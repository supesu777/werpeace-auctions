// Script to reinstall Wix Stores, Blog, and Events apps to restore default pages
const fs = require('fs');
const path = require('path');

const SITE_ID = '31a6db9e-6673-47bf-a1be-4cc41decaab5';
const AUTH_FILE = path.join(process.env.HOME, '.wix/auth', `${SITE_ID}.json`);

// Known Wix app IDs
const APPS = {
  'Wix Stores': '1380b703-ce81-ff05-f115-39571d94dfcd',
  'Wix Blog': '14bcded7-0066-7c35-14d7-466cb3f09103',
  'Wix Events': '140603ad-af8d-84a5-2c80-a0f60cb47351',
};

function getToken() {
  const auth = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  return auth.accessToken;
}

async function wixApi(method, endpoint, body) {
  const token = getToken();
  const opts = {
    method,
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json',
      'wix-site-id': SITE_ID,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`https://www.wixapis.com${endpoint}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  console.log(`${method} ${endpoint} -> ${res.status}`);
  if (!res.ok) {
    console.error(`ERROR: ${JSON.stringify(data, null, 2)}`);
    return null;
  }
  return data;
}

async function checkInstalledApps() {
  console.log('\n=== Checking installed apps ===');
  const result = await wixApi('GET', '/v1/apps', null);
  if (result) {
    console.log('Installed apps:', JSON.stringify(result, null, 2));
  }
  return result;
}

async function installApp(appName, appId) {
  console.log(`\n=== Installing ${appName} (${appId}) ===`);

  // Try the install endpoint
  const result = await wixApi('POST', '/apps-installer-service/v1/app-instance/install', {
    appDefId: appId,
  });

  if (result) {
    console.log(`✓ ${appName} installed successfully`);
    return result;
  } else {
    console.log(`✗ Failed to install ${appName}`);
    return null;
  }
}

async function main() {
  console.log('Attempting to reinstall Wix apps to fix blank pages...\n');
  console.log('Site ID:', SITE_ID);

  // Check what's currently installed
  await checkInstalledApps();

  // Try to install each app
  for (const [appName, appId] of Object.entries(APPS)) {
    await installApp(appName, appId);
  }

  console.log('\n=== Done! ===');
  console.log('If apps were installed successfully, the default pages should now have content.');
  console.log('Visit your site at https://weworkforpeace.org to verify.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
