function renderCheckInPage(root) {
  let mode = 'in'; // 'in' = Time In, 'out' = Time Out

  const scanner = createQrScanner({ onCode: (value) => handleEntry(value) });

  /* ---------- Time In / Time Out mode ---------- */
  function setMode(newMode) {
    mode = newMode;
    scanner.resetCooldown();
    const isOut = mode === 'out';

    const inBtn = document.getElementById('mode-in');
    const outBtn = document.getElementById('mode-out');
    inBtn.classList.toggle('active', !isOut);
    outBtn.classList.toggle('active', isOut);
    inBtn.setAttribute('aria-pressed', String(!isOut));
    outBtn.setAttribute('aria-pressed', String(isOut));
    document.getElementById('mode-toggle').dataset.mode = mode;

    const submit = document.getElementById('checkin-btn');
    submit.className = `btn ${isOut ? 'btn-warning' : 'btn-primary'} btn-block`;
    submit.innerHTML = `${isOut ? Icons.logout('icon icon-sm') : Icons.login('icon icon-sm')} ${isOut ? 'Time Out' : 'Time In'}`;
  }

  /* ---------- Today's list ---------- */
  function getTodayCheckIns() {
    const today = toDateKey(new Date());
    return Store.state.checkIns.filter((c) => toDateKey(c.timestamp) === today);
  }

  function renderList() {
    const todayCheckIns = getTodayCheckIns();
    const insideCount = todayCheckIns.filter((c) => !c.timeOut).length;

    const listHeader = document.getElementById('checkin-count');
    if (listHeader) listHeader.textContent = `Today's Check-ins (${todayCheckIns.length})`;
    const insidePill = document.getElementById('checkin-inside');
    if (insidePill) {
      insidePill.textContent = `${insideCount} inside now`;
      insidePill.classList.toggle('hidden', insideCount === 0);
    }

    const list = document.getElementById('checkin-list');
    if (!list) return;

    if (todayCheckIns.length === 0) {
      list.innerHTML = `<p class="empty-state">No check-ins yet today</p>`;
      return;
    }

    list.innerHTML = todayCheckIns.slice().reverse().map((c) => `
      <div class="checkin-row">
        <div class="checkin-row-main">
          <p class="checkin-row-name">${escapeHtml(c.memberName)}</p>
          <p class="checkin-row-id">${escapeHtml(c.memberId)}</p>
        </div>
        <div class="checkin-row-times">
          <p class="checkin-row-time">In ${formatTime(c.timestamp)}</p>
          ${c.timeOut
            ? `<p class="checkin-row-time">Out ${formatTime(c.timeOut)}</p>`
            : `<span class="badge badge-success">Inside</span>`}
        </div>
        <div class="checkin-row-action">
          ${c.timeOut
            ? `<span class="checkin-row-duration">${formatDuration(c.timestamp, c.timeOut)}</span>`
            : `<button class="btn btn-outline btn-sm timeout-btn" data-id="${escapeHtml(c.id)}">${Icons.logout('icon icon-sm')} Time Out</button>`}
        </div>
      </div>
    `).join('');
  }

  /* ---------- Actions ---------- */
  function showResult(result) {
    // toasts show HTML, so escape names coming from the data
    toast[result.ok ? 'success' : 'error'](escapeHtml(result.message));
    if (result.ok) renderList();
  }

  function handleEntry(rawId) {
    showResult(recordAttendance(mode, rawId));
  }

  function handleManualEntry() {
    const input = document.getElementById('scan-input');
    handleEntry(input.value);
    input.value = '';
    input.focus();
  }

  function completeTimeOut(checkIn) {
    const done = Store.timeOutCheckIn(checkIn.id);
    if (!done) return;
    showResult({
      ok: true,
      message: `${done.memberName} timed out after ${formatDuration(done.timestamp, done.timeOut)}`,
    });
  }

  root.innerHTML = `
    <div class="app-shell">
      ${renderSidebar('#/checkin')}
      <div class="main-content">
        <div class="content-container">
          ${renderPageHeader('Member Check-In')}

          <div class="checkin-grid">
            <div class="card card-pad-lg">
              <div class="checkin-scan-header">
                <div class="checkin-icon-circle">${Icons.scan('icon icon-xl')}</div>
                <h2>Scan QR Code</h2>
                <p>Choose Time In or Time Out, then scan the member's QR code or enter their ID</p>
              </div>

              <div class="mode-toggle" id="mode-toggle" data-mode="in" role="group" aria-label="Scan mode">
                <button type="button" id="mode-in" class="mode-btn active" aria-pressed="true">Time In</button>
                <button type="button" id="mode-out" class="mode-btn" aria-pressed="false">Time Out</button>
              </div>

              ${renderScannerFrame()}

              <button id="scan-toggle-btn" class="btn btn-outline btn-block" style="margin-bottom:1rem;">
                ${Icons.scan('icon icon-sm')} Start Camera Scanning
              </button>

              <p class="checkin-divider">OR</p>

              <div class="checkin-input-group">
                <input id="scan-input" type="text" class="input input-center" placeholder="Enter Member ID (e.g., M001)" />
                <button id="checkin-btn" class="btn btn-primary btn-block">
                  ${Icons.login('icon icon-sm')} Time In
                </button>
              </div>
            </div>

            <div class="card card-pad">
              <div class="checkin-list-header">
                ${Icons.clock('icon')}
                <h3 id="checkin-count">Today's Check-ins (0)</h3>
                <span id="checkin-inside" class="badge badge-success checkin-inside hidden"></span>
              </div>
              <div class="checkin-list" id="checkin-list"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  attachSidebarEvents();
  renderList();

  document.getElementById('checkin-btn').addEventListener('click', handleManualEntry);
  document.getElementById('scan-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleManualEntry();
  });
  document.getElementById('scan-toggle-btn').addEventListener('click', () => scanner.toggle());
  document.getElementById('mode-in').addEventListener('click', () => setMode('in'));
  document.getElementById('mode-out').addEventListener('click', () => setMode('out'));

  // One-tap Time Out button on each row (list is re-rendered, so use delegation)
  document.getElementById('checkin-list').addEventListener('click', (e) => {
    const btn = e.target.closest('.timeout-btn');
    if (!btn) return;
    const record = Store.state.checkIns.find((c) => c.id === btn.dataset.id);
    if (record) completeTimeOut(record);
  });

  // Stop the camera automatically if the user navigates to another page
  window.__pageCleanup = () => scanner.stop();
}
