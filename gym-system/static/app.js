/* ==========================================================================
   Client-side hash router (SPA)
   ========================================================================== */

const ROUTES = {
  '#/login': { render: renderLoginPage, protected: false },
  '#/scan': { render: renderMemberScanPage, protected: false }, // members: no login needed
  '#/': { render: renderDashboardPage, protected: true },
  '#/members': { render: renderMembersPage, protected: true },
  '#/products': { render: renderProductsPage, protected: true, roles: ['owner'] },
  '#/checkin': { render: renderCheckInPage, protected: true },
  '#/sales': { render: renderSalesPage, protected: true },
  '#/history': { render: renderHistoryPage, protected: true, roles: ['owner'] },
};

function router() {
  const root = document.getElementById('app');
  let hash = window.location.hash || '#/';

  const route = ROUTES[hash];

  if (!route) {
    window.location.hash = '#/';
    return;
  }

  if (route.protected && !Store.state.user) {
    window.location.hash = '#/login';
    return;
  }

  // Pages marked roles: ['owner'] are closed to staff, even if they type the address
  if (route.roles && Store.state.user && !route.roles.includes(Store.state.user.role)) {
    toast.error('Only the owner can open that page');
    window.location.hash = '#/';
    return;
  }

  if (hash === '#/login' && Store.state.user) {
    window.location.hash = '#/';
    return;
  }

  if (typeof window.__pageCleanup === 'function') {
    window.__pageCleanup();
    window.__pageCleanup = null;
  }

  route.render(root);
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.hash) {
    window.location.hash = '#/';
  }
  router();
});
