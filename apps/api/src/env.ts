import { createHash } from 'node:crypto';

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://isoflow:isoflow@localhost:5432/isoflow';

/**
 * Prefer explicit JWT_SECRET. If unset but DATABASE_URL exists (e.g. Railway),
 * derive a stable secret so the process can start without misconfigured env.
 * Set JWT_SECRET explicitly in production for stronger isolation.
 */
function resolveJwtSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.DATABASE_URL) {
    return createHash('sha256')
      .update(`isoflow:jwt:${process.env.DATABASE_URL}`)
      .digest('hex');
  }
  return 'dev-insecure-change-me';
}

export const JWT_SECRET = resolveJwtSecret();

function resolvePort(): number {
  const raw = process.env.PORT;
  if (raw === undefined || raw === '') {
    return 4000;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 65535) {
    throw new Error(`Invalid PORT env: ${JSON.stringify(raw)}`);
  }
  return n;
}

export const PORT = resolvePort();
export const BODY_LIMIT = Number(process.env.BODY_LIMIT_BYTES ?? 15_000_000);

export function assertProductionSecrets() {
  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.JWT_SECRET &&
    process.env.DATABASE_URL
  ) {
    console.warn(
      '[isoflow-api] JWT_SECRET is not set; using a derived secret from DATABASE_URL. Set JWT_SECRET for explicit key rotation.'
    );
  }
}

export { required };
