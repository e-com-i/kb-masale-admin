import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

// IMPORTANT: Add your GitHub Personal Access Token here or use environment variable
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'YOUR_GITHUB_TOKEN_HERE';
const GITHUB_OWNER = 'iFrugal';
const GITHUB_REPO = 'json-data-keeper';
const GITHUB_BRANCH = 'main';
const BASE_PATH = 'kb-v2';

// B2C App Repository
const B2C_REPO = 'test-portal';
const B2C_BRANCH = 'main';

const octokit = new Octokit({ auth: GITHUB_TOKEN });

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const path = searchParams.get('path');

  try {
    if (action === 'get-file' && path) {
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

      return NextResponse.json({ error: 'File not found' }, { status: 404 });
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
          email: 'admin@ecommerce.com',
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

    // Update B2C App environment files with new tag
    if (action === 'update-b2c-env') {
      const { tagName, publishedBy } = body;

      if (!tagName) {
        return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
      }

      // Only update .env file (not .env.local or .env.production as they may have local overrides)
      const envFiles = ['.env'];
      const results: { file: string; status: 'updated' | 'created' | 'skipped'; error?: string }[] = [];
      const cdnBaseUrl = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}@${tagName}/${BASE_PATH}`;

      for (const envFile of envFiles) {
        try {
          // Try to get existing file
          let existingContent = '';
          let existingSha: string | undefined;

          try {
            const { data } = await octokit.repos.getContent({
              owner: GITHUB_OWNER,
              repo: B2C_REPO,
              path: envFile,
              ref: B2C_BRANCH,
            });

            if ('content' in data) {
              existingContent = Buffer.from(data.content, 'base64').toString('utf-8');
              existingSha = data.sha;
            }
          } catch (e: any) {
            if (e.status !== 404) throw e;
            // File doesn't exist, we'll create it
          }

          // Update the environment variables to match existing format
          let newContent: string;

          // Regex patterns to match existing variables (with optional quotes and spaces)
          const apiUrlRegex = /^NEXT_PUBLIC_API_URL\s*=\s*['"]?[^'"\n]*['"]?/m;
          const cdnUrlRegex = /^CDN_BASE_URL\s*=\s*['"]?[^'"\n]*['"]?/m;

          if (existingContent) {
            newContent = existingContent;

            // Update NEXT_PUBLIC_API_URL
            if (apiUrlRegex.test(newContent)) {
              newContent = newContent.replace(apiUrlRegex, `NEXT_PUBLIC_API_URL='${cdnBaseUrl}'`);
            } else {
              newContent = newContent.trim() + `\n\nNEXT_PUBLIC_API_URL='${cdnBaseUrl}'\n`;
            }

            // Update CDN_BASE_URL
            if (cdnUrlRegex.test(newContent)) {
              newContent = newContent.replace(cdnUrlRegex, `CDN_BASE_URL='${cdnBaseUrl}'`);
            } else {
              newContent = newContent.trim() + `\nCDN_BASE_URL='${cdnBaseUrl}'\n`;
            }
          } else {
            // Create new file with the expected format
            newContent = `NEXT_PUBLIC_API_URL='${cdnBaseUrl}'

NEXT_PUBLIC_ACCESS_KEY=3bc45ca0-44a9-4805-b5da-7a4e3e58e151

CDN_BASE_URL='${cdnBaseUrl}'
`;
          }

          // Commit the file
          const params: any = {
            owner: GITHUB_OWNER,
            repo: B2C_REPO,
            path: envFile,
            message: `chore: Update data version to ${tagName}\n\nPublished by ${publishedBy || 'Admin Panel'}`,
            content: Buffer.from(newContent).toString('base64'),
            branch: B2C_BRANCH,
          };

          if (existingSha) {
            params.sha = existingSha;
          }

          await octokit.repos.createOrUpdateFileContents(params);

          results.push({
            file: envFile,
            status: existingSha ? 'updated' : 'created'
          });

        } catch (error: any) {
          results.push({
            file: envFile,
            status: 'skipped',
            error: error.message
          });
        }
      }

      return NextResponse.json({
        success: true,
        results,
        message: `B2C environment files updated with ${tagName}`
      });
    }

    // Get B2C deployment/workflow status
    if (action === 'get-b2c-deployment-status') {
      try {
        // Get the latest workflow runs
        const { data } = await octokit.actions.listWorkflowRunsForRepo({
          owner: GITHUB_OWNER,
          repo: B2C_REPO,
          per_page: 5,
        });

        const latestRun = data.workflow_runs[0];

        if (latestRun) {
          return NextResponse.json({
            success: true,
            hasWorkflows: true,
            latestRun: {
              id: latestRun.id,
              name: latestRun.name,
              status: latestRun.status,
              conclusion: latestRun.conclusion,
              createdAt: latestRun.created_at,
              updatedAt: latestRun.updated_at,
              htmlUrl: latestRun.html_url,
            }
          });
        } else {
          return NextResponse.json({
            success: true,
            hasWorkflows: false,
            message: 'No workflow runs found'
          });
        }
      } catch (error: any) {
        // If no workflows configured, that's okay
        if (error.status === 404) {
          return NextResponse.json({
            success: true,
            hasWorkflows: false,
            message: 'No GitHub Actions configured for B2C repo'
          });
        }
        throw error;
      }
    }

    // Get specific workflow run status
    if (action === 'get-workflow-run') {
      const { runId } = body;

      if (!runId) {
        return NextResponse.json({ error: 'Run ID is required' }, { status: 400 });
      }

      const { data } = await octokit.actions.getWorkflowRun({
        owner: GITHUB_OWNER,
        repo: B2C_REPO,
        run_id: runId,
      });

      return NextResponse.json({
        success: true,
        run: {
          id: data.id,
          name: data.name,
          status: data.status,
          conclusion: data.conclusion,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          htmlUrl: data.html_url,
        }
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