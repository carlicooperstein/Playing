# Railway Deployment Debug Checklist

## Common Issues and Solutions

### 1. Check Railway Logs for These Errors:

#### Error: "Cannot find module 'next'"
**Solution:** Build command issue
- Ensure `pnpm install` runs before `pnpm build`

#### Error: "EADDRINUSE: address already in use"
**Solution:** Port binding issue
- The app is trying to use a port that's already taken

#### Error: "Error: listen EACCES: permission denied 0.0.0.0:80"
**Solution:** Wrong port
- Railway provides PORT env variable (usually not 80)

#### Error: "Module not found" errors during build
**Solution:** Missing dependencies
- Check if all dependencies are in package.json

#### Error: "next: command not found"
**Solution:** Next.js not installed properly
- Ensure next is in dependencies, not devDependencies

### 2. Environment Variables to Check in Railway:

```env
# Required
NODE_ENV=production
PORT=(Railway sets this automatically, don't override)

# Spotify
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=42dd5db55516412289ecf834c0a89fc9
SPOTIFY_CLIENT_SECRET=64f497977a8c49249378acfc423bc4bd
NEXT_PUBLIC_REDIRECT_URI=https://playing-production-7747.up.railway.app/api/spotify/callback
NEXT_PUBLIC_SOCKET_URL=https://playing-production-7747.up.railway.app
```

### 3. Build & Deploy Logs to Look For:

✅ **Successful build should show:**
- "Installing dependencies"
- "Building application"
- "Build successful"
- "Starting server"
- "Server listening on port XXXX"

❌ **Failed deployment indicators:**
- "Build failed"
- "npm ERR!" or "pnpm ERR!"
- "Error:" messages
- "Cannot find module"
- Process exits with non-zero code

### 4. Quick Fixes to Try:

1. **Remove node_modules locally and push:**
   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   git add pnpm-lock.yaml
   git commit -m "Regenerate lock file"
   git push
   ```

2. **Simplify start command:**
   In package.json, temporarily change to:
   ```json
   "start": "next start"
   ```

3. **Add explicit Node version:**
   Create `.nvmrc` with:
   ```
   18.17.0
   ```

### 5. Test Locally with Production Build:

```bash
# Build locally like Railway would
pnpm build

# Test production server
PORT=8080 NODE_ENV=production pnpm start

# Visit http://localhost:8080
```

### 6. What to Share for Help:

Please share:
1. The last 50 lines of Railway deploy logs
2. Any error messages in red
3. The "Build Command" and "Start Command" shown in Railway
4. Whether the build succeeds but runtime fails, or if build itself fails
