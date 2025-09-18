// MoonPhase Utilities (no external API)

/*
Reference New moon: 2000-01-06 18:14 UTC
Synodic month length (lunation): ~29.530588853 days

Terminology:
EPOCH is New Moon instant with this time stamp: (Jan/6/2000, 18:14 UTC)
LUNATION is the average synodic month length in days (~29.530588853).
Moon phase is the return shape or fraction 

*/

/* compute moon phase for a givin date (default: now) this will work with moon phase calender. (getMoonPhase())

First get the days since the reference of a New MOON(EPOCH)
Second keep only the fractional part of days / lunation
Third map that fraction to a friendly label/emoji
Finally return a typed result
*/

const LUNATION = 29.530588853; // synodic month
const NEW_MOON_JD = 2451550.1;

export type MoonPhase = {
  fraction: number; //0..1 (0 = new, 0.5 = half)
  label: string; // understandable text
  emoji: string; // pictures or moon signs based on phase.
  illum: number;
  illumPercent: number;
};

export function getMoonPhase(date: Date = new Date()): MoonPhase {
  const jd = toJulianDayUTC(date);
  const cycles = (jd - NEW_MOON_JD) / LUNATION;

  const fraction = frac1(cycles);
  const age = fraction * LUNATION;

  // illumination
  const phaseAngle = 2 * Math.PI * fraction;
  const illum = 0.5 * (1 - Math.cos(phaseAngle));
  const illumPercent = Math.round(illum * 100);

  const { label, emoji } = phaseByAge(age);
  return { fraction, label, emoji, illum, illumPercent };
}

function toJulianDayUTC(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}
function frac1(x: number): number {
  return x - Math.floor(x);
}

//Calender functions
export function getMoonCalendar(days = 7, start: Date = new Date()) {
  const out: Array<{ date: string; phase: MoonPhase }> = [];
  const startUTC = new Date(
    Date.UTC(start.getFullYear(), start.getUTCMonth(), start.getUTCDate())
  );

  for (let i = 0; i < days; i++) {
    const d = new Date(startUTC.getTime() + i * 86400000);
    out.push({ date: d.toISOString().slice(0, 10), phase: getMoonPhase(d) });
  }
  return out;
}

// Map phase fractions with label and emojis. 8 main phases
function phaseByAge(age: number): { label: string; emoji: string } {
  if (age < 1.84566) return { label: "New Moon", emoji: "🌑" };
  if (age < 5.53699) return { label: "Waxing Crescent", emoji: "🌒" };
  if (age < 9.22831) return { label: "First Quarter", emoji: "🌓" };
  if (age < 12.91963) return { label: "Waxing Gibbous", emoji: "🌔" };
  if (age < 16.61096) return { label: "Full Moon", emoji: "🌕" };
  if (age < 20.30228) return { label: "Waning Gibbous", emoji: "🌖" };
  if (age < 23.0) return { label: "Last Quarter", emoji: "🌗" }; // ✅ cutoff earlier
  if (age < 27.68493) return { label: "Waning Crescent", emoji: "🌘" };
  return { label: "New Moon", emoji: "🌑" }; // wrap-around
}
