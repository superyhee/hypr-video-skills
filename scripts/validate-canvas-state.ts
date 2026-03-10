#!/usr/bin/env tsx
/**
 * Validate canvasState JSON before rendering.
 * Zero project dependencies — runs standalone with just Node.js + tsx.
 *
 * Usage:
 *   tsx validate-canvas-state.ts <input.json>
 *
 * Exit code 0 = valid, 1 = errors found.
 */

import * as fs from "fs";
import * as path from "path";

interface ValidationError {
  path: string;
  message: string;
}

function validate(filePath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  let raw: any;

  try {
    raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [{ path: "root", message: "Invalid JSON" }];
  }

  const isFullPayload = raw.canvasState && typeof raw.canvasState === "object";
  const cs = isFullPayload ? raw.canvasState : raw;
  const outputFormat = isFullPayload ? raw.outputFormat : undefined;

  // ── Top-level canvasState fields ─────────────────────────────────

  if (typeof cs.width !== "number" || cs.width <= 0)
    errors.push({ path: "canvasState.width", message: "Must be a positive number" });
  if (typeof cs.height !== "number" || cs.height <= 0)
    errors.push({ path: "canvasState.height", message: "Must be a positive number" });
  if (!Array.isArray(cs.elements))
    errors.push({ path: "canvasState.elements", message: "Must be an array" });
  if (!Array.isArray(cs.tracks))
    errors.push({ path: "canvasState.tracks", message: "Must be an array" });
  if (!Array.isArray(cs.animations))
    errors.push({ path: "canvasState.animations", message: "Must be an array (can be empty [])" });
  if (!Array.isArray(cs.captions))
    errors.push({ path: "canvasState.captions", message: "Must be an array (can be empty [])" });
  if (!cs.globalCaptionStyle || typeof cs.globalCaptionStyle !== "object")
    errors.push({ path: "canvasState.globalCaptionStyle", message: "Must be a complete object" });

  if (!Array.isArray(cs.elements) || !Array.isArray(cs.tracks)) {
    return errors; // Can't continue without elements/tracks
  }

  // ── Elements ─────────────────────────────────────────────────────

  const elementIds = new Set<string>();
  let maxEnd = 0;

  for (let i = 0; i < cs.elements.length; i++) {
    const el = cs.elements[i];
    const p = `canvasState.elements[${i}]`;

    if (!el.id) errors.push({ path: `${p}.id`, message: "Missing id" });
    if (!el.type) errors.push({ path: `${p}.type`, message: "Missing type" });
    if (!el.timeFrame || typeof el.timeFrame.start !== "number" || typeof el.timeFrame.end !== "number")
      errors.push({ path: `${p}.timeFrame`, message: "Must have numeric start and end (ms)" });
    if (!el.placement || typeof el.placement.x !== "number")
      errors.push({ path: `${p}.placement`, message: "Must have x, y, width, height" });

    // Check opacity is NOT inside placement
    if (el.placement && "opacity" in el.placement) {
      errors.push({
        path: `${p}.placement.opacity`,
        message: "WRONG: opacity must be a top-level element field, NOT inside placement",
      });
    }

    // Check text elements use fontColor, not fill
    if (el.type === "text" && el.properties?.fill && !el.properties?.fontColor) {
      errors.push({
        path: `${p}.properties.fill`,
        message: "WRONG: text elements use 'fontColor', NOT 'fill'. 'fill' is for shapes only. Text will render as black.",
      });
    }

    if (el.id) {
      if (elementIds.has(el.id))
        errors.push({ path: `${p}.id`, message: `Duplicate element id: "${el.id}"` });
      elementIds.add(el.id);
    }

    if (el.timeFrame?.end > maxEnd) maxEnd = el.timeFrame.end;
  }

  // ── maxTime ──────────────────────────────────────────────────────

  if (cs.maxTime && cs.maxTime < maxEnd) {
    errors.push({
      path: "canvasState.maxTime",
      message: `maxTime (${cs.maxTime}) < latest element end (${maxEnd}). Elements will be cut off.`,
    });
  }

  // ── Tracks ───────────────────────────────────────────────────────

  for (let i = 0; i < cs.tracks.length; i++) {
    const track = cs.tracks[i];
    const p = `canvasState.tracks[${i}]`;

    if (!track.name)
      errors.push({ path: `${p}.name`, message: "Missing name field" });

    if (track.isVisible !== true) {
      errors.push({
        path: `${p}.isVisible`,
        message: `CRITICAL: isVisible is ${JSON.stringify(track.isVisible)}. Must be true or the entire track will be invisible!`,
      });
    }

    if (Array.isArray(track.elementIds)) {
      for (const eid of track.elementIds) {
        if (!elementIds.has(eid))
          errors.push({ path: `${p}.elementIds`, message: `References non-existent element: "${eid}"` });
      }
    }
  }

  // ── Animations ───────────────────────────────────────────────────

  if (Array.isArray(cs.animations)) {
    for (let i = 0; i < cs.animations.length; i++) {
      const anim = cs.animations[i];
      const p = `canvasState.animations[${i}]`;

      if (anim.targetId && !elementIds.has(anim.targetId))
        errors.push({ path: `${p}.targetId`, message: `References non-existent element: "${anim.targetId}"` });
      if (!anim.type)
        errors.push({ path: `${p}.type`, message: "Missing animation type" });
      if (!anim.group || !["in", "out", "loop"].includes(anim.group))
        errors.push({ path: `${p}.group`, message: `Must be "in", "out", or "loop"` });
    }
  }

  // ── Transitions ──────────────────────────────────────────────────

  if (Array.isArray(cs.transitions)) {
    for (let i = 0; i < cs.transitions.length; i++) {
      const tr = cs.transitions[i];
      const p = `canvasState.transitions[${i}]`;

      if (tr.sourceElementId && !elementIds.has(tr.sourceElementId))
        errors.push({ path: `${p}.sourceElementId`, message: `References non-existent element: "${tr.sourceElementId}"` });
      if (tr.targetElementId && !elementIds.has(tr.targetElementId))
        errors.push({ path: `${p}.targetElementId`, message: `References non-existent element: "${tr.targetElementId}"` });
    }
  }

  // ── outputFormat ─────────────────────────────────────────────────

  if (isFullPayload && outputFormat) {
    if (!outputFormat.fps)
      errors.push({ path: "outputFormat.fps", message: "Missing fps" });
    if (!outputFormat.quality)
      errors.push({ path: "outputFormat.quality", message: "Missing quality" });
  }

  return errors;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const file = process.argv[2];
if (!file) {
  console.error("Usage: tsx validate-canvas-state.ts <input.json>");
  process.exit(1);
}

const filePath = path.resolve(file);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const errors = validate(filePath);

if (errors.length === 0) {
  console.log("Valid canvasState JSON.");
  process.exit(0);
} else {
  console.error(`Found ${errors.length} error(s):\n`);
  for (const e of errors) {
    console.error(`  ${e.path}: ${e.message}`);
  }
  process.exit(1);
}
