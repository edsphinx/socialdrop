import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
const limiter = hasUpstash
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, "60 s"), prefix: "socialdrop" })
  : null;

/** True if allowed. No-op (always true) when Upstash env is not configured (local/dev/tests). */
export async function checkRateLimit(key: string): Promise<boolean> {
  if (!limiter) return true;
  const { success } = await limiter.limit(key);
  return success;
}
