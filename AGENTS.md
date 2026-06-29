# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project overview

Single-page Next.js 14 (App Router) app: the **Observatori**, a Three.js 3D
city-block data visualization (PAHC Bages / Manresa) built with
**react-three-fiber**, Tailwind, and shadcn/ui. TypeScript throughout.

The visualization is real React — Three.js is an npm dependency and the scene is
declarative R3F (no iframe, no CDN globals). Pure logic (datasets, splines,
floor distribution, city geometry) lives in `lib/observatori/`; the R3F
components and shadcn UI live in `components/observatori/` and `components/ui/`.

Data lives in `lib/observatori/datasets.ts` — to add or change a dataset, edit
that file; the UI and scene adapt automatically.

## Setup

```bash
npm install
npm run dev      # dev server at http://localhost:3000
```

## Commands

- `npm run dev` — start the dev server
- `npm run build` — production build; **run this to verify changes compile and type-check**
- `npm run start` — serve the production build
- `npm run lint` — run Next.js / ESLint checks

After any non-trivial change, run `npm run build` and make sure it completes
with no type errors before considering the task done.

## Project structure

```
app/
  layout.tsx       Root layout (Inter font, <html lang="ca">)
  page.tsx         The single page — add UI here
  globals.css      Tailwind directives + shadcn theme CSS variables
components/ui/      shadcn/ui components (button, card, …)
lib/utils.ts        cn() helper (clsx + tailwind-merge)
components.json     shadcn CLI config
tailwind.config.ts  Tailwind theme wired to the CSS variables
```

## Conventions

- **Imports use the `@/` alias** mapped to the project root (e.g.
  `import { Button } from "@/components/ui/button"`). Do not use long relative
  paths like `../../components`.
- **Styling is Tailwind utility classes only.** Do not add new CSS files or
  `<style>` blocks. Use the existing theme tokens (`bg-background`,
  `text-muted-foreground`, `border-border`, etc.) rather than hard-coded colors,
  so light/dark mode keeps working.
- **Merge class names with `cn()`** from `@/lib/utils` when composing
  conditional or overridable classes.
- **Client interactivity needs `"use client"`** at the top of the file. Keep
  components as server components unless they use state, effects, or browser
  APIs.
- **Icons come from `lucide-react`.**

## Adding shadcn/ui components

This repo is configured for the shadcn CLI (`components.json` is present).
Add new primitives instead of writing them by hand:

```bash
npx shadcn@latest add dialog input dropdown-menu
```

They install into `components/ui/`. Match the existing components' style
(forwardRef, `cn()` for class merging, variant maps via
`class-variance-authority`) if you ever write one manually.

## Theming

Theme tokens are defined as HSL CSS variables in `app/globals.css` under
`:root` (light) and `.dark` (dark). To enable dark mode, add the `dark` class
to the `<html>` element. Add or change colors there, not inline.

## Do not

- Do not commit `node_modules/`, `.next/`, or `*.tsbuildinfo` (already in
  `.gitignore`).
- Do not edit `next-env.d.ts`.
- Do not introduce a different styling system (CSS modules, styled-components,
  etc.); stay on Tailwind + shadcn.
