# 📜 Restaurant Management REST API Documentation

Base URL: `http://localhost:5000/api`

---

## 🏥 Health Check

### `GET /health`
Verify server and connection status.

**Response (200 OK):**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2026-10-04T15:12:38.745Z"
}
```

---

## 👥 Users API (`/api/users`)

### 1. Create User
- **Method:** `POST`
- **Endpoint:** `/api/users`
- **Body:**
```json
{
  "name": "Marcus Green",
  "email": "marcus.green@example.com",
  "phone": "555-0144",
  "role": "customer"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": 5,
    "name": "Marcus Green",
    "email": "marcus.green@example.com",
    "phone": "555-0144",
    "role": "customer",
    "created_at": "2026-10-04T15:12:38.958Z"
  }
}
```

### 2. Get All Users
- **Method:** `GET`
- **Endpoint:** `/api/users`
- **Response (200 OK):** Returns array of user objects.

### 3. Get User By ID
- **Method:** `GET`
- **Endpoint:** `/api/users/:id`
- **Response (200 OK):** Single user object.

### 4. Update User
- **Method:** `PUT`
- **Endpoint:** `/api/users/:id`
- **Body:** Any of `{ "name", "email", "phone", "role" }`
- **Response (200 OK):** Updated user object.

### 5. Delete User
- **Method:** `DELETE`
- **Endpoint:** `/api/users/:id`
- **Response (200 OK):** Deleted user confirmation.

---

## 📂 Categories API (`/api/categories`)

### 1. Create Category
- **Method:** `POST`
- **Endpoint:** `/api/categories`
- **Body:**
```json
{
  "name": "Desserts",
  "description": "Sweet treats and pastries"
}
```
- **Response (201 Created):** Created category object.

### 2. Get All Categories
- **Method:** `GET`
- **Endpoint:** `/api/categories`
- **Response (200 OK):** Array of category objects.

### 3. Get Category By ID
- **Method:** `GET`
- **Endpoint:** `/api/categories/:id`
- **Response (200 OK):** Single category object.

### 4. Update Category
- **Method:** `PUT`
- **Endpoint:** `/api/categories/:id`
- **Body:** `{ "name", "description" }`
- **Response (200 OK):** Updated category object.

### 5. Delete Category
- **Method:** `DELETE`
- **Endpoint:** `/api/categories/:id`
- **Response (200 OK):** Confirmation. Note: Deletes associated menu items due to `ON DELETE CASCADE`.

---

## 🍕 Menu Items API (`/api/menu-items`)

### 1. Create Menu Item
- **Method:** `POST`
- **Endpoint:** `/api/menu-items`
- **Body:**
```json
{
  "category_id": 1,
  "name": "Garlic Butter Bruschetta",
  "description": "Grilled artisan sourdough with fresh tomato & basil",
  "price": 8.50,
  "is_available": true
}
```
- **Response (201 Created):** Created menu item with category info.

### 2. Get All Menu Items
- **Method:** `GET`
- **Endpoint:** `/api/menu-items`
- **Query Parameters:**
  - `category_id` (optional): Filter dishes by category ID
  - `is_available` (optional): Filter by availability (`true` or `false`)
  - `search` (optional): Search by dish name or description
- **Response (200 OK):** Array of menu items.

### 3. Get Menu Item By ID
- **Method:** `GET`
- **Endpoint:** `/api/menu-items/:id`
- **Response (200 OK):** Single menu item object.

### 4. Update Menu Item
- **Method:** `PUT`
- **Endpoint:** `/api/menu-items/:id`
- **Body:** Any of `{ "category_id", "name", "description", "price", "is_available" }`
- **Response (200 OK):** Updated menu item object.

### 5. Delete Menu Item
- **Method:** `DELETE`
- **Endpoint:** `/api/menu-items/:id`
- **Response (200 OK):** Confirmation.

---

## 🧾 Orders API (`/api/orders`)

### 1. Create Order (with Multiple Order Items)
- **Method:** `POST`
- **Endpoint:** `/api/orders`
- **Body:**
```json
{
  "user_id": 1,
  "table_number": 4,
  "notes": "No onions on pizza please",
  "items": [
    {
      "menu_item_id": 1,
      "quantity": 2
    },
    {
      "menu_item_id": 5,
      "quantity": 1
    }
  ]
}
```
- **Processing Details:**
  - Validates user and menu items exist in PostgreSQL.
  - Automatically fetches true prices from `menu_items` table and calculates item subtotals and grand total.
  - Executes atomically in a transaction (`BEGIN` ... `COMMIT`).
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 1,
    "user_id": 1,
    "user_name": "John Doe",
    "user_email": "john.doe@example.com",
    "table_number": 4,
    "status": "pending",
    "total_amount": 32.00,
    "notes": "No onions on pizza please",
    "created_at": "2026-10-04T15:12:39.394Z",
    "items": [
      {
        "id": 1,
        "menu_item_id": 1,
        "name": "Garlic Butter Bruschetta",
        "quantity": 2,
        "unit_price": 8.50,
        "subtotal": 17.00
      },
      {
        "id": 2,
        "menu_item_id": 5,
        "name": "Classic Margherita Pizza",
        "quantity": 1,
        "unit_price": 15.00,
        "subtotal": 15.00
      }
    ]
  }
}
```

### 2. Get All Orders
- **Method:** `GET`
- **Endpoint:** `/api/orders`
- **Query Parameters:**
  - `status` (optional): Filter by `pending`, `in-progress`, `completed`, `cancelled`
  - `user_id` (optional): Filter by user
- **Response (200 OK):** Array of orders with customer info and nested items list.

### 3. Get Order By ID
- **Method:** `GET`
- **Endpoint:** `/api/orders/:id`
- **Response (200 OK):** Order object with full customer details and itemized breakdown.

### 4. Update Order
- **Method:** `PUT`
- **Endpoint:** `/api/orders/:id`
- **Body:**
```json
{
  "status": "completed",
  "notes": "Delivered to table"
}
```
- **Response (200 OK):** Updated order.

### 5. Delete Order
- **Method:** `DELETE`
- **Endpoint:** `/api/orders/:id`
- **Response (200 OK):** Confirmation. Cascades and deletes `order_items`.
