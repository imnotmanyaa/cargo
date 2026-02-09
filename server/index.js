import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { getClientsDb, getStaffDb } from './db.js';
import authRoutes from './routes/auth.js';
import shipmentRoutes from './routes/shipments.js';
import adminRoutes from './routes/admin.js';
import reportsRouter from './routes/reports.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server and Socket.IO
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PATCH", "DELETE"]
    }
});

// Make io available to routes
app.set('io', io);

app.use(cors());
app.use(express.json());

// Initialize DBs
Promise.all([getClientsDb(), getStaffDb()]).then(() => {
    console.log('Databases initialized');
}).catch(err => {
    console.error('Failed to initialize databases:', err);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join room based on station (for receivers)
    socket.on('join-station', (station) => {
        socket.join(`station:${station}`);
        console.log(`Socket ${socket.id} joined station: ${station}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportsRouter);

// Background job: Auto-transit 'Погружен' -> 'В пути' after 1 minute
import { getShipmentsDb } from './db.js';

setInterval(async () => {
    try {
        const db = await getShipmentsDb();
        const now = Date.now();
        const oneMinuteAgo = new Date(now - 60 * 1000).toISOString();

        // Find shipments that are 'Погружен' and were updated more than 1 minute ago
        // Note: Assuming we track update time. If not, we use created_at or just check all 'Погружен'
        // For simplicity in this demo, we'll check any 'Погружен' shipment
        // In a real app, we should have a `updated_at` column. 
        // Let's assume we want to move ALL 'Погружен' shipments to 'В пути' if they stay there too long.
        // But the requirement says "after 1 minute". 
        // We will add a check on `shipment_history` or just move them all for now if no timestamp is available.
        // Better approach: We'll modify the status update to set a timestamp, but since we don't want to change DB schema now,
        // we will check shipment_history for the 'Погружен' event.

        const shipments = await db.all("SELECT * FROM shipments WHERE status = 'Погружен'");

        for (const shipment of shipments) {
            // Check history for when it became 'Погружен'
            const history = await db.get(
                "SELECT timestamp FROM shipment_history WHERE shipment_id = ? AND details LIKE '%Погружен%' ORDER BY timestamp DESC LIMIT 1",
                [shipment.id]
            );

            let shouldUpdate = false;
            if (history) {
                // Handle SQLite default timestamp (YYYY-MM-DD HH:MM:SS) which is UTC
                // Append 'Z' if missing to ensure it's treated as UTC
                let timeStr = history.timestamp;
                if (!timeStr.endsWith('Z') && !timeStr.includes('+')) {
                    timeStr = timeStr.replace(' ', 'T') + 'Z';
                }

                const loadedTime = new Date(timeStr).getTime();
                const diff = now - loadedTime;

                if (diff > 15000) {
                    shouldUpdate = true;
                }
            } else {
                // If no history found (legacy), update anyway
                shouldUpdate = true;
            }

            if (shouldUpdate) {
                await db.run("UPDATE shipments SET status = 'В пути' WHERE id = ?", [shipment.id]);

                // Add history record
                await db.run(
                    "INSERT INTO shipment_history (shipment_id, action, details) VALUES (?, ?, ?)",
                    [shipment.id, 'Auto Transit', 'Automatically moved to In Transit after 15 seconds']
                );

                console.log(`Auto-transited shipment ${shipment.id}`);

                // Emit update
                io.to(`station:${shipment.from_station}`).emit('shipment-updated', { ...shipment, status: 'В пути' });
                if (shipment.to_station) {
                    io.to(`station:${shipment.to_station}`).emit('shipment-incoming', { ...shipment, status: 'В пути' });
                }
            }
        }
    } catch (error) {
        console.error('Auto-transit job error:', error);
    }
}, 5000); // Check every 5 seconds

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('WebSocket server ready');
});

export { io };
