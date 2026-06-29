import { useCallback, useMemo, useState } from "react";
import type { Dataset, Metric } from "./types";
import { distributeFloors } from "./distribute";

export interface ViewState {
  metrics: Metric[]; // en ordre de pintura (estable)
  counts: number[]; // plantes per mètrica (alineat amb metrics)
  activeFillMax: number;
  period: number; // índex temporal actual
  periodLabel: string;
  dataset: Dataset;
  // event marker actiu a prop del període
  activeMarker: { label: string; periodLabel: string } | null;
}

// Construeix les mètriques d'un dataset estàtic o d'un període temporal.
function buildMetrics(
  ds: Dataset,
  t: number,
  disabled: Set<string>
): { metrics: Metric[]; values: Record<string, number> } {
  const values: Record<string, number> = {};
  if (ds.temporal && ds.series) {
    ds.labels.forEach((label) => {
      values[label] = ds.series![label]?.[t] ?? 0;
    });
  } else if (ds.values) {
    ds.labels.forEach((label) => {
      values[label] = ds.values![label] ?? 0;
    });
  }

  // selecció top-N (manté l'ordre estable de ds.labels per a la pintura)
  let activeLabels = ds.labels;
  let activeColors = ds.colors;
  if (ds.top) {
    const sorted = ds.labels
      .map((label, i) => ({ label, color: ds.colors[i], val: values[label] }))
      .sort((a, b) => b.val - a.val)
      .slice(0, ds.top);
    const keep = new Set(sorted.map((s) => s.label));
    const order = ds.labels
      .map((label, i) => ({ label, color: ds.colors[i] }))
      .filter((x) => keep.has(x.label));
    activeLabels = order.map((x) => x.label);
    activeColors = order.map((x) => x.color);
  }

  const metrics: Metric[] = activeLabels.map((label, i) => ({
    label,
    value: values[label] ?? 0,
    hex: activeColors[i % activeColors.length],
    enabled: !disabled.has(label),
  }));
  return { metrics, values };
}

function disabledFromDefaults(ds: Dataset): Set<string> {
  const disabled = new Set<string>();
  if (ds.defaultEnabled) {
    ds.labels.forEach((label) => {
      if (!ds.defaultEnabled!.includes(label)) disabled.add(label);
    });
  }
  return disabled;
}

function latestPeriodIndex(ds: Dataset): number {
  return ds.temporal && ds.periods ? ds.periods.length - 1 : 0;
}

export function useObservatori(datasets: Dataset[], totalFloors: number) {
  const [datasetIndex, setDatasetIndex] = useState(0);
  const [period, setPeriod] = useState(() => latestPeriodIndex(datasets[0]));
  const [disabled, setDisabled] = useState<Set<string>>(() =>
    disabledFromDefaults(datasets[0])
  );

  const dataset = datasets[datasetIndex];

  // activeFillMax: normalització al màxim temporal o al 100%
  const activeFillMax = useMemo(() => {
    if (dataset.temporal && dataset.normalizeToMax && dataset.series && dataset.periods) {
      let max = 0;
      for (let t = 0; t < dataset.periods.length; t++) {
        const s = dataset.labels.reduce(
          (acc, label) => acc + (dataset.series![label]?.[t] ?? 0),
          0
        );
        if (s > max) max = s;
      }
      return max;
    }
    if (dataset.fillTo100) return 100;
    return 0;
  }, [dataset]);

  // canvi de dataset: reinicia període, disabled (segons defaultEnabled) i marca aim
  const selectDataset = useCallback(
    (i: number) => {
      const ds = datasets[i];
      setDisabled(disabledFromDefaults(ds));
      setPeriod(latestPeriodIndex(ds));
      setDatasetIndex(i);
    },
    [datasets]
  );

  const toggleMetric = useCallback((label: string) => {
    setDisabled((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const { metrics } = useMemo(
    () => buildMetrics(dataset, period, disabled),
    [dataset, period, disabled]
  );

  const counts = useMemo(
    () => distributeFloors(metrics, totalFloors, activeFillMax),
    [metrics, totalFloors, activeFillMax]
  );

  const periodLabel = useMemo(() => {
    if (dataset.temporal && dataset.periods) return dataset.periods[period] ?? "";
    return "";
  }, [dataset, period]);

  const activeMarker = useMemo(() => {
    if (!dataset.temporal || !dataset.markers || !dataset.periods) return null;
    const mk = dataset.markers.find(
      (m) => Math.abs((m.index ?? m.periodIndex) - period) <= 1
    );
    if (!mk) return null;
    return { label: mk.label, periodLabel: dataset.periods[period] ?? "" };
  }, [dataset, period]);

  return {
    datasetIndex,
    dataset,
    metrics,
    counts,
    activeFillMax,
    period,
    periodLabel,
    activeMarker,
    disabled,
    selectDataset,
    setPeriod,
    toggleMetric,
  };
}
