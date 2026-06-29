import type { Metric } from "./types";

export interface FloorSlot {
  bi: number; // índex de l'edifici
  floor: number;
  idxs: number[]; // índexs de finestres d'aquest pis
}

export interface PaintResult {
  /** color (hex 0xRRGGBB) per a cada índex de finestra global, o null si apagada */
  litFloorMetric: Int16Array; // per a cada FloorSlot: índex de mètrica encesa, o -1
  lightX: number;
  lightZ: number;
  lightW: number;
  litFloors: number;
  biMetricSet: Map<number, Set<number>>;
}

// Reparteix TOTAL_FLOORS plantes entre les mètriques segons el seu valor,
// usant el mètode del residu més gran. Retorna quantes plantes per mètrica.
// El repartiment es fa sobre TOTS els valors (inclosos desactivats); desactivar
// una categoria només n'apaga les finestres, no redistribueix.
export function distributeFloors(
  metrics: Metric[],
  totalFloors: number,
  activeFillMax: number
): number[] {
  const sum = metrics.reduce((s, m) => s + m.value, 0);
  if (sum <= 0) return metrics.map(() => 0);

  const denom = activeFillMax > 0 ? Math.max(activeFillMax, sum) : sum;
  const exact = metrics.map((m) => (m.value / denom) * totalFloors);
  const counts = exact.map(Math.floor);
  let used = counts.reduce((a, b) => a + b, 0);
  const targetFloors = Math.round((sum / denom) * totalFloors);
  const remainder = exact
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac);
  let k = 0;
  while (used < targetFloors && k < remainder.length) {
    counts[remainder[k].i]++;
    used++;
    k++;
  }
  return counts;
}
