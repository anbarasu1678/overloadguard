import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { generalRateLimiter } from './middleware/rateLimiter';

import deviceRoutes from './routes/device';
import vehiclesRoutes from './routes/vehicles';
import eventsRoutes from './routes/events';
import alertsRoutes from './routes/alerts';
import statsRoutes from './routes/stats';
import reportsRoutes from './routes/reports';
import devicesRoutes from './routes/devices';
import healthRoutes from './routes/health';

dotenv.config();

const app: Express = express();

// Security headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Let frontend handle CSP
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration: locked down to FRONTEND_ORIGIN
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const allowedOrigins = [
  frontendOrigin,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or ESP32 hardware)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.netlify.app') ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-key', 'x-device-serial'],
  })
);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global rate limiting for general traffic
app.use(generalRateLimiter);

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/devices', devicesRoutes);

// Root route for API verification
app.get('/', (_req, res) => {
  res.status(200).json({
    name: 'OverloadGuard API',
    description: 'Vehicle Overload Management System Serverless API',
    docs: '/api/health',
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;
