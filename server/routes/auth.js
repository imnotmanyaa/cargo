import express from 'express';
import { getClientsDb, getStaffDb } from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, company, phone } = req.body;
        const db = await getClientsDb();

        const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const id = Date.now().toString(); // Simple ID generation

        await db.run(
            'INSERT INTO users (id, name, email, password, role, company, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, name, email, hashedPassword, role || 'individual', company, phone]
        );

        const user = await db.get('SELECT id, name, email, role, company, phone FROM users WHERE id = ?', [id]);

        // Generate Token
        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ ...user, token });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Check Staff DB first
        const staffDb = await getStaffDb();
        const staffUser = await staffDb.get('SELECT * FROM employees WHERE email = ?', [email]);

        if (staffUser) {
            const isValid = await bcrypt.compare(password, staffUser.password);
            if (isValid) {
                const { password: _, ...userWithoutPassword } = staffUser;
                const token = jwt.sign(
                    { id: staffUser.id, role: staffUser.role, station: staffUser.station, email: staffUser.email },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );
                return res.json({ ...userWithoutPassword, token });
            }
        }

        // 2. Check Clients DB
        const clientsDb = await getClientsDb();
        const clientUser = await clientsDb.get('SELECT * FROM users WHERE email = ?', [email]);

        if (clientUser) {
            const isValid = await bcrypt.compare(password, clientUser.password);
            if (isValid) {
                const { password: _, ...userWithoutPassword } = clientUser;
                const token = jwt.sign(
                    { id: clientUser.id, role: clientUser.role, email: clientUser.email },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );
                return res.json({ ...userWithoutPassword, token });
            }
        }

        return res.status(400).json({ error: 'Invalid credentials' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
