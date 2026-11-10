/* Shared render helpers */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPeso(amount) {
  return `₱${Number(amount).toFixed(2)}`;
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/* Time only if it is today, "Oct 22, 09:05 AM" this year, "Dec 31, 2025, 03:00 PM" before that */
function formatDateTime(value) {
  const d = new Date(value);
  if (toDateKey(d) === toDateKey(new Date())) return formatTime(d);
  const opts = { month: 'short', day: 'numeric' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return `${d.toLocaleDateString('en-US', opts)}, ${formatTime(d)}`;
}

/* "YYYY-MM-DD" key -> local Date (avoids the UTC shift of new Date("YYYY-MM-DD")) */
function dateFromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateShort(key) {
  return dateFromKey(key).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

/* e.g. "Fri, Oct 23" */
function formatDayLabel(key) {
  return dateFromKey(key).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDateLong(key) {
  return dateFromKey(key).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

/* e.g. "45 min", "1 hr 25 min" */
function formatDuration(start, end) {
  const mins = Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000));
  if (mins < 1) return 'Under 1 min';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/* Gmail only: letters and numbers, with single dots or plus signs inside */
function isValidGmail(value) {
  return /^[a-z0-9]+(?:[.+][a-z0-9]+)*@gmail\.com$/i.test(String(value).trim());
}

/* Numbers only, 7 to 15 digits */
function isValidPhone(value) {
  return /^\d{7,15}$/.test(String(value).trim());
}

function renderPageHeader(title, actionsHtml = '') {
  return `
    <div class="page-header">
      <h1 class="page-title">${escapeHtml(title)}</h1>
      <div class="header-actions">${actionsHtml}</div>
    </div>
  `;
}

function renderSearchBar(id, placeholder) {
  return `
    <div class="search-bar">
      ${Icons.search('icon')}
      <input type="text" id="${id}" class="input" placeholder="${escapeHtml(placeholder)}" />
    </div>
  `;
}

const NAV_ITEMS = [
  { path: '#/', label: 'Dashboard', icon: 'home' },
  { path: '#/members', label: 'Members', icon: 'users' },
  { path: '#/products', label: 'Products', icon: 'package', roles: ['owner'] },
  { path: '#/checkin', label: 'Check-In', icon: 'scan' },
  { path: '#/sales', label: 'Sales', icon: 'cart' },
  { path: '#/history', label: 'History', icon: 'history', roles: ['owner'] },
];

function renderSidebar(activePath) {
  const user = Store.state.user;
  // Owner-only pages are hidden from the menu for staff
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role)));
  const navHtml = visibleItems.map((item) => {
    const isActive = item.path === activePath;
    return `
      <a href="${item.path}" class="sidebar-link ${isActive ? 'active' : ''}">
        ${Icons[item.icon]('icon')}
        <span>${item.label}</span>
      </a>
    `;
  }).join('');

  return `
    <div class="sidebar">
      <div class="sidebar-brand">
        <h1>Gladiator and Sparta Fitness Gym</h1>
        <p>Management System</p>
      </div>

      ${user ? `
        <div class="sidebar-user">
          <div class="sidebar-user-inner">
            <div class="sidebar-avatar">${Icons.user('icon icon-sm')}</div>
            <div>
              <p class="sidebar-user-name">${escapeHtml(user.name)}</p>
              <p class="sidebar-user-role">${escapeHtml(user.role)}</p>
            </div>
          </div>
        </div>
      ` : ''}

      <nav class="sidebar-nav">${navHtml}</nav>

      <button id="logout-btn" class="sidebar-link sidebar-logout">
        ${Icons.logout('icon')}
        <span>Logout</span>
      </button>
    </div>
  `;
}

function attachSidebarEvents() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Store.logout();
      toast.success('Logged out successfully');
      window.location.hash = '#/login';
    });
  }
}

/* Simple modal helper */
function openModal(innerHtml, { onClose } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${innerHtml}</div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      if (onClose) onClose();
    }
  });

  return overlay;
}

function closeModal(overlay) {
  if (overlay && overlay.parentNode) overlay.remove();
}
