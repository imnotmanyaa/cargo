import express from 'express';
import bcrypt from 'bcryptjs';
import { getClientsDb } from '../db.js';

const router = express.Router();

// Get all corporate clients
router.get('/', async (req, res) => {
    try {
        const db = await getClientsDb();
        const clients = await db.all("SELECT * FROM users WHERE role = 'corporate'");
        res.json(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new corporate client (Manager only)
router.post('/', async (req, res) => {
    try {
        const { name, email, password, company, bin, phone, deposit } = req.body;

        // Validate required fields
        if (!name || !email || !password || !company || !bin) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const db = await getClientsDb();

        // Check if user exists
        const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Initial deposit (default to 0 if not provided)
        const initialDeposit = deposit ? parseFloat(deposit) : 0;

        // Insert user
        const result = await db.run(
            `INSERT INTO users (id, name, email, password, role, company, contract_number, phone, deposit_balance, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
                `corp_${Date.now()}`, // Simple ID generation
                name,
                email,
                hashedPassword,
                'corporate',
                company,
                bin, // Storing BIN in 'contract_number' column
                phone,
                initialDeposit
            ]
        );

        res.status(201).json({ message: 'Client created successfully', clientId: result.lastID });
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create corporate client (This is redundant if we use /api/register but we need deposit)
// So this is a specific endpoint for managers.

export default router;
