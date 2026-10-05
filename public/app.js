"use strict";

// SVGs (Clean black line icons)
const ICONS = {
  USER: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  VIEW: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  EDIT: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
  DELETE: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`,
};

// Auth gate
const currentUser = (() => {
  try {
    return JSON.parse(localStorage.getItem("bf_user"));
  } catch (_) {
    return null;
  }
})();

if (!currentUser) {
  window.location.href = "/login.html";
}

const isStaffOrAdmin = currentUser && (currentUser.role === "admin" || currentUser.role === "staff");

// State
let categories = [];
let menuItems = [];
let users = [];
let orders = [];
let activeCategory = "all";
let cart = []; // Array of { menuItem, quantity }

// API Helper
async function apiRequest(endpoint, options = {}) {
  const method = options.method || "GET";
  const url = endpoint;

  const fetchOptions = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errMsg = (data && data.error && data.error.message) || data.message || `Request failed (${response.status})`;
    throw new Error(errMsg);
  }

  return data;
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.background = isError ? "#dc2626" : "#0f172a";
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

// Route → Tab mapping
const ROUTES = {
  "/":            "tab-menu",
  "/menu":        "tab-menu",
  "/orders":      "tab-orders",
  "/manage-menu": "tab-manage-menu",
  "/categories":  "tab-categories",
  "/customers":   "tab-users",
};

// Tab → Route mapping (for pushState)
const TAB_ROUTES = {
  "tab-menu":        "/menu",
  "tab-orders":      "/orders",
  "tab-manage-menu": "/manage-menu",
  "tab-categories":  "/categories",
  "tab-users":       "/customers",
};

function activateTab(tabId) {
  // Customers may only use the Menu & Order tab
  if (!isStaffOrAdmin && tabId !== "tab-menu") {
    tabId = "tab-menu";
  }

  const navTabs = document.querySelectorAll(".nav-tab");
  navTabs.forEach((t) => t.classList.remove("active"));

  const targetBtn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
  if (targetBtn) targetBtn.classList.add("active");

  document.querySelectorAll(".tab-pane").forEach((pane) => pane.classList.remove("active"));
  document.getElementById(tabId)?.classList.add("active");

  // Auto-refresh data on tab switch
  if (tabId === "tab-orders")      loadOrders();
  if (tabId === "tab-manage-menu") renderMenuManagement();
  if (tabId === "tab-categories")  renderCategories();
  if (tabId === "tab-users")       renderUsers();
}

function navigateTo(tabId, pushState = true) {
  const route = TAB_ROUTES[tabId] || "/menu";
  if (pushState && window.location.pathname !== route) {
    history.pushState({ tabId }, "", route);
  }
  activateTab(tabId);
}

function initTabs() {
  // Tab click → push real URL
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      navigateTo(tab.dataset.tab);
    });
  });

  // Back / Forward buttons
  window.addEventListener("popstate", (e) => {
    const tabId = e.state?.tabId || ROUTES[window.location.pathname] || "tab-menu";
    activateTab(tabId);
  });

  // Activate correct tab from current URL on first load
  const initialTab = ROUTES[window.location.pathname] || "tab-menu";
  // Replace state so popstate has tabId on first back navigation
  history.replaceState({ tabId: initialTab }, "", window.location.pathname === "/" ? "/menu" : window.location.pathname);
  activateTab(initialTab);
}


// ----------------- LOAD INITIAL DATA -----------------
async function loadInitialData() {
  try {
    await Promise.all([loadCategories(), loadMenuItems(), loadUsers(), loadOrders()]);
  } catch (err) {
    showToast(`Error initializing data: ${err.message}`, true);
  }
}

async function loadCategories() {
  const res = await apiRequest("/api/categories");
  categories = res.data || [];
  renderCategoryPills();
  populateCategorySelects();
  renderCategories();
}

async function loadMenuItems() {
  const res = await apiRequest("/api/menu-items");
  menuItems = res.data || [];
  renderMenuGrid();
  renderMenuManagement();
}

async function loadUsers() {
  const res = await apiRequest("/api/users");
  users = res.data || [];
  populateUserSelect();
  renderUsers();
}

async function loadOrders() {
  const statusFilter = document.getElementById("orderStatusFilter")?.value || "all";
  let endpoint = "/api/orders";
  if (statusFilter !== "all") {
    endpoint += `?status=${encodeURIComponent(statusFilter)}`;
  }
  const res = await apiRequest(endpoint);
  orders = res.data || [];
  renderOrders();
}

// ----------------- CATEGORY PILLS & SELECTS -----------------
function renderCategoryPills() {
  const container = document.getElementById("categoryPills");
  if (!container) return;

  container.innerHTML = `<button class="pill ${activeCategory === "all" ? "active" : ""}" data-cat="all">All Dishes</button>`;

  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = `pill ${activeCategory == cat.id ? "active" : ""}`;
    btn.dataset.cat = cat.id;
    btn.textContent = cat.name;
    btn.addEventListener("click", () => {
      activeCategory = cat.id;
      document.querySelectorAll(".category-pills .pill").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      renderMenuGrid();
    });
    container.appendChild(btn);
  });

  // All button listener
  container.querySelector('[data-cat="all"]').addEventListener("click", (e) => {
    activeCategory = "all";
    document.querySelectorAll(".category-pills .pill").forEach((p) => p.classList.remove("active"));
    e.target.classList.add("active");
    renderMenuGrid();
  });
}

function populateCategorySelects() {
  const itemCategorySelect = document.getElementById("itemCategoryId");
  if (!itemCategorySelect) return;

  itemCategorySelect.innerHTML = categories
    .map((c) => `<option value="${c.id}">${c.name}</option>`)
    .join("");
}

function populateUserSelect() {
  const customerSelect = document.getElementById("orderCustomerSelect");
  if (!customerSelect) return;

  const currentVal = customerSelect.value;
  customerSelect.innerHTML = `<option value="">Select Customer...</option>` +
    users.map((u) => `<option value="${u.id}">${u.name} (${u.email})</option>`).join("");

  if (currentVal && users.some((u) => u.id == currentVal)) {
    customerSelect.value = currentVal;
  } else if (users.length > 0) {
    customerSelect.value = users[0].id;
  }

  // Customers always order as themselves
  if (currentUser && currentUser.role === "customer") {
    customerSelect.value = currentUser.id;
    customerSelect.disabled = true;
    document.getElementById("quickAddUserBtn")?.style.setProperty("display", "none");
  }
}

// ----------------- MENU GRID (EXPLORE & ADD TO CART) -----------------
function renderMenuGrid() {
  const grid = document.getElementById("menuItemsList");
  const searchQuery = document.getElementById("menuSearch")?.value.toLowerCase().trim() || "";
  if (!grid) return;

  let filtered = menuItems;

  if (activeCategory !== "all") {
    filtered = filtered.filter((item) => item.category_id == activeCategory);
  }

  if (searchQuery) {
    filtered = filtered.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery) ||
        (item.description && item.description.toLowerCase().includes(searchQuery))
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="loading-state">No dishes match your filter.</div>`;
    return;
  }

  grid.innerHTML = filtered
    .map((item) => {
      const isAvailable = item.is_available;
      return `
        <div class="menu-item-card" data-id="${item.id}">
          <div>
            <span class="item-badge">${item.category_name || "Dish"}</span>
            <h4 class="item-name">${escapeHtml(item.name)}</h4>
            <p class="item-desc">${escapeHtml(item.description || "Freshly made daily.")}</p>
          </div>
          <div class="item-footer">
            <span class="item-price">$${Number(item.price).toFixed(2)}</span>
            ${
              isAvailable
                ? `<button class="btn-primary btn-small add-to-cart-btn" data-id="${item.id}">+ Add</button>`
                : `<span class="badge-status cancelled">Sold Out</span>`
            }
          </div>
        </div>
      `;
    })
    .join("");

  // Attach add-to-cart handlers
  grid.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      addToCart(id);
    });
  });
}

