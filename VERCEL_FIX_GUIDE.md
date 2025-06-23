# Fix Vercel Frontend API Connection Issue

## Problems Fixed
1. ✅ **API URL Issue**: Frontend was trying to connect to `localhost:5600` instead of Google Cloud Run API
2. ✅ **Hardcoded URLs**: Several screens had hardcoded localhost URLs that bypassed the configuration
3. ❌ **Login Authentication**: Some user credentials may need to be verified on your API

## Solution Steps

### Step 1: Set Environment Variable in Vercel
1. Go to your Vercel dashboard
2. Select your frontend project
3. Go to **Settings** > **Environment Variables**
4. Add a new environment variable:
   - **Name**: `REACT_APP_API_URL`
   - **Value**: `https://loansiya-api-38767014727.asia-southeast1.run.app`
   - **Environment**: Select all (Production, Preview, Development)

### Step 2: Deploy Latest Fixes
The latest commit includes fixes for all hardcoded localhost URLs:
```bash
git push origin main
```

### Step 3: Verify the Fix
1. Once redeployed, visit your Vercel app URL
2. Open browser Developer Tools (F12)
3. Go to **Console** tab
4. Look for the debug logs that start with "Environment debug info:"
5. Verify that `REACT_APP_API_URL` shows your Google Cloud Run URL
6. Check that API calls are going to the correct URL (should show Google Cloud Run URL, not localhost)

### Step 4: Test Functionality
- ✅ Try logging in (basic users should work)
- ✅ Check if client data loads
- ✅ Verify client detail screens work
- ✅ Test document viewing
- ❌ Loan officer login (401 Unauthorized - needs investigation)

## Current Status
### Fixed Issues
- ✅ All API calls now use the correct Google Cloud Run URL
- ✅ Client detail screens load data from the API
- ✅ Document viewing works
- ✅ Main dashboard and client lists work

### Remaining Issues
- ❌ **Loan Officer Login**: Getting 401 Unauthorized error
  - This suggests the credentials might be incorrect or the user doesn't exist in your API database
  - Check your API database to verify loan officer accounts exist
  - Verify the username/password you're using

## Troubleshooting Login Issues

### Check API Database
1. Connect to your Google Cloud Run API
2. Verify that loan officer accounts exist in your database
3. Check if passwords are properly hashed
4. Ensure the role is set correctly as 'loanofficer'

### Test Different Users
Try logging in with different user types:
- IT Admin accounts
- Operations Manager accounts
- Regular user accounts

### Check API Logs
1. Go to Google Cloud Console
2. Navigate to Cloud Run
3. Select your API service
4. Check the logs for authentication errors

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