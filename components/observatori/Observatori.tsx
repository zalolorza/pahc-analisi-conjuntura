"use client";

import { useCallback, useState } from "react";
import { DATASETS } from "@/lib/observatori/datasets";
import { useObservatori } from "@/lib/observatori/useObservatori";
import { Scene } from "./Scene";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export function Observatori() {
  // el nombre de plantes el fixa l'escena en construir la ciutat
  const [totalFloors, setTotalFloors] = useState(0);
  const onCity = useCallback((tf: number) => setTotalFloors((cur) => (cur === tf ? cur : tf)), []);

  const obs = useObservatori(DATASETS, totalFloors || 1);

  const [legendOpen, setLegendOpen] = useState(true);
  const ds = obs.dataset;

  const legendMetrics = ds.legendByLabel
    ? obs.metrics
    : [...obs.metrics].sort((a, b) => b.value - a.value);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0d1525] text-[#e8eef7]">
      <Scene
        metrics={obs.metrics}
        counts={obs.counts}
        unit={ds.unit}
        datasetIndex={obs.datasetIndex}
        invert={ds.invert}
        onCity={onCity}
      />

      {/* missatge d'època */}
      {obs.activeMarker && (
        <div className="pointer-events-none absolute left-1/2 top-[16%] z-10 -translate-x-1/2 text-center font-mono">
          <div
            className="text-[clamp(28px,5vw,56px)] font-semibold tracking-wider"
            style={{ color: "#5cc94a", textShadow: "0 0 30px #5cc94a" }}
          >
            {obs.activeMarker.label}
          </div>
          <div className="mt-1.5 text-[11px] uppercase tracking-[0.3em] opacity-70">
            {obs.activeMarker.periodLabel}
          </div>
        </div>
      )}

      {/* UI superposada */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-[clamp(18px,3vw,36px)]">
        {/* capçalera */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.2em] opacity-60">
              {ds.scope}
            </div>
            <div className="text-2xl font-semibold tracking-tight">{ds.name}</div>
            <p className="mt-1.5 max-w-[280px] text-sm opacity-70">{ds.desc}</p>
          </div>

          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <Select
              value={String(obs.datasetIndex)}
              onValueChange={(v) => obs.selectDataset(Number(v))}
            >
              <SelectTrigger className="w-[270px] border-white/15 bg-[#0c111c]/80 text-[#e8eef7] backdrop-blur">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/15 bg-[#0c111c] text-[#e8eef7]">
                {DATASETS.map((d, i) => (
                  <SelectItem key={d.id} value={String(i)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Card className="w-[270px] border-white/10 bg-[#0c111c]/80 p-3 text-[#e8eef7] backdrop-blur">
              <button
                onClick={() => setLegendOpen((o) => !o)}
                className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider opacity-80"
              >
                Llegenda <span>{legendOpen ? "▾" : "▸"}</span>
              </button>
              {legendOpen && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {legendMetrics.map((m) => {
                    const css = "#" + m.hex.toString(16).padStart(6, "0");
                    return (
                      <button
                        key={m.label}
                        onClick={() => obs.toggleMetric(m.label)}
                        className={cn(
                          "flex items-center gap-2.5 text-left text-sm transition-opacity",
                          m.enabled ? "opacity-100" : "opacity-35"
                        )}
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{
                            background: css,
                            boxShadow: m.enabled ? `0 0 6px ${css}` : "none",
                          }}
                        />
                        <span className="flex-1">{m.label}</span>
                        <span style={{ color: css }}>{Math.round(m.value)}</span>
                        <span className="opacity-50">{ds.unit}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* peu: timeline + ajuda */}
        <div className="flex flex-col gap-3 w-full">
          {ds.temporal && ds.periods && (
            <Card className="pointer-events-auto w-full max-w-lg mx-auto border-white/10 bg-[#0c111c]/80 p-4 text-[#e8eef7] backdrop-blur">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider opacity-60">
                  Període
                </span>
                <span className="font-mono text-sm" style={{ color: "#5cc94a" }}>
                  {obs.periodLabel}
                </span>
              </div>
              <Slider
                min={0}
                max={ds.periods.length - 1}
                step={1}
                value={[obs.period]}
                onValueChange={([v]) => obs.setPeriod(v)}
              />
            </Card>
          )}
          <div className="font-mono text-xs opacity-40 text-center">
            <span className="hidden sm:inline">Arrossega per orbitar · Scroll per a fer zoom</span>
            <span className="sm:hidden">Arrossega per orbitar · Pinça per fer zoom</span>
          </div>
        </div>
      </div>
    </div>
  );
}
