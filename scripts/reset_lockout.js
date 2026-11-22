/**
 * reset_lockout.js
 * Script to reset login_attempts and locked_until for all users in SQLite database
 * Ensures all test accounts (admin1..admin5, victim_admin) exist and are unlocked
 * Used between Stress / Spike runs to restore user accounts from 3-fail lockout
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

const requiredAccounts = [
    ['Admin User', 'admin@eshop.com', 'Admin123!', 'admin'],
    ['Test User', 'test@eshop.com', 'Test1234!', 'user'],
    ['Admin User 1', 'admin1@eshop.com', 'Admin123!', 'admin'],
    ['Admin User 2', 'admin2@eshop.com', 'Admin123!', 'admin'],
    ['Admin User 3', 'admin3@eshop.com', 'Admin123!', 'admin'],
    ['Admin User 4', 'admin4@eshop.com', 'Admin123!', 'admin'],
    ['Admin User 5', 'admin5@eshop.com', 'Admin123!', 'admin'],
    ['Victim Admin', 'victim_admin@eshop.com', 'Admin123!', 'admin']
];

db.serialize(() => {
    // 1. Ensure all test accounts exist (in case database.js was re-initialized)
    requiredAccounts.forEach(([name, email, pwd, role]) => {
        db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
            if (!row) {
                db.run('INSERT INTO users (name, email, password, role, login_attempts, locked_until) VALUES (?, ?, ?, ?, 0, NULL)', [name, email, pwd, role]);
            }
        });
    });

    // 2. Clean duplicate emails if any
    db.run('DELETE FROM users WHERE id NOT IN (SELECT MIN(id) FROM users GROUP BY email)');

    // 3. Reset lockout for ALL accounts (specifically resetting victim_admin and all admins)
    db.run('UPDATE users SET login_attempts = 0, locked_until = NULL', function(err) {
        if (err) {
            console.error('Error resetting lockout:', err);
        } else {
            console.log(`\n[SUCCESS] Successfully reset lockout for all accounts (Rows updated: ${this.changes}).`);
        }
    });

    // 4. Display current status of all accounts
    db.all('SELECT id, name, email, role, login_attempts, locked_until FROM users ORDER BY id ASC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching users:', err);
        } else {
            console.log('\nCurrent user account statuses in database:');
            console.table(rows);
            const victim = rows.find(r => r.email === 'victim_admin@eshop.com');
            if (victim) {
                console.log(`[STATUS] victim_admin@eshop.com is UNLOCKED (login_attempts: ${victim.login_attempts}, locked_until: ${victim.locked_until})`);
            }
        }
        db.close();
    });
});
