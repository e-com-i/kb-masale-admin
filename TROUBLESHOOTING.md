# 🔧 Troubleshooting Guide

## Common Issues & Solutions

---

## 🚨 Installation Issues

### Error: "npm: command not found"
**Problem:** Node.js/npm not installed

**Solution:**
1. Download Node.js from https://nodejs.org/
2. Install LTS version (recommended)
3. Restart terminal
4. Verify: `npm --version`

---

### Error: "Cannot find module 'next'"
**Problem:** Dependencies not installed

**Solution:**
```bash
npm install
```

If still failing:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 🔑 GitHub Token Issues

### Error: "Failed to fetch from GitHub"
**Problem:** Token not set or invalid

**Solutions:**
1. Check `.env.local` exists in root directory
2. Verify token format: `GITHUB_TOKEN=ghp_...`
3. Ensure no spaces around `=`
4. Restart dev server: `npm run dev`

**Verify token:**
```bash
# Mac/Linux
echo $GITHUB_TOKEN

# Windows
echo %GITHUB_TOKEN%
```

---

### Error: "Bad credentials"
**Problem:** Token expired or wrong scope

**Solutions:**
1. Generate new token: https://github.com/settings/tokens
2. Select scope: ☑️ **repo** (full control)
3. Copy new token
4. Update `.env.local`
5. Restart server

---

### Error: "Resource not accessible"
**Problem:** Token lacks required permissions

**Solution:**
1. Go to token settings
2. Edit token scopes
3. Enable: ☑️ repo
4. Save changes
5. Update token in `.env.local`

---

## 🖼️ Image Upload Issues

### Error: "Image upload failed"
**Problem:** Various causes

**Solutions:**

**1. File too large:**
```
Error: Image size should be less than 2MB
```
- Compress image before upload
- Use online tools: tinypng.com, compressor.io

**2. Unsupported format:**
```
Only JPG, PNG, WebP, GIF supported
```
- Convert image to supported format
- Use: JPEG, PNG, WebP, or GIF

**3. GitHub API error:**
```
Error: Failed to upload to GitHub
```
- Check token permissions
- Check repository path is correct
- Verify disk space on GitHub

---

## 📝 Data Not Saving

### Issue: "Changes not persisting"
**Problem:** API call failing

**Solutions:**

**1. Check browser console:**
```bash
F12 → Console tab
Look for red errors
```

**2. Verify GitHub repo details:**
Edit `app/api/github/route.ts`:
```typescript
const GITHUB_OWNER = 'iFrugal';     // ← Your GitHub username
const GITHUB_REPO = 'json-data-keeper';  // ← Your repo name
const GITHUB_BRANCH = 'main';            // ← Branch name
```

**3. Check network tab:**
```bash
F12 → Network tab → Click save
Look for failed requests (red)
```

**4. Verify JSON structure:**
- Ensure JSON is valid
- Check for required fields
- Validate against existing structure

---

## 🌐 CDN/jsDelivr Issues

### Issue: "Images not showing on frontend"
**Problem:** CDN cache not updated

**Solutions:**

**1. Wait for cache refresh:**
- jsDelivr cache: up to 12 hours
- Be patient!

**2. Bust cache manually:**
```javascript
// Add timestamp to URL
const imageUrl = `${BASE_URL}/image.jpg?v=${Date.now()}`;
```

**3. Verify file exists in GitHub:**
- Go to your repo on GitHub
- Navigate to file path
- Confirm file is there

**4. Check CDN URL format:**
```
Correct: https://cdn.jsdelivr.net/gh/USER/REPO@BRANCH/path
Wrong:   https://cdn.jsdelivr.net/gh/USER/REPO/path  (missing @branch)
```

---

## 💻 Development Server Issues

### Error: "Port 3000 already in use"
**Problem:** Another app using port 3000

**Solutions:**

**Option 1: Kill the process**
```bash
# Mac/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

**Option 2: Use different port**
```bash
PORT=3001 npm run dev
```

---

### Error: "Module not found"
**Problem:** Missing dependency or wrong import

**Solutions:**
```bash
# Reinstall dependencies
npm install

