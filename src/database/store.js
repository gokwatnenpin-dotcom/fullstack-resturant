"use strict";

const { query, pool } = require("./pg");
const ApiError = require("../errors/ApiError");

function formatNumeric(val) {
  if (val === null || val === undefined) return 0;
  return Number(parseFloat(val).toFixed(2));
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    created_at: row.created_at,
  };
}

function mapCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    created_at: row.created_at,
  };
}

function mapMenuItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    category_id: row.category_id,
    category_name: row.category_name || undefined,
    name: row.name,
    description: row.description,
    price: formatNumeric(row.price),
    is_available: row.is_available,
    created_at: row.created_at,
  };
}

// ----------------- USERS -----------------

async function listUsers() {
  const { rows } = await query("SELECT * FROM users ORDER BY id ASC");
  return rows.map(mapUser);
}

async function findUserById(id) {
  const { rows } = await query("SELECT * FROM users WHERE id = $1", [Number(id)]);
  return mapUser(rows[0]);
}

async function findUserByEmail(email) {
  const { rows } = await query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  return mapUser(rows[0]);
}

async function createUser({ name, email, phone, role, password_hash }) {
  const { rows } = await query(
    `INSERT INTO users (name, email, phone, role, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, email, phone, role || "customer", password_hash || null]
  );
  return mapUser(rows[0]);
}

async function findUserAuthByEmail(email) {
  const { rows } = await query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  return rows[0] || null;
}

async function updateUser(id, updates) {
  const allowed = ["name", "email", "phone", "role"];
  const sets = [];
  const values = [];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      values.push(updates[key]);
      sets.push(`${key} = $${values.length}`);
    }
  }

  if (sets.length === 0) {
    return findUserById(id);
  }

  values.push(Number(id));
  const { rows } = await query(
    `UPDATE users SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values
  );

  return mapUser(rows[0]);
}

async function deleteUser(id) {
  const { rows } = await query("DELETE FROM users WHERE id = $1 RETURNING *", [Number(id)]);
  return mapUser(rows[0]);
}

// ----------------- CATEGORIES -----------------

async function listCategories() {
  const { rows } = await query("SELECT * FROM categories ORDER BY id ASC");
  return rows.map(mapCategory);
}

async function findCategoryById(id) {
  const { rows } = await query("SELECT * FROM categories WHERE id = $1", [Number(id)]);
  return mapCategory(rows[0]);
}

async function createCategory({ name, description }) {
  const { rows } = await query(
    `INSERT INTO categories (name, description)
     VALUES ($1, $2)
     RETURNING *`,
    [name, description || ""]
  );
  return mapCategory(rows[0]);
}

async function updateCategory(id, updates) {
  const allowed = ["name", "description"];
  const sets = [];
  const values = [];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      values.push(updates[key]);
      sets.push(`${key} = $${values.length}`);
    }
  }

  if (sets.length === 0) {
    return findCategoryById(id);
  }

  values.push(Number(id));
  const { rows } = await query(
    `UPDATE categories SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values
  );

  return mapCategory(rows[0]);
}

async function deleteCategory(id) {
  const { rows } = await query("DELETE FROM categories WHERE id = $1 RETURNING *", [Number(id)]);
  return mapCategory(rows[0]);
}

// ----------------- MENU ITEMS -----------------

async function listMenuItems(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.category_id !== undefined && filters.category_id !== null && filters.category_id !== "") {
    values.push(Number(filters.category_id));
    conditions.push(`m.category_id = $${values.length}`);
  }

  if (filters.is_available !== undefined && filters.is_available !== null && filters.is_available !== "") {
    values.push(filters.is_available === "true" || filters.is_available === true);
    conditions.push(`m.is_available = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`(m.name ILIKE $${values.length} OR m.description ILIKE $${values.length})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT m.*, c.name AS category_name
    FROM menu_items m
    JOIN categories c ON m.category_id = c.id
    ${whereClause}
    ORDER BY c.name ASC, m.name ASC
  `;

  const { rows } = await query(sql, values);
  return rows.map(mapMenuItem);
}

async function findMenuItemById(id) {
  const sql = `
    SELECT m.*, c.name AS category_name
    FROM menu_items m
    JOIN categories c ON m.category_id = c.id
    WHERE m.id = $1
  `;
  const { rows } = await query(sql, [Number(id)]);
  return mapMenuItem(rows[0]);
}

async function createMenuItem({ category_id, name, description, price, is_available }) {
  const { rows } = await query(
    `INSERT INTO menu_items (category_id, name, description, price, is_available)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [Number(category_id), name, description || "", price, is_available ?? true]
  );
  return findMenuItemById(rows[0].id);
}

async function updateMenuItem(id, updates) {
  const allowed = ["category_id", "name", "description", "price", "is_available"];
  const sets = [];
  const values = [];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      values.push(updates[key]);
      sets.push(`${key} = $${values.length}`);
    }
  }

  if (sets.length === 0) {
    return findMenuItemById(id);
  }

  values.push(Number(id));
  const { rows } = await query(
    `UPDATE menu_items SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values
  );

  if (!rows[0]) return null;
  return findMenuItemById(id);
}

async function deleteMenuItem(id) {
  const { rows } = await query("DELETE FROM menu_items WHERE id = $1 RETURNING *", [Number(id)]);
  return mapMenuItem(rows[0]);
}

// ----------------- ORDERS & ORDER ITEMS -----------------

