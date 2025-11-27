# SQL Examples for Orbital DB

This document provides example SQL statements for all supported operations in Orbital DB, organized by category.

## Data Query Language (DQL)

### SELECT - Basic Query
```sql
SELECT * FROM my_table;
```

### SELECT with WHERE Clause
```sql
SELECT name, age, email
FROM customers
WHERE age >= 18
ORDER BY name;
```

### SELECT with JOIN
```sql
SELECT o.order_id, c.name, o.total
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.total > 100;
```

### SELECT with Aggregation
```sql
SELECT
  category,
  COUNT(*) as product_count,
  AVG(price) as avg_price,
  MAX(price) as max_price
FROM products
GROUP BY category
HAVING COUNT(*) > 5;
```

### WITH (Common Table Expression)
```sql
WITH high_value_customers AS (
  SELECT customer_id, SUM(total) as lifetime_value
  FROM orders
  GROUP BY customer_id
  HAVING SUM(total) > 1000
)
SELECT c.name, hvc.lifetime_value
FROM customers c
JOIN high_value_customers hvc ON c.id = hvc.customer_id;
```

---

## Data Definition Language (DDL)

### CREATE TABLE
```sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE,
  age INTEGER CHECK (age >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### CREATE TABLE with Constraints
```sql
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  total DECIMAL(10, 2) CHECK (total >= 0),
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

### CREATE VIEW
```sql
CREATE VIEW customer_summary AS
SELECT
  c.id,
  c.name,
  COUNT(o.order_id) as order_count,
  SUM(o.total) as total_spent
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name;
```

### ALTER TABLE - Add Column
```sql
ALTER TABLE customers
ADD COLUMN phone VARCHAR;
```

### ALTER TABLE - Modify Column
```sql
ALTER TABLE customers
ALTER COLUMN email SET NOT NULL;
```

### DROP TABLE
```sql
DROP TABLE IF EXISTS temp_table;
```

### DROP VIEW
```sql
DROP VIEW IF EXISTS customer_summary;
```

### TRUNCATE TABLE
```sql
TRUNCATE TABLE temp_data;
```

---

## Data Manipulation Language (DML)

### INSERT - Single Row
```sql
INSERT INTO customers (id, name, email, age)
VALUES (1, 'Alice Johnson', 'alice@example.com', 28);
```

### INSERT - Multiple Rows
```sql
INSERT INTO customers (id, name, email, age) VALUES
  (2, 'Bob Smith', 'bob@example.com', 35),
  (3, 'Carol White', 'carol@example.com', 42),
  (4, 'David Brown', 'david@example.com', 31);
```

### INSERT - From SELECT
```sql
INSERT INTO archived_orders
SELECT * FROM orders
WHERE created_at < '2023-01-01';
```

### UPDATE - Single Record
```sql
UPDATE customers
SET email = 'alice.j@example.com'
WHERE id = 1;
```

### UPDATE - Multiple Records
```sql
UPDATE orders
SET status = 'completed'
WHERE status = 'pending' AND created_at < CURRENT_TIMESTAMP - INTERVAL 7 DAY;
```

### UPDATE - With Calculation
```sql
UPDATE products
SET price = price * 1.1
WHERE category = 'electronics';
```

### DELETE - Specific Records
```sql
DELETE FROM temp_data
WHERE created_at < CURRENT_TIMESTAMP - INTERVAL 30 DAY;
```

### DELETE - All Records (use with caution!)
```sql
DELETE FROM staging_table;
```

---

## Transaction Control Language (TCL)

### BEGIN TRANSACTION
```sql
BEGIN TRANSACTION;
```

### COMMIT - Save Changes
```sql
BEGIN TRANSACTION;

INSERT INTO customers (id, name, email, age)
VALUES (100, 'Test User', 'test@example.com', 25);

UPDATE customers
SET age = age + 1
WHERE id = 100;

COMMIT;
```

### ROLLBACK - Undo Changes
```sql
BEGIN TRANSACTION;

DELETE FROM customers WHERE id = 1;

-- Oops, wrong ID! Undo the change
ROLLBACK;
```