# Clear Next.js cache
rm -rf .next
npm run dev
```

---

## 🔍 UI/Display Issues

### Issue: "Inline editing not working"
**Problem:** State not updating

**Solutions:**
1. Check browser console for errors
2. Verify React DevTools
3. Clear browser cache (Ctrl+Shift+Del)
4. Hard reload (Ctrl+Shift+R)

---

### Issue: "Images not loading"
**Problem:** Invalid image URL

**Solutions:**
1. Check image exists in GitHub
2. Verify URL format
3. Check CORS settings
4. Use placeholder on error:
```typescript
onError={(e) => {
  e.currentTarget.src = '/placeholder.jpg';
}}
```

---

### Issue: "Search not working"
**Problem:** Filter logic issue

**Check:**
- Is `searchTerm` state updating?
- Are filtered results correct?
- Check console for errors

---

## 🚀 Build/Deployment Issues

### Error: "Build failed"
**Problem:** TypeScript errors or missing dependencies

**Solutions:**
```bash
# Check for TypeScript errors
npm run build

# Fix errors shown in output
# Common fixes:
npm install --save-dev @types/node @types/react
```

---

### Error: "Environment variable not set"
**Problem:** `.env.local` not loaded in production

**Solution:**
**Vercel:**
1. Go to project settings
2. Environment Variables
3. Add: `GITHUB_TOKEN` = `your_token`
4. Redeploy

**Other platforms:**
- Add environment variable in platform dashboard
- Restart application

---

## 🐛 Debugging Tips

### 1. Enable Verbose Logging
```typescript
// In app/api/github/route.ts
console.log('Request:', action, path);
console.log('Response:', data);
```

### 2. Check Network Requests
```bash
F12 → Network tab
Filter: Fetch/XHR
Watch requests in real-time
```

### 3. Inspect React State
```bash
F12 → Components tab (React DevTools)
Select component
View current state
```

### 4. Test GitHub API Directly
```bash
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/repos/iFrugal/json-data-keeper/contents/kb-v2/master/category/all.json
```

---

## 📞 Still Having Issues?

### Before Asking for Help:

1. ✅ Check error message in browser console
2. ✅ Verify GitHub token is valid
3. ✅ Confirm repository details are correct
4. ✅ Try restarting dev server
5. ✅ Clear browser cache
6. ✅ Check this troubleshooting guide

### Include in Support Request:

1. 📋 Full error message from console
2. 📋 Steps to reproduce the issue
3. 📋 Screenshots (if applicable)
4. 📋 Your environment:
   - OS (Windows/Mac/Linux)
   - Node version: `node --version`
   - npm version: `npm --version`
   - Browser (Chrome/Firefox/Safari)

---

## 🔍 Quick Diagnostics

Run these commands to check your setup:

```bash
# Check Node/npm versions
node --version   # Should be v18+ or v20+
npm --version    # Should be v9+ or v10+

# Check if .env.local exists
cat .env.local   # Mac/Linux
type .env.local  # Windows

# Check if dependencies are installed
ls node_modules | wc -l   # Should show many packages

# Test dev server
npm run dev
# Should start without errors
```

---

## ✅ Health Check Checklist

- [ ] Node.js installed (v18+)
- [ ] npm installed (v9+)
- [ ] Dependencies installed (`node_modules` exists)
- [ ] `.env.local` exists with valid token
- [ ] Token has `repo` scope
- [ ] Repository details correct in `route.ts`
- [ ] Dev server starts without errors
- [ ] Can access http://localhost:3000
- [ ] Dashboard loads
- [ ] Categories load
- [ ] Can click edit button
- [ ] Can save changes
- [ ] Images display correctly

---

## 📚 Additional Resources

**GitHub API:**
- Docs: https://docs.github.com/en/rest
- Status: https://www.githubstatus.com/

**Next.js:**
- Docs: https://nextjs.org/docs
- Troubleshooting: https://nextjs.org/docs/messages

**TypeScript:**
- Docs: https://www.typescriptlang.org/docs

**jsDelivr:**
- Docs: https://www.jsdelivr.com/documentation
- Purge cache: https://www.jsdelivr.com/tools/purge

---

## 🎯 Prevention Tips

1. **Always backup data** before major changes
2. **Test locally** before deploying
3. **Use version control** (Git)
4. **Keep dependencies updated** (`npm update`)
5. **Monitor GitHub rate limits**
6. **Rotate tokens** periodically
7. **Document custom changes**

---

**Most issues can be solved by:**
1. Restarting the dev server
2. Clearing browser cache
3. Checking the browser console
4. Verifying the GitHub token

**Happy coding! 🚀**
