function renderSalesPage(root) {
  let cart = [];

  function stockClass(stock) {
    if (stock > 20) return 'stock-high';
    if (stock > 10) return 'stock-mid';
    return 'stock-low';
  }

  function addToCart(productId) {
    const product = Store.state.products.find((p) => p.id === productId);
    if (!product) return;

    const existingItem = cart.find((item) => item.id === productId);
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        existingItem.quantity += 1;
        toast.success(`Added ${product.name} to cart`);
      } else {
        toast.error('Not enough stock available');
        return;
      }
    } else {
      cart.push({ ...product, quantity: 1 });
      toast.success(`Added ${product.name} to cart`);
    }
    renderCart();
  }

  function updateQuantity(productId, change) {
    const item = cart.find((i) => i.id === productId);
    if (!item) return;
    const newQuantity = item.quantity + change;
    if (newQuantity > 0 && newQuantity <= item.stock) {
      item.quantity = newQuantity;
    } else if (newQuantity <= 0) {
      cart = cart.filter((i) => i.id !== productId);
    }
    renderCart();
  }

  function removeFromCart(productId) {
    cart = cart.filter((item) => item.id !== productId);
    toast.success('Item removed from cart');
    renderCart();
  }

  function getTotal() {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  function handleCheckout() {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    const total = getTotal();

    Store.addSale({
      customerType: 'guest',
      items: cart.map((item) => ({
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: total,
      discount: 0,
      tax: 0,
      total,
    });

    toast.success('Payment processed successfully!');
    cart = [];
    renderCart();
    renderProductsGrid();
  }

  function renderProductsGridItems() {
    return Store.state.products.map((product) => `
      <div class="pos-product-card" data-id="${product.id}">
        <div class="pos-product-top">
          <div>
            <h3 class="pos-product-name">${escapeHtml(product.name)}</h3>
            <p class="pos-product-id">${escapeHtml(product.id)}</p>
          </div>
          <span class="stock-badge ${stockClass(product.stock)}">${product.stock} left</span>
        </div>
        <div class="pos-product-bottom">
          <p class="pos-product-price">${formatPeso(product.price)}</p>
          <button class="btn btn-primary btn-icon-sm add-cart-btn" data-id="${product.id}">${Icons.plus('icon icon-sm')}</button>
        </div>
      </div>
    `).join('');
  }

  function renderProductsGrid() {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;
    grid.innerHTML = renderProductsGridItems();
    grid.querySelectorAll('.pos-product-card').forEach((card) => {
      card.addEventListener('click', () => addToCart(card.dataset.id));
    });
  }

  function renderCartItems() {
    if (cart.length === 0) {
      return `
        <div class="cart-empty">
          ${Icons.cart('icon icon-xl')}
          <p>Cart is empty</p>
        </div>
      `;
    }
    return cart.map((item) => `
      <div class="cart-item">
        <div class="cart-item-top">
          <div class="flex-1">
            <h4 class="cart-item-name">${escapeHtml(item.name)}</h4>
            <p class="cart-item-price">${formatPeso(item.price)}</p>
          </div>
          <button class="btn btn-ghost btn-icon-sm remove-cart-btn" data-id="${item.id}" style="color:#dc2626;">
            ${Icons.trash('icon icon-sm')}
          </button>
        </div>
        <div class="cart-item-bottom">
          <div class="qty-controls">
            <button class="btn btn-outline btn-icon-sm qty-minus-btn" data-id="${item.id}">${Icons.minus('icon icon-sm')}</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="btn btn-outline btn-icon-sm qty-plus-btn" data-id="${item.id}">${Icons.plus('icon icon-sm')}</button>
          </div>
          <span class="cart-item-total">${formatPeso(item.price * item.quantity)}</span>
        </div>
      </div>
    `).join('');
  }

  function renderCart() {
    const itemsEl = document.getElementById('cart-items');
    const countEl = document.getElementById('cart-count');
    const totalEl = document.getElementById('cart-total-value');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (itemsEl) itemsEl.innerHTML = renderCartItems();
    if (countEl) countEl.textContent = cart.length;
    if (totalEl) totalEl.textContent = formatPeso(getTotal());
    if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;

    document.querySelectorAll('.remove-cart-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFromCart(btn.dataset.id);
      });
    });
    document.querySelectorAll('.qty-minus-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateQuantity(btn.dataset.id, -1);
      });
    });
    document.querySelectorAll('.qty-plus-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateQuantity(btn.dataset.id, 1);
      });
    });
  }

  root.innerHTML = `
    <div class="app-shell">
      ${renderSidebar('#/sales')}
      <div class="main-content">
        <div class="content-container">
          <h1 class="page-title" style="margin-bottom:2rem;">Point of Sale</h1>

          <div class="sales-grid">
            <div>
              <div class="card card-pad" style="margin-bottom:1.5rem;">
                <h2 class="section-title" style="font-size:1.25rem;">Products</h2>
                <div class="sales-products-grid" id="pos-products-grid">${renderProductsGridItems()}</div>
              </div>
            </div>

            <div>
              <div class="cart-panel">
                <div class="cart-header">
                  ${Icons.cart('icon')}
                  <h2>Cart</h2>
                  <span class="cart-count" id="cart-count">0</span>
                </div>

                <div class="cart-items" id="cart-items"></div>

                <div class="cart-total-row">
                  <div class="cart-total-inner">
                    <span>Total</span>
                    <span class="cart-total-value" id="cart-total-value">₱0.00</span>
                  </div>
                </div>

                <button id="checkout-btn" class="btn btn-primary btn-block btn-lg" disabled>
                  ${Icons.card('icon')} Complete Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  attachSidebarEvents();
  renderProductsGrid();
  renderCart();

  document.getElementById('checkout-btn').addEventListener('click', handleCheckout);
}
