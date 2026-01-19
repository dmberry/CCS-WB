/**
 * Simple in-memory rate limiter for API endpoints.
 * Uses a sliding window approach to limit requests per client.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// Store rate limit data per identifier (e.g., IP address)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      // Remove entries older than 5 minutes
      if (now - entry.windowStart > 5 * 60 * 1000) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current number of requests in the window */
  current: number;
  /** Maximum requests allowed */
  limit: number;
  /** Milliseconds until the rate limit resets */
  resetIn: number;
  /** Remaining requests in the current window */
  remaining: number;
}

/**
 * Check if a request should be rate limited.
 *
 * @param identifier - Unique identifier for the client (e.g., IP address)
 * @param config - Rate limit configuration
 * @returns RateLimitResult with status and metadata
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  startCleanup();

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // If no entry exists or window has expired, create new entry
  if (!entry || now - entry.windowStart >= config.windowMs) {
    rateLimitStore.set(identifier, {
      count: 1,
      windowStart: now,
    });
    return {
      allowed: true,
      current: 1,
      limit: config.maxRequests,
      resetIn: config.windowMs,
      remaining: config.maxRequests - 1,
    };
  }

  // Increment count
  entry.count += 1;
  const resetIn = config.windowMs - (now - entry.windowStart);

  // Check if over limit
  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      current: entry.count,
      limit: config.maxRequests,
      resetIn,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    current: entry.count,
    limit: config.maxRequests,
    resetIn,
    remaining: config.maxRequests - entry.count,
  };
}

/**
 * Get a client identifier from request headers.
 * Uses X-Forwarded-For, X-Real-IP, or falls back to a default.
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Get the first IP in the chain
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback for local development
  return "localhost";
}

// Default rate limit configurations for different endpoint types
export const RATE_LIMITS = {
  /** Chat endpoint: 20 requests per minute */
  chat: {
    maxRequests: 20,
    windowMs: 60 * 1000,
  },
  /** Generate endpoint: 10 requests per minute */
  generate: {
    maxRequests: 10,
    windowMs: 60 * 1000,
  },
  /** Literature search: 15 requests per minute */
  literature: {
    maxRequests: 15,
    windowMs: 60 * 1000,
  },
  /** File upload: 30 requests per minute */
  upload: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
} as const;
