"use client";

import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { CityData } from "@/lib/observatori/city";
import type { LightInfo } from "./Windows";
import { useMediaQuery } from "@/lib/useMediaQuery";

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


function cityBoundingBox(city: CityData) {
  const box = new THREE.Box3();
  const footprintPad = 0.8;
  for (const b of city.buildings) {
    box.expandByPoint(
      new THREE.Vector3(b.position.x - footprintPad, 0, b.position.z - footprintPad)
    );
    box.expandByPoint(
      new THREE.Vector3(
        b.position.x + footprintPad,
        b.height + 0.55,
        b.position.z + footprintPad
      )
    );
  }
  return box;
}

/** Distància d'òrbita per encabir la ciutat al viewport amb l'angle donat. */
function computeFitRadius(
  box: THREE.Box3,
  fovDeg: number,
  aspect: number,
  theta: number,
  phi: number,
  target: THREE.Vector3,
  padding = 1.14
) {
  const u = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta)
  );
  const forward = u.clone().negate();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  right.normalize();
  const up = new THREE.Vector3().crossVectors(right, forward).normalize();

  const halfFovV = ((fovDeg * Math.PI) / 180) / 2;
  const halfFovH = Math.atan(Math.tan(halfFovV) * aspect);
  const tanH = Math.tan(halfFovH);
  const tanV = Math.tan(halfFovV);

  const corners = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];

  let minR = 0;
  for (const corner of corners) {
    const v = corner.clone().sub(target);
    const vDotU = v.dot(u);
    const needH = vDotU + Math.abs(v.dot(right)) / tanH;
    const needV = vDotU + Math.abs(v.dot(up)) / tanV;
    minR = Math.max(minR, needH, needV);
  }

  return minR * padding;
}

function aimFitRadius(
  city: CityData,
  camera: THREE.PerspectiveCamera,
  theta: number,
  phi: number,
  target: THREE.Vector3,
  viewport: { width: number; height: number },
  viewShiftRatio: number
) {
  // compensa el viewOffset vertical
  const effectiveHeight = viewport.height * (1 - viewShiftRatio * 1.13);
  const aspect = viewport.width / effectiveHeight;
  const box = cityBoundingBox(city);
  return computeFitRadius(box, camera.fov, aspect, theta, phi, target, 1.16);
}

function viewShiftRatio(isCompact: boolean) {
  // desktop: desplaça cap amunt per al capçalera; mòbil: cap avall per als controls del peu
  return isCompact ? 0.02 : 0.12;
}

// phi baix = càmera més alta (vista cenital); phi alt = vista obliqua
function computeZenithPhi(light: LightInfo, city: CityData) {
  const total = totalWindows(city);
  const litFrac = total > 0 ? Math.min(1, light.lightW / total) : 0;
  const PHI_OBLIQUE = 1.18; // poques finestres enceses
  const PHI_ZENITH = 1.02; // moltes finestres enceses (mai gaire cenital)
  return PHI_OBLIQUE - litFrac * (PHI_OBLIQUE - PHI_ZENITH);
}

