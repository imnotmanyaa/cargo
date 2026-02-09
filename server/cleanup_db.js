import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cleanup() {
  const clientsDbPath = path.join(__dirname, '..', 'clients.sqlite');
  const staffDbPath = path.join(__dirname, '..', 'staff.sqlite');
  const shipmentsDbPath = path.join(__dirname, '..', 'shipments.sqlite');

  try {
    const clientsDb = await open({ filename: clientsDbPath, driver: sqlite3.Database });
    const staffDb = await open({ filename: staffDbPath, driver: sqlite3.Database });
    const shipmentsDb = await open({ filename: shipmentsDbPath, driver: sqlite3.Database });

    // Clean users (keep only 1st rowid)
    await clientsDb.run("DELETE FROM users WHERE rowid NOT IN (SELECT rowid FROM users ORDER BY rowid ASC LIMIT 1)");
    console.log('Cleaned users table');

    // Clean employees (keep only 1st rowid)
    await staffDb.run("DELETE FROM employees WHERE rowid NOT IN (SELECT rowid FROM employees ORDER BY rowid ASC LIMIT 1)");
    console.log('Cleaned employees table');

    // Clean shipments (keep only 1st rowid)
    await shipmentsDb.run("DELETE FROM shipments WHERE rowid NOT IN (SELECT rowid FROM shipments ORDER BY rowid ASC LIMIT 1)");

    // Clean history
    await shipmentsDb.run("DELETE FROM shipment_history WHERE shipment_id NOT IN (SELECT id FROM shipments)");
    console.log('Cleaned shipments table');

  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

cleanup();
