/**
 * seed_orders.js
 * Script to seed 1,000 pending orders into SQLite database for Admin Order Processing testing
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
    // Check existing orders count
    db.get('SELECT COUNT(*) as count FROM orders', (err, row) => {
        if (err) {
            console.error('Error counting orders:', err);
            return;
        }

        console.log(`Current orders in database: ${row.count}`);

        const stmt = db.prepare('INSERT INTO orders (user_id, total_amount, status, shipping_address, created_at) VALUES (?, ?, ?, ?, ?)');
        const cities = ['TP.HCM', 'Ha Noi', 'Da Nang', 'Can Tho', 'Hai Phong'];
        const amounts = [500000, 1200000, 3500000, 6000000, 15000000, 28000000, 30000000];

        const toAdd = Math.max(TARGET_ORDERS - row.count, 0);
        console.log(`Adding ${toAdd} pending orders to database...`);

        for (let i = 1; i <= toAdd; i++) {
            const amount = amounts[i % amounts.length];
            const city = cities[i % cities.length];
            const address = `${100 + (i % 800)} Nguyen Trai, Q1, ${city}`;
            const date = new Date(Date.now() - (i * 3600 * 1000)).toISOString();
            stmt.run(2, amount, 'pending', address, date);
        }

        stmt.finalize(() => {
            db.all('SELECT status, COUNT(*) as count FROM orders GROUP BY status', [], (err, rows) => {
                console.log('Seeding completed. Summary of orders by status:');
                console.table(rows);
                db.close();
            });
        });
    });
});
