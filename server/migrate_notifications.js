import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    const dbPath = path.join(__dirname, '..', 'shipments.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    try {
        console.log('Checking notifications table...');

        await db.exec(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                message TEXT NOT NULL,
                read BOOLEAN DEFAULT 0,
                type TEXT DEFAULT 'info',
                related_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Notifications table checked/created.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await db.close();
    }
}

migrate();
