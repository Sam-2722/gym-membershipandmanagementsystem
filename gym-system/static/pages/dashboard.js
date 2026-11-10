function renderDashboardPage(root) {
  const { sales, checkIns, products, members, memberPayments } = Store.state;

  // Totals cover the whole current year (January 1 to today).
  // The day-by-day records stay in History.
  const year = new Date().getFullYear();
  const inThisYear = (timestamp) => new Date(timestamp).getFullYear() === year;

  const yearSales = sales.filter((s) => inThisYear(s.timestamp));
  const yearCheckIns = checkIns.filter((c) => inThisYear(c.timestamp));
  const yearPayments = memberPayments.filter((p) => inThisYear(p.timestamp));

  const salesRevenue = yearSales.reduce((sum, sale) => sum + sale.total, 0);
  const membershipRevenue = yearPayments.reduce((sum, payment) => sum + payment.price, 0);
  const totalRevenue = salesRevenue + membershipRevenue;
  const productsSoldThisYear = yearSales.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );

  const stats = [
    { title: 'Active Members', value: members.filter((m) => m.status === 'Active').length, icon: 'users', color: 'stat-icon-blue' },
    { title: 'Products Sold This Year', value: productsSoldThisYear, icon: 'package', color: 'stat-icon-green' },
    { title: 'Revenue This Year', value: formatPeso(totalRevenue), icon: 'dollar', color: 'stat-icon-purple' },
    { title: 'Check-ins This Year', value: yearCheckIns.length, icon: 'trending', color: 'stat-icon-orange' },
  ];

  // Latest 10 things that happened, newest first
  const recentActivity = [
    ...checkIns.map((c) => ({
      time: c.timestamp,
      member: c.memberName,
      action: 'Timed in',
    })),
    ...checkIns.filter((c) => c.timeOut).map((c) => ({
      time: c.timeOut,
      member: c.memberName,
      action: 'Timed out',
    })),
    ...sales.map((s) => ({
      time: s.timestamp,
      member: s.customerType === 'member' ? `Member ${s.memberId}` : 'Guest',
      action: `Purchased ${s.items[0]?.productName || ''}${s.items.length > 1 ? ` +${s.items.length - 1} more` : ''}`,
    })),
  ]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 10);

  const lowStockProducts = products.filter((p) => p.stock < 20).sort((a, b) => a.stock - b.stock);

  root.innerHTML = `
    <div class="app-shell">
      ${renderSidebar('#/')}
      <div class="main-content">
        <div class="content-container">
          ${renderPageHeader('Dashboard')}
          <p class="page-note">Totals for ${year}, January 1 to today.</p>

          <div class="stats-grid">
            ${stats.map((stat) => `
              <div class="stat-card">
                <div class="stat-icon-wrap ${stat.color}">${Icons[stat.icon]('icon')}</div>
                <h3 class="stat-value">${stat.value}</h3>
                <p class="stat-label">${stat.title}</p>
              </div>
            `).join('')}
          </div>

          <div class="grid-2">
            <div class="card card-pad">
              <h2 class="section-title">Recent Activity</h2>
              <div>
                ${recentActivity.length === 0
                  ? `<p class="empty-state">No activity yet</p>`
                  : recentActivity.map((activity) => `
                    <div class="list-row">
                      <div>
                        <p class="activity-name">${escapeHtml(activity.member)}</p>
                        <p class="activity-action">${escapeHtml(activity.action)}</p>
                      </div>
                      <span class="activity-time">${formatDateTime(activity.time)}</span>
                    </div>
                  `).join('')}
              </div>
            </div>

            <div class="card card-pad">
              <h2 class="section-title">Low Stock Alert</h2>
              <div>
                ${lowStockProducts.length === 0
                  ? `<p class="empty-state">All products well stocked</p>`
                  : lowStockProducts.map((product) => `
                    <div class="low-stock-row">
                      <div>
                        <p class="low-stock-name">${escapeHtml(product.name)}</p>
                        <p class="low-stock-cat">${escapeHtml(product.category)}</p>
                      </div>
                      <span class="low-stock-count">${product.stock}</span>
                    </div>
                  `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  attachSidebarEvents();
}
