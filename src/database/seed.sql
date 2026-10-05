-- Sample Seed Data for Restaurant Management System

-- Insert Users
INSERT INTO users (name, email, phone, role) VALUES
('John Doe', 'john.doe@example.com', '555-0101', 'customer'),
('Jane Smith', 'jane.smith@example.com', '555-0102', 'customer'),
('Alice Chef', 'alice.chef@restaurant.com', '555-0103', 'staff'),
('Bob Manager', 'bob.manager@restaurant.com', '555-0104', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert Categories
INSERT INTO categories (name, description) VALUES
('Appetizers', 'Delicious starters to kick off your dining experience'),
('Main Course', 'Hearty, satisfying entrees freshly prepared'),
('Pizza & Pasta', 'Authentic stone-baked pizzas and fresh Italian pasta'),
('Desserts', 'Sweet treats and decadent confectioneries'),
('Beverages', 'Refreshing drinks, iced teas, and artisan coffees')
ON CONFLICT (name) DO NOTHING;

-- Insert Menu Items (using category lookups)
INSERT INTO menu_items (category_id, name, description, price, is_available) VALUES
((SELECT id FROM categories WHERE name = 'Appetizers'), 'Garlic Butter Bruschetta', 'Grilled artisan sourdough topped with roasted garlic, Roma tomatoes, and fresh basil', 8.50, TRUE),
((SELECT id FROM categories WHERE name = 'Appetizers'), 'Crispy Calamari', 'Tender calamari rings flash-fried and served with house lemon-herb aioli', 12.00, TRUE),
((SELECT id FROM categories WHERE name = 'Main Course'), 'Grilled Ribeye Steak', '12oz USDA Prime ribeye with garlic mashed potatoes and seasonal vegetables', 28.50, TRUE),
((SELECT id FROM categories WHERE name = 'Main Course'), 'Pan-Seared Atlantic Salmon', 'Crispy skin salmon with lemon dill butter and wild rice pilaf', 24.00, TRUE),
((SELECT id FROM categories WHERE name = 'Pizza & Pasta'), 'Classic Margherita Pizza', 'San Marzano tomato sauce, fresh buffalo mozzarella, and sweet basil', 15.00, TRUE),
((SELECT id FROM categories WHERE name = 'Pizza & Pasta'), 'Fettuccine Alfredo', 'Handmade egg fettuccine tossed in rich Parmesan cream sauce with roasted chicken', 17.50, TRUE),
((SELECT id FROM categories WHERE name = 'Desserts'), 'Classic Tiramisu', 'Espresso-soaked ladyfingers layered with mascarpone cream and cocoa powder', 7.50, TRUE),
((SELECT id FROM categories WHERE name = 'Desserts'), 'Molten Chocolate Lava Cake', 'Warm dark chocolate cake with a molten center, served with vanilla bean gelato', 8.50, TRUE),
((SELECT id FROM categories WHERE name = 'Beverages'), 'Fresh Lemon Mint Iced Tea', 'Brewed black tea infused with fresh lemon juice and garden mint', 3.50, TRUE),
((SELECT id FROM categories WHERE name = 'Beverages'), 'Italian Sparkling Water', 'Chilled San Pellegrino sparkling mineral water (750ml)', 4.00, TRUE)
ON CONFLICT DO NOTHING;

-- Insert Sample Orders & Order Items
DO $$
DECLARE
  v_user_id INTEGER;
  v_order1_id INTEGER;
  v_order2_id INTEGER;
  v_item_pizza INTEGER;
  v_item_coke INTEGER;
  v_item_bruschetta INTEGER;
  v_item_steak INTEGER;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE email = 'john.doe@example.com' LIMIT 1;
  SELECT id INTO v_item_pizza FROM menu_items WHERE name = 'Classic Margherita Pizza' LIMIT 1;
  SELECT id INTO v_item_coke FROM menu_items WHERE name = 'Fresh Lemon Mint Iced Tea' LIMIT 1;
  SELECT id INTO v_item_bruschetta FROM menu_items WHERE name = 'Garlic Butter Bruschetta' LIMIT 1;
  SELECT id INTO v_item_steak FROM menu_items WHERE name = 'Grilled Ribeye Steak' LIMIT 1;

  -- Create Order 1 if no orders exist yet
  IF NOT EXISTS (SELECT 1 FROM orders LIMIT 1) THEN
    -- Order 1: Table 4, 1 Margherita Pizza ($15) + 2 Iced Tea ($3.50 * 2 = $7) + 1 Bruschetta ($8.50) = $30.50
    INSERT INTO orders (user_id, table_number, status, total_amount, notes)
    VALUES (v_user_id, 4, 'preparing', 30.50, 'Extra napkins please')
    RETURNING id INTO v_order1_id;

    INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES
    (v_order1_id, v_item_pizza, 1, 15.00, 15.00),
    (v_order1_id, v_item_coke, 2, 3.50, 7.00),
    (v_order1_id, v_item_bruschetta, 1, 8.50, 8.50);

    -- Order 2: Table 2, 1 Ribeye Steak ($28.50) + 1 Iced Tea ($3.50) = $32.00
    INSERT INTO orders (user_id, table_number, status, total_amount, notes)
    VALUES (v_user_id, 2, 'completed', 32.00, 'Medium-rare steak')
    RETURNING id INTO v_order2_id;

    INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES
    (v_order2_id, v_item_steak, 1, 28.50, 28.50),
    (v_order2_id, v_item_coke, 1, 3.50, 3.50);
  END IF;
END $$;
