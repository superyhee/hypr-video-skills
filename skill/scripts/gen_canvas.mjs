#!/usr/bin/env node
/**
 * gen_canvas.mjs — entry point & runner
 *
 * Usage: node skill/scripts/gen_canvas.mjs <config.mjs> [output.json]
 *
 * Modules:
 *   lib/anim.mjs        — animation / keyframe extraction utilities
 *   lib/elements.mjs    — makeText, makeShape, makeImage, etc.
 *   lib/theme.mjs       — theme() + 24 presets + 11 role helpers
 *   lib/tracks.mjs      — autoTracks, makeTrack, makeAnim, makeKf*…
 *   lib/svg.mjs         — 65 SVG helpers
 *   lib/composites.mjs  — 14 composite UI components
 *   lib/build.mjs       — buildCanvas()
 */

import { writeFileSync } from "fs";

import { makeText, makeShape, makeImage, makeSvg, makeGif,
         makeVideo, makeAudio, makeEffect }             from "./lib/elements.mjs";
import { theme }                                        from "./lib/theme.mjs";
import { autoTracks, makeTrack, makeAnim, makeKfTrack,
         makeKf, makeTransition, makeCaption }          from "./lib/tracks.mjs";
import { buildCanvas }                                  from "./lib/build.mjs";
import * as _svg        from "./lib/svg.mjs";
import * as _composites from "./lib/composites.mjs";

// helpers object passed to every config's build(h) function
const helpers = {
  // primitives
  makeText, makeShape, makeImage, makeSvg, makeGif, makeVideo, makeAudio, makeEffect,
  // theme + layout
  theme, autoTracks, buildCanvas,
  // track / animation / keyframe
  makeTrack, makeAnim, makeKfTrack, makeKf, makeTransition, makeCaption,
  // composite components (auto-includes all exports from composites.mjs)
  ..._composites,
  // SVG helpers (auto-includes all exports from svg.mjs)
  ..._svg,
};

// ── Runner ────────────────────────────────────────────────────────────────────

const configPath = process.argv[2];
const OUT        = process.argv[3] ?? "/tmp/video-output.json";

if (!configPath) {
  console.error("Usage: node gen_canvas.mjs <config.mjs> [output.json]");
  process.exit(1);
}

const configUrl = configPath.startsWith("/")
  ? `file://${configPath}`
  : new URL(configPath, `file://${process.cwd()}/`).href;

const config = await import(configUrl);
const build  = config.default ?? config.build;

if (typeof build !== "function") {
  console.error("Config must export a default function: export default function build(h) { ... }");
  process.exit(1);
}

const result  = build(helpers);
writeFileSync(OUT, JSON.stringify(result, null, 2));
const elCount = result?.canvasState?.elements?.length ?? 0;
console.log(`Written ${elCount} elements to ${OUT}`);
