import express from 'express';
import cors from 'cors';
import { getClientsDb, getStaffDb } from './db.js';
import authRoutes from './routes/auth.js';
import shipmentRoutes from './routes/shipments.js';
import adminRoutes from './routes/admin.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize DBs
Promise.all([getClientsDb(), getStaffDb()]).then(() => {
    console.log('Databases initialized');
}).catch(err => {
    console.error('Failed to initialize databases:', err);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
