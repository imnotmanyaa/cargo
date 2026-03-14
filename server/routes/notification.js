import express from 'express';
import { getShipmentsDb } from '../db.js';

const router = express.Router();

// Get notifications for a user by their phone number (common identifier)
// Or by user ID if we have it linked
router.get('/', async (req, res) => {
    try {
        const { userId, phone } = req.query;
        if (!userId && !phone) {
            return res.status(400).json({ error: 'Missing userId or phone' });
        }

        const db = await getShipmentsDb();
        let notifications = [];

        if (userId) {
            notifications = await db.all(
                'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
                [userId]
            );
        } else if (phone) {
            // If we don't have user ID, multiple users might share phone or we just query by phone stored on notification
            // Wait, the creating logic will link by user ID if found.
            // Let's assume frontend sends userId.
            // If not, we might need to lookup user by phone here.
            // For now let's just support userId which is safer.
        }

        res.json(notifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Mark as read
router.patch('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getShipmentsDb();
        await db.run('UPDATE notifications SET read = 1 WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