// ----------------- CART MANAGEMENT -----------------
function addToCart(menuItemId) {
  const item = menuItems.find((m) => m.id === menuItemId);
  if (!item) return;

  const existing = cart.find((c) => c.menuItem.id === menuItemId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ menuItem: item, quantity: 1 });
  }

  renderCart();
  showToast(`Added "${item.name}" to order`);
}

function updateCartQuantity(menuItemId, delta) {
  const idx = cart.findIndex((c) => c.menuItem.id === menuItemId);
  if (idx === -1) return;

  cart[idx].quantity += delta;
  if (cart[idx].quantity <= 0) {
    cart.splice(idx, 1);
  }

  renderCart();
}

function clearCart() {
  cart = [];
  renderCart();
}

function renderCart() {
  const list = document.getElementById("cartItemsList");
  const countEl = document.getElementById("cartCount");
  const totalEl = document.getElementById("cartTotal");
  const submitBtn = document.getElementById("placeOrderBtn");

  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = `
      <div class="empty-cart-state">
        <p>Your order is empty.</p>
        <small>Select dishes from the menu to add them to this order.</small>
      </div>
    `;
    countEl.textContent = "0";
    totalEl.textContent = "$0.00";
    submitBtn.disabled = true;
    return;
  }

  let total = 0;
  let totalCount = 0;

  list.innerHTML = cart
    .map(({ menuItem, quantity }) => {
      const subtotal = menuItem.price * quantity;
      total += subtotal;
      totalCount += quantity;

      return `
        <div class="cart-item-row">
          <div class="cart-item-info">
            <div class="cart-item-name">${escapeHtml(menuItem.name)}</div>
            <div class="cart-item-price">$${menuItem.price.toFixed(2)} × ${quantity} = <strong>$${subtotal.toFixed(2)}</strong></div>
          </div>
          <div class="cart-qty-ctrl">
            <button class="qty-btn" onclick="updateCartQuantity(${menuItem.id}, -1)">−</button>
            <span>${quantity}</span>
            <button class="qty-btn" onclick="updateCartQuantity(${menuItem.id}, 1)">+</button>
          </div>
        </div>
      `;
    })
    .join("");

  countEl.textContent = totalCount;
  totalEl.textContent = `$${total.toFixed(2)}`;
  submitBtn.disabled = false;
}

