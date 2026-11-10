/* ==========================================================================
   History page (owner only).
   Filter bar: Day / Week / Month / Year.
     Day   - list of every day with records + that day's full details
     Week / Month / Year - totals, an earnings chart and a breakdown table
                           (click a row to open that day or month)
   All numbers are built from the saved records, one entry per day.
   ========================================================================== */

const WEEK_STARTS_ON = 1; // 0 = weeks start on Sunday, 1 = on Monday

const HISTORY_MODES = [
  { id: 'day', label: 'Day', current: 'Today' },
  { id: 'week', label: 'Week', current: 'This week' },
  { id: 'month', label: 'Month', current: 'This month' },
  { id: 'year', label: 'Year', current: 'This year' },
];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/* ---------- building the daily records ---------- */

function finalizeDay(day) {
  day.salesRevenue = day.sales.reduce((sum, s) => sum + s.total, 0);
  day.membershipRevenue = day.payments.reduce((sum, p) => sum + p.price, 0);
  day.totalRevenue = day.salesRevenue + day.membershipRevenue;
  day.itemsSold = day.sales.reduce(
    (sum, s) => sum + s.items.reduce((n, item) => n + item.quantity, 0), 0
  );
  day.transactionCount = day.sales.length + day.payments.length;
  day.timedOutCount = day.checkIns.filter((c) => c.timeOut).length;
  return day;
}

function emptyDay(key) {
  return finalizeDay({ key, sales: [], payments: [], checkIns: [] });
}

function buildDailyHistory() {
  const { sales, memberPayments, checkIns } = Store.state;
  const days = new Map();

  const dayFor = (timestamp) => {
    const key = toDateKey(timestamp);
    if (!days.has(key)) days.set(key, { key, sales: [], payments: [], checkIns: [] });
    return days.get(key);
  };

  sales.forEach((s) => dayFor(s.timestamp).sales.push(s));
  memberPayments.forEach((p) => dayFor(p.timestamp).payments.push(p));
  checkIns.forEach((c) => dayFor(c.timestamp).checkIns.push(c));

  return Array.from(days.values())
    .map(finalizeDay)
    .sort((a, b) => b.key.localeCompare(a.key)); // newest day first
}

/* Add up several days into one summary */
function summarizeDays(list) {
  const t = {
    totalRevenue: 0, salesRevenue: 0, membershipRevenue: 0, itemsSold: 0,
    transactionCount: 0, paymentCount: 0, checkInCount: 0, timedOutCount: 0,
  };
  list.forEach((d) => {
    t.totalRevenue += d.totalRevenue;
    t.salesRevenue += d.salesRevenue;
    t.membershipRevenue += d.membershipRevenue;
    t.itemsSold += d.itemsSold;
    t.transactionCount += d.transactionCount;
    t.paymentCount += d.payments.length;
    t.checkInCount += d.checkIns.length;
    t.timedOutCount += d.timedOutCount;
  });
  return t;
}

/* ---------- date math on "YYYY-MM-DD" keys ---------- */

const pad2 = (n) => String(n).padStart(2, '0');

