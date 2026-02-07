// Auto-refresh bids on auction detail pages
(function() {
  var slug = window.__auctionSlug;
  if (!slug) return;

  var REFRESH_INTERVAL = 15000; // 15 seconds

  function formatTime(dateStr) {
    var d = new Date(dateStr + 'Z');
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }

  function updateBids() {
    fetch('/api/auction/' + slug + '/bids')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        // Update current bid display
        var auction = data.auction;
        var bidAmountEl = document.querySelector('.bid-amount-large');
        var bidLabelEl = document.querySelector('.bid-amount-label');
        var bidCountEl = document.querySelector('.bid-count-detail');

        if (bidAmountEl && auction.currentBid) {
          bidAmountEl.textContent = '$' + auction.currentBid.toFixed(2);
          if (bidLabelEl) bidLabelEl.textContent = 'Current highest bid';
        }
        if (bidCountEl) {
          bidCountEl.textContent = auction.bidCount + ' bid' + (auction.bidCount !== 1 ? 's' : '') + ' placed';
        }

        // Update min bid on form
        var amountInput = document.getElementById('amount');
        if (amountInput && auction.currentBid) {
          var newMin = (auction.currentBid + 0.01).toFixed(2);
          amountInput.setAttribute('min', newMin);
          amountInput.setAttribute('placeholder', (auction.currentBid + 1).toFixed(2));
        }

        // Update bid table
        var bids = data.bids;
        if (bids.length === 0) return;

        var historyEl = document.getElementById('bidHistory');
        if (!historyEl) {
          // Create bid history section if it doesn't exist yet
          var section = document.querySelector('.auction-detail .container');
          var div = document.createElement('div');
          div.id = 'bidHistory';
          div.className = 'bid-history';
          div.innerHTML = '<h2>Bid History</h2><table class="bid-table"><thead><tr><th>#</th><th>Bidder</th><th>Amount</th><th>Message</th><th>Time</th></tr></thead><tbody></tbody></table>';
          section.appendChild(div);
          historyEl = div;
        }

        var tbody = historyEl.querySelector('tbody');
        if (!tbody) return;

        var html = '';
        bids.forEach(function(bid, i) {
          html += '<tr class="' + (i === 0 ? 'top-bid' : '') + '">';
          html += '<td>' + (i + 1) + '</td>';
          html += '<td>' + escapeHtml(bid.name) + '</td>';
          html += '<td class="bid-amt">$' + bid.amount.toFixed(2) + '</td>';
          html += '<td class="bid-msg">' + (bid.message ? escapeHtml(bid.message) : '—') + '</td>';
          html += '<td class="bid-time">' + formatTime(bid.created_at) + '</td>';
          html += '</tr>';
        });
        tbody.innerHTML = html;

        // Update form note
        var note = document.querySelector('.form-note');
        if (note && auction.currentBid) {
          note.textContent = 'Minimum bid: $' + (auction.currentBid + 0.01).toFixed(2);
        }

        // If auction was closed, reload page to show sold banner
        if (auction.status === 'closed') {
          window.location.reload();
        }
      })
      .catch(function() { /* silent fail on network error */ });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Client-side form validation
  var form = document.getElementById('bidForm');
  if (form) {
    form.addEventListener('submit', function(e) {
      var amount = parseFloat(document.getElementById('amount').value);
      var min = parseFloat(document.getElementById('amount').getAttribute('min'));
      if (amount < min) {
        e.preventDefault();
        alert('Your bid must be at least $' + min.toFixed(2));
      }
    });
  }

  setInterval(updateBids, REFRESH_INTERVAL);
})();