async function placeOrder() {
  const customerId = (currentUser && currentUser.role === "customer")
    ? currentUser.id
    : document.getElementById("orderCustomerSelect").value;
  const tableNum = document.getElementById("orderTableNumber").value;
  const notes = document.getElementById("orderNotes").value;

  if (!customerId) {
    showToast("Please select a customer for this order", true);
    return;
  }

  if (cart.length === 0) {
    showToast("Cart is empty", true);
    return;
  }

  const payload = {
    user_id: Number(customerId),
    table_number: tableNum ? Number(tableNum) : null,
    notes: notes || "",
    items: cart.map((c) => ({
      menu_item_id: c.menuItem.id,
      quantity: c.quantity,
    })),
  };

  try {
    const res = await apiRequest("/api/orders", {
      method: "POST",
      body: payload,
    });

    showToast(`Order #${res.data.id} placed successfully!`);
    clearCart();
    document.getElementById("orderNotes").value = "";

    // Reload orders and switch to Orders tab
    await loadOrders();
    const ordersTabBtn = document.querySelector('[data-tab="tab-orders"]');
    if (ordersTabBtn) ordersTabBtn.click();
  } catch (err) {
    showToast(`Failed to place order: ${err.message}`, true);
  }
}

// ----------------- ORDERS MANAGEMENT -----------------
function renderOrders() {
  const container = document.getElementById("ordersList");
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `<div class="loading-state">No orders found. Place an order from the Menu tab!</div>`;
    return;
  }

  container.innerHTML = orders
    .map((order) => {
      const itemsHtml = (order.items || [])
        .map(
          (it) => `
            <div class="order-card-item-row">
              <span>${escapeHtml(it.name)} × ${it.quantity}</span>
              <span>$${Number(it.subtotal).toFixed(2)}</span>
            </div>
          `
        )
        .join("");

      const dateStr = new Date(order.created_at).toLocaleString();

      return `
        <div class="order-card" data-id="${order.id}">
          <div class="order-card-header">
            <div>
              <div class="order-id-badge">Order #${order.id} ${order.table_number ? `• Table ${order.table_number}` : ""}</div>
              <div class="order-customer">${ICONS.USER} ${escapeHtml(order.user_name || "Customer")} (${order.user_email || ""})</div>
              <small style="color:#94a3b8">${dateStr}</small>
            </div>
            <span class="badge-status ${order.status}">${order.status}</span>
          </div>

          <div class="order-card-items">
            ${itemsHtml || "<em>No item breakdown</em>"}
            ${order.notes ? `<div style="margin-top:0.4rem; font-size:0.78rem; color:#64748b;"><strong>Note:</strong> ${escapeHtml(order.notes)}</div>` : ""}
          </div>

          <div class="order-card-footer">
            <span class="order-total-price">$${Number(order.total_amount).toFixed(2)}</span>
            <div class="order-actions">
              <select class="order-status-select" onchange="changeOrderStatus(${order.id}, this.value)">
                <option value="pending" ${order.status === "pending" ? "selected" : ""}>Pending</option>
                <option value="in-progress" ${order.status === "in-progress" ? "selected" : ""}>In-Progress</option>
                <option value="completed" ${order.status === "completed" ? "selected" : ""}>Completed</option>
                <option value="cancelled" ${order.status === "cancelled" ? "selected" : ""}>Cancelled</option>
              </select>
              <button class="btn-action-icon" onclick="viewOrderDetails(${order.id})" title="View Details">${ICONS.VIEW}</button>
              <button class="btn-action-icon" onclick="deleteOrder(${order.id})" title="Delete Order">${ICONS.DELETE}</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

async function changeOrderStatus(orderId, newStatus) {
  try {
    await apiRequest(`/api/orders/${orderId}`, {
      method: "PUT",
      body: { status: newStatus },
    });
    showToast(`Order #${orderId} status updated to '${newStatus}'`);
    await loadOrders();
  } catch (err) {
    showToast(`Failed to update order status: ${err.message}`, true);
    await loadOrders();
  }
}