export function CameraRig({ aim, city }: CameraRigProps) {
  const { camera, gl, size } = useThree();
  const isCompact = useMediaQuery("(max-width: 1023px)");
  const lookAtY = cityLookAtY(city);
  const shiftRatio = viewShiftRatio(isCompact);

  const updateAimRadius = (theta: number, phi: number) => {
    const s = state.current;
    if (s.userInteracted) return;
    s.targetRadius = aimFitRadius(
      city,
      camera as THREE.PerspectiveCamera,
      theta,
      phi,
      s.target,
      { width: isCompact ? size.width * 1.4 : size.width, height: size.height },
      shiftRatio
    );
  };

  // estat d'òrbita
  const state = useRef({
    theta: 0.7,
    phi: 1.12,
    radius: 42,
    target: new THREE.Vector3(0, lookAtY, 0),
    targetTheta: null as number | null,
    targetPhi: null as number | null,
    targetRadius: null as number | null,
    userInteracted: false,
    dragging: false,
    pinching: false,
    pinchDist: 0,
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

  // reajusta el zoom quan canvia la mida del dispositiu
  useEffect(() => {
    const s = state.current;
    if (s.userInteracted || s.lastAimedDatasetIndex < 0) return;
    const theta = s.targetTheta ?? s.theta;
    const phi = s.targetPhi ?? s.phi;
    updateAimRadius(theta, phi);
  }, [size.width, size.height, city, camera, shiftRatio]);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    // offsetY positiu desplaça l'escena cap amunt dins el viewport
    const shift = size.height * shiftRatio;
    cam.setViewOffset(size.width, size.height, 0, shift, size.width, size.height);
    return () => cam.clearViewOffset();
  }, [camera, size.width, size.height, shiftRatio]);

  // interacció ratolí/roda i tàctil
  useEffect(() => {
    const el = gl.domElement;
    const s = state.current;
    const prevTouchAction = el.style.touchAction;
    el.style.touchAction = "none";

    const orbitFromDelta = (dx: number, dy: number) => {
      s.userInteracted = true;
      s.targetTheta = null;
      s.targetPhi = null;
      s.targetRadius = null;
      s.theta -= dx * 0.005;
      s.phi = Math.max(0.2, Math.min(1.4, s.phi - dy * 0.005));
    };

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
      orbitFromDelta(e.clientX - s.px, e.clientY - s.py);
      s.px = e.clientX;
      s.py = e.clientY;
    };
    const wheel = (e: WheelEvent) => {
      s.userInteracted = true;
      s.targetRadius = null;
      s.radius = Math.max(14, Math.min(60, s.radius + e.deltaY * 0.02));
    };

    const pinchDistance = (touches: TouchList) => {
      const [a, b] = [touches[0], touches[1]];
      return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    };

    const touchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        s.dragging = true;
        s.pinching = false;
        s.px = e.touches[0].clientX;
        s.py = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        s.dragging = false;
        s.pinching = true;
        s.pinchDist = pinchDistance(e.touches);
      }
    };
    const touchMove = (e: TouchEvent) => {
      if (s.pinching && e.touches.length >= 2) {
        e.preventDefault();
        s.userInteracted = true;
        s.targetRadius = null;
        const dist = pinchDistance(e.touches);
        const scale = dist / s.pinchDist;
        if (scale > 0) {
          s.radius = Math.max(14, Math.min(60, s.radius / scale));
        }
        s.pinchDist = dist;
        return;
      }
      if (!s.dragging || e.touches.length !== 1) return;
      e.preventDefault();
      const t = e.touches[0];
      orbitFromDelta(t.clientX - s.px, t.clientY - s.py);
      s.px = t.clientX;
      s.py = t.clientY;
    };
    const touchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        s.dragging = false;
        s.pinching = false;
        return;
      }
      if (e.touches.length === 1) {
        s.pinching = false;
        s.dragging = true;
        s.px = e.touches[0].clientX;
        s.py = e.touches[0].clientY;
      }
    };

    el.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    window.addEventListener("mousemove", move);
    el.addEventListener("wheel", wheel, { passive: true });
    el.addEventListener("touchstart", touchStart, { passive: true });
    el.addEventListener("touchmove", touchMove, { passive: false });
    el.addEventListener("touchend", touchEnd);
    el.addEventListener("touchcancel", touchEnd);
    return () => {
      el.style.touchAction = prevTouchAction;
      el.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("mousemove", move);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("touchstart", touchStart);
      el.removeEventListener("touchmove", touchMove);
      el.removeEventListener("touchend", touchEnd);
      el.removeEventListener("touchcancel", touchEnd);
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
    const aimTheta = pos
      ? nearestCorner(Math.atan2(pos.z, pos.x))
      : (s.targetTheta ?? s.theta);
    const aimPhi = computeZenithPhi(light, city);
    if (pos) s.targetTheta = aimTheta;
    s.targetPhi = aimPhi;
    updateAimRadius(aimTheta, aimPhi);
  }, [aim, camera, size.width, size.height, shiftRatio]);

  useFrame(() => {
    const s = state.current;
    // anima theta cap a l'objectiu pel camí més curt
    if (s.targetTheta !== null && !s.dragging && !s.pinching && !s.userInteracted) {
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
    if (s.targetPhi !== null && !s.dragging && !s.pinching && !s.userInteracted) {
      const diff = s.targetPhi - s.phi;
      if (Math.abs(diff) > 0.002) s.phi += diff * 0.06;
      else {
        s.phi = s.targetPhi;
        s.targetPhi = null;
      }
    }
    // anima radius (zoom to fit)
    if (s.targetRadius !== null && !s.dragging && !s.pinching && !s.userInteracted) {
      const diff = s.targetRadius - s.radius;
      if (Math.abs(diff) > 0.05) s.radius += diff * 0.06;
      else {
        s.radius = s.targetRadius;
        s.targetRadius = null;
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
