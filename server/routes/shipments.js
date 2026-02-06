import express from 'express';
import { getClientsDb } from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const db = await getClientsDb();
        // In a real app, you'd filter by user ID from a token
        const shipments = await db.all('SELECT * FROM shipments ORDER BY created_at DESC');
        res.json(shipments);
    } catch (error) {
        console.error('Get shipments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { client_id, from_station, to_station, weight, dimensions, description, value } = req.body;
        const db = await getClientsDb();
        const id = 'SH-' + Date.now().toString().slice(-6); // Simple ID format

        await db.run(
            `INSERT INTO shipments (
        id, client_id, from_station, to_station, status, 
        weight, dimensions, description, value, departure_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, client_id, from_station, to_station, 'В пути', // Default status
                weight, dimensions, description, value, new Date().toISOString()
            ]
        );

        const shipment = await db.get('SELECT * FROM shipments WHERE id = ?', [id]);
        res.json(shipment);
    } catch (error) {
        console.error('Create shipment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
