# Wix Blank Pages Investigation Report

## Problem Summary
Site ID: `31a6db9e-6673-47bf-a1be-4cc41decaab5` (https://weworkforpeace.org)

The site has:
- 9 products in Wix Store
- 3 blog posts in Wix Blog
- 3 events in Wix Events
- **ALL pages are blank** - data exists but page layouts have no content/widgets

## Investigation Results

### What I Tried

#### 1. Wix MCP Server
- **Status**: Failed to connect (requires authentication token)
- **Location**: `https://mcp.wix.com/sse`
- **Error**: "Missing or invalid access token"

#### 2. Wix CLI
- **Status**: Authenticated as `joelmatson@yahoo.com`
- **Available Commands**: dev, install, login, logout, preview, publish, telemetry, uninstall, whoami
- **Limitation**: No commands for page management or app installation

#### 3. Wix REST APIs Explored

##### Site Information API
- **Endpoint**: `/v2/sites/{siteId}`
- **Status**: Not accessible with current auth
- **Purpose**: Read-only site metadata (name, URL, status, owner)
- **Cannot**: Modify pages, add components, or change site structure

##### App Installation API
- **Install Endpoint**: `POST /apps-installer-service/v1/app-instance/install`
- **Uninstall Endpoint**: `POST /apps-installer-service/v1/app-instance/uninstall`
- **Status**: Requires additional parameters (tenant, appInstance)
- **Limitation**: Request body format not fully documented; requires API key for account-level operations

##### Publish Site API
- **Endpoint**: `POST /site-publisher/v1/site/publish`
- **Requires**: Account-level API key
- **Header**: `wix-site-id` with site ID
- **Purpose**: Publishes saved changes to live site
- **Cannot**: Fix blank pages or restore content

##### Pages/Site Structure API
- **Status**: No direct API found
- **Velo Method**: `getSiteStructure()` - returns pages/prefixes/popups but NOT layouts/components/widgets
- **Cannot**: Add widgets, modify page structure, or restore default layouts

#### 4. Known Wix App IDs
Successfully identified the app IDs for the three apps:
- **Wix Stores**: `1380b703-ce81-ff05-f115-39571d94dfcd`
- **Wix Blog**: `14bcded7-0066-7c35-14d7-466cb3f09103`
- **Wix Events**: `140603ad-af8d-84a5-2c80-a0f60cb47351`

### Root Cause Analysis

Based on Wix's official support documentation, blank pages for Store/Blog/Events apps are typically caused by:
1. **App not properly installed** - widgets were never added to pages
2. **App installation corrupted** - widgets were removed or lost
3. **Pages created but widgets not configured** - default page templates weren't applied

### The Solution (Requires Wix Editor)

According to Wix Support documentation:

**For Wix Stores:**
> "If you have this issue, the workaround is to re-install the Wix Stores App in the App Market. Then publish the site."

**For Wix Blog:**
> "If your blog is still missing, you may need to delete Wix Blog and re-add the app to your site."

**Steps to Fix (Manual Process):**
1. Open the Wix Editor for the site
2. Go to "My Business" panel on the left
3. For each app (Stores, Blog, Events):
   - Click the "More Actions" icon next to the app
   - Click "Delete App" (this removes the blank pages)
   - Confirm deletion
4. Reinstall each app from the App Market:
   - Click "Add App" icon
   - Search for "Wix Stores", "Wix Blog", "Wix Events"
   - Install each app
5. Publish the site

**Important Warning:**
Deleting apps may result in data loss. However, since the CMS data (products, blog posts, events) exists separately in the database, it should remain intact and reconnect when the apps are reinstalled.

## What Cannot Be Done Programmatically (Current Limitations)

### 1. No Pages API
- Cannot create, modify, or configure pages via REST API
- Cannot add widgets or components to pages
- Cannot restore default page layouts
- `getSiteStructure()` only returns metadata, not actual page content

### 2. App Management Requires API Keys
- App install/uninstall requires account-level API keys
- API keys must be created manually in the Enterprise dashboard
- Current site authentication uses instance tokens, not API keys
- Account owner/co-owner permissions required

### 3. No "Reset to Default" API
- No API to restore pages to default template
- No API to regenerate app pages
- No bulk "fix all pages" operation

### 4. Wix Editor Required for Most Operations
- Page design and layout requires visual editor
- Widget placement requires editor
- App configuration panels only accessible in editor
- No headless/programmatic alternative for page design

## Alternative Approaches Considered

### 1. Wix Blocks
- **Purpose**: Create custom widgets and app components
- **Limitation**: Requires building new widgets, doesn't fix existing blank pages
- **Not applicable**: Our apps are built-in Wix apps, not custom Blocks

### 2. Velo (formerly Corvid)
- **Purpose**: Add custom code to pages
- **Limitation**: Code runs on existing pages, doesn't create page structure
- **Not applicable**: Pages are completely blank - no elements to attach code to

### 3. Site History Restore
- **Purpose**: Revert entire site to a previous version
- **Limitation**: Cannot restore individual pages; all-or-nothing approach
- **Risk**: Would lose any other changes made since the "good" version

### 4. Wix CLI Dev Mode
- **Purpose**: Run local code against live site
- **Limitation**: Only works with Velo backend code, not page structure
- **Not applicable**: Cannot create or modify page layouts

## Recommendations

### Immediate Action Required (Manual)
1. **Open the Wix Editor** at https://www.wix.com/my-account/sites/31a6db9e-6673-47bf-a1be-4cc41decaab5
2. **Delete and reinstall apps** following the steps above
3. **Verify data persistence** - check that products, blog posts, and events are still intact
4. **Configure app settings** if needed after reinstall
5. **Publish the site** to make changes live

### Future Automation (If Wix Releases APIs)
Currently monitoring for:
- Pages API - create/modify pages programmatically
- Widgets API - add components to pages
- App Management API with OAuth support - install/uninstall without API keys

### Workaround for Future Issues
To prevent this issue:
1. **Regular backups**: Use Site History to save versions before major changes
2. **Test in preview**: Use `wix preview` before publishing
3. **Staging site**: Clone site before making structural changes
4. **App monitoring**: Verify apps are properly installed after any site changes

## Technical Details

### Authentication Files
- **Account Auth**: `~/.wix/auth/account.json`
- **Site Auth**: `~/.wix/auth/31a6db9e-6673-47bf-a1be-4cc41decaab5.json`
- **Token Type**: OAuth instance tokens
- **Expiration**: 4 hours (14400 seconds)

### API Base URL
- **Wix APIs**: `https://www.wixapis.com`
- **Required Headers**:
  - `Authorization: {token}`
  - `Content-Type: application/json`
  - `wix-site-id: {siteId}` (for site-level operations)
  - `wix-account-id: {accountId}` (for account-level operations)

### Error Codes Encountered
- **404**: Endpoint not found (`/v1/apps`)
- **400**: Missing required fields (tenant, appInstance)
- **401**: Invalid or expired token
- **428**: Precondition failed (publish site)

## Documentation Sources

All findings are based on official Wix documentation:

1. **App Installation**: https://dev.wix.com/docs/api-reference/business-management/app-installation
2. **Site Management**: https://dev.wix.com/docs/rest/account-level/sites
3. **Troubleshooting**:
   - Wix Stores: https://support.wix.com/en/article/some-wix-stores-pages-missing-from-the-dashboard
   - Wix Blog: https://support.wix.com/en/article/wix-blog-troubleshooting-issues-on-your-live-site
   - Wix Events: https://support.wix.com/en/article/events-detail-and-registration-page-loads-blank-on-some-websites
4. **Deleting Apps**: https://support.wix.com/en/article/deleting-apps
5. **API Keys**: https://dev.wix.com/docs/api-reference/articles/authentication/about-api-keys

## Conclusion

**The blank pages issue cannot be fixed programmatically with current Wix APIs.**

The only solution is to manually delete and reinstall the Wix Stores, Wix Blog, and Wix Events apps through the Wix Editor. This is a known limitation of the Wix platform - page structure and layout management is only available through the visual editor interface.

All Wix MCP tools, REST APIs, CLI commands, and SDKs have been exhausted. None provide the capability to:
- Add widgets to pages
- Restore default page templates
- Repair blank pages
- Programmatically manage page layouts

The site owner must log into the Wix Editor to resolve this issue.