async function deleteOrder(orderId) {
  if (!confirm(`Are you sure you want to delete Order #${orderId}?`)) return;

  try {
    await apiRequest(`/api/orders/${orderId}`, { method: "DELETE" });
    showToast(`Order #${orderId} deleted`);
    await loadOrders();
  } catch (err) {
    showToast(`Failed to delete order: ${err.message}`, true);
  }
}

async function viewOrderDetails(orderId) {
  try {
    const res = await apiRequest(`/api/orders/${orderId}`);
    const order = res.data;

    const modal = document.getElementById("orderDetailsModal");
    const body = document.getElementById("orderDetailsBody");
    const title = document.getElementById("orderDetailsTitle");

    title.textContent = `Order #${order.id} Breakdown`;

    const itemsRows = order.items
      .map(
        (it) => `
        <tr>
          <td>${escapeHtml(it.name)}</td>
          <td>${it.quantity}</td>
          <td>$${Number(it.unit_price).toFixed(2)}</td>
          <td><strong>$${Number(it.subtotal).toFixed(2)}</strong></td>
        </tr>
      `
      )
      .join("");

    body.innerHTML = `
      <div class="order-details-grid">
        <div><strong>Customer:</strong> ${escapeHtml(order.user_name)}</div>
        <div><strong>Email:</strong> ${escapeHtml(order.user_email)}</div>
        <div><strong>Table:</strong> ${order.table_number || "Takeout / None"}</div>
        <div><strong>Status:</strong> <span class="badge-status ${order.status}">${order.status}</span></div>
        <div><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</div>
        <div><strong>Total:</strong> <span style="color:var(--primary); font-weight:800; font-size:1.1rem;">$${Number(order.total_amount).toFixed(2)}</span></div>
      </div>
      ${order.notes ? `<p style="margin-bottom:1rem; font-size:0.85rem; color:#475569;"><strong>Notes:</strong> ${escapeHtml(order.notes)}</p>` : ""}

      <div class="order-details-table">
      <table class="data-table">
        <thead>
          <tr>
            <th>Dish Name</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
      </div>
    `;

    openModal("orderDetailsModal");
  } catch (err) {
    showToast(`Could not load order details: ${err.message}`, true);
  }
}

