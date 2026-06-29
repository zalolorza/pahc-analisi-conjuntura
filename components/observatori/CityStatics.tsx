"use client";

import * as React from "react";
import * as THREE from "three";
import { useMemo } from "react";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { CityData } from "@/lib/observatori/city";

const SHELL_COLORS = [0x222a3a, 0x26303f, 0x1f2735, 0x2a3344];

// Fusiona totes les geometries estàtiques (cos, teulada, extres) en pocs meshes,
// aplicant la transformació de cada edifici (posició + rotació).
export function CityStatics({ city }: { city: CityData }) {
  const { shellGeo, roofGeo, trimGeo, sidewalkGeo } = useMemo(() => {
    const shells: THREE.BufferGeometry[] = [];
    const roofs: THREE.BufferGeometry[] = [];
    const trims: THREE.BufferGeometry[] = [];
    const sidewalks: THREE.BufferGeometry[] = [];

    const m = new THREE.Matrix4();
    for (const b of city.buildings) {
      m.compose(
        b.position,
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, b.rotationY, 0)),
        new THREE.Vector3(1, 1, 1)
      );
      for (const s of b.shells) {
        const g = s.geometry.clone();
        g.applyMatrix4(m);
        shells.push(g);
      }
      const rg = b.roof.clone();
      rg.applyMatrix4(m);
      roofs.push(rg);
      for (const e of b.extras) {
        const g = e.geometry.clone();
        g.applyMatrix4(m);
        if (e.matIndex === 2) sidewalks.push(g);
        else trims.push(g);
      }
    }
    return {
      shellGeo: mergeGeometries(shells, false),
      roofGeo: mergeGeometries(roofs, false),
      trimGeo: trims.length ? mergeGeometries(trims, false) : null,
      sidewalkGeo: sidewalks.length ? mergeGeometries(sidewalks, false) : null,
    };
  }, [city]);

  return (
    <group>
      {shellGeo && (
        <mesh geometry={shellGeo}>
          <meshLambertMaterial color={SHELL_COLORS[1]} />
        </mesh>
      )}
      {roofGeo && (
        <mesh geometry={roofGeo}>
          <meshLambertMaterial color={0x2a3344} side={THREE.DoubleSide} />
        </mesh>
      )}
      {trimGeo && (
        <mesh geometry={trimGeo}>
          <meshLambertMaterial color={0x161d2b} />
        </mesh>
      )}
      {sidewalkGeo && (
        <mesh geometry={sidewalkGeo}>
          <meshLambertMaterial color={0x10151f} />
        </mesh>
      )}
    </group>
  );
}

// Faroles del bloc: pal, bombeta i llum puntual càlida.
export function Lamps({ city }: { city: CityData }) {
  return (
    <group>
      {city.lamps.map((l, i) => (
        <group key={i} position={[l.x, 0, l.z]}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 1.2, 5]} />
            <meshLambertMaterial color={0x1a2236} />
          </mesh>
          <mesh position={[0, 1.25, 0]}>
            <sphereGeometry args={[0.07, 6, 6]} />
            <meshBasicMaterial color={0xffd9a0} toneMapped={false} />
          </mesh>
          <pointLight
            position={[0, 1.25, 0]}
            color={0xffc97a}
            intensity={8}
            distance={5.17 * 2.6}
            decay={1.8}
          />
        </group>
      ))}
    </group>
  );
}

// Llums de teulada (un subconjunt d'edificis).
export function RoofLights({ city }: { city: CityData }) {
  return (
    <group>
      {city.buildings
        .filter((b) => b.hasLight)
        .map((b) => (
          <pointLight
            key={b.bi}
            position={[b.position.x, b.height + 2.0, b.position.z]}
            color={0xb8cce8}
            intensity={0.7}
            distance={2.8 * 2.8}
            decay={2.0}
          />
        ))}
    </group>
  );
}
