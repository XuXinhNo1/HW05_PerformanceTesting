/**
 * reset_lockout.js
 * Script to reset login_attempts and locked_until for all users in SQLite database
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

db.serialize(() => {
    db.run("UPDATE users SET login_attempts = 0, locked_until = NULL", function(err) {
        if (err) {
            console.error('Error resetting lockout:', err);
        } else {
            console.log(`Successfully reset account lockout for users. Rows updated: ${this.changes}`);
        }
    });

    db.all("SELECT id, name, email, role, login_attempts, locked_until FROM users", [], (err, rows) => {
        if (err) {
            console.error('Error fetching users:', err);
        } else {
            console.log('Current user account statuses:');
            console.table(rows);
        }
        db.close();
    });
});
