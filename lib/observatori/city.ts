import * as THREE from "three";

export const GAP = 5.17;
const FH = 0.85; // alçada de planta

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export interface WindowInstance {
  matrix: THREE.Matrix4;
}

export interface BuildingData {
  bi: number;
  position: THREE.Vector3;
  rotationY: number;
  floors: number;
  height: number;
  total: number; // nombre de finestres
  floorRanges: { start: number; count: number }[];
  windowMatrices: THREE.Matrix4[];
  // geometries del cos (caixes) i teulada, ja posicionades en local
  shells: { geometry: THREE.BufferGeometry; matIndex: number }[];
  roof: THREE.BufferGeometry;
  extras: { geometry: THREE.BufferGeometry; matIndex: number }[]; // base, terrasses, xemeneia, canalera
  hasLight: boolean;
}

export interface FloorSlot {
  bi: number;
  floor: number;
  idxs: number[];
}

export interface CityData {
  buildings: BuildingData[];
  floors: FloorSlot[]; // ordre serpentí
  cols: number;
  rows: number;
  lamps: { x: number; z: number }[];
}

const SHELL_COLORS = [0x222a3a, 0x26303f, 0x1f2735, 0x2a3344];

function makeBuilding(
  bi: number,
  ix: number,
  iz: number,
  floors: number,
  footprint: number,
  useLight: boolean
): BuildingData {
  const h = floors * FH;
  const w0 = footprint * rand(0.85, 1.2);
  const d0 = footprint * rand(0.85, 1.2);

  const wAt = new Array(floors);
  const dAt = new Array(floors);
  const winDensity = 1.6;
  const colsFor = (span: number) => Math.max(2, Math.round(span * winDensity));

  let setbackFloor = -1;
  let shrink = 1;
  if (floors >= 3 && Math.random() < 0.45) {
    const tryShrink = rand(0.55, 0.78);
    const shrunkCols = Math.min(colsFor(w0 * tryShrink), colsFor(d0 * tryShrink));
    if (shrunkCols >= 4) {
      setbackFloor = floors - 1;
      shrink = tryShrink;
    }
  }
  for (let fl = 0; fl < floors; fl++) {
    const s = setbackFloor >= 0 && fl >= setbackFloor ? shrink : 1;
    wAt[fl] = w0 * s;
    dAt[fl] = d0 * s;
  }
  const wMax = w0;
  const dMax = d0;

  const shells: BuildingData["shells"] = [];
  const extras: BuildingData["extras"] = [];

  // vorera
  const padGeo = new THREE.BoxGeometry(wMax * 1.18, 0.08, dMax * 1.18);
  padGeo.translate(0, 0.04, 0);
  extras.push({ geometry: padGeo, matIndex: 2 }); // sidewalk

  // cos: un bloc per tram de superfície constant
  const shellMatIdx = Math.floor(Math.random() * SHELL_COLORS.length);
  let segStart = 0;
  for (let fl = 1; fl <= floors; fl++) {
    if (fl === floors || wAt[fl] !== wAt[segStart]) {
      const segFloors = fl - segStart;
      const segH = segFloors * FH;
      const g = new THREE.BoxGeometry(wAt[segStart], segH, dAt[segStart]);
      g.translate(0, segStart * FH + segH / 2, 0);
      shells.push({ geometry: g, matIndex: shellMatIdx });
      if (fl < floors) {
        const terr = new THREE.BoxGeometry(wAt[segStart], 0.08, dAt[segStart]);
        terr.translate(0, fl * FH + 0.04, 0);
        extras.push({ geometry: terr, matIndex: 1 }); // trim
      }
      segStart = fl;
    }
  }

  // plinth planta baixa
  const base = new THREE.BoxGeometry(wAt[0] * 1.002, FH * 0.85, dAt[0] * 1.002);
  base.translate(0, FH * 0.42, 0);
  extras.push({ geometry: base, matIndex: 1 });

  // ---- teulada triangular ----
  const wTop = wAt[floors - 1];
  const dTop = dAt[floors - 1];
  const roofBase = h + 0.05;
  const ridgeH = rand(0.25, 0.45);
  const overhang = 0.18;
  const aspect = wTop / dTop;
  const isPyramid = aspect > 0.75 && aspect < 1.33 && Math.random() < 0.4;

  const hw = wTop / 2 + overhang;
  const hd = dTop / 2 + overhang;
  let verts: Float32Array;
  let ridgeAlongX = false;
  if (isPyramid) {
    verts = new Float32Array([
      -hw, roofBase, hd, hw, roofBase, hd, 0, roofBase + ridgeH, 0,
      hw, roofBase, -hd, -hw, roofBase, -hd, 0, roofBase + ridgeH, 0,
      hw, roofBase, hd, hw, roofBase, -hd, 0, roofBase + ridgeH, 0,
      -hw, roofBase, -hd, -hw, roofBase, hd, 0, roofBase + ridgeH, 0,
    ]);
  } else {
    ridgeAlongX = wTop >= dTop;
    if (ridgeAlongX) {
      verts = new Float32Array([
        -hw, roofBase, hd, hw, roofBase, hd, hw, roofBase + ridgeH, 0,
        -hw, roofBase, hd, hw, roofBase + ridgeH, 0, -hw, roofBase + ridgeH, 0,
        hw, roofBase, -hd, -hw, roofBase, -hd, -hw, roofBase + ridgeH, 0,
        hw, roofBase, -hd, -hw, roofBase + ridgeH, 0, hw, roofBase + ridgeH, 0,
        -hw, roofBase, hd, -hw, roofBase + ridgeH, 0, -hw, roofBase, -hd,
        hw, roofBase, -hd, hw, roofBase + ridgeH, 0, hw, roofBase, hd,
      ]);
    } else {
      verts = new Float32Array([
        hw, roofBase, -hd, hw, roofBase, hd, 0, roofBase + ridgeH, hd,
        hw, roofBase, -hd, 0, roofBase + ridgeH, hd, 0, roofBase + ridgeH, -hd,
        -hw, roofBase, hd, -hw, roofBase, -hd, 0, roofBase + ridgeH, -hd,
        -hw, roofBase, hd, 0, roofBase + ridgeH, -hd, 0, roofBase + ridgeH, hd,
        -hw, roofBase, hd, 0, roofBase + ridgeH, hd, hw, roofBase, hd,
        -hw, roofBase, -hd, hw, roofBase, -hd, 0, roofBase + ridgeH, -hd,
      ]);
    }
  }
  const roof = new THREE.BufferGeometry();
  roof.setAttribute("position", new THREE.BufferAttribute(verts, 3));
  roof.computeVertexNormals();

  // canalera per a teulada a dues aigües
  if (!isPyramid) {
    const gutterGeo = new THREE.BoxGeometry(
      ridgeAlongX ? wTop + overhang * 2 : 0.1,
      0.06,
      ridgeAlongX ? 0.1 : dTop + overhang * 2
    );
    const g1 = gutterGeo.clone();
    const g2 = gutterGeo.clone();
    if (ridgeAlongX) {
      g1.translate(0, roofBase, dTop / 2 + overhang);
      g2.translate(0, roofBase, -(dTop / 2 + overhang));
    } else {
      g1.translate(wTop / 2 + overhang, roofBase, 0);
      g2.translate(-(wTop / 2 + overhang), roofBase, 0);
    }
    extras.push({ geometry: g1, matIndex: 1 });
    extras.push({ geometry: g2, matIndex: 1 });
  }

  // xemeneia
  if (Math.random() < 0.3) {
    const cw = rand(0.12, 0.22);
    const cd = rand(0.12, 0.22);
    const ch = rand(0.25, 0.55);
    const chim = new THREE.BoxGeometry(cw, ch, cd);
    chim.translate(
      rand(-wTop * 0.25, wTop * 0.25),
      roofBase + ridgeH * 0.4,
      rand(-dTop * 0.25, dTop * 0.25)
    );
    extras.push({ geometry: chim, matIndex: 1 });
  }

  // ---- finestres (instàncies) ----
  const paneH = FH * 0.5;
  const floorRanges: BuildingData["floorRanges"] = [];
  let total = 0;
  const cWcD: { cW: number; cD: number }[] = [];
  for (let fl = 0; fl < floors; fl++) {
    const cW = colsFor(wAt[fl]);
    const cD = colsFor(dAt[fl]);
    const perFloor = 2 * cW + 2 * cD;
    floorRanges.push({ start: total, count: perFloor });
    cWcD.push({ cW, cD });
    total += perFloor;
  }

  const windowMatrices: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();
  const facePlacements = [
    { axis: "z", sign: 1, rotY: 0 },
    { axis: "z", sign: -1, rotY: Math.PI },
    { axis: "x", sign: 1, rotY: Math.PI / 2 },
    { axis: "x", sign: -1, rotY: -Math.PI / 2 },
  ] as const;
  for (let fl = 0; fl < floors; fl++) {
    const wf = wAt[fl];
    const df = dAt[fl];
    const { cW, cD } = cWcD[fl];
    for (const f of facePlacements) {
      const faceSpan = f.axis === "z" ? wf : df;
      const nCols = f.axis === "z" ? cW : cD;
      const paneWf = (faceSpan / nCols) * 0.62;
      for (let c = 0; c < nCols; c++) {
        const cx = (c - (nCols - 1) / 2) * (faceSpan / nCols);
        const cy = FH * 0.55 + fl * FH + FH * 0.2;
        if (f.axis === "z") dummy.position.set(cx, cy, f.sign * (df / 2 + 0.012));
        else dummy.position.set(f.sign * (wf / 2 + 0.012), cy, cx);
        dummy.rotation.set(0, f.rotY, 0);
        dummy.scale.set(paneWf, paneH, 1);
        dummy.updateMatrix();
        windowMatrices.push(dummy.matrix.clone());
      }
    }
  }

  return {
    bi,
    position: new THREE.Vector3(ix, 0, iz),
    rotationY: rand(-0.06, 0.06),
    floors,
    height: h,
    total,
    floorRanges,
    windowMatrices,
    shells,
    roof,
    extras,
    hasLight: useLight,
  };
}

