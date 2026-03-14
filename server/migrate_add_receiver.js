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

    console.log('Migrating shipments table...');

    try {
        await db.exec('ALTER TABLE shipments ADD COLUMN receiver_name TEXT');
        console.log('Added receiver_name column');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('receiver_name column already exists');
        } else {
            console.error('Error adding receiver_name:', e);
        }
    }

    try {
        await db.exec('ALTER TABLE shipments ADD COLUMN receiver_phone TEXT');
        console.log('Added receiver_phone column');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('receiver_phone column already exists');
        } else {
            console.error('Error adding receiver_phone:', e);
        }
    }

    console.log('Migration complete.');
}

migrate();
