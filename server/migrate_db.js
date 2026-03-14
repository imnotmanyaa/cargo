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
        console.log('Checking shipments table...');
        const result = await db.all("PRAGMA table_info(shipments)");
        const hasTrainTime = result.some(col => col.name === 'train_time');

        if (!hasTrainTime) {
            console.log('Adding train_time column...');
            await db.run("ALTER TABLE shipments ADD COLUMN train_time TEXT");
            console.log('Column added successfully.');
        } else {
            console.log('Column train_time already exists.');
        }
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await db.close();
    }
}

migrate();
