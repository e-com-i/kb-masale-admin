# KB Masale Admin — Architecture

## System Overview

KB Masale Admin is a Next.js 14 admin panel for managing an Indian grocery e-commerce catalog.
It stores all data as JSON files in a GitHub repository (`iFrugal/json-data-keeper`) and uses
jsDelivr CDN for production delivery. The admin panel handles the full lifecycle: CRUD for
categories/subcategories/products, image uploads, unit management, and a multi-step publish
workflow that tags data versions and deploys the B2C storefront.

**Live URLs:**
- Admin: https://kb-masale-admin.vercel.app
- B2C Store: https://kbmarts.com

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          ADMIN BROWSER                                │
│                   https://kb-masale-admin.vercel.app                  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  app/page.tsx — Single-Page Admin UI                            │ │
│  │  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌─────────────────┐ │ │
│  │  │Dashboard │ │Categories  │ │Products  │ │Publish/Deploy   │ │ │
│  │  │Stats     │ │SubCats     │ │Units     │ │5-step release   │ │ │
│  │  └──────────┘ └────────────┘ └──────────┘ └─────────────────┘ │ │
│  └──────────────────────────┬──────────────────────────────────────┘ │
└─────────────────────────────┼────────────────────────────────────────┘
                              │ fetch('/api/...')
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      NEXT.JS SERVER (Vercel)                          │
│                                                                       │
│  ┌────────────────────┐   ┌──────────────────────────────────────┐  │
│  │ /api/auth/[...next │   │ /api/github (route.ts)               │  │
│  │    auth]            │   │   GET:  get-file, list-files,        │  │
│  │  Google OAuth       │   │         get-tags, get-latest-release │  │
│  │  Email allowlist    │   │   POST: update-file, delete-file,    │  │
│  │  JWT sessions       │   │         create-release, update-b2c-  │  │
│  │  8h expiry          │   │         env, verify-live-version     │  │
│  └────────────────────┘   └───────────────┬──────────────────────┘  │
│                                            │ Octokit (KB_GITHUB_TOKEN)│
│  middleware.ts — JWT validation + headers   │ Vercel API (KB_VERCEL_  │
└────────────────────────────────────────────┼──TOKEN)──────────────────┘
                                             │
                     ┌───────────────────────┼───────────────────────┐
                     ▼                       ▼                       ▼
          ┌──────────────────┐   ┌────────────────────┐   ┌─────────────┐
          │  GitHub API       │   │  Vercel API         │   │ Google OAuth│
          │  iFrugal/json-   │   │  Update env vars    │   │ Provider    │
          │  data-keeper     │   │  Trigger redeploy   │   │             │
          │  (main branch)   │   │  Check status       │   │             │
          └────────┬─────────┘   └──────────┬─────────┘   └─────────────┘
                   │                         │
                   ▼                         ▼
          ┌──────────────────┐   ┌────────────────────┐
          │  jsDelivr CDN    │   │  B2C App (kbmarts)  │
          │  @tag versioned  │   │  Redeployed with    │
          │  JSON + images   │   │  new DATA_VERSION   │
          └──────────────────┘   └────────────────────┘
```

---

## File Structure

```
kb-masale-admin/
├── app/
│   ├── page.tsx                    # Main admin UI (single component, all views)
│   ├── layout.tsx                  # Root layout
│   ├── providers.tsx               # NextAuth SessionProvider wrapper
│   ├── globals.css                 # Global styles
│   ├── login/
│   │   └── page.tsx                # Google OAuth login page
│   └── api/
│       ├── auth/[...nextauth]/
│       │   └── route.ts            # NextAuth: Google OAuth + email allowlist
│       └── github/
│           └── route.ts            # GitHub API proxy (all CRUD + publish)
├── middleware.ts                    # JWT validation, security headers
├── types/
│   └── next-auth.d.ts              # NextAuth type extensions
├── .env.local                      # Local dev secrets (gitignored)
├── .env.production                 # Production config (committed, non-secrets only)
├── next.config.js                  # Image domains config
├── tailwind.config.js              # Tailwind CSS config
├── tsconfig.json                   # TypeScript config
└── package.json                    # Dependencies
```

---

## Authentication

**Provider:** Google OAuth via NextAuth v4

**Flow:**
1. User navigates to admin → middleware redirects to `/login` if no JWT
2. User clicks "Sign in with Google" → Google OAuth consent screen
3. Google callback → `signIn()` validates email is in `ALLOWED_ADMIN_EMAILS`
4. JWT created with `isAdmin: true`, 8-hour expiry, 5-minute refresh

**Security layers:**
- `middleware.ts` validates JWT + admin status on every request
- Email allowlist (env var `ALLOWED_ADMIN_EMAILS`)
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, etc.
- Same-domain redirect restriction

---

## Data Storage (GitHub as Database)

All catalog data lives in `iFrugal/json-data-keeper` repo under `kb-v3/`:

```
kb-v3/
├── master/
│   ├── category/
│   │   ├── all.json                          # { total, categories: [{id, name, order, image}] }
│   │   └── {category_id}/
│   │       ├── sub-categories.json           # { parent, total, subcategories: [...] }
│   │       └── sub-category/
│   │           └── {subcategory_id}/
│   │               └── products.json         # { parent, total, products: [...] }
│   ├── counters/
│   │   └── order.json                        # { lastOrderNo, lastUpdated } — sequential invoice counter
│   └── dropdown-values/
│       └── product/unit/all.json             # { total, types: [...], units: [{id, label, order, types}] }
└── images/
    └── category/{cat_id}/
        ├── {cat_id}.webp                     # Category image
        └── sub-category/
            ├── {subcat_id}.webp              # Subcategory image
            └── products/{product_id}/        # Product images
