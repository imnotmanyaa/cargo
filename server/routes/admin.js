import express from 'express';
import { getStaffDb } from '../db.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Get all employees
router.get('/employees', async (req, res) => {
    try {
        const db = await getStaffDb();
        // Return everything except password
        const employees = await db.all('SELECT id, name, email, role, station, created_at FROM employees ORDER BY created_at DESC');

        // Add status field (mocked as 'active' for now since it's not in DB yet)
        const employeesWithStatus = employees.map(emp => ({
            ...emp,
            status: 'active'
        }));

        res.json(employeesWithStatus);
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new employee
router.post('/employees', async (req, res) => {
    try {
        const { name, email, password, role, station } = req.body;
        const db = await getStaffDb();

        const existingUser = await db.get('SELECT * FROM employees WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'Employee already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const id = Date.now().toString();

        await db.run(
            'INSERT INTO employees (id, name, email, password, role, station) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, email, hashedPassword, role, station]
        );

        const newEmployee = await db.get('SELECT id, name, email, role, station, created_at FROM employees WHERE id = ?', [id]);
        res.json({ ...newEmployee, status: 'active' });
    } catch (error) {
        console.error('Create employee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete employee
router.delete('/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getStaffDb();
        await db.run('DELETE FROM employees WHERE id = ?', [id]);
        res.json({ message: 'Employee deleted' });
    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
