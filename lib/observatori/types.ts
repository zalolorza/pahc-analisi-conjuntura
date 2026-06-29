// Tipus compartits per a l'Observatori.

export interface Marker {
  periodIndex: number; // índex en l'escala original (abans d'expandir)
  index?: number; // índex reescalat a l'escala expandida (el calcula expandTemporal)
  label: string;
}

export interface Dataset {
  id: string;
  name: string;
  scope: string; // 'Catalunya' | 'Manresa'
  desc: string;
  unit: string;
  labels: string[];
  colors: number[];
  /** mostra només les N categories més grans per període */
  top?: number;
  /** les categories es mesuren respecte al 100% (la resta queda apagada) */
  fillTo100?: boolean;
  /** normalitza el volum al màxim temporal (el període màxim omple tot el bloc) */
  normalizeToMax?: boolean;
  /** categories actives en carregar; la resta arrenquen desactivades */
  defaultEnabled?: string[];
  /** inverteix l'ordre del flux al serpentí (categories grans al final) */
  invert?: boolean;
  temporal?: boolean;
  periods?: string[];
  series?: Record<string, number[]>;
  values?: Record<string, number>; // datasets estàtics
  markers?: Marker[];
}

export interface Metric {
  label: string;
  value: number;
  hex: number;
  enabled: boolean;
}
