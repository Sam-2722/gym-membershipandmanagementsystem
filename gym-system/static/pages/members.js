function renderMembersPage(root) {
  let searchTerm = '';

  function getFiltered() {
    return Store.state.members.filter((m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  function renderTableRows() {
    const filtered = getFiltered();
    if (filtered.length === 0) {
      return `<tr><td colspan="7" class="empty-state">No members found</td></tr>`;
    }
    return filtered.map((m) => `
      <tr>
        <td style="font-weight:500;">${escapeHtml(m.id)}</td>
        <td>${escapeHtml(m.name)}</td>
        <td class="cell-muted">
          <div>${escapeHtml(m.email)}</div>
          <div class="cell-subtle">${escapeHtml(m.phone)}</div>
        </td>
        <td>${escapeHtml(m.membershipType)}</td>
        <td><span class="badge ${m.status === 'Active' ? 'badge-success' : 'badge-danger'}">${m.status}</span></td>
        <td class="cell-muted">${escapeHtml(m.expiryDate)}</td>
        <td>
          <div class="cell-actions">
            <button class="btn btn-outline btn-sm qr-btn" data-id="${m.id}">${Icons.qrcode('icon icon-sm')} QR Code</button>
            <button class="btn btn-danger-outline btn-icon-sm delete-btn" data-id="${m.id}" data-name="${escapeHtml(m.name)}">${Icons.trash('icon icon-sm')}</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function renderTable() {
    const tbody = document.getElementById('members-tbody');
    if (tbody) tbody.innerHTML = renderTableRows();
    attachRowEvents();
  }

  function attachRowEvents() {
    document.querySelectorAll('.qr-btn').forEach((btn) => {
      btn.addEventListener('click', () => showQrModal(btn.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleDelete(btn.dataset.id, btn.dataset.name));
    });
  }

  function handleDelete(id, name) {
    if (confirm(`Delete ${name}?`)) {
      Store.deleteMember(id);
      toast.success('Member deleted!');
      renderTable();
    }
  }

  function showQrModal(id) {
    const member = Store.state.members.find((m) => m.id === id);
    if (!member) return;

    const overlay = openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Member QR Code</h3>
        <p class="modal-desc">Download QR code for this member.</p>
      </div>
      <div class="qr-panel">
        <canvas id="qr-canvas"></canvas>
        <div class="text-center">
          <p class="qr-panel-name">${escapeHtml(member.name)}</p>
          <p class="qr-panel-id">ID: ${escapeHtml(member.id)}</p>
        </div>
        <button id="download-qr-btn" class="btn btn-primary btn-block">
          ${Icons.download('icon')} Download QR Code
        </button>
      </div>
    `);

    const canvas = overlay.querySelector('#qr-canvas');
    QRCode.toCanvas(canvas, member.id, { width: 256, errorCorrectionLevel: 'H', margin: 2 }, (err) => {
      if (err) console.error(err);
    });

    overlay.querySelector('#download-qr-btn').addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = `${member.name.replace(/\s+/g, '_')}_QR.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('QR Code downloaded!');
    });
  }

  function showAddModal() {
    const overlay = openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Add New Member</h3>
        <p class="modal-desc">Register a new gym member.</p>
      </div>
      <div>
        <div class="form-group">
          <label class="label" for="new-name">Full Name</label>
          <input id="new-name" class="input" placeholder="Enter name" />
        </div>
        <div class="form-group">
          <label class="label" for="new-email">Email (Gmail only)</label>
          <input id="new-email" type="email" class="input" placeholder="yourname@gmail.com" autocomplete="off" />
        </div>
        <div class="form-group">
          <label class="label" for="new-phone">Phone (numbers only)</label>
          <input id="new-phone" type="tel" inputmode="numeric" class="input" placeholder="e.g., 09171234567" autocomplete="off" />
        </div>
        <div class="form-group">
          <label class="label" for="new-type">Membership Type</label>
          <select id="new-type" class="select">
            <option value="Weekly">Weekly - ₱100</option>
            <option value="2 Weeks">2 Weeks - ₱200</option>
            <option value="Monthly">Monthly - ₱400</option>
          </select>
        </div>
        <button id="add-member-submit" class="btn btn-primary btn-block">Add Member</button>
      </div>
    `);

    // Phone: drop anything that isn't a digit as the user types or pastes
    const phoneInput = overlay.querySelector('#new-phone');
    phoneInput.addEventListener('input', () => {
      phoneInput.value = phoneInput.value.replace(/\D/g, '');
    });

    // Clear the red outline as soon as the field is edited
    overlay.querySelectorAll('.input').forEach((el) => {
      el.addEventListener('input', () => el.classList.remove('input-invalid'));
    });

    function markInvalid(selector) {
      const el = overlay.querySelector(selector);
      el.classList.add('input-invalid');
      el.focus();
    }

    overlay.querySelector('#add-member-submit').addEventListener('click', () => {
      const name = overlay.querySelector('#new-name').value.trim();
      const email = overlay.querySelector('#new-email').value.trim().toLowerCase();
      const phone = phoneInput.value.trim();
      const membershipType = overlay.querySelector('#new-type').value;

      if (!name || !email || !phone) {
        toast.error('Please fill in all fields');
        return;
      }

      if (!isValidGmail(email)) {
        markInvalid('#new-email');
        toast.error('Email must be a Gmail address, like name@gmail.com');
        return;
      }

      if (!isValidPhone(phone)) {
        markInvalid('#new-phone');
        toast.error('Phone number must be 7 to 15 digits, numbers only');
        return;
      }

      Store.addMember({ name, email, phone, membershipType });
      toast.success('Member added successfully!');
      closeModal(overlay);
      renderTable();
    });
  }

  root.innerHTML = `
    <div class="app-shell">
      ${renderSidebar('#/members')}
      <div class="main-content">
        <div class="content-container">
          ${renderPageHeader('Members', `
            <button id="add-member-btn" class="btn btn-primary">${Icons.plus('icon icon-sm')} Add Member</button>
          `)}

          ${renderSearchBar('member-search', 'Search members by name, ID, or email...')}

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  ${['Member ID', 'Name', 'Contact', 'Membership', 'Status', 'Expiry Date', 'Actions']
                    .map((h) => `<th>${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody id="members-tbody">${renderTableRows()}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  attachSidebarEvents();
  attachRowEvents();

  document.getElementById('add-member-btn').addEventListener('click', showAddModal);

  const searchInput = document.getElementById('member-search');
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderTable();
  });
}
