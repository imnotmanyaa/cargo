import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let clientsDb = null;
let staffDb = null;
let shipmentsDb = null;

export async function getClientsDb() {
  if (clientsDb) return clientsDb;

  const dbPath = path.join(__dirname, '..', 'clients.sqlite');

  clientsDb = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await clientsDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'individual',
      company TEXT,
      deposit_balance REAL,
      contract_number TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return clientsDb;
}

export async function getStaffDb() {
  if (staffDb) return staffDb;

  const dbPath = path.join(__dirname, '..', 'staff.sqlite');

  staffDb = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await staffDb.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      station TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return staffDb;
}

export async function getShipmentsDb() {
  if (shipmentsDb) return shipmentsDb;

  const dbPath = path.join(__dirname, '..', 'shipments.sqlite');

  shipmentsDb = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await shipmentsDb.exec(`
    CREATE TABLE IF NOT EXISTS shipments (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      client_name TEXT,
      client_email TEXT,
      from_station TEXT NOT NULL,
      to_station TEXT NOT NULL,
      current_station TEXT,
      next_station TEXT,
      status TEXT NOT NULL DEFAULT 'В пути',
      departure_date TEXT,
      weight TEXT,
      dimensions TEXT,
      description TEXT,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shipment_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipment_id TEXT NOT NULL,
      action TEXT NOT NULL,
      operator_id TEXT,
      operator_name TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      details TEXT,
      FOREIGN KEY(shipment_id) REFERENCES shipments(id)
    );
  `);

  return shipmentsDb;
}
