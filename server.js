const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || 'werpeace2026';

// --- Database setup ---
const db = new Database(path.join(__dirname, 'data', 'auctions.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_slug TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    amount REAL NOT NULL,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS auction_status (
    slug TEXT PRIMARY KEY,
    status TEXT DEFAULT 'open',
    closed_at DATETIME
  );
`);

// --- Load seed data ---
const auctions = require('./data/auctions.json');
const siteContent = require('./data/site-content.json');
const auctionsBySlug = {};
auctions.forEach(a => { auctionsBySlug[a.slug] = a; });

// --- Middleware ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));

// Flash messages via query params
function getFlash(req) {
  return { success: req.query.success, error: req.query.error };
}

// --- Prepared statements ---
const stmts = {
  getHighestBid: db.prepare('SELECT * FROM bids WHERE auction_slug = ? ORDER BY amount DESC LIMIT 1'),
  getAllBids: db.prepare('SELECT * FROM bids WHERE auction_slug = ? ORDER BY amount DESC'),
  getBidCount: db.prepare('SELECT COUNT(*) as count FROM bids WHERE auction_slug = ?'),
  insertBid: db.prepare('INSERT INTO bids (auction_slug, name, email, amount, message) VALUES (?, ?, ?, ?, ?)'),
  getStatus: db.prepare('SELECT * FROM auction_status WHERE slug = ?'),
  upsertStatus: db.prepare('INSERT INTO auction_status (slug, status, closed_at) VALUES (?, ?, ?) ON CONFLICT(slug) DO UPDATE SET status = excluded.status, closed_at = excluded.closed_at'),
  allStatuses: db.prepare('SELECT * FROM auction_status'),
};

function getAuctionStatus(slug) {
  const row = stmts.getStatus.get(slug);
  return row ? row.status : 'open';
}

function enrichAuction(auction) {
  const highest = stmts.getHighestBid.get(auction.slug);
  const countRow = stmts.getBidCount.get(auction.slug);
  const status = getAuctionStatus(auction.slug);
  return {
    ...auction,
    currentBid: highest ? highest.amount : null,
    highestBidder: highest ? highest.name : null,
    bidCount: countRow.count,
    status,
  };
}

// --- Routes ---

// Homepage
app.get('/', (req, res) => {
  const enriched = auctions.map(enrichAuction);
  res.render('home', {
    auctions: enriched,
    blog: siteContent.blog,
    events: siteContent.events,
    about: siteContent.about,
  });
});

// About
app.get('/about', (req, res) => {
  res.render('about', { about: siteContent.about });
});

// Auction detail
app.get('/auction/:slug', (req, res) => {
  const auction = auctionsBySlug[req.params.slug];
  if (!auction) return res.status(404).send('Auction not found');

  const enriched = enrichAuction(auction);
  const bids = stmts.getAllBids.all(auction.slug);
  const flash = getFlash(req);

  res.render('auction', { auction: enriched, bids, flash });
});

// Bid API (JSON for AJAX refresh)
app.get('/api/auction/:slug/bids', (req, res) => {
  const auction = auctionsBySlug[req.params.slug];
  if (!auction) return res.status(404).json({ error: 'Not found' });

  const enriched = enrichAuction(auction);
  const bids = stmts.getAllBids.all(auction.slug);
  res.json({ auction: enriched, bids });
});

// Submit bid
app.post('/auction/:slug/bid', (req, res) => {
  const auction = auctionsBySlug[req.params.slug];
  if (!auction) return res.status(404).send('Auction not found');

  const { name, email, amount, message } = req.body;
  const redir = `/auction/${req.params.slug}`;

  // Validation
  if (!name || !name.trim()) {
    return res.redirect(`${redir}?error=${encodeURIComponent('Name is required')}`);
  }
  if (!email || !email.trim() || !email.includes('@')) {
    return res.redirect(`${redir}?error=${encodeURIComponent('Valid email is required')}`);
  }

  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount <= 0) {
    return res.redirect(`${redir}?error=${encodeURIComponent('Bid amount must be a positive number')}`);
  }

  // Check auction not closed
  if (getAuctionStatus(req.params.slug) === 'closed') {
    return res.redirect(`${redir}?error=${encodeURIComponent('This auction has been closed')}`);
  }

  // Check bid exceeds current highest
  const highest = stmts.getHighestBid.get(req.params.slug);
  const minBid = highest ? highest.amount : auction.startingBid;
  if (numAmount <= minBid) {
    return res.redirect(`${redir}?error=${encodeURIComponent(`Bid must be higher than $${minBid.toFixed(2)}`)}`);
  }

  // Insert bid
  stmts.insertBid.run(req.params.slug, name.trim(), email.trim(), numAmount, (message || '').trim() || null);

  return res.redirect(`${redir}?success=${encodeURIComponent('Your bid has been placed!')}`);
});

// Admin panel
app.get('/admin', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) {
    return res.status(401).send('Unauthorized. Append ?pass=YOUR_PASSWORD to access admin.');
  }
  const enriched = auctions.map(enrichAuction);
  res.render('admin', { auctions: enriched, pass: ADMIN_PASS });
});

// Close auction
app.post('/admin/close/:slug', (req, res) => {
  if (req.body.pass !== ADMIN_PASS) {
    return res.status(401).send('Unauthorized');
  }
  stmts.upsertStatus.run(req.params.slug, 'closed', new Date().toISOString());
  res.redirect(`/admin?pass=${ADMIN_PASS}`);
});

// Reopen auction
app.post('/admin/reopen/:slug', (req, res) => {
  if (req.body.pass !== ADMIN_PASS) {
    return res.status(401).send('Unauthorized');
  }
  stmts.upsertStatus.run(req.params.slug, 'open', null);
  res.redirect(`/admin?pass=${ADMIN_PASS}`);
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`WeRPeace auction site running at http://localhost:${PORT}`);
});
