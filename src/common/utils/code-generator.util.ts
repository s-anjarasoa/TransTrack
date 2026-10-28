import * as crypto from 'crypto';

/**
 * Durée de validité d'un code d'invitation (à partir de son envoi).
 * 10 minutes laissent le temps à l'e-mail d'arriver. Ajuste si besoin.
 */
export const CODE_VALIDITY_MS = 10 * 60 * 1000;

/**
 * Génère un code aléatoire à 6 chiffres (cryptographiquement sûr).
 * Ce code n'est JAMAIS stocké en clair : il n'existe que dans l'e-mail.
 */
export function generateOtp(): string {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

/**
 * Empreinte (HMAC-SHA256) du code, liée à l'agent.
 * C'est cette empreinte qui est stockée dans Agent.codeHash.
 */
export function hashOtp(otp: string, agentId: number, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${agentId}:${otp}`)
    .digest('hex');
}

/**
 * Vérifie le code saisi : bonne empreinte ET code non expiré.
 * Comparaison en temps constant.
 */
export function verifyOtp(
  code: string,
  storedHash: string | null | undefined,
  expiresAt: Date | null | undefined,
  agentId: number,
  secret: string,
): boolean {
  if (!storedHash || !expiresAt) return false;
  if (Date.now() > expiresAt.getTime()) return false;

  const normalized = (code ?? '').replace(/\s/g, '');
  const given = Buffer.from(hashOtp(normalized, agentId, secret), 'hex');
  const expected = Buffer.from(storedHash, 'hex');

  return (
    given.length === expected.length && crypto.timingSafeEqual(given, expected)
  );
}