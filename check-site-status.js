// Check current site status - what apps are installed, what data exists
const fs = require('fs');
const path = require('path');

const SITE_ID = '31a6db9e-6673-47bf-a1be-4cc41decaab5';
const AUTH_FILE = path.join(process.env.HOME, '.wix/auth', `${SITE_ID}.json`);

function getToken() {
  const auth = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  return auth.accessToken;
}

async function wixApi(method, endpoint, body = null) {
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

  const url = `https://www.wixapis.com${endpoint}`;
  console.log(`\n${method} ${url}`);

  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  console.log(`Status: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    console.log('Error:', JSON.stringify(data, null, 2));
    return null;
  }

  console.log('Response:', JSON.stringify(data, null, 2));
  return data;
}

async function main() {
  console.log('='.repeat(80));
  console.log('WIX SITE STATUS CHECK');
  console.log('='.repeat(80));
  console.log('Site ID:', SITE_ID);
  console.log('Site URL: https://weworkforpeace.org');

  // Try various endpoints to see what data we can access
  const endpoints = [
    // Store endpoints
    ['GET', '/stores/v1/products'],
    ['POST', '/stores/v1/products/query', { query: {} }],

    // Blog endpoints
    ['GET', '/blog/v3/posts'],
    ['POST', '/blog/v3/posts/query', { query: {} }],

    // Events endpoints
    ['GET', '/events/v1/events'],
    ['POST', '/events/v1/events/query', { query: {} }],

    // Site info
    ['GET', '/v1/sites/' + SITE_ID],
    ['GET', '/v2/sites/' + SITE_ID],

    // App instances
    ['GET', '/v1/app-instances'],
    ['GET', '/apps/v1/app-instances'],

    // Site structure
    ['GET', '/v1/site-structure'],
    ['GET', '/v1/pages'],
  ];

  for (const [method, endpoint, body] of endpoints) {
    await wixApi(method, endpoint, body);
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(80));
  console.log('STATUS CHECK COMPLETE');
  console.log('='.repeat(80));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
