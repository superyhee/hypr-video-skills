import { _extractInline } from "./anim.mjs";

// buildCanvas — assembles canvasState + outputFormat payload

export function buildCanvas({
  width = 1920, height = 1080, bg = "#0a0a0a", maxTime,
  backgroundType, blurIntensity,
  projectName,
  fontAssets = {}, elements, tracks,
  animations = [], transitions = [], keyframeTracks = [],
  captions = [], captionAnimation, globalCaptionStyle,
  fps = 30, quality = "medium", format = "mp4",
  resolution,
}) {
  // Extract inline animIn/animOut/animLoop/kf from elements, merge with explicit arrays
  const extracted = _extractInline(elements, animations, keyframeTracks);

  const canvasState = {
    width, height, backgroundColor: bg, maxTime,
    ...(projectName && { projectName }),
    ...(backgroundType && { backgroundType }),
    ...(backgroundType === "blur" && blurIntensity != null && { blurIntensity }),
    ...(Object.keys(fontAssets).length && { fontAssets }),
    elements,
    tracks,
    animations: extracted.animations,
    captions,
    globalCaptionStyle: globalCaptionStyle ?? {
      fontSize: 36, fontFamily: "Arial", fontColor: "#ffffff",
      fontWeight: 700, textAlign: "center", lineHeight: 1.2,
      charSpacing: 0, styles: [], strokeWidth: 0, strokeColor: "#000000",
      shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
      backgroundColor: "", originX: "center", originY: "bottom",
    },
    ...(captionAnimation && { captionAnimation }),
    ...(extracted.keyframeTracks.length && { keyframeTracks: extracted.keyframeTracks }),
    ...(transitions.length && { transitions }),
  };
  const payload = { canvasState, outputFormat: { fps, quality, format } };
  if (resolution) payload.resolution = resolution;
  return payload;
}

// ─── Runner ──────────────────────────────────────────────────────────────────
// Usage:
//   node skill/scripts/gen_canvas.mjs <config.mjs> [output.json]
//
// Config file exports a default function that receives all helpers:
//
//   export default function build(h) {
//     const { makeText, makeShape, makeTrack, makeAnim, buildCanvas, ... } = h;
//     // ... build your video ...
//     return buildCanvas({ ... });
//   }
// ─────────────────────────────────────────────────────────────────────────────