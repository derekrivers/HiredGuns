/** Integer-only subset of Main.s players_fall / damage_fitness / decr_fitness. */
export const MAX_FALL_DAMAGE = 0x1000000;
function unsigned(value: number, max: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) throw new Error(`Invalid ${label}`);
  return value;
}
function divisor(value: number, label: string): number {
  unsigned(value,0xffff,label);
  if (value === 0) throw new Error(`Zero ${label} divisor`);
  return value;
}

export function nextFallDamage(previous: number, stats: {physique:number;agility:number;weight:number}): number {
  unsigned(previous,MAX_FALL_DAMAGE,'fall damage');
  divisor(stats.physique,'physique'); divisor(stats.agility,'agility'); unsigned(stats.weight,0xffffffff,'weight');
  let value = previous;
  if (value === 0) {
    const quotient = Math.floor(stats.weight / stats.agility);
    // Source does not test V here. Do not invent behavior for overflowed DIVU.
    if (quotient > 0xffff) throw new Error('Unsupported fall seed DIVU overflow');
    value = ((quotient + stats.physique) & 0xffff) * 32; // ADD.W then LSL.L #5
  }
  // Validated range keeps ASL.L and the source signed cap comparison positive.
  return Math.min(value * 2,MAX_FALL_DAMAGE);
}

export function damageFitness(fitness: number, physique: number, hit: number): {fitness:number;dead:boolean;damage:number} {
  unsigned(fitness,0xffff,'fitness'); divisor(physique,'physique'); unsigned(hit,0xffffffff,'hit');
  let quotient = Math.floor(hit / physique);
  if (quotient > 0xffff) quotient = Math.floor(0x0fffffff / 100);
  const damage = (quotient & 0xffff) * 100; // MULU consumes the low word, including overflow substitute.
  const remaining = damage > fitness ? 0 : fitness - damage;
  const dead = damage > fitness || remaining < 655;
  // Source can leave sub-band residue on death. This subset normalizes dead fitness to zero.
  return {fitness:dead ? 0 : remaining,dead,damage};
}
