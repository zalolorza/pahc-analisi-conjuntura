import type { Dataset } from "./types";
import { expandTemporal } from "./spline";

function lerpPalette(from: number, to: number, steps: number): number[] {
  const fr = (from >> 16) & 0xff;
  const fg = (from >> 8) & 0xff;
  const fb = from & 0xff;
  const tr = (to >> 16) & 0xff;
  const tg = (to >> 8) & 0xff;
  const tb = to & 0xff;
  return Array.from({ length: steps }, (_, i) => {
    const t = steps === 1 ? 0 : i / (steps - 1);
    const r = Math.round(fr + (tr - fr) * t);
    const g = Math.round(fg + (tg - fg) * t);
    const b = Math.round(fb + (tb - fb) * t);
    return (r << 16) | (g << 8) | b;
  });
}

// Pobresa energètica (Manresa, Cens 2021) — Taula 31 Idescat
const ENERGY_POVERTY_LABELS = [
  "< 250 kWh",
  "251–500 kWh",
  "501–750 kWh",
  "751–1.000 kWh",
  "1.001–2.000 kWh",
  "2.001–3.000 kWh",
  "3.001–4.000 kWh",
  "4.001–5.000 kWh",
  "5.001–6.000 kWh",
  "6.001–7.000 kWh",
  "7.001–8.000 kWh",
  "8.001–9.000 kWh",
  "9.001–10.000 kWh",
  "> 10.000 kWh",
];
const ENERGY_POVERTY_COLORS = lerpPalette(0xff2020, 0x1a6fff, ENERGY_POVERTY_LABELS.length);

// Partits del Parlament de Catalunya
const PARTY_LABELS = ["PSC", "ERC", "Junts", "Aliança", "Vox", "PP", "Comuns", "CUP"];
const PARTY_COLORS = [
  0xff3b30, 0xff9500, 0x34d9b5, 0x0a84ff, 0x22c55e, 0x5e5ce6, 0xff2d92, 0xffe138,
];

// 9 preocupacions principals (CEO)
const P9_LABELS = [
  "Habitatge",
  "Immigració",
  "Inseguretat",
  "Insat. política",
  "Sanitat",
  "Economia",
  "Atur",
  "Cat.-Espanya",
  "Polít. socials",
];
const P9_COLORS = [
  0x5cc94a, 0xff2020, 0x1a6fff, 0x5e5ce6, 0xff9500, 0x0a84ff, 0xff2d92, 0xff8c00,
  0xb05cff,
];
const P9_PERIODS = [
  "Març 22", "Juny 22", "Oct. 22", "Març 23", "Juny 23", "Oct. 23",
  "Feb. 24", "Juny 24", "Nov. 24", "Març 25", "Juny 25", "Oct. 25",
];
const P9_SERIES: Record<string, number[]> = {
  Habitatge: [4, 4, 3, 6, 8, 8, 7, 11, 20, 23, 21, 31],
  Immigració: [2, 3, 3, 2, 4, 4, 6, 8, 7, 10, 9, 10],
  Inseguretat: [3, 5, 6, 6, 8, 8, 7, 8, 8, 9, 9, 9],
  "Insat. política": [14, 15, 17, 14, 13, 11, 11, 16, 13, 10, 14, 8],
  Sanitat: [8, 7, 6, 9, 9, 7, 7, 8, 8, 6, 5, 6],
  Economia: [17, 16, 18, 14, 9, 12, 8, 6, 7, 7, 5, 5],
  Atur: [13, 11, 9, 11, 9, 9, 8, 7, 7, 5, 5, 4],
  "Cat.-Espanya": [13, 13, 10, 9, 9, 13, 9, 9, 5, 5, 5, 4],
  "Polít. socials": [5, 5, 6, 5, 6, 5, 4, 4, 4, 4, 4, 3],
};

