// Setup script: creates CMS collections and seeds data via Wix REST API
const fs = require('fs');
const path = require('path');

const SITE_ID = '31a6db9e-6673-47bf-a1be-4cc41decaab5';
const AUTH_FILE = path.join(process.env.HOME, '.wix/auth', `${SITE_ID}.json`);

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

  if (!res.ok) {
    console.error(`ERROR ${res.status} ${method} ${endpoint}:`, JSON.stringify(data, null, 2));
    return null;
  }
  return data;
}

// --- Step 1: Create collections ---
async function createCollections() {
  console.log('\n=== Creating Auctions collection ===');
  const auctions = await wixApi('POST', '/wix-data/v2/collections', {
    collection: {
      id: 'Auctions',
      displayName: 'Auctions',
      fields: [
        { key: 'title', displayName: 'Title', type: 'TEXT' },
        { key: 'slug', displayName: 'Slug', type: 'TEXT' },
        { key: 'description', displayName: 'Description', type: 'TEXT' },
        { key: 'startingBid', displayName: 'Starting Bid', type: 'NUMBER' },
        { key: 'image', displayName: 'Image URL', type: 'TEXT' },
        { key: 'category', displayName: 'Category', type: 'TEXT' },
        { key: 'status', displayName: 'Status', type: 'TEXT' },
      ],
      permissions: {
        insert: 'ADMIN',
        update: 'ADMIN',
        remove: 'ADMIN',
        read: 'ANYONE',
      },
    },
  });
  if (auctions) console.log('  Created Auctions collection');

  console.log('\n=== Creating Bids collection ===');
  const bids = await wixApi('POST', '/wix-data/v2/collections', {
    collection: {
      id: 'Bids',
      displayName: 'Bids',
      fields: [
        { key: 'auctionSlug', displayName: 'Auction Slug', type: 'TEXT' },
        { key: 'bidderName', displayName: 'Bidder Name', type: 'TEXT' },
        { key: 'bidderEmail', displayName: 'Bidder Email', type: 'TEXT' },
        { key: 'amount', displayName: 'Amount', type: 'NUMBER' },
        { key: 'message', displayName: 'Message', type: 'TEXT' },
      ],
      permissions: {
        insert: 'ANYONE',
        update: 'ADMIN',
        remove: 'ADMIN',
        read: 'ANYONE',
      },
    },
  });
  if (bids) console.log('  Created Bids collection');
}

// --- Step 2: Seed auction items ---
async function seedAuctions() {
  console.log('\n=== Seeding auction items ===');
  const items = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'auctions.json'), 'utf8'));

  for (const item of items) {
    const res = await wixApi('POST', '/wix-data/v2/items', {
      dataCollectionId: 'Auctions',
      dataItem: {
        data: {
          title: item.title,
          slug: item.slug,
          description: item.description,
          startingBid: item.startingBid,
          image: item.image,
          category: item.category,
          status: 'open',
        },
      },
    });
    if (res) {
      console.log(`  Inserted: ${item.title}`);
    }
  }
}

// --- Main ---
async function main() {
  console.log('Setting up Wix CMS for WeRPeace Auctions...\n');

  await createCollections();
  await seedAuctions();

  console.log('\n=== Done! ===');
  console.log('Collections created and data seeded.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