async function createOrder({ user_id, table_number, notes, items }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Verify user exists
    const userRes = await client.query("SELECT id, name, email FROM users WHERE id = $1", [user_id]);
    if (!userRes.rows[0]) {
      throw new ApiError(404, `User with ID ${user_id} not found`, { code: "USER_NOT_FOUND" });
    }

    // 2. Fetch all menu items for the order
    const menuItemIds = items.map((i) => i.menu_item_id);
    const menuRes = await client.query(
      "SELECT id, name, price, is_available FROM menu_items WHERE id = ANY($1)",
      [menuItemIds]
    );

    const menuMap = new Map();
    for (const item of menuRes.rows) {
      menuMap.set(item.id, item);
    }

    // Verify all menu items exist and are available
    for (const item of items) {
      const found = menuMap.get(item.menu_item_id);
      if (!found) {
        throw new ApiError(404, `Menu item with ID ${item.menu_item_id} not found`, {
          code: "MENU_ITEM_NOT_FOUND",
        });
      }
      if (!found.is_available) {
        throw new ApiError(400, `Menu item "${found.name}" is currently unavailable`, {
          code: "ITEM_UNAVAILABLE",
        });
      }
    }

    // 3. Calculate subtotals and grand total
    let totalAmount = 0;
    const preparedItems = items.map((item) => {
      const menuItem = menuMap.get(item.menu_item_id);
      const unitPrice = formatNumeric(menuItem.price);
      const subtotal = formatNumeric(unitPrice * item.quantity);
      totalAmount += subtotal;
      return {
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal: subtotal,
      };
    });

    totalAmount = formatNumeric(totalAmount);

    // 4. Insert order
    const orderRes = await client.query(
      `INSERT INTO orders (user_id, table_number, status, total_amount, notes)
       VALUES ($1, $2, 'pending', $3, $4)
       RETURNING *`,
      [user_id, table_number || null, totalAmount, notes || ""]
    );

    const orderId = orderRes.rows[0].id;

    // 5. Insert order items
    for (const pItem of preparedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, pItem.menu_item_id, pItem.quantity, pItem.unit_price, pItem.subtotal]
      );
    }

    await client.query("COMMIT");

    // 6. Return fully populated order
    return await findOrderById(orderId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function listOrders(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.user_id) {
    values.push(Number(filters.user_id));
    conditions.push(`o.user_id = $${values.length}`);
  }

  if (filters.status) {
    values.push(filters.status.toLowerCase());
    conditions.push(`o.status = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT 
      o.id,
      o.user_id,
      u.name AS user_name,
      u.email AS user_email,
      o.table_number,
      o.status,
      o.total_amount,
      o.notes,
      o.created_at,
      COUNT(oi.id)::int AS items_count,
      COALESCE(
        json_agg(
          json_build_object(
            'id', oi.id,
            'menu_item_id', oi.menu_item_id,
            'name', m.name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'subtotal', oi.subtotal
          )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'
      ) AS items
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN menu_items m ON oi.menu_item_id = m.id
    ${whereClause}
    GROUP BY o.id, u.name, u.email
    ORDER BY o.created_at DESC, o.id DESC
  `;

  const { rows } = await query(sql, values);

  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    user_name: r.user_name,
    user_email: r.user_email,
    table_number: r.table_number,
    status: r.status,
    total_amount: formatNumeric(r.total_amount),
    notes: r.notes,
    created_at: r.created_at,
    items_count: r.items_count,
    items: r.items.map((it) => ({
      ...it,
      unit_price: formatNumeric(it.unit_price),
      subtotal: formatNumeric(it.subtotal),
    })),
  }));
}

async function findOrderById(id) {
  const sql = `
    SELECT 
      o.id,
      o.user_id,
      u.name AS user_name,
      u.email AS user_email,
      u.phone AS user_phone,
      o.table_number,
      o.status,
      o.total_amount,
      o.notes,
      o.created_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', oi.id,
            'menu_item_id', oi.menu_item_id,
            'name', m.name,
            'category_id', m.category_id,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'subtotal', oi.subtotal
          )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'
      ) AS items
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN menu_items m ON oi.menu_item_id = m.id
    WHERE o.id = $1
    GROUP BY o.id, u.name, u.email, u.phone
  `;

  const { rows } = await query(sql, [Number(id)]);
  if (!rows[0]) return null;

  const r = rows[0];
  return {
    id: r.id,
    user_id: r.user_id,
    user_name: r.user_name,
    user_email: r.user_email,
    user_phone: r.user_phone,
    table_number: r.table_number,
    status: r.status,
    total_amount: formatNumeric(r.total_amount),
    notes: r.notes,
    created_at: r.created_at,
    items: r.items.map((it) => ({
      ...it,
      unit_price: formatNumeric(it.unit_price),
      subtotal: formatNumeric(it.subtotal),
    })),
  };
}

async function updateOrder(id, updates) {
  const allowed = ["status", "table_number", "notes"];
  const sets = [];
  const values = [];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      values.push(updates[key]);
      sets.push(`${key} = $${values.length}`);
    }
  }

  if (sets.length === 0) {
    return findOrderById(id);
  }

  values.push(Number(id));
  const { rows } = await query(
    `UPDATE orders SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values
  );

  if (!rows[0]) return null;
  return findOrderById(id);
}

async function deleteOrder(id) {
  const { rows } = await query("DELETE FROM orders WHERE id = $1 RETURNING *", [Number(id)]);
  return rows[0] || null;
}

module.exports = {
  // Users
  listUsers,
  findUserById,
  findUserByEmail,
  findUserAuthByEmail,
  createUser,
  updateUser,
  deleteUser,

  // Categories
  listCategories,
  findCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,

  // Menu Items
  listMenuItems,
  findMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,

  // Orders
  createOrder,
  listOrders,
  findOrderById,
  updateOrder,
  deleteOrder,
};
