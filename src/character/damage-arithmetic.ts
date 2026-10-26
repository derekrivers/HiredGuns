/** Normal unsigned damage arithmetic only; grants no lifecycle/geometry authority. */
export function computeNormalDamage(requestedHit: number, physique: number, spellShield: number) {
  const uint = (n: number, max: number) => Number.isInteger(n) && n >= 0 && n <= max;
  if (!uint(requestedHit, 0xffffffff) || !uint(physique, 65535) || physique === 0 || !uint(spellShield, 65535)) throw new Error('Malformed damage arithmetic.');
  const shieldedHit = spellShield === 87 ? requestedHit >>> 3 : requestedHit;
  const quotient = Math.floor(shieldedHit / physique);
  const remainder = shieldedHit % physique;
  const quotientOverflow = quotient > 65535;
  const multiplierWord = quotientOverflow ? Math.floor(0x0fffffff / 100) & 65535 : quotient;
  return { requestedHit, shieldedHit, quotient, remainder, quotientOverflow, multiplierWord, damage: multiplierWord * 100 };
}
