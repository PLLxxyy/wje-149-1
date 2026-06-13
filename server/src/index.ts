import express from 'express';
import cors from 'cors';
import path from 'path';

import authRoutes from './routes/auth';
import coachRoutes from './routes/coach';
import scheduleRoutes from './routes/schedule';
import bookingRoutes from './routes/booking';
import reviewRoutes from './routes/review';
import adminRoutes from './routes/admin';
import studentRoutes from './routes/student';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);

// Serve static files in production
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
