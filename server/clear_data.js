import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function clearData() {
    const clientsDbPath = path.join(__dirname, '..', 'clients.sqlite');
    const staffDbPath = path.join(__dirname, '..', 'staff.sqlite');
    const shipmentsDbPath = path.join(__dirname, '..', 'shipments.sqlite');

    try {
        const clientsDb = await open({ filename: clientsDbPath, driver: sqlite3.Database });
        const staffDb = await open({ filename: staffDbPath, driver: sqlite3.Database });
        const shipmentsDb = await open({ filename: shipmentsDbPath, driver: sqlite3.Database });

        console.log('Starting database cleanup...');

        // 1. Clear Shipments DB completely (Shipments, History, Notifications)
        await shipmentsDb.run("DELETE FROM shipments");
        await shipmentsDb.run("DELETE FROM shipment_history");

        // Check if notifications table exists before clearing
        const notifyTable = await shipmentsDb.get("SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'");
        if (notifyTable) {
            await shipmentsDb.run("DELETE FROM notifications");
            console.log('Cleared notifications table');
        }

        console.log('Cleared shipments and history');

        // 2. Clear Clients DB (Users) - Keep Admins if any (unlikely in clients db but safe to check)
        await clientsDb.run("DELETE FROM users WHERE role != 'admin'");
        console.log('Cleared users table (kept admins)');

        // 3. Clear Staff DB (Employees) - Keep Admins
        await staffDb.run("DELETE FROM employees WHERE role != 'admin'");
        console.log('Cleared employees table (kept admins)');

        console.log('Database cleanup completed successfully.');

    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}

clearData();
