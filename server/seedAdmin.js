import { getStaffDb } from './db.js';
import bcrypt from 'bcryptjs';

async function seedAdmin() {
    try {
        const db = await getStaffDb();

        const email = 'admin@cargo.kz';
        const password = 'admin'; // Default password
        const hashedPassword = await bcrypt.hash(password, 10);

        await db.run(
            `INSERT OR REPLACE INTO employees (id, name, email, password, role, station) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['admin-1', 'Главный Администратор', email, hashedPassword, 'admin', 'Алматы-1']
        );

        console.log(`Admin user seeded: ${email} / ${password}`);
    } catch (error) {
        console.error('Failed to seed admin:', error);
    }
}

seedAdmin();
