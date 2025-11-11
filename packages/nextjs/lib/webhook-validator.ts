import { createHmac } from "crypto";

/**
 * Valida la firma de un webhook de Neynar
 *
 * Neynar firma los webhooks usando HMAC-SHA512 con tu webhook secret.
 * La firma viene en el header 'X-Neynar-Signature'.
 *
 * Documentación: https://docs.neynar.com/docs/webhooks-security
 *
 * @param signature - El valor del header X-Neynar-Signature
 * @param body - El body raw del request (como string)
 * @param secret - Tu webhook secret de Neynar
 * @returns true si la firma es válida, false en caso contrario
 */
export function validateNeynarWebhookSignature(signature: string | null, body: string, secret: string): boolean {
  if (!signature) {
    console.warn("[Webhook Validator] No signature provided");
    return false;
  }

  if (!secret) {
    console.error("[Webhook Validator] Webhook secret not configured");
    return false;
  }

  try {
    // Crear HMAC usando el secret
    const hmac = createHmac("sha512", secret);
    hmac.update(body);
    const expectedSignature = hmac.digest("hex");

    // Comparación segura para prevenir timing attacks
    return timingSafeEqual(signature, expectedSignature);
  } catch (error) {
    console.error("[Webhook Validator] Error validating signature:", error);
    return false;
  }
}

/**
 * Compara dos strings de forma segura para prevenir timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Extrae y valida el webhook de Neynar del request
 *
 * @param request - El Next.js Request object
 * @returns El body parseado si la validación es exitosa, null si falla
 */
export async function validateAndParseNeynarWebhook(request: Request): Promise<any | null> {
  const webhookSecret = process.env.NEYNAR_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn(
      "[Webhook Validator] NEYNAR_WEBHOOK_SECRET no está configurado. IMPORTANTE: Configúralo en producción para seguridad.",
    );
    // En desarrollo, permitimos requests sin validación
    // En producción, esto debería retornar null
    if (process.env.NODE_ENV === "production") {
      return null;
    }
  }

  try {
    // Obtener el body como texto
    const bodyText = await request.text();

    // Obtener la firma del header
    const signature = request.headers.get("X-Neynar-Signature");

    // Si tenemos webhook secret, validamos la firma
    if (webhookSecret) {
      const isValid = validateNeynarWebhookSignature(signature, bodyText, webhookSecret);

      if (!isValid) {
        console.error("[Webhook Validator] ❌ Invalid webhook signature");
        return null;
      }

      console.log("[Webhook Validator] ✅ Webhook signature validated");
    }

    // Parsear el body
    return JSON.parse(bodyText);
  } catch (error) {
    console.error("[Webhook Validator] Error validating webhook:", error);
    return null;
  }
}

/**
 * Valida que el webhook data tenga la estructura esperada
 */
export function validateWebhookDataStructure(webhookData: any): boolean {
  // Validar estructura básica
  if (!webhookData || typeof webhookData !== "object") {
    return false;
  }

  // Validar que tenga los campos requeridos
  const hasData = webhookData.data && typeof webhookData.data === "object";
  const hasFid = typeof webhookData.data?.fid === "number";
  const hasCast = webhookData.data?.cast && typeof webhookData.data.cast === "object";
  const hasCastHash = typeof webhookData.data?.cast?.hash === "string";

  return hasData && hasFid && hasCast && hasCastHash;
}
