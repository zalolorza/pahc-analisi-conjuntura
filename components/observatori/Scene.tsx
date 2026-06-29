"use client";

import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useMemo, useState, useCallback, useEffect } from "react";
import * as THREE from "three";
import { buildCity } from "@/lib/observatori/city";
import { useMediaQuery } from "@/lib/useMediaQuery";
import type { Metric } from "@/lib/observatori/types";
import { CityStatics, Lamps, RoofLights } from "./CityStatics";
import { Windows, type LightInfo } from "./Windows";
import { CameraRig, type CameraAimRequest } from "./CameraRig";
import { Labels } from "./Labels";

interface SceneProps {
  metrics: Metric[];
  counts: number[];
  unit: string;
  datasetIndex: number;
  invert?: boolean;
  onCity: (totalFloors: number) => void;
}

export function Scene({ metrics, counts, unit, datasetIndex, invert = false, onCity }: SceneProps) {
  const isCompact = useMediaQuery("(max-width: 1023px)");

  const city = useMemo(() => {
    const cols = isCompact ? 5 : 6;
    const rows = isCompact ? 4 : 5;
    return buildCity(cols, rows, 1, 0.68);
  }, [isCompact]);

  // informem del nombre total de plantes (per a la distribució del pare)
  useEffect(() => {
    onCity(city.floors.length);
  }, [city, onCity]);

  const [light, setLight] = useState<LightInfo | null>(null);
  const onLight = useCallback((info: LightInfo) => setLight(info), []);

  const aim: CameraAimRequest | null = useMemo(
    () => (light ? { light, city, datasetIndex } : null),
    [light, city, datasetIndex]
  );

  const metricBiSets = light?.metricBiSets ?? metrics.map(() => new Set<number>());
  const metricBiWindowCounts =
    light?.metricBiWindowCounts ?? metrics.map(() => new Map<number, number>());

  return (
    <Canvas
      gl={{ antialias: false }}
      dpr={1}
      camera={{ fov: 45, near: 0.1, far: 200, position: [20, 20, 20] }}
      style={{ position: "fixed", inset: 0 }}
      scene={{ background: new THREE.Color(0x0d1525) }}
      onCreated={({ scene }) => {
        scene.fog = new THREE.FogExp2(0x0d1525, 0.013);
      }}
    >
      <ambientLight color={0x0e1424} intensity={isCompact ? 120 : 60} />
      <directionalLight color={0x8fa6d8} intensity={2} position={[-14, 26, -10]} />
      {/* <hemisphereLight color={0x2b3a5e} groundColor={0x0a0e17} intensity={0.4} /> */}

      <CityStatics city={city} />
      {/* <RoofLights city={city} /> */}
      <Lamps city={city} />
      <Windows
        city={city}
        metrics={metrics}
        counts={counts}
        bloom
        invert={invert}
        onLight={onLight}
      />
      <Labels
        city={city}
        metrics={metrics}
        metricBiSets={metricBiSets}
        metricBiWindowCounts={metricBiWindowCounts}
        unit={unit}
      />

      {/* terra */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[2000, 2000]} />
        <meshLambertMaterial color={0x0d1522} />
      </mesh>

      <CameraRig aim={aim} city={city} />

      <EffectComposer>
        <Bloom intensity={0.7} luminanceThreshold={0.15} luminanceSmoothing={0.5} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
