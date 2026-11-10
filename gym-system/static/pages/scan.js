/* ==========================================================================
   Member QR Scan - opened from the login page, NO login needed.
   A member picks Time In or Time Out and shows their QR code to the camera.
   Only the result for the person who just scanned is shown (no member list),
   and there is no manual ID box, so nobody can time in/out for someone else.
   ========================================================================== */

function renderMemberScanPage(root) {
  let mode = 'in';
  let clearTimer = null;
  const RESULT_VISIBLE_MS = 8000;

  // Same QR held up again within 8 seconds is ignored (no accidental double scan)
  const scanner = createQrScanner({ cooldownMs: RESULT_VISIBLE_MS, onCode: handleCode });

  function idleHtml() {
    return `<p>Ready - show your QR code to the camera</p>`;
  }

  function showResult(result) {
    const panel = document.getElementById('scan-result');
    if (!panel) return;

    if (result.ok) {
      const isOut = result.kind === 'out';
      panel.className = 'scan-result scan-result-success';
      panel.innerHTML = `
        <div class="scan-result-icon">${Icons.check('icon icon-lg')}</div>
        <div>
          <p class="scan-result-title">${isOut ? 'Goodbye' : 'Welcome'}, ${escapeHtml(result.memberName)}!</p>
          <p class="scan-result-text">${isOut
            ? `Timed out at ${formatTime(result.time)} (time spent: ${escapeHtml(result.duration)})`
            : `Timed in at ${formatTime(result.time)}`}</p>
        </div>
      `;
    } else {
      panel.className = 'scan-result scan-result-error';
      panel.innerHTML = `
        <div class="scan-result-icon">${Icons.alert('icon icon-lg')}</div>
        <div>
          <p class="scan-result-title">${escapeHtml(result.message)}</p>
          <p class="scan-result-text">Please ask the front desk if you need help.</p>
        </div>
      `;
    }

    clearTimeout(clearTimer);
    clearTimer = setTimeout(() => {
      const el = document.getElementById('scan-result');
      if (!el) return;
      el.className = 'scan-result scan-result-idle';
      el.innerHTML = idleHtml();
    }, RESULT_VISIBLE_MS);
  }

  function handleCode(value) {
    showResult(recordAttendance(mode, value));
  }

  function setMode(newMode) {
    mode = newMode;
    scanner.resetCooldown();
    const isOut = mode === 'out';
    document.getElementById('mode-in').classList.toggle('active', !isOut);
    document.getElementById('mode-out').classList.toggle('active', isOut);
    document.getElementById('mode-in').setAttribute('aria-pressed', String(!isOut));
    document.getElementById('mode-out').setAttribute('aria-pressed', String(isOut));
    document.getElementById('mode-toggle').dataset.mode = mode;
  }

  root.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-brand scan-brand">
          <div class="login-brand-icon">${Icons.scan('icon icon-xl')}</div>
          <h1>Member QR Scan</h1>
          <p>Choose Time In or Time Out, then show your QR code to the camera</p>
        </div>

        <div class="mode-toggle" id="mode-toggle" data-mode="in" role="group" aria-label="Scan mode">
          <button type="button" id="mode-in" class="mode-btn active" aria-pressed="true">Time In</button>
          <button type="button" id="mode-out" class="mode-btn" aria-pressed="false">Time Out</button>
        </div>

        ${renderScannerFrame()}

        <button id="scan-toggle-btn" class="btn btn-outline btn-block" style="margin-bottom:1rem;">
          ${Icons.scan('icon icon-sm')} Start Camera Scanning
        </button>

        <div id="scan-result" class="scan-result scan-result-idle" role="status" aria-live="polite">${idleHtml()}</div>

        <a href="#/login" id="scan-back-btn" class="btn btn-outline btn-block">
          ${Icons.chevronLeft('icon icon-sm')} Back to login
        </a>
      </div>
    </div>
  `;

  const slideshow = startBackgroundSlideshow(root.querySelector('.login-screen'));

  document.getElementById('mode-in').addEventListener('click', () => setMode('in'));
  document.getElementById('mode-out').addEventListener('click', () => setMode('out'));
  document.getElementById('scan-toggle-btn').addEventListener('click', () => scanner.toggle());

  // Leaving this page turns the camera and the slideshow timer off
  window.__pageCleanup = () => {
    clearTimeout(clearTimer);
    scanner.stop();
    slideshow.stop();
  };

  // Start the camera straight away so members only have to hold up their code
  scanner.start();
}
