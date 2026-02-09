
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addCostColumn() {
    const dbPath = path.join(__dirname, '..', 'shipments.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    try {
        await db.exec('ALTER TABLE shipments ADD COLUMN cost REAL');
        console.log('Added cost column to shipments table');
    } catch (error) {
        if (error.message.includes('duplicate column name')) {
            console.log('Column cost already exists');
        } else {
            console.error('Error adding column:', error);
        }
    }
}

addCostColumn();
