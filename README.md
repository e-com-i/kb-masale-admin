# E-Commerce Admin Panel

A Next.js admin panel for managing categories, subcategories, and products stored in GitHub. Features inline editing, image uploads, and direct GitHub integration.

## 🚀 Features

- ✅ **Inline Editing** - Edit categories, subcategories, and products without page navigation
- ✅ **Image Management** - Upload and preview images with drag & drop
- ✅ **GitHub Integration** - Direct push to your GitHub repository
- ✅ **Real-time Updates** - Changes sync immediately to jsDelivr CDN
- ✅ **Search & Filter** - Quick search across all entities
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile
- ✅ **TypeScript** - Full type safety
- ✅ **Tailwind CSS** - Beautiful, modern UI

## 📁 Project Structure

```
ecommerce-admin/
├── app/
│   ├── api/
│   │   └── github/
│   │       └── route.ts          # GitHub API proxy (secure)
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main admin UI (single file!)
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── next.config.js
├── .env.local                    # Environment variables (add your token)
└── README.md
```

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Get GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: **`repo`** (full control of private repositories)
4. Click "Generate token"
5. **Copy the token** (you won't see it again!)

### 3. Configure Environment Variables

Edit `.env.local` and add your GitHub token:

```env
GITHUB_TOKEN=ghp_your_token_here
```

**IMPORTANT:** Never commit `.env.local` to Git! It's already in `.gitignore`.

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## 📖 How to Use

### Dashboard
- View statistics: total categories, subcategories, and products
- Quick access to manage categories

### Categories
1. **View All Categories** - See list with images and metadata
2. **Inline Edit** - Click ✏️ Edit button to edit without leaving the page
3. **Change Image** - Upload new image with preview
4. **Save/Cancel** - Save changes or cancel inline editing
5. **Delete** - Remove category (with confirmation)
6. **Navigate** - Click category name to view subcategories

### Sub-Categories
- Same inline editing features as categories
- Click subcategory name to view products

### Products
- Edit multiple product fields inline
- View multiple product images
- Update price, stock, description, etc.

## 🔧 Configuration

### GitHub Repository Settings

Edit `app/api/github/route.ts` if your repo details are different:

```typescript
const GITHUB_OWNER = 'iFrugal';              // Your GitHub username
const GITHUB_REPO = 'json-data-keeper';      // Your repo name
const GITHUB_BRANCH = 'main';                // Branch name
const BASE_PATH = 'kb-v3';                   // Base path in repo
```

### Image CDN URL

The app uses jsDelivr CDN. Base URL is:
```
https://cdn.jsdelivr.net/gh/iFrugal/json-data-keeper@main/kb-v3
```

## 📂 Data Structure

### Categories JSON
```json
{
  "total": 2,
  "categories": [
    {
      "id": "cat_001",
      "name": "Electronics",
      "order": 1,
      "image": "https://cdn.jsdelivr.net/gh/.../cat_001.jpg"
    }
  ]
}
```

### Subcategories JSON
```json
{
  "parent": {
    "id": "cat_001",
    "name": "Electronics"
  },
  "total": 3,
  "subcategories": [
    {
      "id": "subcat_001",
      "name": "Mobile Phones",
      "order": 1,
      "image": "https://cdn.jsdelivr.net/gh/.../subcat_001.jpg"
    }
  ]
}
```

### Products JSON
```json
{
  "parent": {
    "category_id": "cat_001",
    "category_name": "Electronics",
    "subcategory_id": "subcat_001",
    "subcategory_name": "Mobile Phones"
  },
  "total": 1,
  "products": [
    {
      "_id": "prod_001",
      "name": "iPhone 15 Pro",
      "image": ["url1.jpg", "url2.jpg"],
      "unit": "1 Piece",
      "stock": 50,
      "price": 999,
      "discount": 5,
      "description": "Latest iPhone...",
      "publish": true
    }
  ]
}
```

## 🖼️ Image Structure

```
kb-v3/
  images/
    category/
      {category_id}/
        {category_id}.jpg                    # Category image
        sub-category/
          {subcategory_id}.jpg               # Subcategory image
          products/
            {product_id}_1.jpg               # Product images
            {product_id}_2.jpg
```

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub (without `.env.local`)
2. Go to https://vercel.com
3. Import your repository
4. Add environment variable:
   - Key: `GITHUB_TOKEN`
   - Value: Your GitHub token
5. Deploy!

### Deploy to Other Platforms

The app works on any platform that supports Next.js:
- Netlify
- Railway
- Render
- AWS Amplify

Just make sure to set the `GITHUB_TOKEN` environment variable.

## 🔐 Security Notes

1. **Never expose GitHub token in client code** ✅ (Handled by API routes)
2. **Use environment variables** ✅ (`.env.local` is gitignored)
3. **Limit token permissions** - Only grant `repo` scope
4. **Rotate tokens regularly** - Generate new tokens periodically
5. **Use read-only tokens** - For production, consider read-only access

## 🐛 Troubleshooting

### "Failed to fetch from GitHub"
- Check if `GITHUB_TOKEN` is set correctly in `.env.local`
- Verify token has `repo` scope permissions
- Check if repository name and owner are correct

### "Image upload failed"
- Ensure image is less than 2MB
- Check file format (JPG, PNG, WebP, GIF only)
- Verify GitHub token has write permissions

### "Changes not reflecting"
- jsDelivr CDN caches for 12 hours
- Use cache-busting: Add `?v=timestamp` to URLs
- Or wait for CDN to refresh

## 📝 License

MIT License - feel free to use this for your projects!

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

## 📧 Support

Having issues? Open an issue on GitHub or contact support.

---

**Built with ❤️ using Next.js 14, TypeScript, and Tailwind CSS**

