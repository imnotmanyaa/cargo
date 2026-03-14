
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function clearCustom() {
    const clientsDbPath = path.join(__dirname, '..', 'clients.sqlite');
    const staffDbPath = path.join(__dirname, '..', 'staff.sqlite');
    const shipmentsDbPath = path.join(__dirname, '..', 'shipments.sqlite');

    try {
        const clientsDb = await open({ filename: clientsDbPath, driver: sqlite3.Database });
        const staffDb = await open({ filename: staffDbPath, driver: sqlite3.Database });
        const shipmentsDb = await open({ filename: shipmentsDbPath, driver: sqlite3.Database });

        console.log('Starting custom database cleanup...');

        // 1. Clear Shipments DB completely
        await shipmentsDb.run("DELETE FROM shipments");
        await shipmentsDb.run("DELETE FROM shipment_history");

        const notifyTable = await shipmentsDb.get("SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'");
        if (notifyTable) {
            await shipmentsDb.run("DELETE FROM notifications");
        }
        console.log('Cleared shipments, history, and notifications');

        // 2. Clear Clients DB completely
        await clientsDb.run("DELETE FROM users");
        console.log('Cleared users table');

        // 3. Clear Staff DB (Employees) - Keep 1 record
        // Strategy: Keep 'manager' or 'admin' if exists, otherwise keep the first one.
        const manager = await staffDb.get("SELECT id FROM employees WHERE role IN ('admin', 'manager') ORDER BY created_at LIMIT 1");

        let keepId;
        if (manager) {
            keepId = manager.id;
            console.log(`Keeping manager/admin record with ID: ${keepId}`);
        } else {
            const first = await staffDb.get("SELECT id FROM employees ORDER BY created_at LIMIT 1");
            if (first) {
                keepId = first.id;
                console.log(`Keeping first record with ID: ${keepId}`);
            }
        }

        if (keepId) {
            await staffDb.run("DELETE FROM employees WHERE id != ?", [keepId]);
            console.log(`Cleared employees table, kept record ${keepId}`);
        } else {
            // Table was empty
            console.log('Employees table was already empty');
        }

        console.log('Database cleanup completed successfully.');

    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}

clearCustom();
