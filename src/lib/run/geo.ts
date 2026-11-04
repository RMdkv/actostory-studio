export type RunPoint = { lat: number; lng: number; t: number; acc: number; seg: number };

const R = 6371000;
export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Max accepted GPS accuracy radius in meters. */
export const MAX_ACCURACY_M = 30;
/** Faster than this (m/s) between two fixes is treated as a GPS jump. */
export const MAX_SPEED_MS = 12;
/** Ignore jitter smaller than this. */
export const MIN_STEP_M = 3;

/** Decide whether a new fix should be added; returns the distance gained (0 if same spot) or null to reject. */
export function acceptPoint(prev: RunPoint | undefined, next: RunPoint): number | null {
  if (next.acc > MAX_ACCURACY_M) return null;
  if (!prev || prev.seg !== next.seg) return 0;
  const d = haversine(prev, next);
  const dt = (next.t - prev.t) / 1000;
  if (dt <= 0) return null;
  if (d / dt > MAX_SPEED_MS) return null;
  if (d < MIN_STEP_M) return null;
  return d;
}

export function totalDistance(points: RunPoint[]) {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!;
    if (a.seg === b.seg) d += haversine(a, b);
  }
  return d;
}

/** Pace in seconds per km over the trailing window (ms) of the current segment. */
export function recentPace(points: RunPoint[], windowMs = 30000): number | null {
  const last = points[points.length - 1];
  if (!last) return null;
  let d = 0;
  let i = points.length - 1;
  while (i > 0) {
    const a = points[i - 1]!, b = points[i]!;
    if (a.seg !== b.seg || last.t - a.t > windowMs) break;
    d += haversine(a, b);
    i--;
  }
  const dt = (last.t - points[i]!.t) / 1000;
  if (d < 20 || dt <= 0) return null;
  return dt / (d / 1000);
}

/** Fastest rolling pace (s/km) over any ~200m stretch. */
export function bestPace(points: RunPoint[]): number | null {
  let best: number | null = null;
  for (let i = 0; i < points.length; i++) {
    let d = 0;
    for (let j = i + 1; j < points.length; j++) {
      const a = points[j - 1]!, b = points[j]!;
      if (a.seg !== b.seg) break;
      d += haversine(a, b);
      if (d >= 200) {
        const p = (b.t - points[i]!.t) / 1000 / (d / 1000);
        if (best === null || p < best) best = p;
        break;
      }
    }
  }
  return best;
}

/** Running energy estimate: ~1 kcal per kg per km (default 70 kg). */
export function estimateCalories(distanceM: number, weightKg = 70) {
  return Math.round((distanceM / 1000) * weightKg * 1.0);
}

export function formatDuration(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return [h, m, r].map((n) => String(n).padStart(2, "0")).join(":");
}
export function formatPace(sPerKm: number | null | undefined) {
  if (!sPerKm || !isFinite(sPerKm) || sPerKm > 3600) return "--:--";
  const m = Math.floor(sPerKm / 60), s = Math.round(sPerKm % 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, "0")}`;
}
export function formatKm(m: number) {
  return (m / 1000).toFixed(2).replace(".", ",");
}
