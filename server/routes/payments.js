import express from 'express';
import { getClientsDb } from '../db.js';

const router = express.Router();

// Top up deposit
router.post('/topup', async (req, res) => {
    try {
        const { userId, amount } = req.body;

        if (!userId || !amount) {
            return res.status(400).json({ error: 'User ID and amount are required' });
        }

        const db = await getClientsDb();
        const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const newBalance = (user.deposit_balance || 0) + parseFloat(amount);

        await db.run('UPDATE users SET deposit_balance = ? WHERE id = ?', [newBalance, userId]);

        res.json({ message: 'Top up successful', newBalance });
    } catch (error) {
        console.error('Top up error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