// ----------------- MANAGE MENU ITEMS TABLE -----------------
function renderMenuManagement() {
  const tbody = document.getElementById("menuManagementTableBody");
  if (!tbody) return;

  if (menuItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="loading-state">No menu items found.</td></tr>`;
    return;
  }

  tbody.innerHTML = menuItems
    .map(
      (item) => `
      <tr>
        <td><strong>#${item.id}</strong></td>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td><span class="item-badge">${escapeHtml(item.category_name || "General")}</span></td>
        <td style="color:#64748b; font-size:0.82rem; max-width:280px;">${escapeHtml(item.description || "—")}</td>
        <td><strong style="color:var(--primary)">$${Number(item.price).toFixed(2)}</strong></td>
        <td>${item.is_available ? '<span style="color:#16a34a; font-weight:bold;">Yes</span>' : '<span style="color:#dc2626; font-weight:bold;">No</span>'}</td>
        <td>
          <button class="btn-action-icon" onclick="openEditMenuItemModal(${item.id})" title="Edit">${ICONS.EDIT}</button>
          <button class="btn-action-icon" onclick="deleteMenuItem(${item.id})" title="Delete">${ICONS.DELETE}</button>
        </td>
      </tr>
    `
    )
    .join("");
}

function openAddMenuItemModal() {
  document.getElementById("menuItemForm").reset();
  document.getElementById("menuItemId").value = "";
  document.getElementById("menuItemModalTitle").textContent = "Add New Menu Item";
  document.getElementById("itemAvailable").checked = true;
  openModal("menuItemModal");
}

function openEditMenuItemModal(id) {
  const item = menuItems.find((m) => m.id === id);
  if (!item) return;

  document.getElementById("menuItemId").value = item.id;
  document.getElementById("itemCategoryId").value = item.category_id;
  document.getElementById("itemName").value = item.name;
  document.getElementById("itemDescription").value = item.description || "";
  document.getElementById("itemPrice").value = item.price;
  document.getElementById("itemAvailable").checked = item.is_available;

  document.getElementById("menuItemModalTitle").textContent = `Edit Menu Item #${item.id}`;
  openModal("menuItemModal");
}

async function handleMenuItemSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("menuItemId").value;
  const categoryId = document.getElementById("itemCategoryId").value;
  const name = document.getElementById("itemName").value;
  const description = document.getElementById("itemDescription").value;
  const price = document.getElementById("itemPrice").value;
  const isAvailable = document.getElementById("itemAvailable").checked;

  const payload = {
    category_id: Number(categoryId),
    name,
    description,
    price: Number(price),
    is_available: isAvailable,
  };

  try {
    if (id) {
      await apiRequest(`/api/menu-items/${id}`, { method: "PUT", body: payload });
      showToast(`Menu item #${id} updated`);
    } else {
      await apiRequest("/api/menu-items", { method: "POST", body: payload });
      showToast("Menu item created");
    }
    closeModal("menuItemModal");
    await loadMenuItems();
  } catch (err) {
    showToast(`Save failed: ${err.message}`, true);
  }
}

async function deleteMenuItem(id) {
  if (!confirm(`Are you sure you want to delete Menu Item #${id}?`)) return;

  try {
    await apiRequest(`/api/menu-items/${id}`, { method: "DELETE" });
    showToast(`Menu item #${id} deleted`);
    await loadMenuItems();
  } catch (err) {
    showToast(`Delete failed: ${err.message}`, true);
  }
}