```

**Read:** `octokit.repos.getContent()` → base64 decode → JSON parse
**Write:** `octokit.repos.createOrUpdateFileContents()` with SHA for conflict detection
**Images:** Uploaded as base64, served via raw.githubusercontent.com (admin) or jsDelivr CDN (B2C)

---

## API Routes

### `/api/auth/[...nextauth]`
Google OAuth handler with email allowlist, JWT sessions, admin flag.

### `/api/github` (GET)
| Action | Purpose |
|--------|---------|
| `get-file` | Fetch JSON/image from GitHub by path |
| `list-files` | List directory contents |
| `get-tags` | Get all version tags (prefix `v` or date format) |
| `get-latest-release` | Latest GitHub release info |

### `/api/github` (POST)
| Action | Purpose |
|--------|---------|
| `update-file` | Create/update JSON or image files |
| `delete-file` | Remove files from repo |
| `create-release` | Create git tag + GitHub release |
| `update-b2c-env` | Update `DATA_VERSION` in Vercel B2C project + trigger redeploy |
| `get-b2c-deployment-status` | Poll Vercel deployment status |
| `get-workflow-run` | Check deployment by run ID |
| `verify-live-version` | Confirm kbmarts.com serves expected version |

---

## Publish / Deploy Flow

When admin clicks "Publish to B2C Store":

```
Step 1: Create Git Tag
  └─ Get latest commit SHA → create tag object → create ref (refs/tags/{tagName})

Step 2: Create GitHub Release
  └─ Create release with notes, publishedBy audit field

Step 3: Update Vercel B2C Environment
  └─ Set DATA_VERSION = new tag name → triggers automatic redeploy

Step 4: Track Deployment (poll every 10s, max 3.5 min)
  └─ QUEUED → BUILDING → READY (or ERROR)

Step 5: Verify Live Version (poll every 20s, max 2 min)
  └─ GET kbmarts.com/api/config → check liveVersion matches expected
```

**Tag format:** `YYYY-MM-DD_BN` (e.g., `2026-03-07_B6`), auto-increments build number per day.

---

## Admin UI Views

All views are rendered from the single `app/page.tsx` component:

| View | State | Features |
|------|-------|----------|
| **Dashboard** | `viewMode: 'dashboard'` | Category count card, quick actions, publish section |
| **Categories** | `viewMode: 'categories'` | List, search, inline add/edit, image upload, delete |
| **SubCategories** | `viewMode: 'subcategories'` | Same as categories + breadcrumb back to parent |
| **Products** | `viewMode: 'products'` | Multi-image upload, price/discount/stock, unit dropdown (filtered by type), publish toggle, more_details fields |
| **Units** | `viewMode: 'units'` | Unit CRUD, type management, order control |

**Header:** "KB Masale Admin" title is clickable → resets to dashboard view.

---

## Environment Variables

### `.env.local` (gitignored — secrets)
```
KB_GITHUB_TOKEN       # GitHub PAT (repo scope) for read/write
KB_VERCEL_TOKEN       # Vercel API token for B2C deployment
KB_VERCEL_PROJECT_ID  # Vercel project ID for B2C app
NEXTAUTH_SECRET       # JWT encryption key
NEXTAUTH_URL          # http://localhost:3000 (local)
GOOGLE_CLIENT_ID      # Google OAuth
GOOGLE_CLIENT_SECRET  # Google OAuth
ALLOWED_ADMIN_EMAILS  # Comma-separated admin emails
```

### `.env.production` (committed — non-secrets)
```
KB_DATA_PATH=kb-v3
NEXT_PUBLIC_KB_DATA_PATH=kb-v3
NEXTAUTH_URL=https://kb-masale-admin.vercel.app
```

Secrets must be set in Vercel Dashboard for production.

---

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 14.2.18 | React framework |
| react | 18.3.1 | UI library |
| next-auth | 4.24.5 | Google OAuth authentication |
| @octokit/rest | 20.0.2 | GitHub API client |
| lucide-react | 0.263.1 | Icon library |
| tailwindcss | 3.4.14 | Utility-first CSS |
| typescript | 5.x | Type safety |

---

## Audit Trail

- `updatedBy` field on categories, subcategories, and products stores the admin email
- `createdAt` / `updatedAt` timestamps on products
- GitHub commit history provides full change log
- Release notes include `publishedBy` field

---

## Security Model

```
Browser (untrusted)
  │ HTTPS only
  ▼
Next.js Server (trusted)
  ├─ JWT validated on every request (middleware.ts)
  ├─ Admin email checked against allowlist
  ├─ GitHub token held server-side only (never sent to client)
  ├─ Vercel token held server-side only
  └─ Security headers on all responses
  │
  ▼
External APIs (authenticated via server-held tokens)
  ├─ GitHub API (Octokit with PAT)
  ├─ Vercel API (Bearer token)
  └─ Google OAuth (client secret server-side)
```
