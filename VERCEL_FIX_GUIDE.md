# Fix Vercel Frontend API Connection Issue

## Problem
Your frontend is deployed on Vercel but is still trying to connect to `localhost:5600` instead of your Google Cloud Run API at `https://loansiya-api-38767014727.asia-southeast1.run.app`.

## Solution Steps

### Step 1: Set Environment Variable in Vercel
1. Go to your Vercel dashboard
2. Select your frontend project
3. Go to **Settings** > **Environment Variables**
4. Add a new environment variable:
   - **Name**: `REACT_APP_API_URL`
   - **Value**: `https://loansiya-api-38767014727.asia-southeast1.run.app`
   - **Environment**: Select all (Production, Preview, Development)

### Step 2: Rebuild and Deploy
After setting the environment variable, you need to trigger a new deployment:

#### Option A: Push a commit to trigger auto-deployment
```bash
git add .
git commit -m "Fix API URL configuration for production"
git push origin main
```

#### Option B: Manual redeploy in Vercel
1. Go to your Vercel project dashboard
2. Go to **Deployments** tab
3. Click the three dots (...) on your latest deployment
4. Click **Redeploy**

### Step 3: Verify the Fix
1. Once redeployed, visit your Vercel app URL
2. Open browser Developer Tools (F12)
3. Go to **Console** tab
4. Look for the debug logs that start with "Environment debug info:"
5. Verify that `REACT_APP_API_URL` shows your Google Cloud Run URL
6. Check that API calls are going to the correct URL

### Step 4: Test Functionality
- Try logging in
- Check if client data loads
- Verify notifications work
- Test user management features

## Alternative: Quick Fix by Updating app.json (if Vercel env vars don't work)

If the environment variable approach doesn't work, we can hardcode it temporarily:

```bash
# Edit app.json to ensure the URL is correct
# The extra.REACT_APP_API_URL should be your Google Cloud Run URL
```

## Debug Information
The updated code now includes debug logging. Check your browser console to see:
- What environment variables are available
- Which API URL is being selected
- Whether the app is in production mode

## Common Issues and Solutions

### Issue: Environment variable not working
**Solution**: Make sure the variable name is exactly `REACT_APP_API_URL` (case sensitive)

### Issue: Still showing localhost
**Solution**: Clear browser cache and hard refresh (Ctrl+Shift+R)

### Issue: CORS errors after fixing URL
**Solution**: Ensure your Google Cloud Run API has CORS configured for your Vercel domain

### Issue: API calls timing out
**Solution**: Check if your Google Cloud Run service is running and accessible

## Test Commands (for local debugging)
```bash
# Test locally with the environment variable
REACT_APP_API_URL=https://loansiya-api-38767014727.asia-southeast1.run.app npm run web

# Build and test production build locally
npm run build
npx serve web-build
```

## Verification Checklist
- [ ] Environment variable set in Vercel
- [ ] New deployment triggered
- [ ] Browser console shows correct API URL
- [ ] API calls go to Google Cloud Run (not localhost)
- [ ] Login works
- [ ] Data loads successfully
- [ ] No CORS errors in console