// ----------------- MANAGE CATEGORIES -----------------
function renderCategories() {
  const container = document.getElementById("categoriesCardGrid");
  if (!container) return;

  if (categories.length === 0) {
    container.innerHTML = `<div class="loading-state">No categories defined yet.</div>`;
    return;
  }

  container.innerHTML = categories
    .map((cat) => {
      const itemsInCat = menuItems.filter((m) => m.category_id === cat.id);
      return `
        <div class="category-card" data-id="${cat.id}">
          <div class="category-card-header">
            <h4>${escapeHtml(cat.name)}</h4>
            <span class="item-badge">${itemsInCat.length} dishes</span>
          </div>
          <p class="item-desc">${escapeHtml(cat.description || "No description provided.")}</p>
          <div class="item-footer">
            <span style="font-size:0.75rem; color:#94a3b8;">ID: #${cat.id}</span>
            <div>
              <button class="btn-action-icon" onclick="openEditCategoryModal(${cat.id})" title="Edit">${ICONS.EDIT}</button>
              <button class="btn-action-icon" onclick="deleteCategory(${cat.id})" title="Delete">${ICONS.DELETE}</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function openAddCategoryModal() {
  document.getElementById("categoryForm").reset();
  document.getElementById("categoryId").value = "";
  document.getElementById("categoryModalTitle").textContent = "Add Category";
  openModal("categoryModal");
}

function openEditCategoryModal(id) {
  const cat = categories.find((c) => c.id === id);
  if (!cat) return;

  document.getElementById("categoryId").value = cat.id;
  document.getElementById("categoryName").value = cat.name;
  document.getElementById("categoryDescription").value = cat.description || "";
  document.getElementById("categoryModalTitle").textContent = `Edit Category #${cat.id}`;
  openModal("categoryModal");
}

async function handleCategorySubmit(e) {
  e.preventDefault();
  const id = document.getElementById("categoryId").value;
  const name = document.getElementById("categoryName").value;
  const description = document.getElementById("categoryDescription").value;

  const payload = { name, description };

  try {
    if (id) {
      await apiRequest(`/api/categories/${id}`, { method: "PUT", body: payload });
      showToast(`Category #${id} updated`);
    } else {
      await apiRequest("/api/categories", { method: "POST", body: payload });
      showToast("Category created");
    }
    closeModal("categoryModal");
    await loadCategories();
    await loadMenuItems();
  } catch (err) {
    showToast(`Save failed: ${err.message}`, true);
  }
}

async function deleteCategory(id) {
  if (!confirm(`Deleting Category #${id} will also delete all dishes inside it. Proceed?`)) return;

  try {
    await apiRequest(`/api/categories/${id}`, { method: "DELETE" });
    showToast(`Category #${id} deleted`);
    await loadCategories();
    await loadMenuItems();
  } catch (err) {
    showToast(`Delete failed: ${err.message}`, true);
  }
}

// ----------------- MANAGE USERS / CUSTOMERS -----------------
function renderUsers() {
  const tbody = document.getElementById("usersTableBody");
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="loading-state">No users registered yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = users
    .map(
      (user) => `
      <tr>
        <td><strong>#${user.id}</strong></td>
        <td><strong>${escapeHtml(user.name)}</strong></td>
        <td>${escapeHtml(user.email)}</td>
        <td>${escapeHtml(user.phone || "—")}</td>
        <td><span class="badge-status ${user.role === "admin" ? "cancelled" : user.role === "staff" ? "in-progress" : "completed"}">${user.role}</span></td>
        <td>
          <button class="btn-action-icon" onclick="openEditUserModal(${user.id})" title="Edit">${ICONS.EDIT}</button>
          <button class="btn-action-icon" onclick="deleteUser(${user.id})" title="Delete">${ICONS.DELETE}</button>
        </td>
      </tr>
    `
    )
    .join("");
}

function openAddUserModal() {
  document.getElementById("userForm").reset();
  document.getElementById("userId").value = "";
  document.getElementById("userModalTitle").textContent = "Add Customer";
  document.getElementById("userRole").value = "customer";
  openModal("userModal");
}

function openEditUserModal(id) {
  const user = users.find((u) => u.id === id);
  if (!user) return;

  document.getElementById("userId").value = user.id;
  document.getElementById("userName").value = user.name;
  document.getElementById("userEmail").value = user.email;
  document.getElementById("userPhone").value = user.phone || "";
  document.getElementById("userRole").value = user.role || "customer";
  document.getElementById("userModalTitle").textContent = `Edit Customer #${user.id}`;
  openModal("userModal");
}

async function handleUserSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("userId").value;
  const name = document.getElementById("userName").value;
  const email = document.getElementById("userEmail").value;
  const phone = document.getElementById("userPhone").value;
  const role = document.getElementById("userRole").value;
  const password = document.getElementById("userPassword")?.value;

  const payload = { name, email, phone, role };
  if (password) payload.password = password;

  try {
    if (id) {
      await apiRequest(`/api/users/${id}`, { method: "PUT", body: payload });
      showToast(`User #${id} updated`);
    } else {
      await apiRequest("/api/users", { method: "POST", body: payload });
      showToast("Customer registered");
    }
    closeModal("userModal");
    await loadUsers();
  } catch (err) {
    showToast(`Save failed: ${err.message}`, true);
  }
}

async function deleteUser(id) {
  if (!confirm(`Are you sure you want to delete User #${id}? Associated orders may also be deleted.`)) return;

  try {
    await apiRequest(`/api/users/${id}`, { method: "DELETE" });
    showToast(`User #${id} deleted`);
    await loadUsers();
    await loadOrders();
  } catch (err) {
    showToast(`Delete failed: ${err.message}`, true);
  }
}

// ----------------- MODAL UTILITIES -----------------
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("open");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("open");
}

