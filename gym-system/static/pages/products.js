const PRODUCT_CATEGORIES = ['Protein', 'Supplements', 'Drinks', 'Accessories', 'Clothing'];

function renderProductsPage(root) {
  let searchTerm = '';
  const isOwner = Store.state.user?.role === 'owner';

  function getFiltered() {
    return Store.state.products.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  function stockClass(stock) {
    if (stock > 20) return 'text-success';
    if (stock > 10) return 'text-warning';
    return 'text-danger';
  }
  function stockColor(stock) {
    if (stock > 20) return '#16a34a';
    if (stock > 10) return '#ea580c';
    return '#dc2626';
  }

  function renderGridItems() {
    const filtered = getFiltered();
    if (filtered.length === 0) {
      return `<p class="empty-state">No products found</p>`;
    }
    return filtered.map((p) => `
      <div class="product-card">
        <div class="product-card-top">
          <div>
            <h3 class="product-name">${escapeHtml(p.name)}</h3>
            <p class="product-category">${escapeHtml(p.category)}</p>
          </div>
          <span class="tag">${escapeHtml(p.id)}</span>
        </div>
        <p class="product-desc">${escapeHtml(p.description)}</p>
        <div class="product-meta">
          <div>
            <p class="product-meta-label">Price</p>
            <p class="product-price">${formatPeso(p.price)}</p>
          </div>
          <div class="text-center" style="text-align:right;">
            <p class="product-meta-label">Stock</p>
            <p class="product-stock" style="color:${stockColor(p.stock)}">${p.stock}</p>
          </div>
        </div>
        <div class="product-actions">
          ${isOwner ? `
            <button class="btn btn-outline btn-sm edit-btn" data-id="${p.id}">${Icons.edit('icon icon-sm')} Edit</button>
            <button class="btn btn-danger-outline btn-icon-sm delete-btn" data-id="${p.id}">${Icons.trash('icon icon-sm')}</button>
          ` : `<p class="viewonly-note">View only (Staff access)</p>`}
        </div>
      </div>
    `).join('');
  }

  function renderGrid() {
    const grid = document.getElementById('products-grid');
    if (grid) grid.innerHTML = renderGridItems();
    attachGridEvents();
  }

  function attachGridEvents() {
    document.querySelectorAll('.edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => showEditModal(btn.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        Store.deleteProduct(btn.dataset.id);
        toast.success('Product deleted!');
        renderGrid();
      });
    });
  }

  function categoryOptions(selected) {
    return PRODUCT_CATEGORIES.map((c) => `<option value="${c}" ${c === selected ? 'selected' : ''}>${c}</option>`).join('');
  }

  function showAddModal() {
    const overlay = openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Add New Product</h3>
        <p class="modal-desc">Add a product to your gym inventory.</p>
      </div>
      <div>
        <div class="form-group">
          <label class="label" for="add-name">Product Name</label>
          <input id="add-name" class="input" placeholder="Enter product name" />
        </div>
        <div class="form-group">
          <label class="label" for="add-category">Category</label>
          <select id="add-category" class="select">${categoryOptions('Protein')}</select>
        </div>
        <div class="form-group">
          <label class="label" for="add-price">Price (₱)</label>
          <input id="add-price" type="number" step="0.01" class="input" placeholder="0.00" />
        </div>
        <div class="form-group">
          <label class="label" for="add-stock">Stock Quantity</label>
          <input id="add-stock" type="number" class="input" placeholder="0" />
        </div>
        <div class="form-group">
          <label class="label" for="add-desc">Description</label>
          <input id="add-desc" class="input" placeholder="Product description" />
        </div>
        <button id="add-product-submit" class="btn btn-primary btn-block">Add Product</button>
      </div>
    `);

    overlay.querySelector('#add-product-submit').addEventListener('click', () => {
      const name = overlay.querySelector('#add-name').value;
      const category = overlay.querySelector('#add-category').value;
      const price = parseFloat(overlay.querySelector('#add-price').value) || 0;
      const stock = parseInt(overlay.querySelector('#add-stock').value) || 0;
      const description = overlay.querySelector('#add-desc').value;

      Store.addProduct({ name, category, price, stock, description });
      toast.success('Product added!');
      closeModal(overlay);
      renderGrid();
    });
  }

  function showEditModal(id) {
    const p = Store.state.products.find((p) => p.id === id);
    if (!p) return;

    const overlay = openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Edit Product</h3>
        <p class="modal-desc">Update the product information.</p>
      </div>
      <div>
        <div class="form-group">
          <label class="label" for="edit-name">Product Name</label>
          <input id="edit-name" class="input" value="${escapeHtml(p.name)}" />
        </div>
        <div class="form-group">
          <label class="label" for="edit-category">Category</label>
          <select id="edit-category" class="select">${categoryOptions(p.category)}</select>
        </div>
        <div class="form-group">
          <label class="label" for="edit-price">Price (₱)</label>
          <input id="edit-price" type="number" step="0.01" class="input" value="${p.price}" />
        </div>
        <div class="form-group">
          <label class="label" for="edit-stock">Stock Quantity</label>
          <input id="edit-stock" type="number" class="input" value="${p.stock}" />
        </div>
        <div class="form-group">
          <label class="label" for="edit-desc">Description</label>
          <input id="edit-desc" class="input" value="${escapeHtml(p.description)}" />
        </div>
        <button id="edit-product-submit" class="btn btn-primary btn-block">Update Product</button>
      </div>
    `);

    overlay.querySelector('#edit-product-submit').addEventListener('click', () => {
      const name = overlay.querySelector('#edit-name').value;
      const category = overlay.querySelector('#edit-category').value;
      const price = parseFloat(overlay.querySelector('#edit-price').value) || 0;
      const stock = parseInt(overlay.querySelector('#edit-stock').value) || 0;
      const description = overlay.querySelector('#edit-desc').value;

      Store.updateProduct(id, { name, category, price, stock, description });
      toast.success('Product updated!');
      closeModal(overlay);
      renderGrid();
    });
  }

  root.innerHTML = `
    <div class="app-shell">
      ${renderSidebar('#/products')}
      <div class="main-content">
        <div class="content-container">
          ${renderPageHeader('Products', isOwner ? `
            <button id="add-product-btn" class="btn btn-primary">${Icons.plus('icon icon-sm')} Add Product</button>
          ` : '')}

          ${renderSearchBar('product-search', 'Search products by name, category, or ID...')}

          <div class="products-grid" id="products-grid">${renderGridItems()}</div>
        </div>
      </div>
    </div>
  `;

  attachSidebarEvents();
  attachGridEvents();

  if (isOwner) {
    document.getElementById('add-product-btn').addEventListener('click', showAddModal);
  }

  const searchInput = document.getElementById('product-search');
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderGrid();
  });
}
