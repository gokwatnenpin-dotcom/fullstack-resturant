"use strict";

const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const app = require("../src/app");
const { ensureSchema, pool } = require("../src/database/pg");
const store = require("../src/database/store");

let server;
let baseUrl;

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const fetchOptions = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

test.before(async () => {
  await ensureSchema();
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end();
});

test("GET /health returns 200 OK", async () => {
  const { status, data } = await request("/health");
  assert.strictEqual(status, 200);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.status, "ok");
});

test("Users CRUD Endpoints", async () => {
  const uniqueEmail = `test_${Date.now()}@example.com`;

  // 1. Create User
  const createRes = await request("/api/users", {
    method: "POST",
    body: {
      name: "Assessment Tester",
      email: uniqueEmail,
      phone: "123-456-7890",
      role: "customer",
    },
  });
  assert.strictEqual(createRes.status, 201);
  assert.strictEqual(createRes.data.success, true);
  const userId = createRes.data.data.id;
  assert.ok(userId);

  // 2. Get Users List
  const listRes = await request("/api/users");
  assert.strictEqual(listRes.status, 200);
  assert.ok(Array.isArray(listRes.data.data));
  assert.ok(listRes.data.data.some((u) => u.id === userId));

  // 3. Get Single User
  const getRes = await request(`/api/users/${userId}`);
  assert.strictEqual(getRes.status, 200);
  assert.strictEqual(getRes.data.data.email, uniqueEmail);

  // 4. Update User
  const updateRes = await request(`/api/users/${userId}`, {
    method: "PUT",
    body: { name: "Updated Tester", phone: "987-654-3210" },
  });
  assert.strictEqual(updateRes.status, 200);
  assert.strictEqual(updateRes.data.data.name, "Updated Tester");
  assert.strictEqual(updateRes.data.data.phone, "987-654-3210");

  // 5. Delete User
  const delRes = await request(`/api/users/${userId}`, { method: "DELETE" });
  assert.strictEqual(delRes.status, 200);

  // 6. Verify 404 after deletion
  const getAfterDel = await request(`/api/users/${userId}`);
  assert.strictEqual(getAfterDel.status, 404);
});

test("Categories & Menu Items CRUD with Relationships", async () => {
  const catName = `Category_${Date.now()}`;

  // 1. Create Category
  const catRes = await request("/api/categories", {
    method: "POST",
    body: { name: catName, description: "Test category description" },
  });
  assert.strictEqual(catRes.status, 201);
  const categoryId = catRes.data.data.id;

  // 2. Create Menu Item in this Category
  const itemRes = await request("/api/menu-items", {
    method: "POST",
    body: {
      category_id: categoryId,
      name: "Truffle Pasta",
      description: "Pasta with black truffle sauce",
      price: 21.5,
      is_available: true,
    },
  });
  assert.strictEqual(itemRes.status, 201);
  const itemId = itemRes.data.data.id;
  assert.strictEqual(itemRes.data.data.category_id, categoryId);
  assert.strictEqual(itemRes.data.data.price, 21.5);

  // 3. Filter Menu Items by Category
  const filterRes = await request(`/api/menu-items?category_id=${categoryId}`);
  assert.strictEqual(filterRes.status, 200);
  assert.strictEqual(filterRes.data.count, 1);
  assert.strictEqual(filterRes.data.data[0].id, itemId);

  // 4. Update Menu Item
  const updateItemRes = await request(`/api/menu-items/${itemId}`, {
    method: "PUT",
    body: { price: 23.0, is_available: false },
  });
  assert.strictEqual(updateItemRes.status, 200);
  assert.strictEqual(updateItemRes.data.data.price, 23.0);
  assert.strictEqual(updateItemRes.data.data.is_available, false);

  // 5. Clean up item and category
  await request(`/api/menu-items/${itemId}`, { method: "DELETE" });
  await request(`/api/categories/${categoryId}`, { method: "DELETE" });
});

test("Orders & Order Items Workflow (Multiple items calculation and constraints)", async () => {
  // Create user
  const user = await store.createUser({
    name: "Order Customer",
    email: `order_user_${Date.now()}@test.com`,
    phone: "555-9999",
  });

  // Create category & items
  const cat = await store.createCategory({
    name: `Order Category ${Date.now()}`,
    description: "For order tests",
  });

  const item1 = await store.createMenuItem({
    category_id: cat.id,
    name: "Burger Deluxe",
    description: "Juicy beef burger",
    price: 10.0,
    is_available: true,
  });

  const item2 = await store.createMenuItem({
    category_id: cat.id,
    name: "Crispy Fries",
    description: "Golden fries with sea salt",
    price: 4.5,
    is_available: true,
  });

  // Create Order with multiple items: 2x Burger ($20.00) + 3x Fries ($13.50) = $33.50
  const orderRes = await request("/api/orders", {
    method: "POST",
    body: {
      user_id: user.id,
      table_number: 7,
      notes: "Crispy fries extra crunchy",
      items: [
        { menu_item_id: item1.id, quantity: 2 },
        { menu_item_id: item2.id, quantity: 3 },
      ],
    },
  });

  assert.strictEqual(orderRes.status, 201);
  const order = orderRes.data.data;
  assert.strictEqual(order.total_amount, 33.5);
  assert.strictEqual(order.items.length, 2);
  assert.strictEqual(order.status, "pending");

  // Get order by ID
  const getOrderRes = await request(`/api/orders/${order.id}`);
  assert.strictEqual(getOrderRes.status, 200);
  assert.strictEqual(getOrderRes.data.data.items.length, 2);

  // Update order status
  const updateOrderRes = await request(`/api/orders/${order.id}`, {
    method: "PUT",
    body: { status: "completed" },
  });
  assert.strictEqual(updateOrderRes.status, 200);
  assert.strictEqual(updateOrderRes.data.data.status, "completed");

  // Delete order
  const delOrderRes = await request(`/api/orders/${order.id}`, { method: "DELETE" });
  assert.strictEqual(delOrderRes.status, 200);

  // Clean up user and category
  await store.deleteUser(user.id);
  await store.deleteCategory(cat.id);
});
