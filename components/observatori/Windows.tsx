"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import type { CityData } from "@/lib/observatori/city";
import type { Metric } from "@/lib/observatori/types";

const DARK = new THREE.Color(0x0c1320);

export interface LightInfo {
  lightX: number;
  lightZ: number;
  lightW: number;
  litFloors: number;
  totalFloors: number;
  biMetricSet: Map<number, Set<number>>;
  // per a les etiquetes: bi → mètriques presents / finestres enceses
  metricBiSets: Set<number>[];
  metricBiWindowCounts: Map<number, number>[];
  epoch: number; // incrementa a cada repaint (per sincronitzar la càmera)
}

interface WindowsProps {
  city: CityData;
  metrics: Metric[];
  counts: number[];
  bloom: boolean;
  /** pinta des del final del serpentí (categories grans al cim) */
  invert?: boolean;
  onLight?: (info: LightInfo) => void;
}

// Un únic InstancedMesh amb totes les finestres de la ciutat. El mapping
// global → (edifici, índex local) es precalcula; el color s'actualitza a cada
// canvi de distribució.
export function Windows({ city, metrics, counts, bloom, invert = false, onLight }: WindowsProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const lightEpoch = useRef(0);

  // offset de cada edifici dins l'array global de finestres + matrius globals
  const { total, matrices, buildingOffset } = useMemo(() => {
    let total = 0;
    const buildingOffset: number[] = [];
    for (const b of city.buildings) {
      buildingOffset[b.bi] = total;
      total += b.total;
    }
    const matrices = new Array<THREE.Matrix4>(total);
    const m = new THREE.Matrix4();
    for (const b of city.buildings) {
      m.compose(
        b.position,
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, b.rotationY, 0)),
        new THREE.Vector3(1, 1, 1)
      );
      const off = buildingOffset[b.bi];
      b.windowMatrices.forEach((wm, i) => {
        matrices[off + i] = new THREE.Matrix4().multiplyMatrices(m, wm);
      });
    }
    return { total, matrices, buildingOffset };
  }, [city]);

  // posa les matrius un sol cop
  useEffect(() => {
    const inst = ref.current;
    if (!inst) return;
    for (let i = 0; i < total; i++) inst.setMatrixAt(i, matrices[i]);
    inst.instanceMatrix.needsUpdate = true;
  }, [matrices, total]);

  // repaint: aplica colors segons la distribució de plantes (ordre serpentí;
  // amb invert, des del final perquè les categories grans quedin al cim)
  useEffect(() => {
    const inst = ref.current;
    if (!inst || !inst.instanceColor) {
      // força la creació de l'atribut de color
      if (inst) for (let i = 0; i < total; i++) inst.setColorAt(i, DARK);
    }
    if (!inst) return;
    for (let i = 0; i < total; i++) inst.setColorAt(i, DARK);

    const FLOORS = city.floors;
    const TOTAL_FLOORS = FLOORS.length;
    let p = 0;
    let lightX = 0,
      lightZ = 0,
      lightW = 0,
      litFloors = 0;
    const biMetricSet = new Map<number, Set<number>>();
    const metricBiSets: Set<number>[] = metrics.map(() => new Set<number>());
    const metricBiWindowCounts: Map<number, number>[] = metrics.map(() => new Map());

    metrics.forEach((m, mi) => {
      const enabled = m.enabled !== false;
      const color = new THREE.Color(m.hex).lerp(
        new THREE.Color(0xffffff),
        bloom ? 0.08 : 0.35
      );
      for (let j = 0; j < counts[mi] && p < TOTAL_FLOORS; j++, p++) {
        const fl = FLOORS[invert ? TOTAL_FLOORS - 1 - p : p];
        if (!enabled) continue;
        litFloors++;
        const off = buildingOffset[fl.bi];
        const w = fl.idxs.length;
        for (const idx of fl.idxs) inst.setColorAt(off + idx, color);
        metricBiSets[mi].add(fl.bi);
        metricBiWindowCounts[mi].set(
          fl.bi,
          (metricBiWindowCounts[mi].get(fl.bi) ?? 0) + w
        );
        const b = city.buildings[fl.bi];
        lightX += b.position.x * w;
        lightZ += b.position.z * w;
        lightW += w;
        if (!biMetricSet.has(fl.bi)) biMetricSet.set(fl.bi, new Set());
        biMetricSet.get(fl.bi)!.add(mi);
      }
    });
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;

    lightEpoch.current += 1;
    onLight?.({
      lightX,
      lightZ,
      lightW,
      litFloors,
      totalFloors: TOTAL_FLOORS,
      biMetricSet,
      metricBiSets,
      metricBiWindowCounts,
      epoch: lightEpoch.current,
    });
    // onLight no a deps a propòsit (callback estable del pare)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, counts, bloom, invert, city, total, buildingOffset]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, total]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color={0xffffff} toneMapped={false} />
    </instancedMesh>
  );
}
