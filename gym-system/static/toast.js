/* Minimal toast notification system (mimics sonner) */
const toast = {
  container: null,

  _ensure() {
    if (!this.container) this.container = document.getElementById('toast-container');
    return this.container;
  },

  _show(message, type) {
    const container = this._ensure();
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    const icon = type === 'success' ? Icons.check('icon icon-sm') : Icons.alert('icon icon-sm');
    el.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateX(16px)';
      setTimeout(() => el.remove(), 200);
    }, 3000);
  },

  success(message) {
    this._show(message, 'success');
  },

  error(message) {
    this._show(message, 'error');
  },
};
