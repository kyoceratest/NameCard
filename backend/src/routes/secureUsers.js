import { Router } from 'express';
import { pool } from '../db.js';
import { authMiddleware } from '../authContext.js';

const router = Router();

// All routes here require authentication.
router.use(authMiddleware);

// Simple HTML shell for secure user management.
router.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NameCard · Secure User Management</title>
  <style>
    body { margin:0; padding:1.5rem; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f7eee7; }
    .page { max-width: 960px; margin: 0 auto; }
    h1 { font-size:1.6rem; margin:0 0 0.5rem 0; color:#333; }
    .brand { font-weight:600; letter-spacing:0.12em; font-size:0.8rem; color:#b66b4d; text-transform:uppercase; margin-bottom:0.75rem; }
    .section { margin-bottom:1.25rem; padding:1rem 1.1rem; background:#fff; border-radius:16px; box-shadow:0 10px 26px rgba(0,0,0,0.05); }
    label { display:block; font-size:0.8rem; color:#444; margin-bottom:0.4rem; }
    input[type="email"], input[type="password"], input[type="text"], select { width:100%; padding:0.45rem 0.55rem; border-radius:10px; border:1px solid #d9bca5; font-size:0.9rem; }
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
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; }
    @media (max-width: 720px) { .grid { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <main class="page">
    <div class="brand">Cœur Du Ciel · Digital NameCard</div>
    <h1>User Management</h1>
    <p class="muted">Manage users for your tenant (client admins manage only their own staff).</p>

    <section class="section" id="info-section">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:0.75rem; flex-wrap:wrap;">
        <div>
          <p id="currentUserInfo" class="muted" style="margin:0 0 0.3rem 0;"></p>
          <p id="accessNote" class="muted" style="margin:0;"></p>
        </div>
        <div>
          <button id="changeTokenBtn" class="btn">Logout / change user</button>
        </div>
      </div>
    </section>

    <section class="section" id="create-section" style="display:none;">
      <h2 style="font-size:1rem; margin:0 0 0.6rem 0; color:#333;">Create user</h2>
      <div class="grid">
        <div>
          <label for="newEmail">Email</label>
          <input type="email" id="newEmail" />
        </div>
        <div>
          <label for="newDisplayName">Display name</label>
          <input type="text" id="newDisplayName" />
        </div>
        <div>
          <label for="newPassword">Password</label>
          <input type="password" id="newPassword" />
        </div>
        <div>
          <label for="newRole">Role</label>
          <select id="newRole"></select>
        </div>
      </div>
      <div style="margin-top:0.8rem;">
        <button id="createUserBtn" class="btn">Create user</button>
      </div>
      <div id="createStatus" class="status"></div>
    </section>

    <section class="section" id="list-section" style="display:none;">
      <h2 style="font-size:1rem; margin:0 0 0.6rem 0; color:#333;">Existing users</h2>
      <div id="usersTableWrapper">
        <p class="muted">No users to display.</p>
      </div>
    </section>

    <section class="section" id="audit-section" style="display:none;">
      <h2 style="font-size:1rem; margin:0 0 0.6rem 0; color:#333;">Recent account changes (CDC admin)</h2>
      <div id="auditTableWrapper">
        <p class="muted">No audit entries yet.</p>
      </div>
    </section>
  </main>

  <script>
    (function() {
      var currentUserInfo = document.getElementById('currentUserInfo');
      var accessNote = document.getElementById('accessNote');
      var createSection = document.getElementById('create-section');
      var listSection = document.getElementById('list-section');
      var auditSection = document.getElementById('audit-section');
      var auditTableWrapper = document.getElementById('auditTableWrapper');
      var usersTableWrapper = document.getElementById('usersTableWrapper');
      var newEmail = document.getElementById('newEmail');
      var newDisplayName = document.getElementById('newDisplayName');
      var newPassword = document.getElementById('newPassword');
      var newRole = document.getElementById('newRole');
      var createUserBtn = document.getElementById('createUserBtn');
      var createStatus = document.getElementById('createStatus');
      var changeTokenBtn = document.getElementById('changeTokenBtn');

      // This page reuses the auth token stored by the secure dashboard in
      // localStorage. If not present, it will ask once via prompt.
      var authToken = null;

      function setStatus(el, message, type) {
        el.textContent = message || '';
        el.className = 'status' + (type ? ' ' + type : '');
      }

      function esc(v) {
        var s = (v == null ? '' : String(v));
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }

      function renderUsers(users, canDelete) {
        if (!users || !users.length) {
          usersTableWrapper.innerHTML = '<p class="muted">No users found for this tenant.</p>';
          return;
        }

        var header = '' +
          '<table>' +
            '<thead>' +
              '<tr>' +
                '<th>Email</th>' +
                '<th>Display name</th>' +
                '<th>Role</th>' +
                '<th>Status</th>' +
                (canDelete ? '<th></th>' : '') +
              '</tr>' +
            '</thead>' +
            '<tbody>';

        var rows = users.map(function(u) {
          var statusText = (u.is_active === false) ? 'Disabled' : 'Active';
          var actions = '';
          if (canDelete && u.canDelete) {
            if (u.is_active === false) {
              actions = '<td><button class="btn btn-small" data-user-id="' + esc(u.id) + '" data-action="activate">Activate</button></td>';
            } else {
              actions = '<td><button class="btn btn-small" data-user-id="' + esc(u.id) + '" data-action="disable">Disable</button></td>';
            }
          } else if (canDelete) {
            actions = '<td></td>';
          }

          return '<tr>' +
            '<td>' + esc(u.email) + '</td>' +
            '<td>' + esc(u.display_name || '') + '</td>' +
            '<td>' + esc(u.role) + '</td>' +
            '<td>' + esc(statusText) + '</td>' +
            actions +
            '</tr>';
        }).join('');

        var footer = '</tbody></table>';
        usersTableWrapper.innerHTML = header + rows + footer;
      }

      function loadUsers() {
        if (!authToken) {
          accessNote.textContent = 'This page requires an auth token in the x-auth-token header. Paste the token from the secure dashboard login when prompted.';
          currentUserInfo.textContent = '';
          createSection.style.display = 'none';
          listSection.style.display = 'none';
          return;
        }

        fetch('/auth/users/me', {
          headers: { 'x-auth-token': authToken }
        })
          .then(function(resp) { return resp.json(); })
          .then(function(data) {
            if (!data || !data.success) {
              accessNote.textContent = (data && data.message) || 'Unable to load users.';
              return;
            }

            var me = data.me;
            var users = data.users || [];

            currentUserInfo.textContent = 'Signed in as ' + (me.displayName || me.email || 'user') + ' (' + me.role + ')';

            if (me.role === 'cdc_admin') {
              accessNote.textContent = 'CDC admin: you can manage users across all tenants and review the deletion audit log below.';
            } else if (me.role === 'tenant_admin') {
              accessNote.textContent = 'Tenant admin: you can create and manage manager/employee accounts for your own tenant only.';
            } else {
              accessNote.textContent = 'This page is read-only for your role. You cannot create or change users.';
            }

            if (data.allowedRoles && data.allowedRoles.length) {
              newRole.innerHTML = data.allowedRoles.map(function(r) {
                return '<option value="' + esc(r.value) + '">' + esc(r.label) + '</option>';
              }).join('');
              createSection.style.display = 'block';
            } else {
              createSection.style.display = 'none';
            }

            if (data.canViewUsers) {
              listSection.style.display = 'block';
              renderUsers(users, !!data.canDeleteUsers);

              if (data.canDeleteUsers) {
                var buttons = usersTableWrapper.querySelectorAll('button[data-user-id]');
                buttons.forEach(function(btn) {
                  btn.addEventListener('click', function() {
                    var id = btn.getAttribute('data-user-id');
                    var action = btn.getAttribute('data-action') || 'disable';
                    if (!id) return;

                    if (action === 'activate') {
                      if (!window.confirm('Activate this user account? They will be able to log in again.')) {
                        return;
                      }

                      fetch('/auth/users/' + encodeURIComponent(id) + '/activate', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-auth-token': authToken
                        },
                        body: JSON.stringify({ reason: 'Reactivated via secure users UI' })
                      })
                        .then(function(resp) { return resp.json(); })
                        .then(function(actData) {
                          if (!actData || !actData.success) {
                            window.alert((actData && actData.message) || 'Failed to activate user.');
                            return;
                          }
                          loadUsers();
                        })
                        .catch(function(err) {
                          console.error('Error activating user:', err);
                          window.alert('Error while activating user.');
                        });
                    } else {
                      if (!window.confirm('Disable this user account? They will no longer be able to log in.')) {
                        return;
                      }

                      fetch('/auth/users/' + encodeURIComponent(id), {
                        method: 'DELETE',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-auth-token': authToken
                        },
                        body: JSON.stringify({ reason: 'Disabled via secure users UI' })
                      })
                        .then(function(resp) { return resp.json(); })
                        .then(function(delData) {
                          if (!delData || !delData.success) {
                            window.alert((delData && delData.message) || 'Failed to disable user.');
                            return;
                          }
                          loadUsers();
                        })
                        .catch(function(err) {
                          console.error('Error disabling user:', err);
                          window.alert('Error while disabling user.');
                        });
                    }
                  });
                });
              }

              if (me.role === 'cdc_admin') {
                if (auditSection) {
                  auditSection.style.display = 'block';
                }
                if (auditTableWrapper) {
                  fetch('/auth/user-deletions', {
                    headers: { 'x-auth-token': authToken }
                  })
                    .then(function(resp) { return resp.json(); })
                    .then(function(auditData) {
                      if (!auditData || !auditData.success) {
                        auditTableWrapper.innerHTML = '<p class="muted">Unable to load audit log.</p>';
                        return;
                      }
                      var rows = auditData.deletions || [];
                      if (!rows.length) {
                        auditTableWrapper.innerHTML = '<p class="muted">No deletion records yet.</p>';
                        return;
                      }

                      var header = '' +
                        '<table>' +
                          '<thead>' +
                            '<tr>' +
                              '<th>When</th>' +
                              '<th>Tenant</th>' +
                              '<th>User</th>' +
                              '<th>Requested by</th>' +
                              '<th>Reason</th>' +
                            '</tr>' +
                          '</thead>' +
                          '<tbody>';

                      var body = rows.map(function(r) {
                        return '<tr>' +
                          '<td>' + esc(r.created_at) + '</td>' +
                          '<td>' + esc(r.tenant_name || '') + '</td>' +
                          '<td>' + esc(r.user_email || ('ID ' + r.user_id)) + '</td>' +
                          '<td>' + esc(r.requested_by_email || ('ID ' + r.requested_by)) + '</td>' +
                          '<td>' + esc(r.reason || '') + '</td>' +
                          '</tr>';
                      }).join('');

                      var footer = '</tbody></table>';
                      auditTableWrapper.innerHTML = header + body + footer;
                    })
                    .catch(function(err) {
                      console.error('Error loading audit log:', err);
                      auditTableWrapper.innerHTML = '<p class="muted">Error while loading audit log.</p>';
                    });
                }
              } else if (auditSection) {
                auditSection.style.display = 'none';
              }
            } else {
              listSection.style.display = 'none';
              usersTableWrapper.innerHTML = '<p class="muted">You do not have permission to view users.</p>';
            }
          })
          .catch(function(err) {
            console.error('Error loading users:', err);
            accessNote.textContent = 'Error while loading users.';
          });
      }

      createUserBtn.addEventListener('click', function() {
        if (!authToken) {
          setStatus(createStatus, 'Missing auth token.', 'error');
          return;
        }

        var email = (newEmail.value || '').trim();
        var displayName = (newDisplayName.value || '').trim();
        var password = newPassword.value || '';
        var role = newRole.value || '';

        if (!email || !password || !role) {
          setStatus(createStatus, 'Please fill email, password and role.', 'error');
          return;
        }

        createUserBtn.disabled = true;
        setStatus(createStatus, 'Creating user…', '');

        fetch('/auth/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': authToken
          },
          body: JSON.stringify({ email: email, displayName: displayName, password: password, role: role })
        })
          .then(function(resp) { return resp.json(); })
          .then(function(data) {
            createUserBtn.disabled = false;
            if (!data || !data.success) {
              setStatus(createStatus, (data && data.message) || 'Failed to create user.', 'error');
              return;
            }
            setStatus(createStatus, 'User created.', 'ok');
            newPassword.value = '';
            loadUsers();
          })
          .catch(function(err) {
            console.error('Error creating user:', err);
            createUserBtn.disabled = false;
            setStatus(createStatus, 'Error while creating user.', 'error');
          });
      });

      if (changeTokenBtn) {
        changeTokenBtn.addEventListener('click', function() {
          // Treat this button purely as "logout" from the secure-users page.
          authToken = '';
          try {
            window.localStorage.removeItem('nc_auth_token');
            window.localStorage.removeItem('nc_auth_user');
          } catch (e) {
            console.error('Error clearing auth from localStorage:', e);
          }

          currentUserInfo.textContent = '';
          accessNote.textContent = 'You are logged out for user management. Please sign in again on the secure dashboard, then reopen this page.';
          createSection.style.display = 'none';
          listSection.style.display = 'none';
          if (auditSection) {
            auditSection.style.display = 'none';
          }
        });
      }

      // On first load, reuse token from localStorage if possible.
      try {
        authToken = window.localStorage.getItem('nc_auth_token') || '';
      } catch (e) {
        console.error('Error reading auth token from localStorage:', e);
        authToken = '';
      }

      if (authToken) {
        loadUsers();
      } else {
        accessNote.textContent = 'Please sign in on the secure dashboard first. Once logged in, reopen this page to manage users.';
        currentUserInfo.textContent = '';
        createSection.style.display = 'none';
        listSection.style.display = 'none';
        if (auditSection) {
          auditSection.style.display = 'none';
        }
      }
    })();
  </script>
</body>
</html>`);
});

export default router;