export const DATASETS: Dataset[] = [
  expandTemporal({
    id: "problemes",
    name: "Preocupacions principals",
    scope: "Catalunya",
    desc: "Principal problema percebut a Catalunya. Mou el control temporal del peu per veure l'evolució.",
    unit: "%",
    labels: P9_LABELS,
    colors: P9_COLORS,
    fillTo100: true,
    defaultEnabled: ["Habitatge"],
    temporal: true,
    periods: P9_PERIODS,
    series: P9_SERIES,
    markers: [{ periodIndex: 8, label: "Mobilitzacions 23N" }],
  }),
  expandTemporal({
    id: "vot_evolucio",
    name: "Auge de l'extrema dreta",
    scope: "Catalunya",
    desc: "Intenció de vot al Parlament de Catalunya (CEO). Mou el control temporal per veure l'evolució.",
    unit: "%",
    labels: PARTY_LABELS,
    colors: PARTY_COLORS,
    temporal: true,
    periods: [
      "Març 22", "Juny 22", "Oct. 22", "Març 23", "Juny 23", "Oct. 23",
      "Feb. 24", "Juny 24", "Nov. 24", "Març 25", "Juny 25", "Oct. 25",
    ],
    series: {
      PSC: [26, 27, 25, 25, 25, 24, 29, 30, 27, 27, 27, 25],
      ERC: [22, 21, 20, 20, 20, 20, 19, 14, 13, 14, 14, 16],
      Junts: [15, 16, 13, 16, 17, 13, 13, 21, 19, 17, 18, 14],
      Aliança: [0, 0, 0, 0, 0, 0, 0, 3, 5, 6, 7, 13],
      Vox: [8, 7, 7, 8, 6, 6, 6, 7, 8, 9, 10, 10],
      PP: [6, 9, 7, 7, 7, 7, 10, 12, 11, 11, 10, 10],
      Comuns: [7, 5, 6, 7, 8, 10, 9, 6, 6, 6, 5, 6],
      CUP: [8, 8, 8, 8, 8, 8, 6, 6, 6, 6, 5, 5],
    },
    defaultEnabled: [
      "Aliança",
      "Vox",
      "PP",
      "Junts",
    ],
  }),
  // Desnonaments per causa (Partit Judicial de Manresa) — volum absolut (Taula 26 CGPJ)
  expandTemporal({
    id: "desnonaments_causa",
    name: "Desnonaments per causa",
    scope: "Manresa",
    desc: "Llançaments practicats al Partit Judicial de Manresa per causa. El bloc s'omple del tot l'any de màxim volum (2013); els anys amb menys desnonaments deixen finestres apagades. Font: CGPJ.",
    unit: "",
    labels: ["Impagament lloguer", "Execució hipotecària", "Altres"],
    colors: [0x5cc94a, 0x1a6fff, 0xff8c00],
    temporal: true,
    normalizeToMax: true,
    periods: [
      "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021",
      "2022", "2023", "2024", "2025",
    ],
    series: {
      "Impagament lloguer": [402, 257, 256, 230, 272, 287, 262, 119, 202, 252, 223, 218, 198],
      "Execució hipotecària": [169, 169, 190, 135, 131, 150, 97, 41, 127, 85, 54, 36, 33],
      Altres: [19, 15, 10, 14, 5, 14, 18, 9, 13, 24, 35, 19, 18],
    },
    markers: [{ periodIndex: 7, label: "Moratòries Covid" }],
  }),
  // Concentració de la propietat (Manresa, 2015 vs 2025) — Taula 17
  expandTemporal({
    id: "concentracio_propietat",
    name: "Concentració de la propietat",
    scope: "Manresa",
    desc: "Distribució del parc d'habitatge segons el nombre d'habitatges per propietari. La propietat es concentra: cau el pes dels petits propietaris i creixen els grans tenidors. Font: full municipal de concentració d'habitatge.",
    unit: "%",
    labels: ["1 habitatge", "2 a 4 habitatges", "5 o més habitatges"],
    colors: [0x5cc94a, 0xff8c00, 0xff2020],
    defaultEnabled: ["2 a 4 habitatges", "5 o més habitatges"],
    temporal: true,
    periods: ["2015", "2025"],
    series: {
      "1 habitatge": [60.61, 55.44],
      "2 a 4 habitatges": [18.99, 22.12],
      "5 o més habitatges": [20.4, 22.45],
    },
    invert: true,
  }),
  // Grans tenidors sobre el parc total (Manresa) — Taula 18
  {
    id: "grans_tenidors",
    name: "Grans tenidors",
    scope: "Manresa",
    desc: "Pes dels grans tenidors (5 o més habitatges) sobre el parc total de Manresa: el 22,5%. La resta del parc (77,5%) està en mans de petits i mitjans propietaris. Font: Nació Digital, El Crític, informes municipals.",
    unit: "%",
    labels: [
      "Resta del parc",
      "Altres bancs i fons",
      "SAREB",
      "BBVA",
      "Banc Popular",
      "Banc Sabadell",
      "CaixaBank",
    ],
    colors: [0x2b3a4a, 0x8a97ad, 0x5cc94a, 0x1a6fff, 0xff8c00, 0x34d9b5, 0xff2020],
    defaultEnabled: [
      "Altres bancs i fons",
      "SAREB",
      "BBVA",
      "Banc Popular",
      "Banc Sabadell",
      "CaixaBank",
    ],
    values: {
      "Resta del parc": 77.55,
      "Altres bancs i fons": 10.33,
      SAREB: 5.84,
      BBVA: 3.37,
      "Banc Popular": 1.35,
      "Banc Sabadell": 0.9,
      CaixaBank: 0.67,
    },
    invert: true,
  },
  // Pobresa energètica (Manresa, Cens 2021) — Taula 31 Idescat
  {
    id: "pobresa_energetica",
    name: "Pobresa energètica",
    scope: "Manresa",
    desc: "Distribució del consum elèctric dels habitatges de Manresa (Cens 2021). Les categories de consum baix (< 250 kWh) agrupen el llindar mínim i el tram fins a 250 kWh. Font: Idescat.",
    unit: "",
    legendByLabel: true,
    labels: ENERGY_POVERTY_LABELS,
    colors: ENERGY_POVERTY_COLORS,
    values: {
      "< 250 kWh": 6500,
      "251–500 kWh": 1136,
      "501–750 kWh": 1422,
      "751–1.000 kWh": 1913,
      "1.001–2.000 kWh": 10132,
      "2.001–3.000 kWh": 8261,
      "3.001–4.000 kWh": 4398,
      "4.001–5.000 kWh": 2256,
      "5.001–6.000 kWh": 1218,
      "6.001–7.000 kWh": 791,
      "7.001–8.000 kWh": 536,
      "8.001–9.000 kWh": 373,
      "9.001–10.000 kWh": 309,
      "> 10.000 kWh": 891,
    },
  },
];
