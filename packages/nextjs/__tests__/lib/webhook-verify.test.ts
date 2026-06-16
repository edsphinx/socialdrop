import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "@/lib/webhook-verify";

function sign(body: string, secret: string): string {
  return crypto.createHmac("sha512", secret).update(body).digest("hex");
}

describe("verifyWebhookSignature", () => {
  const secret = "test-webhook-secret";
  const body = '{"data":{"fid":123}}';

  it("returns true for valid signature", () => {
    const signature = sign(body, secret);
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
  });

  it("returns false for invalid signature", () => {
    expect(verifyWebhookSignature(body, "invalid-hex-signature", secret)).toBe(false);
  });

  it("returns false for signature from wrong secret", () => {
    const wrongSignature = sign(body, "wrong-secret");
    expect(verifyWebhookSignature(body, wrongSignature, secret)).toBe(false);
  });

  it("returns false for tampered body", () => {
    const signature = sign(body, secret);
    expect(verifyWebhookSignature('{"data":{"fid":999}}', signature, secret)).toBe(false);
  });

  it("returns false when signature is null", () => {
    expect(verifyWebhookSignature(body, null, secret)).toBe(false);
  });

  it("fails closed when no secret is configured", () => {
    expect(verifyWebhookSignature("body", "sig", undefined)).toBe(false);
  });

  it("returns false for empty signature string", () => {
    expect(verifyWebhookSignature(body, "", secret)).toBe(false);
  });

  it("returns false for signature with different length", () => {
    expect(verifyWebhookSignature(body, "abc", secret)).toBe(false);
  });
});
