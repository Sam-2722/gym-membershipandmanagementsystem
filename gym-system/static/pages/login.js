function renderLoginPage(root) {
  root.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-brand">
          <div class="login-brand-icon">${Icons.dumbbell('icon icon-xl')}</div>
          <h1>Gladiator and Sparta Fitness Gym</h1>
          <p>Gym Management System</p>
        </div>

        <form id="login-form" class="login-form">
          <div class="form-group">
            <label class="label" for="username">Username</label>
            <input id="username" type="text" class="input" placeholder="Enter username" required />
          </div>

          <div class="form-group">
            <label class="label" for="password">Password</label>
            <input id="password" type="password" class="input" placeholder="Enter password" required />
          </div>

          <button type="submit" class="btn btn-primary btn-block btn-lg">
            ${Icons.login('icon')} Login
          </button>
        </form>

        <div class="login-divider"><span>or</span></div>

        <a href="#/scan" id="member-scan-btn" class="btn btn-outline btn-block btn-lg">
          ${Icons.qrcode('icon')} Member? Scan your QR code
        </a>
        <p class="login-scan-hint">Time in or time out without logging in</p>

        <div class="login-demo">
          <p class="demo-title">Demo Credentials:</p>
          <p class="demo-line"><strong>Owner:</strong> username: owner / password: owner123</p>
          <p class="demo-line"><strong>Staff:</strong> username: staff / password: staff123</p>
        </div>
      </div>
    </div>
  `;

  const slideshow = startBackgroundSlideshow(root.querySelector('.login-screen'));
  window.__pageCleanup = () => slideshow.stop();

  const form = document.getElementById('login-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (Store.login(username, password)) {
      toast.success('Login successful!');
      window.location.hash = '#/';
    } else {
      toast.error('Invalid username or password');
    }
  });
}
