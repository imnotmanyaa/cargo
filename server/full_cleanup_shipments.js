import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fullCleanup() {
    const shipmentsDbPath = path.join(__dirname, '..', 'shipments.sqlite');

    try {
        const db = await open({ filename: shipmentsDbPath, driver: sqlite3.Database });

        console.log('Clearing shipments table...');
        await db.run("DELETE FROM shipments");

        console.log('Clearing shipment_history table...');
        await db.run("DELETE FROM shipment_history");

        console.log('Shipment databases cleared successfully.');
        await db.close();
    } catch (error) {
        console.error('Error during full cleanup:', error);
    }
}

fullCleanup();
