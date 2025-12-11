import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NameCard · Secure Scan Dashboard</title>
  <style>
    body { margin:0; padding:1.5rem; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f7eee7; }
    .page { max-width: 960px; margin: 0 auto; }
    h1 { font-size:1.6rem; margin:0 0 0.5rem 0; color:#333; }
    .brand { font-weight:600; letter-spacing:0.12em; font-size:0.8rem; color:#b66b4d; text-transform:uppercase; margin-bottom:0.75rem; }
    .section { margin-bottom:1.25rem; padding:1rem 1.1rem; background:#fff; border-radius:16px; box-shadow:0 10px 26px rgba(0,0,0,0.05); }
    label { display:block; font-size:0.8rem; color:#444; margin-bottom:0.4rem; }
    input[type="email"], input[type="password"] { width:100%; padding:0.45rem 0.55rem; border-radius:10px; border:1px solid #d9bca5; font-size:0.9rem; }
    .btn { display:inline-flex; align-items:center; justify-content:center; padding:0.45rem 1.1rem; border-radius:999px; font-size:0.85rem; border:1px solid #b66b4d; color:#b66b4d; background:#fff; text-decoration:none; cursor:pointer; }
    .btn:hover { background:#f1e0d4; }
    .btn[disabled] { opacity:0.6; cursor:default; }
    .status { font-size:0.8rem; margin-top:0.4rem; min-height:1.2em; }
    .status.error { color:#b00020; }
    .status.ok { color:#2f7a39; }
    table { width:100%; border-collapse:collapse; font-size:0.85rem; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 12px 30px rgba(0,0,0,0.06); }
    thead { background:#f1e0d4; }
    th, td { padding:0.55rem 0.7rem; text-align:left; }
    th { font-weight:600; color:#444; }
    tbody tr:nth-child(even) { background:#faf5f0; }
    tbody tr:hover { background:#f3e7dd; }
    .muted { font-size:0.8rem; color:#777; }
    .stats-row { display:flex; flex-wrap:wrap; gap:0.6rem; margin:0.4rem 0 0.8rem 0; }
    .stat-pill { padding:0.3rem 0.7rem; border-radius:999px; font-size:0.78rem; background:#f1e0d4; color:#5b3b2a; }
  </style>
</head>
<body>
  <main class="page">
    <div class="brand">Cœur Du Ciel · Digital NameCard</div>
    <h1>Secure Scan Dashboard</h1>
    <p class="muted">Sign in with your admin account to view scans using the protected API.</p>

    <section class="section" id="login-section">
      <h2 style="font-size:1rem; margin:0 0 0.6rem 0; color:#333;">Admin sign in</h2>
      <div style="display:grid; grid-template-columns:1fr; gap:0.6rem; max-width:360px;">
        <div>
          <label for="email">Email</label>
          <input type="email" id="email" autocomplete="username" />
        </div>
        <div>
          <label for="password">Password</label>
          <input type="password" id="password" autocomplete="current-password" />
        </div>
        <div>
          <button id="loginBtn" class="btn">Sign in</button>
        </div>
        <div id="loginStatus" class="status"></div>
      </div>
      <p class="muted" style="margin-top:0.6rem;">Current test account: the same email and password you use for the API tests.</p>
    </section>

    <section class="section" id="scans-section" style="display:none;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:0.75rem; margin-bottom:0.5rem; flex-wrap:wrap;">
        <div>
          <h2 style="font-size:1rem; margin:0 0 0.25rem 0; color:#333;">Recent scans (secure)</h2>
          <p id="userInfo" class="muted" style="margin:0;"></p>
        </div>
        <div style="display:flex; gap:0.4rem;">
          <button id="refreshBtn" class="btn">Refresh</button>
          <button id="signOutBtn" class="btn" style="border-color:#aa3d3d; color:#aa3d3d;">Sign out</button>
        </div>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:0.6rem; margin-bottom:0.6rem; align-items:flex-end;">
        <div>
          <label for="filterText">Search</label>
          <input id="filterText" type="text" placeholder="Name, company, email..." style="width:210px; padding:0.35rem 0.55rem; border-radius:999px; border:1px solid #d9bca5; font-size:0.8rem;" />
        </div>
        <div>
          <label for="filterSource">Source</label>
          <select id="filterSource" style="width:130px; padding:0.35rem 0.55rem; border-radius:999px; border:1px solid #d9bca5; font-size:0.8rem; background:#fff;">
            <option value="">All</option>
            <option value="public">public</option>
            <option value="qr">qr</option>
            <option value="direct">direct</option>
          </select>
        </div>
        <div>
          <label for="filterFrom">From</label>
          <input id="filterFrom" type="date" style="padding:0.3rem 0.55rem; border-radius:999px; border:1px solid #d9bca5; font-size:0.8rem;" />
        </div>
        <div>
          <label for="filterTo">To</label>
          <input id="filterTo" type="date" style="padding:0.3rem 0.55rem; border-radius:999px; border:1px solid #d9bca5; font-size:0.8rem;" />
        </div>
      </div>
      <div id="statsRow" class="stats-row" style="display:none;"></div>
      <div id="scansTableWrapper">
        <p class="muted">No data loaded yet.</p>
      </div>
    </section>
  </main>

  <script>
    (function() {
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const loginBtn = document.getElementById('loginBtn');
      const loginStatus = document.getElementById('loginStatus');
      const scansSection = document.getElementById('scans-section');
      const loginSection = document.getElementById('login-section');
      const scansTableWrapper = document.getElementById('scansTableWrapper');
      const userInfo = document.getElementById('userInfo');
      const refreshBtn = document.getElementById('refreshBtn');
      const signOutBtn = document.getElementById('signOutBtn');
      const statsRow = document.getElementById('statsRow');
      const filterText = document.getElementById('filterText');
      const filterSource = document.getElementById('filterSource');
      const filterFrom = document.getElementById('filterFrom');
      const filterTo = document.getElementById('filterTo');

      let authToken = null;
      let allScans = [];

      function setStatus(message, type) {
        loginStatus.textContent = message || '';
        loginStatus.className = 'status' + (type ? ' ' + type : '');
      }

      function renderScans(scans) {
        // Update stats first
        if (!scans || !scans.length) {
          scansTableWrapper.innerHTML = '<p class="muted">No scans found yet.</p>';
          if (statsRow) {
            statsRow.style.display = 'none';
            statsRow.innerHTML = '';
          }
          return;
        }

        var totalScans = scans.length;
        var cardIds = {};
        var now = new Date();
        var sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        var last7Days = 0;

        scans.forEach(function(row) {
          if (row.card_id != null) {
            cardIds[row.card_id] = true;
          }
          if (row.created_at) {
            var dt = new Date(row.created_at);
            if (!isNaN(dt.getTime()) && dt >= sevenDaysAgo) {
              last7Days += 1;
            }
          }
        });

        var uniqueCards = Object.keys(cardIds).length;

        if (statsRow) {
          statsRow.style.display = 'flex';
          statsRow.innerHTML = '' +
            '<div class="stat-pill">Total scans: ' + totalScans + '</div>' +
            '<div class="stat-pill">Unique cards: ' + uniqueCards + '</div>' +
            '<div class="stat-pill">Last 7 days: ' + last7Days + '</div>';
        }

        var header = '' +
          '<table>' +
            '<thead>' +
              '<tr>' +
                '<th>ID</th>' +
                '<th>When</th>' +
                '<th>Source</th>' +
                '<th>Name</th>' +
                '<th>Company</th>' +
                '<th>Email</th>' +
                '<th>Mobile</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>';

        const rows = scans.map(function(row) {
          function esc(v) {
            const s = (v == null ? '' : String(v));
            return s
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
          }

          return '<tr>' +
            '<td>' + esc(row.id) + '</td>' +
            '<td>' + esc(row.created_at) + '</td>' +
            '<td>' + esc(row.source) + '</td>' +
            '<td>' + esc(row.first_name) + ' ' + esc(row.last_name) + '</td>' +
            '<td>' + esc(row.company) + '</td>' +
            '<td>' + esc(row.email) + '</td>' +
            '<td>' + esc(row.mobile) + '</td>' +
            '</tr>';
        }).join('');

        const footer = '</tbody></table>';
        scansTableWrapper.innerHTML = header + rows + footer;
      }

      function applyFilters() {
        var scans = allScans || [];
        if (!scans.length) {
          renderScans([]);
          return;
        }

        var text = (filterText && filterText.value || '').toLowerCase().trim();
        var source = filterSource && filterSource.value || '';
        var fromVal = filterFrom && filterFrom.value || '';
        var toVal = filterTo && filterTo.value || '';

        var fromDate = fromVal ? new Date(fromVal + 'T00:00:00') : null;
        var toDate = toVal ? new Date(toVal + 'T23:59:59') : null;

        var filtered = scans.filter(function(row) {
          // Text filter on name, company, email, mobile
          if (text) {
            var hay = (
              (row.first_name || '') + ' ' +
              (row.last_name || '') + ' ' +
              (row.company || '') + ' ' +
              (row.email || '') + ' ' +
              (row.mobile || '')
            ).toLowerCase();
            if (hay.indexOf(text) === -1) {
              return false;
            }
          }

          // Source filter
          if (source && row.source !== source) {
            return false;
          }

          // Date range filter on created_at
          if ((fromDate || toDate) && row.created_at) {
            var dt = new Date(row.created_at);
            if (!isNaN(dt.getTime())) {
              if (fromDate && dt < fromDate) {
                return false;
              }
              if (toDate && dt > toDate) {
                return false;
              }
            }
          }

          return true;
        });

        renderScans(filtered);
      }

      function fetchScans() {
        if (!authToken) return;
        refreshBtn.disabled = true;
        fetch('/api/secure-scans', {
          headers: {
            'x-auth-token': authToken
          }
        })
          .then(function(resp) {
            var status = resp.status;
            return resp.json().then(function(data) {
              return { status: status, data: data };
            });
          })
          .then(function(result) {
            refreshBtn.disabled = false;
            var data = result && result.data;

            if (!data || !data.success) {
              allScans = [];

              // Specific message for non-admin roles
              if (data && data.code === 'forbidden') {
                scansTableWrapper.innerHTML = '<p class="muted">You are signed in, but this secure dashboard is reserved for admin users. Please contact your administrator if you need access.</p>';
              } else {
                scansTableWrapper.innerHTML = '<p class="muted">Failed to load scans.</p>';
              }

              if (statsRow) {
                statsRow.style.display = 'none';
                statsRow.innerHTML = '';
              }
              return;
            }

            allScans = data.scans || [];
            applyFilters();
          })
          .catch(function(err) {
            console.error('Error loading secure scans:', err);
            refreshBtn.disabled = false;
            scansTableWrapper.innerHTML = '<p class="muted">Error loading scans.</p>';
          });
      }

      loginBtn.addEventListener('click', function() {
        const email = (emailInput.value || '').trim();
        const password = passwordInput.value || '';
        if (!email || !password) {
          setStatus('Please enter email and password.', 'error');
          return;
        }
        loginBtn.disabled = true;
        setStatus('Signing in…', '');

        fetch('/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: email, password: password })
        })
          .then(function(resp) { return resp.json(); })
          .then(function(data) {
            loginBtn.disabled = false;
            if (!data || !data.success) {
              setStatus((data && data.message) || 'Login failed.', 'error');
              return;
            }
            authToken = data.token;
            setStatus('Signed in.', 'ok');
            loginSection.style.display = 'none';
            scansSection.style.display = 'block';
            if (data.user) {
              userInfo.textContent = 'Signed in as ' + (data.user.displayName || data.user.email || 'user') + ' (' + (data.user.role || 'role') + ')';
            }
            fetchScans();
          })
          .catch(function(err) {
            console.error('Error during login:', err);
            loginBtn.disabled = false;
            setStatus('Error during login.', 'error');
          });
      });

      refreshBtn.addEventListener('click', function() {
        fetchScans();
      });

      if (filterText) {
        filterText.addEventListener('input', function() {
          applyFilters();
        });
      }

      if (filterSource) {
        filterSource.addEventListener('change', function() {
          applyFilters();
        });
      }

      if (filterFrom) {
        filterFrom.addEventListener('change', function() {
          applyFilters();
        });
      }

      if (filterTo) {
        filterTo.addEventListener('change', function() {
          applyFilters();
        });
      }

      signOutBtn.addEventListener('click', function() {
        authToken = null;
        scansSection.style.display = 'none';
        loginSection.style.display = 'block';
        emailInput.value = '';
        passwordInput.value = '';
        setStatus('', '');
        scansTableWrapper.innerHTML = '<p class="muted">No data loaded yet.</p>';
      });
    })();
  </script>
</body>
</html>`);
});

export default router;
