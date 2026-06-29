import type { Dataset } from "./types";

// Interpolació cúbica (spline natural): expandeix N punts a `targetN` equidistants.
export function cubicSpline(ys: number[], targetN: number): number[] {
  const n = ys.length;
  if (n < 2) return Array(targetN).fill(ys[0] ?? 0);

  const xs = ys.map((_, i) => i);
  const h = xs.slice(1).map((x, i) => x - xs[i]);
  const a = ys.slice();
  const M = new Array(n).fill(0); // moments (segones derivades)
  const mu = new Array(n).fill(0);
  const z = new Array(n).fill(0);

  for (let i = 1; i < n - 1; i++) {
    const g = 2 * (h[i - 1] + h[i]) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / g;
    z[i] =
      ((3 * (a[i + 1] * h[i - 1] - a[i] * (h[i - 1] + h[i]) + a[i - 1] * h[i])) /
        (h[i - 1] * h[i]) -
        h[i - 1] * z[i - 1]) /
      g;
  }
  for (let i = n - 2; i >= 0; i--) M[i] = z[i] - mu[i] * M[i + 1];

  const result: number[] = [];
  for (let t = 0; t < targetN; t++) {
    const xq = (t / (targetN - 1)) * (n - 1);
    const seg = Math.min(Math.floor(xq), n - 2);
    const dx = xq - seg;
    const hi = h[seg];
    const val =
      (M[seg] / (6 * hi)) * (hi - dx) ** 3 +
      (M[seg + 1] / (6 * hi)) * dx ** 3 +
      (a[seg] / hi - (M[seg] * hi) / 6) * (hi - dx) +
      (a[seg + 1] / hi - (M[seg + 1] * hi) / 6) * dx;
    result.push(Math.max(0, Math.round(val * 10) / 10));
  }
  return result;
}

// Etiquetes de temps interpolades ("Juny 22 → Oct. 22" als punts intermedis).
export function interpolatePeriods(periods: string[], targetN: number): string[] {
  const out: string[] = [];
  for (let t = 0; t < targetN; t++) {
    const xq = (t / (targetN - 1)) * (periods.length - 1);
    const lo = Math.floor(xq);
    const hi = Math.min(lo + 1, periods.length - 1);
    const frac = xq - lo;
    if (frac < 0.05) out.push(periods[lo]);
    else if (frac > 0.95) out.push(periods[hi]);
    else out.push(periods[lo] + " → " + periods[hi]);
  }
  return out;
}

export const MIN_T = 30;

// Expandeix un dataset temporal si té menys de MIN_T punts.
export function expandTemporal(ds: Dataset): Dataset {
  if (!ds.temporal || !ds.periods || !ds.series) return ds;
  const n = ds.periods.length;
  if (n >= MIN_T) return ds;
  const targetN = Math.max(MIN_T, n);
  const newSeries: Record<string, number[]> = {};
  ds.labels.forEach((label) => {
    newSeries[label] = cubicSpline(ds.series![label], targetN);
  });
  const newMarkers = (ds.markers || []).map((mk) => ({
    ...mk,
    index: Math.round((mk.periodIndex / (n - 1)) * (targetN - 1)),
  }));
  return {
    ...ds,
    periods: interpolatePeriods(ds.periods, targetN),
    series: newSeries,
    markers: newMarkers,
  };
}
