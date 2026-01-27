# 🚀 Quick Start Guide

## ⚡ Super Fast Setup (5 minutes)

### Step 1: Extract & Navigate
```bash
# Extract the zip file
# Navigate to the folder
cd ecommerce-admin
```

### Step 2: Run Setup Script

**On Mac/Linux:**
```bash
./setup.sh
```

**On Windows:**
```bash
setup.bat
```

### Step 3: Get GitHub Token

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Give it a name: `ecommerce-admin`
4. Select scope: **☑️ repo** (full control)
5. Click **"Generate token"** at bottom
6. **Copy the token** (starts with `ghp_`)

### Step 4: Add Token

Edit `.env.local`:
```env
GITHUB_TOKEN=ghp_your_actual_token_here
```

### Step 5: Start!

```bash
npm run dev
```

Open: **http://localhost:3000**

---

## 🎯 What You Get

### ✅ Features
- Inline editing (no page refresh needed!)
- Image upload with preview
- Real-time GitHub sync
- Search functionality
- Mobile responsive

### 📁 File Structure (Only 8 files!)
```
ecommerce-admin/
├── app/
│   ├── api/github/route.ts    ← GitHub API (secure)
│   ├── page.tsx               ← Main UI (all features!)
│   ├── layout.tsx             ← Root layout
│   └── globals.css            ← Styles
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── .env.local                 ← Add your token here
```

---

## 🖱️ How to Use

### Categories Page
1. Click **"Manage Categories"**
2. Click **✏️ Edit** on any category
3. Change name, order, or upload new image
4. Click **✅ Save Changes**
5. Click category name to view subcategories

### Inline Editing Example
```
Before: [Image] Electronics    [✏️ Edit] [🗑️ Delete]

After clicking Edit:
┌─────────────────────────────────┐
│ 🔽 EDITING MODE                 │
│ [Image Preview]  📤 Change      │
│ Name: [Electronics_______]      │
│ Order: [1___]                   │
│ [❌ Cancel]  [✅ Save Changes]  │
└─────────────────────────────────┘
```

### Upload Image
- Click "📤 Change Image"
- Select image (max 2MB)
- See instant preview
- Save to upload to GitHub

---

## 🔧 Configuration

### Using Different GitHub Repo?

Edit `app/api/github/route.ts`:
```typescript
const GITHUB_OWNER = 'YourUsername';
const GITHUB_REPO = 'your-repo-name';
const GITHUB_BRANCH = 'main';
const BASE_PATH = 'kb-v2';
```

### Using Different CDN?

Edit `app/page.tsx`:
```typescript
const BASE_IMAGE_URL = 'https://your-cdn.com/path';
```

---

## ⚠️ Common Issues

### "Failed to fetch from GitHub"
**Solution:** Check your token in `.env.local`

### Images not uploading?
**Solution:** 
- Check image size (< 2MB)
- Verify token has `repo` write access

### Changes not showing?
**Solution:** 
- jsDelivr caches for 12 hours
- Clear browser cache or wait

---

## 🚀 Deploy to Production

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variable in Vercel dashboard:
# GITHUB_TOKEN = your_token_here
```

### Other Platforms
Works on:
- Netlify
- Railway
- Render
- AWS Amplify

Just set `GITHUB_TOKEN` environment variable!

---

## 📊 Data Flow

```
Admin UI → API Route → GitHub → jsDelivr CDN → Frontend
   ↓          ↓          ↓           ↓            ↓
 Edit     Secure      Store      Cache       Display
```

**Sync Time:** 
- GitHub: Instant
- jsDelivr CDN: Up to 12 hours (cache)

---

## 🎨 Customization

### Change Colors
Edit `app/globals.css` or Tailwind classes in `app/page.tsx`

### Add More Fields
Edit TypeScript interfaces and form fields in `app/page.tsx`

### Add Authentication
Install next-auth:
```bash
npm install next-auth
```

---

## 📞 Need Help?

1. Check `README.md` for detailed docs
2. Review error messages in browser console
3. Check GitHub API rate limits
4. Verify token permissions

---

## ✅ Checklist

Before deploying:
- [ ] GitHub token added to `.env.local`
- [ ] Token has `repo` scope
- [ ] Repository details correct in `route.ts`
- [ ] Tested locally with `npm run dev`
- [ ] Images uploading successfully
- [ ] Data saving to GitHub correctly

---

**🎉 You're ready to go! Start managing your e-commerce catalog!**