### SAVEPOINT - Partial Rollback
```sql
BEGIN TRANSACTION;

INSERT INTO customers (id, name, email, age)
VALUES (200, 'User A', 'a@example.com', 30);

SAVEPOINT sp1;

INSERT INTO customers (id, name, email, age)
VALUES (201, 'User B', 'b@example.com', 25);

-- Undo User B insertion but keep User A
ROLLBACK TO SAVEPOINT sp1;

COMMIT;
```

---

## Working with Attached Files

### Query CSV File
```sql
-- First, attach the file using the Profile UI with alias 'sales_data'
SELECT * FROM sales_data
WHERE amount > 1000
ORDER BY date DESC;
```

### Join Attached File with Table
```sql
-- Assuming 'products.csv' is attached as 'product_catalog'
SELECT
  o.order_id,
  pc.product_name,
  o.quantity,
  pc.price * o.quantity as total
FROM orders o
JOIN product_catalog pc ON o.product_id = pc.id;
```

### Aggregate Attached Parquet Data
```sql
-- Assuming 'events.parquet' is attached as 'user_events'
SELECT
  DATE_TRUNC('day', timestamp) as day,
  event_type,
  COUNT(*) as event_count
FROM user_events
GROUP BY day, event_type
ORDER BY day DESC, event_count DESC;
```

---

## DuckDB-Specific Features

### Read CSV Directly (Alternative to Attached Files)
```sql
SELECT * FROM read_csv('/path/to/file.csv', AUTO_DETECT=TRUE);
```

### Read Parquet Directly
```sql
SELECT * FROM read_parquet('/path/to/file.parquet');
```

### Read JSON Directly
```sql
SELECT * FROM read_json('/path/to/file.json', AUTO_DETECT=TRUE);
```

### Read Multiple Files with Glob Pattern
```sql
SELECT * FROM read_csv('data/*.csv', UNION_BY_NAME=TRUE);
```

### Export Query Results to CSV
```sql
COPY (SELECT * FROM customers WHERE age > 25)
TO '/path/to/output.csv' (HEADER, DELIMITER ',');
```

### Generate Sequence
```sql
SELECT * FROM generate_series(1, 10) AS t(id);
```

### String Aggregation
```sql
SELECT
  category,
  STRING_AGG(product_name, ', ') as products
FROM products
GROUP BY category;
```

### Window Functions
```sql
SELECT
  name,
  salary,
  department,
  RANK() OVER (PARTITION BY department ORDER BY salary DESC) as rank_in_dept
FROM employees;
```

---

## Performance Tips

### Create Index
```sql
CREATE INDEX idx_customers_email ON customers(email);
```

### Analyze Query Plan
```sql
EXPLAIN SELECT * FROM customers WHERE email = 'alice@example.com';
```

### Get Table Info
```sql
DESCRIBE customers;
```

### Check Table Size
```sql
SELECT
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('customers')) as total_size
FROM customers;
```

---

## Persistence Modes

### 💾 File-Based Database
- Changes persist to disk automatically
- Database file survives app restarts
- Example path: `/Users/you/data/mydb.duckdb`
- Use for: Production data, long-term storage

### 🧠 In-Memory Database
- Changes lost when connection closes
- Extremely fast (no disk I/O)
- Path: `:memory:`
- Use for: Temporary analysis, testing, ETL staging

---

## Best Practices

1. **Use Transactions for Multi-Statement Operations**
   ```sql
   BEGIN TRANSACTION;
   -- Your statements here
   COMMIT; -- or ROLLBACK on error
   ```

2. **Test DML on Small Datasets First**
   ```sql
   -- Test with LIMIT first
   SELECT * FROM customers WHERE age < 18 LIMIT 10;

   -- Then execute DELETE
   DELETE FROM customers WHERE age < 18;
   ```

3. **Use CTEs for Complex Queries**
   - Improves readability
   - Can improve performance
   - Easier to debug

4. **Leverage Attached Files**
   - No need to import CSV/Parquet into database
   - DuckDB reads them efficiently
   - Perfect for exploratory analysis

5. **Check Affected Rows**
   - Orbital DB shows affected row count for DML operations
   - Verify the count matches your expectations

---

For more DuckDB-specific SQL features, see:
- [DuckDB SQL Documentation](https://duckdb.org/docs/sql/introduction)
- [DuckDB Functions](https://duckdb.org/docs/sql/functions/overview)
