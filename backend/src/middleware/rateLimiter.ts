import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for device telemetry ingestion endpoints.
 * Allows high throughput from registered ESP32 units while preventing floods.
 */
export const deviceRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 180, // limit each IP to 180 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many telemetry packets from this device/IP. Please slow down.',
  },
});

/**
 * General API rate limiter for user endpoints.
 */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again shortly.',
  },
});
