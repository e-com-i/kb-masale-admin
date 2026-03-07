# 🏗️ Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                      http://localhost:3000                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS APPLICATION                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  CLIENT SIDE (app/page.tsx)                               │  │
│  │  • Dashboard UI                                           │  │
│  │  • Categories List with Inline Editing                    │  │
│  │  • SubCategories List with Inline Editing                 │  │
│  │  • Products List with Inline Editing                      │  │
│  │  • Image Upload & Preview                                 │  │
│  │  • Search & Filter                                        │  │
│  └───────────────────┬───────────────────────────────────────┘  │
│                      │ API Calls                                 │
│                      ▼                                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SERVER SIDE (app/api/github/route.ts)                    │  │
│  │  • GET: Fetch JSON from GitHub                            │  │
│  │  • POST: Update/Create/Delete files                       │  │
│  │  • PUT: Create new files                                  │  │
│  │  • Secure token handling (never exposed to client)        │  │
│  └───────────────────┬───────────────────────────────────────┘  │
└────────────────────────┼────────────────────────────────────────┘
                         │ Octokit API
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GITHUB API                                  │
│  • Repository: iFrugal/json-data-keeper                         │
│  • Branch: main                                                  │
│  • Actions:                                                      │
│    - getContent()     → Read files                              │
│    - createOrUpdate() → Write files                             │
│    - deleteFile()     → Remove files                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   GITHUB REPOSITORY                              │
│  kb-v3/                                                          │
│  ├── master/                                                     │
│  │   └── category/                                              │
│  │       ├── all.json                                           │
│  │       └── {cat_id}/                                          │
│  │           ├── sub-categories.json                            │
│  │           └── sub-category/{subcat_id}/products.json         │
│  └── images/                                                     │
│      └── category/{cat_id}/                                     │
│          ├── {cat_id}.jpg                                       │
│          └── sub-category/{subcat_id}.jpg                       │
└────────────────────────┬────────────────────────────────────────┘
                         │ Auto-sync
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    JSDELIVR CDN                                  │
│  https://cdn.jsdelivr.net/gh/iFrugal/json-data-keeper@main/    │
│  • Caches files globally                                        │
│  • 12-hour cache refresh                                        │
│  • Serves to your frontend                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│               YOUR E-COMMERCE FRONTEND                           │
│  (Next.js on Vercel)                                            │
│  • Fetches JSON from jsDelivr                                   │
│  • Displays products to customers                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Read Data (GET)
```
User Browser
    ↓ (Click "Categories")
Admin UI (page.tsx)
    ↓ (fetch('/api/github?action=get-file&path=...'))
API Route (route.ts)
    ↓ (octokit.repos.getContent())
GitHub API
    ↓ (Returns base64 encoded JSON)
GitHub Repository
    ↓ (Decode & parse)
Admin UI
    ↓ (Display in table)
User sees categories ✓
```

### 2. Update Data (POST)
```
User Browser
    ↓ (Click "Save Changes")
Admin UI (page.tsx)
    ↓ (Prepare updated JSON + image)
    ↓ (fetch('/api/github', {method: 'POST', ...}))
API Route (route.ts)
    ↓ (Upload image if needed)
    ↓ (octokit.repos.createOrUpdateFileContents())
GitHub API
    ↓ (Commit changes)
GitHub Repository (updated) ✓
    ↓ (Auto-sync ~1-12 hours)
jsDelivr CDN (refreshes)
    ↓ (Available globally)
Frontend (gets new data) ✓
```

### 3. Upload Image
```
User Browser
    ↓ (Select image file)
Admin UI
    ↓ (Convert to base64)
    ↓ (POST to /api/github with imageBuffer)
API Route
    ↓ (Upload to GitHub at specific path)
GitHub Repository
    ↓ (Image stored at: images/category/{id}/{id}.jpg)
jsDelivr CDN
    ↓ (Serves: https://cdn.jsdelivr.net/.../image.jpg)
Frontend & Admin UI (display image) ✓
```

---

## Component Structure

