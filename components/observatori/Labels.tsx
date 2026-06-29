"use client";

import { useMemo } from "react";
import { Html, Line } from "@react-three/drei";
import type { CityData } from "@/lib/observatori/city";
import type { Metric } from "@/lib/observatori/types";

const MAX_LABELS = 9;

interface LabelsProps {
  city: CityData;
  metrics: Metric[];
  metricBiSets: Set<number>[];
  metricBiWindowCounts: Map<number, number>[];
  unit: string;
}

export function Labels({
  city,
  metrics,
  metricBiSets,
  metricBiWindowCounts,
  unit,
}: LabelsProps) {
  const placed = useMemo(() => {
    // candidats per mètrica, ordenats per (finestres enceses, alçada)
    const ranked = metricBiSets.map((biSet, mi) => {
      const counts = metricBiWindowCounts[mi] ?? new Map<number, number>();
      const list: { bi: number; h: number; score: number }[] = [];
      biSet.forEach((bi) => {
        const b = city.buildings[bi];
        const h = b.floors * 0.85;
        const litWindows = counts.get(bi) ?? 0;
        list.push({ bi, h, score: litWindows * 1000 + h });
      });
      list.sort((a, z) => z.score - a.score);
      return list;
    });

    // assignació greedy sense conflictes
    const used = new Set<number>();
    const anchors = metricBiSets.map((_, mi) => {
      for (const cand of ranked[mi]) {
        if (!used.has(cand.bi)) {
          used.add(cand.bi);
          return cand;
        }
      }
      return ranked[mi][0];
    });

    // apilament vertical per edifici compartit
    const stackByBi = new Map<number, number>();
    const out: {
      mi: number;
      x: number;
      z: number;
      topY: number;
      labelY: number;
    }[] = [];
    metrics.forEach((m, mi) => {
      if (mi >= MAX_LABELS) return;
      const biSet = metricBiSets[mi];
      if (!biSet || biSet.size === 0) return;
      const anchor = anchors[mi];
      if (!anchor) return;
      const b = city.buildings[anchor.bi];
      const maxH = anchor.h;
      const stackIdx = stackByBi.get(anchor.bi) ?? 0;
      stackByBi.set(anchor.bi, stackIdx + 1);
      const STACK_GAP = 0.85;
      const labelY = maxH + 2.8 + stackIdx * STACK_GAP;
      const topY = maxH + 0.6;
      out.push({ mi, x: b.position.x, z: b.position.z, topY, labelY });
    });
    return out;
  }, [city, metrics, metricBiSets, metricBiWindowCounts]);

  return (
    <group>
      {placed.map((pl) => {
        const m = metrics[pl.mi];
        const css = "#" + m.hex.toString(16).padStart(6, "0");
        return (
          <group key={m.label}>
            <Line
              points={[
                [pl.x, pl.topY, pl.z],
                [pl.x, pl.labelY - 0.3, pl.z],
              ]}
              color={css}
              lineWidth={1}
              transparent
              opacity={0.8}
            />
            <Html
              position={[pl.x, pl.labelY, pl.z]}
              center
              distanceFactor={28}
              style={{ pointerEvents: "none" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                  fontFamily: "ui-monospace, Menlo, monospace",
                  fontSize: 13,
                  color: "#e8eef7",
                  textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 2,
                    background: css,
                    boxShadow: `0 0 6px ${css}`,
                  }}
                />
                {m.label}{" "}
                <span style={{ opacity: 0.7 }}>
                  {Math.round(m.value)}
                  {unit}
                </span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
