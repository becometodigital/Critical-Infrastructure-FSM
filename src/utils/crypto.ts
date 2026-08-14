/**
 * Cryptographic helper functions for SHA-256 Evidence & Document Hashing
 * Runs authentically in the browser using standard Web Crypto API
 * Gate Pass HMAC verification is strictly enforced server-side.
 */

/**
 * Computes SHA-256 hash of a string or ArrayBuffer
 */
export async function computeSha256(data: string | ArrayBuffer): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = typeof data === 'string' ? encoder.encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parse client-side Gate Pass QR token structure prior to authoritative server verification
 */
export function parseGatePassTokenClient(tokenBase64: string): {
  isValidStructure: boolean;
  ticketId?: string;
  technicianId?: string;
  branchId?: string;
  validUntil?: string;
  isLocallyExpired?: boolean;
} {
  try {
    const decoded = atob(tokenBase64);
    const parts = decoded.split(':');
    if (parts.length < 4) {
      return { isValidStructure: false };
    }
    const ticketId = parts[0];
    const technicianId = parts[1];
    const branchId = parts.length >= 6 ? parts[2] : undefined;
    const validUntil = parts.length >= 6 ? parts[3] : parts[2];
    const expiresAtMs = new Date(validUntil).getTime();
    const isLocallyExpired = !isNaN(expiresAtMs) && Date.now() > expiresAtMs;

    return {
      isValidStructure: true,
      ticketId,
      technicianId,
      branchId,
      validUntil,
      isLocallyExpired,
    };
  } catch {
    return { isValidStructure: false };
  }
}

