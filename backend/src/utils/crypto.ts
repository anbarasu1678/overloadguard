import crypto from 'crypto';

const SALT = process.env.DEVICE_API_KEY_SALT || 'overloadguard_salt_hardware_2026';

/**
 * Hashes a raw device API key using HMAC-SHA256 with DEVICE_API_KEY_SALT.
 */
export function hashDeviceKey(apiKey: string): string {
  return crypto
    .createHmac('sha256', SALT)
    .update(apiKey.trim())
    .digest('hex');
}

/**
 * Generates a cryptographically strong raw API key for an ESP32 hardware device.
 */
export function generateDeviceKey(): string {
  return 'og_dev_' + crypto.randomBytes(24).toString('hex');
}