function addDaysToKey(key, n) {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

/* First and last day of the day / week / month / year that contains `key` */
function periodFor(mode, key) {
  const d = dateFromKey(key);
  if (mode === 'day') return { start: key, end: key };
  if (mode === 'week') {
    const back = (d.getDay() - WEEK_STARTS_ON + 7) % 7;
    const start = addDaysToKey(key, -back);
    return { start, end: addDaysToKey(start, 6) };
  }
  if (mode === 'month') {
    return {
      start: toDateKey(new Date(d.getFullYear(), d.getMonth(), 1)),
      end: toDateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
    };
  }
  return { start: `${d.getFullYear()}-01-01`, end: `${d.getFullYear()}-12-31` };
}

/* Previous (-1) or next (+1) day / week / month / year */
function shiftKey(mode, key, dir) {
  const d = dateFromKey(key);
  if (mode === 'day') d.setDate(d.getDate() + dir);
  else if (mode === 'week') d.setDate(d.getDate() + 7 * dir);
  else if (mode === 'month') { d.setDate(1); d.setMonth(d.getMonth() + dir); }
  else { d.setMonth(0, 1); d.setFullYear(d.getFullYear() + dir); }
  return toDateKey(d);
}

function rangeLabel(start, end) {
  const s = dateFromKey(start);
  const e = dateFromKey(end);
  const short = { month: 'short', day: 'numeric' };
  const full = { month: 'short', day: 'numeric', year: 'numeric' };
  const left = s.toLocaleDateString('en-US', s.getFullYear() === e.getFullYear() ? short : full);
  return `${left} to ${e.toLocaleDateString('en-US', full)}`;
}

function periodLabel(mode, key) {
  const d = dateFromKey(key);
  if (mode === 'day') return formatDateLong(key);
  if (mode === 'week') { const p = periodFor('week', key); return rangeLabel(p.start, p.end); }
  if (mode === 'month') return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  return `Year ${d.getFullYear()}`;
}

/* ---------- the page ---------- */

function renderHistoryPage(root) {
  const days = buildDailyHistory();
  const byKey = new Map(days.map((d) => [d.key, d]));
  const todayKey = toDateKey(new Date());

  function pluralize(n, word) {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
  }

  /* Nothing recorded yet: simple message, no filter bar */
  if (days.length === 0) {
    root.innerHTML = `
      <div class="app-shell">
        ${renderSidebar('#/history')}
        <div class="main-content">
          <div class="content-container">
            ${renderPageHeader('History')}
            <div class="card card-pad">
              <p class="empty-state">No history yet. A day shows up here once there is a check-in, a sale, or a new membership.</p>
            </div>
          </div>
        </div>
      </div>
    `;
    attachSidebarEvents();
    return;
  }

  const earliestKey = days[days.length - 1].key;
  const earliestYear = dateFromKey(earliestKey).getFullYear();
  const currentYear = dateFromKey(todayKey).getFullYear();

  let mode = 'day';
  let anchor = days[0].key; // any date inside the period being viewed

  const getDay = (key) => byKey.get(key) || emptyDay(key);
  const daysIn = (start, end) => days.filter((d) => d.key >= start && d.key <= end);

  /* ----- pieces of the page ----- */

  function renderStatCards(s) {
    const stats = [
      { label: 'Total Earnings', value: formatPeso(s.totalRevenue), sub: pluralize(s.transactionCount, 'transaction'), icon: 'dollar', color: 'stat-icon-purple' },
      { label: 'Product Sales', value: formatPeso(s.salesRevenue), sub: `${pluralize(s.itemsSold, 'item')} sold`, icon: 'package', color: 'stat-icon-green' },
      { label: 'Memberships', value: formatPeso(s.membershipRevenue), sub: pluralize(s.paymentCount, 'new member'), icon: 'users', color: 'stat-icon-blue' },
      { label: 'Check-ins', value: s.checkInCount, sub: `${s.timedOutCount} timed out`, icon: 'clock', color: 'stat-icon-orange' },
    ];
    return `
      <div class="history-stats">
        ${stats.map((c) => `
          <div class="stat-card">
            <div class="stat-icon-wrap ${c.color}">${Icons[c.icon]('icon')}</div>
            <h3 class="stat-value">${c.value}</h3>
            <p class="stat-label">${c.label}</p>
            <p class="stat-sub">${c.sub}</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderTransactions(day) {
    const rows = [
      ...day.sales.map((s) => ({
        timestamp: s.timestamp,
        type: 'Product sale',
        badge: 'badge-info',
        details: s.items.map((i) => `${escapeHtml(i.productName)} &times;${i.quantity}`).join(', '),
        amount: s.total,
      })),
      ...day.payments.map((p) => ({
        timestamp: p.timestamp,
        type: 'Membership',
        badge: 'badge-warning',
        details: `${escapeHtml(p.memberName)} (${escapeHtml(p.memberId)}), ${escapeHtml(p.membershipType)}`,
        amount: p.price,
      })),
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (rows.length === 0) {
      return `<div class="card card-pad"><p class="empty-state">No sales or memberships on this day</p></div>`;
    }

    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Time</th><th>Type</th><th>Details</th><th class="cell-right">Amount</th></tr>
          </thead>
          <tbody>
            ${rows.map((r) => `
              <tr>
                <td class="cell-muted cell-nowrap">${formatTime(r.timestamp)}</td>
                <td><span class="badge ${r.badge}">${r.type}</span></td>
                <td>${r.details}</td>
                <td class="cell-right cell-strong">${formatPeso(r.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3">Total earnings</td>
              <td class="cell-right">${formatPeso(day.totalRevenue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  function renderTimeLog(day) {
    if (day.checkIns.length === 0) {
      return `<div class="card card-pad"><p class="empty-state">No check-ins on this day</p></div>`;
    }

    const rows = day.checkIns
      .slice()
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const isToday = day.key === todayKey;

    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Member</th><th>Time In</th><th>Time Out</th><th>Time Spent</th></tr>
          </thead>
          <tbody>
            ${rows.map((c) => `
              <tr>
                <td>
                  <div>${escapeHtml(c.memberName)}</div>
                  <div class="cell-subtle">${escapeHtml(c.memberId)}</div>
                </td>
                <td class="cell-muted cell-nowrap">${formatTime(c.timestamp)}</td>
                <td class="cell-muted cell-nowrap">
                  ${c.timeOut
                    ? formatTime(c.timeOut)
                    : (isToday
                      ? '<span class="badge badge-success">Still inside</span>'
                      : '<span class="badge badge-muted">No time out</span>')}
                </td>
                <td class="cell-muted cell-nowrap">${c.timeOut ? formatDuration(c.timestamp, c.timeOut) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function headingHtml(start, end) {
    const hasToday = todayKey >= start && todayKey <= end;
    return `
      <div class="history-detail-head">
        <h2 class="history-detail-title">${periodLabel(mode, anchor)}</h2>
        ${hasToday ? '<span class="badge badge-success">Today</span>' : ''}
      </div>
    `;
  }

  /* ----- Day view ----- */

  function renderDayList() {
    return days.map((day) => `
      <button type="button" class="history-day ${day.key === anchor ? 'active' : ''}" data-key="${day.key}">
        <div class="history-day-main">
          <p class="history-day-date">
            ${formatDateShort(day.key)}
            ${day.key === todayKey ? '<span class="badge badge-success">Today</span>' : ''}
          </p>
          <p class="history-day-sub">${pluralize(day.transactionCount, 'transaction')}, ${pluralize(day.checkIns.length, 'check-in')}</p>
        </div>
        <p class="history-day-total">${formatPeso(day.totalRevenue)}</p>
      </button>
    `).join('');
  }

  function renderDayView() {
    const day = getDay(anchor);
    return `
      <div class="history-grid">
        <div class="card history-days-card">
          <div class="history-days" id="history-days">${renderDayList()}</div>
        </div>
        <div class="history-detail">
          ${headingHtml(anchor, anchor)}
          ${renderStatCards(summarizeDays([day]))}
          <h3 class="history-section-title">Transactions</h3>
          ${renderTransactions(day)}
          <h3 class="history-section-title">Time In / Time Out</h3>
          ${renderTimeLog(day)}
        </div>
      </div>
    `;
  }

  /* ----- Week / Month / Year view ----- */

  /* One row per day (week, month) or per month (year) */
  function buildRows(start, end) {
    const rows = [];
    if (mode === 'year') {
      const y = dateFromKey(start).getFullYear();
      for (let m = 0; m < 12; m++) {
        const monthStart = `${y}-${pad2(m + 1)}-01`;
        const monthDays = days.filter((d) => d.key.startsWith(`${y}-${pad2(m + 1)}-`));
        rows.push({
          label: MONTH_NAMES[m],
          short: MONTH_NAMES[m].slice(0, 3),
          drill: `month:${monthStart}`,
          future: monthStart > todayKey,
          summary: summarizeDays(monthDays),
        });
      }
    } else {
      for (let k = start; k <= end; k = addDaysToKey(k, 1)) {
        rows.push({
          label: formatDayLabel(k),
          short: mode === 'week'
            ? dateFromKey(k).toLocaleDateString('en-US', { weekday: 'short' })
            : String(dateFromKey(k).getDate()),
          drill: `day:${k}`,
          future: k > todayKey,
          summary: summarizeDays([getDay(k)]),
        });
      }
    }
    rows.forEach((r) => { r.hasActivity = r.summary.transactionCount > 0 || r.summary.checkInCount > 0; });
    return rows;
  }

  function renderBars(rows) {
    const max = Math.max(0, ...rows.map((r) => r.summary.totalRevenue));
    return `
      <div class="card history-chart-card">
        <div class="history-chart" aria-hidden="true" style="--cols:${rows.length}">
          ${rows.map((r) => {
            const value = r.summary.totalRevenue;
            const pct = max > 0 ? Math.max(value > 0 ? 3 : 0, Math.round((value / max) * 100)) : 0;
            return `
              <div class="bar-col ${r.future ? 'bar-future' : ''}" title="${escapeHtml(r.label)}: ${formatPeso(value)}">
                <div class="bar-track">
                  <div class="bar-fill ${value > 0 ? '' : 'bar-empty'}" style="height:${value > 0 ? pct : 0}%"></div>
                </div>
                <span class="bar-label">${escapeHtml(r.short)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderBreakdown(rows, total) {
    const dash = '<span class="cell-dim">-</span>';
    return `
      <div class="table-wrap">
        <table class="history-breakdown">
          <thead>
            <tr>
              <th>${mode === 'year' ? 'Month' : 'Day'}</th>
              <th class="cell-right">Transactions</th>
              <th class="cell-right">Product Sales</th>
              <th class="cell-right">Memberships</th>
              <th class="cell-right">Total</th>
              <th class="cell-right">Check-ins</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r) => {
              const s = r.summary;
              if (!r.hasActivity) {
                return `
                  <tr class="history-row-empty ${r.future ? 'bar-future' : ''}">
                    <td class="cell-muted">${escapeHtml(r.label)}</td>
                    <td class="cell-right">${dash}</td><td class="cell-right">${dash}</td>
                    <td class="cell-right">${dash}</td><td class="cell-right">${dash}</td>
                    <td class="cell-right">${dash}</td>
                  </tr>`;
              }
              return `
                <tr class="history-row" data-drill="${r.drill}">
                  <td><button type="button" class="history-row-link" data-drill="${r.drill}">${escapeHtml(r.label)}</button></td>
                  <td class="cell-right">${s.transactionCount}</td>
                  <td class="cell-right">${formatPeso(s.salesRevenue)}</td>
                  <td class="cell-right">${formatPeso(s.membershipRevenue)}</td>
                  <td class="cell-right cell-strong">${formatPeso(s.totalRevenue)}</td>
                  <td class="cell-right">${s.checkInCount}</td>
                </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td class="cell-right">${total.transactionCount}</td>
              <td class="cell-right">${formatPeso(total.salesRevenue)}</td>
              <td class="cell-right">${formatPeso(total.membershipRevenue)}</td>
              <td class="cell-right">${formatPeso(total.totalRevenue)}</td>
              <td class="cell-right">${total.checkInCount}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  function renderAggregateView() {
    const { start, end } = periodFor(mode, anchor);
    const rows = buildRows(start, end);
    const total = summarizeDays(daysIn(start, end));
    const unit = mode === 'year' ? 'month' : 'day';
    return `
      <div class="history-detail">
        ${headingHtml(start, end)}
        ${renderStatCards(total)}
        <h3 class="history-section-title">Earnings by ${unit}</h3>
        ${renderBars(rows)}
        <h3 class="history-section-title">Breakdown</h3>
        ${renderBreakdown(rows, total)}
        <p class="history-hint">Select a row to open that ${unit}.</p>
      </div>
    `;
  }

  /* ----- filter bar ----- */

  function renderPicker() {
    if (mode === 'day' || mode === 'week') {
      const { start, end } = periodFor(mode, anchor);
      return `
        <div class="history-picker">
          <input type="date" id="hist-date" class="input" value="${anchor}" max="${todayKey}"
                 aria-label="${mode === 'week' ? 'Pick any day in the week' : 'Pick a date'}" />
          ${mode === 'week' ? `<span class="history-picker-label">${rangeLabel(start, end)}</span>` : ''}
        </div>`;
    }

    const d = dateFromKey(anchor);
    const firstYear = Math.min(earliestYear, d.getFullYear());
    const lastYear = Math.max(currentYear, d.getFullYear());
    let yearOptions = '';
    for (let y = lastYear; y >= firstYear; y--) {
      yearOptions += `<option value="${y}" ${y === d.getFullYear() ? 'selected' : ''}>${y}</option>`;
    }
    const monthSelect = mode === 'month' ? `
      <select id="hist-month" class="select" aria-label="Month">
        ${MONTH_NAMES.map((name, i) => `<option value="${i + 1}" ${i === d.getMonth() ? 'selected' : ''}>${name}</option>`).join('')}
      </select>` : '';
    return `
      <div class="history-picker">
        ${monthSelect}
        <select id="hist-year" class="select" aria-label="Year">${yearOptions}</select>
      </div>`;
  }

  function renderFilter() {
    const { start, end } = periodFor(mode, anchor);
    const prevDisabled = earliestKey >= start;  // nothing recorded before this period
    const nextDisabled = end >= todayKey;       // can't go past today
    const currentLabel = HISTORY_MODES.find((m) => m.id === mode).current;
    return `
      <div class="card history-filter">
        <div class="history-modes" role="group" aria-label="View history by">
          ${HISTORY_MODES.map((m) => `
            <button type="button" class="mode-btn ${m.id === mode ? 'active' : ''}" data-mode="${m.id}" aria-pressed="${m.id === mode}">${m.label}</button>
          `).join('')}
        </div>
        <div class="history-nav">
          <button type="button" class="btn btn-outline btn-icon-sm" data-nav="prev" aria-label="Previous ${mode}" ${prevDisabled ? 'disabled' : ''}>${Icons.chevronLeft('icon icon-sm')}</button>
          ${renderPicker()}
          <button type="button" class="btn btn-outline btn-icon-sm" data-nav="next" aria-label="Next ${mode}" ${nextDisabled ? 'disabled' : ''}>${Icons.chevronRight('icon icon-sm')}</button>
        </div>
        <button type="button" class="btn btn-outline btn-sm history-current" data-nav="current">${currentLabel}</button>
      </div>
    `;
  }

  /* ----- state changes ----- */

  function setMode(newMode) {
    if (newMode === mode) return;
    const order = HISTORY_MODES.map((m) => m.id);
    if (order.indexOf(newMode) < order.indexOf(mode)) {
      // Going to a narrower view (e.g. Year -> Day): land on the latest day with records
      const { start, end } = periodFor(mode, anchor);
      const latest = days.find((d) => d.key >= start && d.key <= end); // days are newest-first
      if (latest) anchor = latest.key;
      else if (todayKey >= start && todayKey <= end) anchor = todayKey;
    }
    mode = newMode;
  }

  function refresh() {
    // keep keyboard focus on the same control after the bar is redrawn
    const active = document.activeElement;
    let focusSelector = null;
    if (active && root.contains(active)) {
      if (active.id) focusSelector = `#${active.id}`;
      else if (active.dataset.mode) focusSelector = `[data-mode="${active.dataset.mode}"]`;
      else if (active.dataset.nav) focusSelector = `[data-nav="${active.dataset.nav}"]`;
    }

    document.getElementById('history-filter').innerHTML = renderFilter();
    document.getElementById('history-body').innerHTML = mode === 'day' ? renderDayView() : renderAggregateView();

    if (focusSelector) {
      const el = root.querySelector(focusSelector);
      if (el && !el.disabled) el.focus();
    }
  }

  /* ----- first draw + events ----- */

  root.innerHTML = `
    <div class="app-shell">
      ${renderSidebar('#/history')}
      <div class="main-content">
        <div class="content-container">
          ${renderPageHeader('History')}
          <p class="page-note">Records are saved in this browser. Clearing the browser's site data will erase them.</p>
          <div id="history-filter"></div>
          <div id="history-body"></div>
        </div>
      </div>
    </div>
  `;
  attachSidebarEvents();
  refresh();

  const host = root.querySelector('.content-container');

  host.addEventListener('click', (e) => {
    const modeBtn = e.target.closest('[data-mode]');
    if (modeBtn) { setMode(modeBtn.dataset.mode); refresh(); return; }

    const navBtn = e.target.closest('[data-nav]');
    if (navBtn && !navBtn.disabled) {
      const dir = navBtn.dataset.nav;
      if (dir === 'prev') anchor = shiftKey(mode, anchor, -1);
      else if (dir === 'next') anchor = shiftKey(mode, anchor, 1);
      else anchor = todayKey;
      refresh();
      return;
    }

    const drill = e.target.closest('[data-drill]');
    if (drill) {
      const [type, key] = drill.dataset.drill.split(':');
      mode = type === 'month' ? 'month' : 'day';
      anchor = key;
      refresh();
      return;
    }

    const dayBtn = e.target.closest('.history-day');
    if (dayBtn) { anchor = dayBtn.dataset.key; refresh(); }
  });

  host.addEventListener('change', (e) => {
    const d = dateFromKey(anchor);
    if (e.target.id === 'hist-date') {
      if (!e.target.value) return;
      anchor = e.target.value > todayKey ? todayKey : e.target.value;
    } else if (e.target.id === 'hist-month') {
      anchor = `${d.getFullYear()}-${pad2(e.target.value)}-01`;
    } else if (e.target.id === 'hist-year') {
      const month = mode === 'month' ? d.getMonth() + 1 : 1;
      anchor = `${e.target.value}-${pad2(month)}-01`;
    } else {
      return;
    }
    refresh();
  });
}
