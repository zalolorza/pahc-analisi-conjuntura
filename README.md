# Observatori d'Habitatge — PAHC Bages

Aplicació Next.js 14 (App Router) que mostra l'**Observatori**: una visualització
3D d'un bloc de ciutat on les finestres dels edificis codifiquen dades
d'habitatge de Manresa i Catalunya. Construïda amb **react-three-fiber**
(Three.js modern), **Tailwind** i **shadcn/ui**.

## Començar

```bash
npm install
npm run dev
```

Obre [http://localhost:3000](http://localhost:3000).

## Arquitectura

La visualització és React de debò (no un iframe ni un sketch global). Three.js
és una dependència npm i l'escena és declarativa amb react-three-fiber.

```
lib/observatori/
  types.ts          Tipus (Dataset, Metric…)
  datasets.ts       Els 5 datasets (preocupacions, vot, desnonaments, propietat, tenidors)
  spline.ts         Interpolació cúbica + expansió temporal
  distribute.ts     Repartiment de plantes per mètrica (residu més gran)
  city.ts           Generació de geometria de la ciutat (edificis, teulades, serpentí)
  useObservatori.ts Hook d'estat: dataset, període, mètriques, normalització

components/observatori/
  Observatori.tsx   Contenidor: uneix el hook amb l'escena i la UI shadcn
  Scene.tsx         Canvas R3F (llums, bloom, terra)
  CityStatics.tsx   Cos dels edificis, teulades, faroles, llums de teulada
  Windows.tsx       InstancedMesh de finestres + repaint segons distribució
  CameraRig.tsx     Òrbita manual + animació a cantonada (variabilitat > llum)
  Labels.tsx        Etiquetes flotants amb assignació greedy i apilament

components/ui/      Components shadcn (button, card, select, slider)
```

## Funcionalitats

- **5 datasets** commutables des d'un Select de shadcn.
- **Timeline** (Slider de shadcn) per als datasets temporals, amb interpolació
  cúbica a 30 punts i marcadors d'esdeveniments amb missatge d'època.
- **Llegenda interactiva** (Card de shadcn): clica una categoria per activar-la
  o desactivar-la; el repartiment es mesura sempre sobre el total.
- **Càmera intel·ligent**: en carregar una vista nova s'orienta a la cantonada
  amb més variabilitat de dades (o, si cap en destaca, més finestres enceses) i
  ajusta l'angle cenital segons la fracció de finestres enceses.
- **Normalització**: percentatges (fillTo100) o volum absolut respecte al màxim
  temporal (normalizeToMax).

## Editar dades

Tot el contingut és a `lib/observatori/datasets.ts`. Afegir o modificar un
dataset és editar aquell fitxer; la UI i la visualització s'hi adapten soles.
