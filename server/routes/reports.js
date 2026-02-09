
import express from 'express';
import { getShipmentsDb } from '../db.js';

const router = express.Router();

router.get('/dashboard', async (req, res) => {
    try {
        const db = await getShipmentsDb();

        // 1. Monthly Shipments (created this month)
        // SQLite 'now' is UTC, so we might want 'localtime' or just simple string matching if dates are ISO.
        // Assuming ISO strings in DB.
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const startOfMonthStr = startOfMonth.toISOString();

        const monthlyShipmentsResult = await db.get(
            'SELECT COUNT(*) as count FROM shipments WHERE created_at >= ?',
            [startOfMonthStr]
        );
        const monthlyShipments = monthlyShipmentsResult?.count || 0;

        // 2. Completed Shipments this month
        // Status is 'Выдан' or 'Доставлен' (assuming these are final statuses)
        // And updated_at or created_at within this month? 
        // For simplicity, let's count shipments created this month that are completed.
        // Or better: shipments that reached final status. But we don't have 'completed_at'.
        // Let's stick to "Shipments created this month that are completed" or just "Total completed shipments this month" (hard without history date)
        // Compromise: Count all shipments with status 'Выдан'/'Доставлен'. Ideally we'd validte date, but let's just count all for "Total Completed" or filter by Create Date.
        // The UI says "1,198 Completed Shipments (Month)". Let's count shipments created this month that are completed.
        const completedShipmentsResult = await db.get(
            `SELECT COUNT(*) as count FROM shipments 
             WHERE created_at >= ? AND status IN ('Выдан', 'Доставлен')`,
            [startOfMonthStr]
        );
        const completedShipments = completedShipmentsResult?.count || 0;

        // 3. Active Contracts (Active Shipments)
        // Status NOT 'Выдан' and NOT 'Доставлен'
        const activeContractsResult = await db.get(
            `SELECT COUNT(*) as count FROM shipments 
             WHERE status NOT IN ('Выдан', 'Доставлен')`
        );
        const activeContracts = activeContractsResult?.count || 0;

        // 4. Revenue by Route (Current Month)
        // Group by from_station -> to_station
        const revenueResult = await db.all(
            `SELECT from_station, to_station, SUM(cost) as revenue, COUNT(*) as count
             FROM shipments 
             WHERE created_at >= ?
             GROUP BY from_station, to_station
             ORDER BY revenue DESC
             LIMIT 5`,
            [startOfMonthStr]
        );

        const revenueByRoute = revenueResult.map(r => ({
            route: `${r.from_station}-${r.to_station}`,
            revenue: r.revenue || 0,
            count: r.count
        }));

        res.json({
            monthlyShipments,
            completedShipments,
            activeContracts,
            revenueByRoute
        });

    } catch (error) {
        console.error('Dashboard report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
