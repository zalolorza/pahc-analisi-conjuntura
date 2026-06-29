"use client";

import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { CityData } from "@/lib/observatori/city";
import type { LightInfo } from "./Windows";

export interface CameraAimRequest {
  light: LightInfo;
  city: CityData;
  datasetIndex: number; // canvia de dataset → reposiciona la càmera
}

interface CameraRigProps {
  aim: CameraAimRequest | null;
  city: CityData;
}

function cityLookAtY(city: CityData) {
  const maxH = Math.max(...city.buildings.map((b) => b.height));
  return maxH * 0.42;
}

// arrodoneix un angle a la cantonada diagonal més propera (45/135/225/315°)
function nearestCorner(ang: number) {
  return Math.round((ang - Math.PI / 4) / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 4;
}

function cornerBuildingIndices(city: CityData) {
  const { cols, rows } = city;
  return [
    0,
    cols - 1,
    (rows - 1) * cols,
    (rows - 1) * cols + (cols - 1),
  ];
}

/** 0=NO, 1=NE, 2=SO, 3=SE */
function quadrantForBi(bi: number, city: CityData) {
  const row = Math.floor(bi / city.cols);
  const col = bi % city.cols;
  const north = row < city.rows / 2;
  const west = col < city.cols / 2;
  if (north && west) return 0;
  if (north && !west) return 1;
  if (!north && west) return 2;
  return 3;
}

// Prioritat: (1) edifici cantoner amb més variabilitat de mètriques,
// (2) cantonada amb més edificis encesos.
function computeAimPosition(light: LightInfo, city: CityData) {
  const corners = cornerBuildingIndices(city);
  const litPerQuadrant = [0, 0, 0, 0];
  light.biMetricSet.forEach((_metrics, bi) => {
    litPerQuadrant[quadrantForBi(bi, city)]++;
  });

  let bestQuadrant = 0;
  let bestVariability = -1;
  let bestLitBuildings = -1;
  for (let q = 0; q < 4; q++) {
    const variability = light.biMetricSet.get(corners[q])?.size ?? 0;
    const lit = litPerQuadrant[q];
    if (
      variability > bestVariability ||
      (variability === bestVariability && lit > bestLitBuildings)
    ) {
      bestVariability = variability;
      bestLitBuildings = lit;
      bestQuadrant = q;
    }
  }

  if (bestVariability > 0 || bestLitBuildings > 0) {
    const b = city.buildings[corners[bestQuadrant]];
    return { x: b.position.x, z: b.position.z };
  }

  return null;
}

function totalWindows(city: CityData) {
  return city.buildings.reduce((sum, b) => sum + b.total, 0);
}

// phi baix = càmera més alta (vista cenital); phi alt = vista obliqua
function computeZenithPhi(light: LightInfo, city: CityData) {
  const total = totalWindows(city);
  const litFrac = total > 0 ? Math.min(1, light.lightW / total) : 0;
  const PHI_OBLIQUE = 1.18; // poques finestres enceses
  const PHI_ZENITH = 0.82; // moltes finestres enceses (mai gaire cenital)
  return PHI_OBLIQUE - litFrac * (PHI_OBLIQUE - PHI_ZENITH);
}

export function CameraRig({ aim, city }: CameraRigProps) {
  const { camera, gl, size } = useThree();
  const lookAtY = cityLookAtY(city);

  // estat d'òrbita
  const state = useRef({
    theta: 0.7,
    phi: 1.12,
    radius: 42,
    target: new THREE.Vector3(0, lookAtY, 0),
    targetTheta: null as number | null,
    targetPhi: null as number | null,
    userInteracted: false,
    dragging: false,
    px: 0,
    py: 0,
    lastAimedDatasetIndex: -1,
    pendingDatasetIndex: null as number | null,
    datasetChangeLightEpoch: -1,
  });

  // centra la ciutat verticalment (compensa la UI del capçalera/peu)
  useEffect(() => {
    state.current.target.y = lookAtY;
  }, [lookAtY]);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    // offsetY positiu desplaça l'escena cap amunt dins el viewport
    const shift = size.height * 0.15;
    cam.setViewOffset(size.width, size.height, 0, shift, size.width, size.height);
    return () => cam.clearViewOffset();
  }, [camera, size.width, size.height]);

  // interacció ratolí/roda
  useEffect(() => {
    const el = gl.domElement;
    const s = state.current;
    const down = (e: MouseEvent) => {
      s.dragging = true;
      s.px = e.clientX;
      s.py = e.clientY;
    };
    const up = () => {
      s.dragging = false;
    };
    const move = (e: MouseEvent) => {
      if (!s.dragging) return;
      s.userInteracted = true;
      s.targetTheta = null;
      s.targetPhi = null;
      s.theta -= (e.clientX - s.px) * 0.005;
      s.phi = Math.max(0.2, Math.min(1.4, s.phi - (e.clientY - s.py) * 0.005));
      s.px = e.clientX;
      s.py = e.clientY;
    };
    const wheel = (e: WheelEvent) => {
      s.radius = Math.max(14, Math.min(60, s.radius + e.deltaY * 0.02));
    };
    el.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    window.addEventListener("mousemove", move);
    el.addEventListener("wheel", wheel, { passive: true });
    return () => {
      el.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("mousemove", move);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  // auto-aim només en canviar de dataset; el slider temporal no mou la càmera
  useEffect(() => {
    if (!aim) return;
    const s = state.current;

    if (aim.datasetIndex !== s.lastAimedDatasetIndex) {
      if (s.pendingDatasetIndex !== aim.datasetIndex) {
        s.pendingDatasetIndex = aim.datasetIndex;
        s.datasetChangeLightEpoch =
          s.lastAimedDatasetIndex === -1 ? -1 : aim.light.epoch;
        s.userInteracted = false;
      }
    }

    if (s.pendingDatasetIndex !== aim.datasetIndex) return;
    // espera el repaint de Windows amb les dades del nou dataset
    if (aim.light.epoch <= s.datasetChangeLightEpoch) return;

    s.lastAimedDatasetIndex = aim.datasetIndex;
    s.pendingDatasetIndex = null;

    const { light, city } = aim;
    const pos = computeAimPosition(light, city);
    if (pos) {
      s.targetTheta = nearestCorner(Math.atan2(pos.z, pos.x));
    }
    s.targetPhi = computeZenithPhi(light, city);
  }, [aim]);

  useFrame(() => {
    const s = state.current;
    // anima theta cap a l'objectiu pel camí més curt
    if (s.targetTheta !== null && !s.dragging && !s.userInteracted) {
      let diff = s.targetTheta - s.theta;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      if (Math.abs(diff) > 0.002) s.theta += diff * 0.06;
      else {
        s.theta = s.targetTheta;
        s.targetTheta = null;
      }
    }
    // anima phi
    if (s.targetPhi !== null && !s.dragging && !s.userInteracted) {
      const diff = s.targetPhi - s.phi;
      if (Math.abs(diff) > 0.002) s.phi += diff * 0.06;
      else {
        s.phi = s.targetPhi;
        s.targetPhi = null;
      }
    }
    const { radius, phi, theta, target } = s;
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.cos(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.sin(theta)
    );
    camera.lookAt(target);
  });

  return null;
}
