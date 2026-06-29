import type { Dataset } from "./types";
import { expandTemporal } from "./spline";

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
    name: "Estimació de vot",
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
  },
];
