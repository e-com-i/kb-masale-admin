import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

const GITHUB_TOKEN = process.env.KB_GITHUB_TOKEN || 'YOUR_GITHUB_TOKEN_HERE';
const GITHUB_OWNER = 'iFrugal';
const GITHUB_REPO = 'json-data-keeper';
const GITHUB_BRANCH = 'main';
const BASE_PATH = process.env.KB_DATA_PATH || 'kb-v4';

// Vercel (for publish/deploy B2C from admin)
const VERCEL_TOKEN = process.env.KB_VERCEL_TOKEN || '';
const VERCEL_PROJECT_ID = process.env.KB_VERCEL_PROJECT_ID || '';

const octokit = new Octokit({ auth: GITHUB_TOKEN });

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const path = searchParams.get('path');

  try {
    if (action === 'get-file' && path) {
      try {
        const { data } = await octokit.repos.getContent({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path: `${BASE_PATH}/${path}`,
          ref: GITHUB_BRANCH,
        });

        if ('content' in data) {
          const content = Buffer.from(data.content, 'base64').toString('utf-8');
          return NextResponse.json({ content: JSON.parse(content), sha: data.sha });
        }

        return NextResponse.json({ content: null, error: 'Not a file' }, { status: 200 });
      } catch (fileError: any) {
        // File/path doesn't exist yet (e.g. new data path) — return empty, don't crash
        if (fileError.status === 404) {
          return NextResponse.json({ content: null, notFound: true });
        }
        throw fileError;
      }
    }

    if (action === 'list-files') {
      const { data } = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: `${BASE_PATH}/${path || ''}`,
        ref: GITHUB_BRANCH,
      });

      return NextResponse.json({ files: data });
    }

    // Get all tags (releases)
    if (action === 'get-tags') {
      const { data } = await octokit.repos.listTags({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        per_page: 100,
      });

      // Filter tags that start with 'v' (version tags)
      const versionTags = data.filter(tag => tag.name.startsWith('v'));

      return NextResponse.json({
        tags: versionTags.map(tag => ({
          name: tag.name,
          sha: tag.commit.sha,
        })),
        latest: versionTags[0] || null
      });
    }

    // Get latest tag/release info
    if (action === 'get-latest-release') {
      try {
        const { data } = await octokit.repos.getLatestRelease({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
        });

        return NextResponse.json({
          tag: data.tag_name,
          name: data.name,
          body: data.body,
          publishedAt: data.published_at,
          author: data.author?.login,
        });
      } catch (error: any) {
        // No releases yet
        if (error.status === 404) {
          return NextResponse.json({ tag: null, message: 'No releases yet' });
        }
        throw error;
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('GitHub API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch from GitHub' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, path, content, message, sha, isImage, imageBuffer } = body;

    if (action === 'update-file') {
      const fileContent = isImage
        ? imageBuffer
        : Buffer.from(JSON.stringify(content, null, 2)).toString('base64');

      const params: any = {
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: `${BASE_PATH}/${path}`,
        message: message || 'Update via admin panel',
        content: fileContent,
        branch: GITHUB_BRANCH,
      };

      // If sha not provided, try to fetch it (for existing files)
      if (!sha) {
        try {
          const existingFile = await octokit.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: `${BASE_PATH}/${path}`,
            ref: GITHUB_BRANCH,
          });

          if ('sha' in existingFile.data) {
            params.sha = existingFile.data.sha;
          }
        } catch (error: any) {
          // File doesn't exist yet, that's fine for new files
          if (error.status !== 404) {
            throw error;
          }
        }
      } else {
        params.sha = sha;
      }

      const { data } = await octokit.repos.createOrUpdateFileContents(params);

      return NextResponse.json({
        success: true,
        sha: data.content?.sha,
        message: 'File updated successfully'
      });
    }

    if (action === 'delete-file') {
      await octokit.repos.deleteFile({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: `${BASE_PATH}/${path}`,
        message: message || 'Delete via admin panel',
        sha: sha,
        branch: GITHUB_BRANCH,
      });

      return NextResponse.json({ success: true, message: 'File deleted successfully' });
    }

    // Create a new release/tag
    if (action === 'create-release') {
      const { tagName, releaseName, releaseNotes, publishedBy } = body;

      if (!tagName) {
        return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
      }

      // Validate tag format - allow multiple formats:
      // - Semantic versioning: v1.0.0, v1.0.1
      // - Date-based: 2025-01-27_B1, 2025-01-27_B2
      // - Simple: release-1, build-123
      const validTagPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
      if (!validTagPattern.test(tagName)) {
        return NextResponse.json(
          { error: 'Invalid tag format. Use alphanumeric characters, dots, hyphens, or underscores.' },
          { status: 400 }
        );
      }

      // Get the latest commit SHA from main branch
      const { data: refData } = await octokit.git.getRef({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        ref: `heads/${GITHUB_BRANCH}`,
      });

      const commitSha = refData.object.sha;

      // Create the tag
      const { data: tagData } = await octokit.git.createTag({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        tag: tagName,
        message: releaseNotes || `Release ${tagName}`,
        object: commitSha,
        type: 'commit',
        tagger: {
          name: publishedBy || 'Admin Panel',
          email: 'admin@kbmasale.com',
          date: new Date().toISOString(),
        },
      });

      // Create the reference for the tag
      await octokit.git.createRef({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        ref: `refs/tags/${tagName}`,
        sha: tagData.sha,
      });

      // Create a GitHub Release (optional but provides better UI in GitHub)
      const { data: releaseData } = await octokit.repos.createRelease({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        tag_name: tagName,
        name: releaseName || `Release ${tagName}`,
        body: releaseNotes || `Published by ${publishedBy || 'Admin Panel'} on ${new Date().toLocaleString()}`,
        draft: false,
        prerelease: false,
      });

      return NextResponse.json({
        success: true,
        tag: tagName,
        releaseId: releaseData.id,
        releaseUrl: releaseData.html_url,
        cdnUrl: `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}@${tagName}/${BASE_PATH}`,
        message: `Release ${tagName} created successfully`
      });
    }

    // Update DATA_VERSION in Vercel and instant-redeploy (no rebuild needed)
    if (action === 'update-b2c-env') {
      const { tagName } = body;

      if (!tagName) {
        return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
      }

      // Step 1: Find existing DATA_VERSION env var
      const listRes = await fetch(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env`,
        { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
      );
      if (!listRes.ok) {
        const listErr = await listRes.json();
        return NextResponse.json({ error: `Failed to list Vercel env vars: ${listErr.error?.message || JSON.stringify(listErr)}` }, { status: 500 });
      }
      const listData = await listRes.json();
      const existing = listData.envs?.find((e: any) => e.key === 'DATA_VERSION');

      // Step 2: Create or update DATA_VERSION
      if (existing) {
        const patchRes = await fetch(
          `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${existing.id}`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: tagName }),
          }
        );
        if (!patchRes.ok) {
          const patchErr = await patchRes.json();
          return NextResponse.json({ error: `Failed to update Vercel env var: ${patchErr.error?.message || JSON.stringify(patchErr)}` }, { status: 500 });
        }
      } else {
        const createRes = await fetch(
          `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: 'DATA_VERSION',
              value: tagName,
              type: 'plain',
              target: ['production', 'preview'],
            }),
          }
        );
        if (!createRes.ok) {
          const createErr = await createRes.json();
          return NextResponse.json({ error: `Failed to create Vercel env var: ${createErr.error?.message || JSON.stringify(createErr)}` }, { status: 500 });
        }
      }

      // Step 3: Get current production deployment ID for instant redeploy (no recompile)
      const latestProdRes = await fetch(
        `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&target=production&limit=1`,
        { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
      );
      if (!latestProdRes.ok) {
        const latestErr = await latestProdRes.json();
        return NextResponse.json({ error: `Failed to get latest deployment: ${latestErr.error?.message || JSON.stringify(latestErr)}` }, { status: 500 });
      }
      const latestProdData = await latestProdRes.json();
      const latestDeploymentId = latestProdData.deployments?.[0]?.uid;
      if (!latestDeploymentId) {
        return NextResponse.json({ error: 'No existing production deployment found to redeploy' }, { status: 500 });
      }

      // Step 4: Instant redeploy — same build, just new env vars (~5-10s, no recompile)
      const latestDeployment = latestProdData.deployments?.[0];
      const projectName = latestDeployment?.name || 'test-portal';
      const deployRes = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          deploymentId: latestDeploymentId,
          target: 'production',
        }),
      });
      const deployData = await deployRes.json();

      if (!deployRes.ok) {
        return NextResponse.json({
          error: `Vercel deployment trigger failed: ${deployData.error?.message || JSON.stringify(deployData)}`,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        deploymentId: deployData.id,
        deploymentUrl: deployData.url ? `https://${deployData.url}` : null,
        inspectorUrl: deployData.inspectorUrl || null,
        message: `NEXT_PUBLIC_DATA_VERSION set to ${tagName}, deployment triggered`,
      });
    }

    // Get B2C deployment status via Vercel
    if (action === 'get-b2c-deployment-status') {
      const res = await fetch(
        `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&limit=1`,
        { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
      );
      const data = await res.json();
      const latest = data.deployments?.[0];

      if (!latest) {
        return NextResponse.json({ success: true, hasDeployment: false });
      }

      return NextResponse.json({
        success: true,
        hasDeployment: true,
        deployment: {
          id: latest.uid,
          state: latest.state,           // BUILDING | READY | ERROR | QUEUED
          url: `https://${latest.url}`,
          prodUrl: 'https://kbmasale.com',
          createdAt: latest.createdAt,
          commit: latest.meta?.githubCommitMessage?.split('\n')[0] || '',
        }
      });
    }

    // Poll a specific Vercel deployment by ID
    if (action === 'get-workflow-run') {
      const { runId } = body;
      if (!runId) return NextResponse.json({ error: 'Deployment ID is required' }, { status: 400 });

      const res = await fetch(
        `https://api.vercel.com/v13/deployments/${runId}`,
        { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
      );
      const data = await res.json();

      if (!res.ok) {
        return NextResponse.json({ error: `Failed to poll deployment: HTTP ${res.status}` }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        deployment: {
          id: data.id,
          state: data.status,
          url: data.url ? `https://${data.url}` : null,
          inspectorUrl: data.inspectorUrl || null,
          createdAt: data.createdAt,
        }
      });
    }

    // Fetch live site /api/config to check what DATA_VERSION is running
    if (action === 'verify-live-version') {
      const { expectedVersion } = body;
      const res = await fetch('https://kbmarts.com/api/config', {
        headers: { 'User-Agent': 'KB-Admin-Panel/1.0' },
        cache: 'no-store',
      });
      if (!res.ok) {
        return NextResponse.json({ error: `Failed to fetch live site config: HTTP ${res.status}` }, { status: 500 });
      }
      const config = await res.json();
      const liveVersion = config.dataVersion || null;
      return NextResponse.json({
        success: true,
        liveVersion,
        expectedVersion,
        matches: liveVersion === expectedVersion,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('GitHub API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update GitHub' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, content, message } = body;

    const fileContent = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');

    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: `${BASE_PATH}/${path}`,
      message: message || 'Create via admin panel',
      content: fileContent,
      branch: GITHUB_BRANCH,
    });

    return NextResponse.json({
      success: true,
      sha: data.content?.sha,
      message: 'File created successfully'
    });
  } catch (error: any) {
    console.error('GitHub API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create file' },
      { status: 500 }
    );
  }
}