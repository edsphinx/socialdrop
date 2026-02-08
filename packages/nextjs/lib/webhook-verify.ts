import crypto from "crypto";

/**
 * Verifies Neynar webhook HMAC-SHA512 signature.
 * Extracted from webhook route for testability.
 */
export function verifyWebhookSignature(body: string, signature: string | null, secret?: string): boolean {
  const webhookSecret = secret ?? process.env.NEYNAR_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn("NEYNAR_WEBHOOK_SECRET not set, skipping signature verification");
    return true;
  }
  if (!signature) return false;
  const hmac = crypto.createHmac("sha512", webhookSecret);
  hmac.update(body);
  const digest = hmac.digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    // timingSafeEqual throws if buffers have different lengths
    return false;
  }
}
