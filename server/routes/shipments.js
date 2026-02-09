import express from 'express';
import { getShipmentsDb } from '../db.js';

const router = express.Router();

const STATIONS_ORDER = ['Шымкент', 'Алматы-1', 'Қарағанды', 'Астана Нұрлы Жол', 'Ақтөбе'];

function calculateRoute(from, to) {
    const fromIndex = STATIONS_ORDER.indexOf(from);
    const toIndex = STATIONS_ORDER.indexOf(to);

    if (fromIndex === -1 || toIndex === -1) return [from, to]; // Fallback to direct

    if (fromIndex < toIndex) {
        return STATIONS_ORDER.slice(fromIndex, toIndex + 1);
    } else {
        return STATIONS_ORDER.slice(toIndex, fromIndex + 1).reverse();
    }
}

// Get single shipment by ID (public/tracking)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getShipmentsDb();
        const shipment = await db.get('SELECT * FROM shipments WHERE id = ?', [id]);

        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }

        res.json(shipment);
    } catch (error) {
        console.error('Get shipment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/', async (req, res) => {
    try {
        const { type, station, client_id } = req.query;
        const db = await getShipmentsDb();

        if (client_id) {
            const shipments = await db.all('SELECT * FROM shipments WHERE client_id = ? ORDER BY created_at DESC', [client_id]);
            return res.json(shipments);
        }

        if (type === 'incoming') {
            const shipments = await db.all('SELECT * FROM shipments WHERE next_station = ?', [station]);
            return res.json(shipments);
        }

        if (type === 'outgoing') {
            const shipments = await db.all(
                `SELECT * FROM shipments 
                 WHERE current_station = ? 
                 AND status IN ('Принят', 'Погружен', 'В пути')`,
                [station]
            );
            return res.json(shipments);
        }

        if (type === 'arrived') {
            const shipments = await db.all(
                `SELECT * FROM shipments 
                 WHERE current_station = ? 
                 AND status = 'Прибыл'`,
                [station]
            );
            return res.json(shipments);
        }

        const shipments = await db.all('SELECT * FROM shipments');
        res.json(shipments);
    } catch (error) {
        console.error('Get shipments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get shipments by from_station (for receivers)
router.get('/by-station/:station', async (req, res) => {
    try {
        const { station } = req.params;
        const db = await getShipmentsDb();
        const shipments = await db.all(
            'SELECT * FROM shipments WHERE from_station = ? ORDER BY created_at DESC',
            [station]
        );
        res.json(shipments);
    } catch (error) {
        console.error('Get shipments by station error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Transit update
router.post('/:id/transit', async (req, res) => {
    try {
        const { id } = req.params;
        const { current_station, operator_id, operator_name } = req.body;
        const db = await getShipmentsDb();

        const shipment = await db.get('SELECT * FROM shipments WHERE id = ?', [id]);
        if (!shipment) return res.status(404).json({ error: 'Shipment not found' });

        const route = JSON.parse(shipment.route || '[]');
        const currentIndex = route.indexOf(current_station);

        let updates = { current_station };
        let next_station = null;
        let status = 'В пути';

        if (currentIndex !== -1 && currentIndex < route.length - 1) {
            next_station = route[currentIndex + 1];
        } else if (currentIndex === route.length - 1) {
            status = 'Прибыл';
            next_station = null;
        }

        // Custom status logic for origin
        if (current_station === shipment.from_station) {
            if (shipment.status === 'Принят') {
                status = 'Погружен';
                // If loaded, we are still at origin, so next station logic remains same
            } else if (shipment.status === 'Погружен') {
                status = 'В пути';
            }
        }

        // Update shipment
        await db.run(
            'UPDATE shipments SET current_station = ?, next_station = ?, status = ? WHERE id = ?',
            [current_station, next_station, status, id]
        );

        // Log history
        await db.run(
            'INSERT INTO shipment_history (shipment_id, action, operator_id, operator_name, details) VALUES (?, ?, ?, ?, ?)',
            [id, 'Transit Update', operator_id, operator_name, `Arrived at ${current_station}, Status: ${status}`]
        );

        const updatedShipment = await db.get('SELECT * FROM shipments WHERE id = ?', [id]);

        // Emit update
        const io = req.app.get('io');
        if (io) {
            io.to(`station:${current_station}`).emit('shipment-updated', updatedShipment);
            if (next_station) {
                io.to(`station:${next_station}`).emit('shipment-incoming', updatedShipment);
            }
        }

        res.json(updatedShipment);
    } catch (error) {
        console.error('Transit update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update shipment status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, operator_id, operator_name } = req.body;
        const db = await getShipmentsDb();

        const oldShipment = await db.get('SELECT * FROM shipments WHERE id = ?', [id]);

        await db.run('UPDATE shipments SET status = ? WHERE id = ?', [status, id]);

        // Log history
        await db.run(
            'INSERT INTO shipment_history (shipment_id, action, operator_id, operator_name, details) VALUES (?, ?, ?, ?, ?)',
            [id, 'Status Change', operator_id, operator_name, `Status changed from ${oldShipment?.status} to ${status}`]
        );

        const shipment = await db.get('SELECT * FROM shipments WHERE id = ?', [id]);

        // Emit update to station room
        const io = req.app.get('io');
        if (io) {
            io.to(`station:${shipment.from_station}`).emit('shipment-updated', shipment);
        }

        res.json(shipment);
    } catch (error) {
        console.error('Update shipment status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            client_id, client_name, client_email, from_station, to_station,
            weight, dimensions, description, value, departure_date, cost
        } = req.body;
        const db = await getShipmentsDb();

        const id = 'SH-' + Date.now().toString().slice(-6); // Simple ID generation
        const route = calculateRoute(from_station, to_station);
        const current_station = from_station;
        const next_station = route.length > 1 ? route[1] : null;

        await db.run(
            `INSERT INTO shipments (
                id, client_id, client_name, client_email, from_station, to_station, 
                current_station, next_station, route,
                status, weight, dimensions, description, value, departure_date, cost
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, client_id, client_name, client_email, from_station, to_station,
                current_station, next_station, JSON.stringify(route),
                'Принят', weight, dimensions, description, value, departure_date || new Date().toISOString(), cost
            ]
        );

        // Log history
        await db.run(
            'INSERT INTO shipment_history (shipment_id, action, operator_id, operator_name, details) VALUES (?, ?, ?, ?, ?)',
            [id, 'Created', client_id, client_name, 'Shipment created']
        );

        const shipment = await db.get('SELECT * FROM shipments WHERE id = ?', [id]);

        // Emit new shipment to station room
        const io = req.app.get('io');
        if (io) {
            io.to(`station:${from_station}`).emit('new-shipment', shipment);
            if (next_station) {
                io.to(`station:${next_station}`).emit('shipment-incoming', shipment);
            }
        }

        res.json(shipment);
    } catch (error) {
        console.error('Create shipment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
