/**
 * seed_orders.js
 * Script to seed 1,000 pending orders and multi-admin accounts into SQLite database
 * Supports multi-account testing and lockout simulation
 */
const path = require('path');
const sqlite3 = require(path.resolve(__dirname, '../../eshop-sut/backend/node_modules/sqlite3')).verbose();

const dbPath = path.resolve(__dirname, '../../eshop-sut/backend/database.sqlite');
console.log('Connecting to SQLite database at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Failed to connect to database:', err);
        process.exit(1);
    }
});

const TARGET_ORDERS = 1000;

db.serialize(() => {
    // 1. Clean up duplicate users if any and ensure unique admin accounts
    db.run('DELETE FROM users WHERE id NOT IN (SELECT MIN(id) FROM users GROUP BY email)');

    // Reset lockout counters
    db.run('UPDATE users SET login_attempts = 0, locked_until = NULL');

    const admins = [
        ['Admin User', 'admin@eshop.com', 'Admin123!', 'admin'],
        ['Admin User 1', 'admin1@eshop.com', 'Admin123!', 'admin'],
        ['Admin User 2', 'admin2@eshop.com', 'Admin123!', 'admin'],
        ['Admin User 3', 'admin3@eshop.com', 'Admin123!', 'admin'],
        ['Admin User 4', 'admin4@eshop.com', 'Admin123!', 'admin'],
        ['Admin User 5', 'admin5@eshop.com', 'Admin123!', 'admin'],
        ['Victim Admin', 'victim_admin@eshop.com', 'Admin123!', 'admin']
    ];

    admins.forEach(([name, email, pwd, role]) => {
        db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
            if (!row) {
                db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, pwd, role]);
            }
        });
    });

    // 2. Check and seed orders
    db.get('SELECT COUNT(*) as count FROM orders', (err, row) => {
        if (err) {
            console.error('Error counting orders:', err);
            return;
        }

        console.log(`Current orders in database: ${row.count}`);

        const cities = ['TP.HCM', 'Ha Noi', 'Da Nang', 'Can Tho', 'Hai Phong'];
        const amounts = [500000, 1200000, 3500000, 6000000, 15000000, 28000000, 30000000];

        const toAdd = Math.max(TARGET_ORDERS - row.count, 0);
        if (toAdd > 0) {
            console.log(`Adding ${toAdd} pending orders to database...`);
            const stmt = db.prepare('INSERT INTO orders (user_id, total_amount, status, shipping_address, created_at) VALUES (?, ?, ?, ?, ?)');
            for (let i = 1; i <= toAdd; i++) {
                const amount = amounts[i % amounts.length];
                const city = cities[i % cities.length];
                const address = `${100 + (i % 800)} Nguyen Trai, Q1, ${city}`;
                const date = new Date(Date.now() - (i * 3600 * 1000)).toISOString();
                stmt.run(2, amount, 'pending', address, date);
            }
            stmt.finalize();
        }

        // Reset all orders back to 'pending' so test plans can be executed cleanly repeatedly
        db.run("UPDATE orders SET status = 'pending'", (err) => {
            if (err) console.error('Error resetting order statuses to pending:', err);
            else console.log('All orders reset to pending status for fresh test run.');

            db.all('SELECT status, COUNT(*) as count FROM orders GROUP BY status', [], (err, rows) => {
                console.log('Seeding completed. Summary of orders by status:');
                console.table(rows);

                db.all('SELECT id, name, email, role, login_attempts, locked_until FROM users', [], (err, urows) => {
                    console.log('Active users in database:');
                    console.table(urows);
                    db.close();
                });
            });
        });
    });
});
