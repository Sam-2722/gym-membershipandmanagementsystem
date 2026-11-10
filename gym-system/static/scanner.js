/* ==========================================================================
   Shared by the staff Check-In page and the public Member QR Scan page:
     - renderScannerFrame()  : the camera box markup
     - createQrScanner()     : start/stop the camera and read QR codes
     - recordAttendance()    : the Time In / Time Out rules
   ========================================================================== */

function renderScannerFrame() {
  return `
    <div class="scanner-frame">
      <video id="scanner-video" class="scanner-video" playsinline muted></video>
      <div class="scanner-overlay" id="scanner-overlay">
        ${Icons.scan('icon icon-xxl')}
        <p>Camera preview will appear here</p>
        <p>Tap "Start Camera Scanning" below</p>
      </div>
      <div class="scanner-corner scanner-corner-tl"></div>
      <div class="scanner-corner scanner-corner-tr"></div>
      <div class="scanner-corner scanner-corner-bl"></div>
      <div class="scanner-corner scanner-corner-br"></div>
    </div>
  `;
}

/* Expects the markup from renderScannerFrame() plus a button with
   id="scan-toggle-btn" on the page. onCode(text) is called for each QR read. */
function createQrScanner({ onCode, cooldownMs = 3000 }) {
  let stream = null;
  let scanning = false;
  let starting = false;
  let rafId = null;
  let scanCanvas = null;
  let lastCode = null;
  let lastTime = 0;

  function setToggleLabel(label) {
    const btn = document.getElementById('scan-toggle-btn');
    if (btn) btn.innerHTML = `${Icons.scan('icon icon-sm')} ${label}`;
  }

  function stop() {
    scanning = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    const video = document.getElementById('scanner-video');
    if (video) video.srcObject = null;
    const overlay = document.getElementById('scanner-overlay');
    if (overlay) overlay.style.display = 'flex';
    setToggleLabel('Start Camera Scanning');
  }

  function frame() {
    if (!scanning) return;
    const video = document.getElementById('scanner-video');

    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      if (!scanCanvas) scanCanvas = document.createElement('canvas');
      scanCanvas.width = video.videoWidth;
      scanCanvas.height = video.videoHeight;
      const ctx = scanCanvas.getContext('2d');
      ctx.drawImage(video, 0, 0, scanCanvas.width, scanCanvas.height);
      const imageData = ctx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (result && result.data) {
        const now = Date.now();
        if (result.data !== lastCode || now - lastTime > cooldownMs) {
          lastCode = result.data;
          lastTime = now;
          onCode(result.data);
        }
      }
    }

    rafId = requestAnimationFrame(frame);
  }

  async function start() {
    if (scanning || starting) return;

    if (typeof jsQR === 'undefined') {
      toast.error('QR scanner library failed to load (check internet connection)');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error('Camera access needs a secure context - run via the local server (see README)');
      return;
    }

    starting = true;
    let mediaStream;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
    } catch (err) {
      starting = false;
      toast.error('Could not access camera: ' + (err.message || 'permission denied'));
      return;
    }
    starting = false;

    const video = document.getElementById('scanner-video');
    const overlay = document.getElementById('scanner-overlay');
    if (!video) {
      // the person left the page while the camera was starting
      mediaStream.getTracks().forEach((track) => track.stop());
      return;
    }

    stream = mediaStream;
    video.srcObject = stream;
    try {
      await video.play();
    } catch (err) {
      /* some browsers auto-play once metadata loads; ignore benign play() interruptions */
    }
    if (overlay) overlay.style.display = 'none';

    scanning = true;
    setToggleLabel('Stop Camera Scanning');
    rafId = requestAnimationFrame(frame);
  }

  return {
    start,
    stop,
    toggle() { return scanning ? stop() : start(); },
    /* forget the last code so the same QR can be read again right away */
    resetCooldown() { lastCode = null; lastTime = 0; },
    isScanning: () => scanning,
  };
}

/* Time In / Time Out rules. Returns plain text (escape it before putting in HTML):
   { ok, kind: 'in' | 'out', message, memberName, time, duration } */
function recordAttendance(mode, rawId) {
  const memberId = String(rawId || '').trim().toUpperCase();
  if (!memberId) return { ok: false, message: 'Please enter a member ID' };

  const member = Store.state.members.find((m) => m.id === memberId);

  if (mode === 'out') {
    const open = Store.getOpenCheckIn(memberId);
    if (!open) {
      return { ok: false, message: member ? `${member.name} has no time in today` : 'Member not found' };
    }
    const done = Store.timeOutCheckIn(open.id);
    const duration = formatDuration(done.timestamp, done.timeOut);
    return {
      ok: true, kind: 'out', memberName: done.memberName, time: done.timeOut, duration,
      message: `${done.memberName} timed out after ${duration}`,
    };
  }

  if (!member) return { ok: false, message: 'Member not found' };

  if (member.status !== 'Active') {
    return { ok: false, message: `${member.name}'s membership has expired!` };
  }

  const open = Store.getOpenCheckIn(member.id);
  if (open) {
    return { ok: false, message: `${member.name} already timed in at ${formatTime(open.timestamp)}. Time out first.` };
  }

  const record = Store.addCheckIn({ memberId: member.id, memberName: member.name });
  return {
    ok: true, kind: 'in', memberName: member.name, time: record.timestamp,
    message: `${member.name} timed in at ${formatTime(record.timestamp)}`,
  };
}