### Main Admin Component (app/page.tsx)
```
AdminPanel
├── State Management
│   ├── categories[]
│   ├── subcategories[]
│   ├── products[]
│   ├── viewMode (dashboard|categories|subcategories|products)
│   ├── editingCategoryId
│   ├── editingSubCategoryId
│   └── editingProductId
│
├── Header
│   ├── Logo & Title
│   └── Dashboard Button
│
├── Message Toast
│   ├── Success messages
│   └── Error messages
│
├── Loading Overlay
│
└── Main Content
    ├── renderDashboard()
    │   ├── Stats Cards (3 cards)
    │   ├── Quick Actions
    │   └── GitHub Info
    │
    ├── renderCategories()
    │   ├── Search Bar
    │   ├── "+ New Category" Button
    │   └── Category Cards
    │       ├── View Mode (image, name, actions)
    │       └── Edit Mode (inline form)
    │
    ├── renderSubCategories()
    │   ├── Breadcrumb Navigation
    │   ├── Search Bar
    │   ├── "+ New Sub-Category" Button
    │   └── SubCategory Cards
    │       ├── View Mode
    │       └── Edit Mode
    │
    └── renderProducts()
        ├── Breadcrumb Navigation
        ├── Search Bar
        ├── "+ New Product" Button
        └── Product Cards
            ├── View Mode
            └── Edit Mode
```

---

## API Routes Structure

### GET Requests
```typescript
/api/github?action=get-file&path=master/category/all.json
    → Returns: { content: {...}, sha: "..." }

/api/github?action=list-files&path=images/category
    → Returns: { files: [...] }
```

### POST Requests
```typescript
/api/github
Body: {
  action: "update-file",
  path: "master/category/all.json",
  content: { categories: [...] },
  message: "Update category",
  sha: "abc123..." // for updates
}
    → Returns: { success: true, sha: "new_sha" }

Body: {
  action: "update-file",
  path: "images/category/cat_001/cat_001.jpg",
  imageBuffer: "base64_string...",
  isImage: true,
  message: "Upload image"
}
    → Returns: { success: true }

Body: {
  action: "delete-file",
  path: "master/category/all.json",
  sha: "abc123...",
  message: "Delete category"
}
    → Returns: { success: true }
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT BROWSER (Untrusted)                             │
│  • No GitHub token                                       │
│  • Only makes API calls to /api/github                  │
│  • Cannot directly access GitHub                        │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
                     │ (Secure)
                     ▼
┌─────────────────────────────────────────────────────────┐
│  NEXT.JS SERVER (Trusted)                               │
│  • Holds GitHub token in environment variable           │
│  • Token never sent to client                           │
│  • Validates all requests                               │
│  • Acts as secure proxy                                 │
└────────────────────┬────────────────────────────────────┘
                     │ GitHub API
                     │ (Token in header)
                     ▼
┌─────────────────────────────────────────────────────────┐
│  GITHUB API                                             │
│  • Validates token                                       │
│  • Checks permissions (repo scope)                      │
│  • Executes operations                                  │
└─────────────────────────────────────────────────────────┘
```

**Key Security Points:**
1. ✅ Token stored in `.env.local` (server-only)
2. ✅ Token never exposed to client
3. ✅ API routes validate all inputs
4. ✅ HTTPS for all communications
5. ✅ Rate limiting by GitHub

---

## File Dependencies

```
package.json
    ↓ (defines)
Dependencies:
    ├── next@14.2.18
    │   ├── react@18.3.1
    │   └── react-dom@18.3.1
    ├── @octokit/rest@20.0.2
    └── lucide-react@0.263.1

DevDependencies:
    ├── typescript@5
    ├── tailwindcss@3.4.14
    │   ├── postcss@8.4.47
    │   └── autoprefixer@10.4.20
    └── @types/* (TypeScript definitions)
```

---

## State Management Flow

```
Component Mount
    ↓
fetchCategories()
    ↓
setCategories([...]) → React State Update
    ↓
Re-render with data
    ↓
User clicks "Edit"
    ↓
startEditingCategory(category)
    ↓
setEditingCategoryId(category.id)
setEditFormData({...category})
    ↓
Inline form appears
    ↓
User changes name/image
    ↓
setEditFormData({...changes})
    ↓
User clicks "Save"
    ↓
saveCategory()
    ↓
Upload to GitHub (if image changed)
    ↓
Update local state
    ↓
setCategories(updatedCategories)
    ↓
setEditingCategoryId(null)
    ↓
Form closes, new data visible ✓
```

---

## Error Handling Flow

```
User Action
    ↓
try {
    API Call to /api/github
    ↓
    GitHub API Call
    ↓
    Success
    ↓
    Update UI
    ↓
    Show success message
}
catch (error) {
    ↓
    Log error
    ↓
    Show error message to user
    ↓
    Rollback UI changes (if needed)
    ↓
    User can retry
}
finally {
    ↓
    Hide loading spinner
    ↓
    Reset form state
}
```

---

This architecture provides:
- ✅ **Security** - Token never exposed
- ✅ **Performance** - Client-side rendering + CDN
- ✅ **Reliability** - Error handling at every level
- ✅ **Scalability** - Serverless functions on Vercel
- ✅ **Maintainability** - Clean separation of concerns