function initModals() {
  document.querySelectorAll(".modal-close, [data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modalId = btn.dataset.close || btn.closest(".modal-backdrop")?.id;
      if (modalId) closeModal(modalId);
    });
  });

  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) {
      e.target.classList.remove("open");
    }
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ----------------- DOM INITIALIZATION -----------------
document.addEventListener("DOMContentLoaded", () => {
  // Show logged in user + role-based nav
  const chip = document.getElementById("userChip");
  if (chip && currentUser) {
    chip.textContent = `${currentUser.name} (${currentUser.role})`;
  }
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("bf_user");
    window.location.href = "/login.html";
  });

  document.querySelectorAll(".nav-tab[data-roles]").forEach((tab) => {
    const roles = tab.dataset.roles.split(",");
    if (!currentUser || !roles.includes(currentUser.role)) {
      tab.style.display = "none";
    }
  });

  initTabs();
  initModals();
  loadInitialData();

  // Search input listener
  document.getElementById("menuSearch")?.addEventListener("input", renderMenuGrid);

  // Cart action listeners
  document.getElementById("clearCartBtn")?.addEventListener("click", clearCart);
  document.getElementById("placeOrderBtn")?.addEventListener("click", placeOrder);

  // Order status filter
  document.getElementById("orderStatusFilter")?.addEventListener("change", loadOrders);
  document.getElementById("refreshOrdersBtn")?.addEventListener("click", loadOrders);

  // Quick Add user button
  document.getElementById("quickAddUserBtn")?.addEventListener("click", openAddUserModal);

  // Modal open buttons
  document.getElementById("openAddMenuItemModalBtn")?.addEventListener("click", openAddMenuItemModal);
  document.getElementById("openAddCategoryModalBtn")?.addEventListener("click", openAddCategoryModal);
  document.getElementById("openAddUserModalBtn")?.addEventListener("click", openAddUserModal);

  // Form submission listeners
  document.getElementById("menuItemForm")?.addEventListener("submit", handleMenuItemSubmit);
  document.getElementById("categoryForm")?.addEventListener("submit", handleCategorySubmit);
  document.getElementById("userForm")?.addEventListener("submit", handleUserSubmit);
});