export function buildCity(
  cols: number,
  rows: number,
  lightEvery: number,
  streetProb: number
): CityData {
  const buildings: BuildingData[] = [];
  const sX = -((cols - 1) * GAP) / 2;
  const sZ = -((rows - 1) * GAP) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let floors: number;
      const t = Math.random();
      if (t < 0.12) floors = 5;
      else if (t < 0.7) floors = 4;
      else if (t < 0.9) floors = 3;
      else floors = 2;
      const footprint = 1.7 + Math.random() * 1.6;
      const bi = r * cols + c;
      const useLight = lightEvery > 0 && bi % lightEvery === 0;
      buildings.push(
        makeBuilding(bi, sX + c * GAP, sZ + r * GAP, floors, footprint, useLight)
      );
    }
  }

  // faroles
  const lamps: { x: number; z: number }[] = [];
  if (streetProb > 0) {
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        if (Math.random() > streetProb) continue;
        lamps.push({ x: sX + (c - 0.5) * GAP, z: sZ + (r - 0.5) * GAP });
      }
    }
  }

  // FLOORS en ordre serpentí (boustrophedon)
  const floors: FloorSlot[] = [];
  buildings.forEach((b, bi) => {
    b.floorRanges.forEach((fr, fl) => {
      const idxs: number[] = [];
      for (let i = 0; i < fr.count; i++) idxs.push(fr.start + i);
      floors.push({ bi, floor: fl, idxs });
    });
  });
  floors.sort((a, z) => {
    const colA = a.bi % cols;
    const rowA = Math.floor(a.bi / cols);
    const colZ = z.bi % cols;
    const rowZ = Math.floor(z.bi / cols);
    if (rowA !== rowZ) return rowA - rowZ;
    const cA = rowA % 2 === 0 ? colA : cols - 1 - colA;
    const cZ = rowZ % 2 === 0 ? colZ : cols - 1 - colZ;
    if (cA !== cZ) return cA - cZ;
    return a.floor - z.floor;
  });

  return { buildings, floors, cols, rows, lamps };
}
