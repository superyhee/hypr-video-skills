import { _attachInline } from "./anim.mjs";

// Primitive element helpers — makeText, makeShape, makeImage, etc.

function placement(x, y, w, h, extra = {}) {
  return { x, y, width: w, height: h, rotation: 0, scaleX: 1, scaleY: 1, ...extra };
}

export function makeText(id, text, {
  x, y, w, h, start, end,
  font = "Arial", size = 48, weight = 700,
  color = "#ffffff", align = "center",
  opacity = 1, name, blendMode,
  rotation, scaleX, scaleY,
  lineHeight, charSpacing, strokeColor, strokeWidth, shadowColor, shadowBlur,
  shadowOffsetX, shadowOffsetY, useGradient, gradientColors, styles,
  animIn, animOut, animLoop, kf,
  ...rest
} = {}) {
  const props = {
    text, fontFamily: font, fontSize: size, fontWeight: weight,
    fontColor: color, textAlign: align,
    ...(lineHeight != null && { lineHeight }),
    ...(charSpacing != null && { charSpacing }),
    ...(styles != null && { styles }),
    ...(strokeColor != null && { strokeColor }),
    ...(strokeWidth != null && { strokeWidth }),
    ...(shadowColor != null && { shadowColor }),
    ...(shadowBlur != null && { shadowBlur }),
    ...(shadowOffsetX != null && { shadowOffsetX }),
    ...(shadowOffsetY != null && { shadowOffsetY }),
    ...(useGradient != null && { useGradient }),
    ...(gradientColors != null && { gradientColors }),
    ...rest,
  };
  const el = { id, type: "text", name: name ?? id, opacity, ...(blendMode && { blendMode }), timeFrame: { start, end }, placement: placement(x, y, w, h, { ...(rotation != null && { rotation }), ...(scaleX != null && { scaleX }), ...(scaleY != null && { scaleY }) }), properties: props };
  return _attachInline(el, { animIn, animOut, animLoop, kf });
}

export function makeShape(id, shapeType, fill, {
  x, y, w, h, start, end,
  stroke = "transparent", strokeWidth = 0, rx = 0, ry,
  opacity = 1, name, blendMode,
  rotation, scaleX, scaleY,
  animIn, animOut, animLoop, kf,
} = {}) {
  const _ry = ry ?? rx;
  // Use "roundedRect" when rx > 0 — renderer handles both identically but roundedRect is semantically correct
  const effectiveType = (shapeType === "rect" && rx > 0) ? "roundedRect" : shapeType;
  const el = { id, type: "shape", name: name ?? id, opacity, ...(blendMode && { blendMode }), timeFrame: { start, end }, placement: placement(x, y, w, h, { ...(rotation != null && { rotation }), ...(scaleX != null && { scaleX }), ...(scaleY != null && { scaleY }) }), properties: { shapeType: effectiveType, fill, stroke, strokeWidth, rx, ry: _ry, shapeBorderRadius: rx } };
  return _attachInline(el, { animIn, animOut, animLoop, kf });
}

export function makeImage(id, src, {
  x, y, w, h, start, end,
  opacity = 1, name, flipX = false, flipY = false,
  rotation, scaleX, scaleY,
  border, filters, effect, blendMode,
  animIn, animOut, animLoop, kf,
} = {}) {
  const el = { id, type: "image", name: name ?? id, opacity, ...(blendMode && { blendMode }), timeFrame: { start, end }, placement: placement(x, y, w, h, { flipX, flipY, ...(rotation != null && { rotation }), ...(scaleX != null && { scaleX }), ...(scaleY != null && { scaleY }) }), properties: { src, ...(border && { border }), ...(filters && { filters }), ...(effect && { effect }) } };
  return _attachInline(el, { animIn, animOut, animLoop, kf });
}

/** SVG must be base64-encoded. Use: Buffer.from(svgString).toString("base64") */
export function makeSvg(id, svgBase64, opts = {}) {
  return makeImage(id, `data:image/svg+xml;base64,${svgBase64}`, opts);
}

export function makeGif(id, src, {
  x, y, w, h, start, end,
  opacity = 1, name, flipX = false, flipY = false,
  rotation, scaleX, scaleY,
  border, filters, effect, blendMode,
  animIn, animOut, animLoop, kf,
} = {}) {
  const el = { id, type: "gif", name: name ?? id, opacity, ...(blendMode && { blendMode }), timeFrame: { start, end }, placement: placement(x, y, w, h, { flipX, flipY, ...(rotation != null && { rotation }), ...(scaleX != null && { scaleX }), ...(scaleY != null && { scaleY }) }), properties: { src, ...(border && { border }), ...(filters && { filters }), ...(effect && { effect }) } };
  return _attachInline(el, { animIn, animOut, animLoop, kf });
}

export function makeVideo(id, src, {
  x, y, w, h, start, end,
  volume = 1, opacity = 1, name, trimStart = 0, trimEnd = 0,
  playbackRate = 1, flipX = false, flipY = false,
  rotation, scaleX, scaleY,
  border, filters, effect, blendMode,
  animIn, animOut, animLoop, kf,
} = {}) {
  const el = { id, type: "video", name: name ?? id, opacity, ...(blendMode && { blendMode }), timeFrame: { start, end }, placement: placement(x, y, w, h, { flipX, flipY, ...(rotation != null && { rotation }), ...(scaleX != null && { scaleX }), ...(scaleY != null && { scaleY }) }), properties: { src, volume, playbackRate, trimStart, trimEnd, ...(border && { border }), ...(filters && { filters }), ...(effect && { effect }) } };
  return _attachInline(el, { animIn, animOut, animLoop, kf });
}

export function makeAudio(id, src, { start, end, volume = 0.8, name, playbackRate = 1 } = {}) {
  return { id, type: "audio", name: name ?? id, timeFrame: { start, end }, placement: placement(0, 0, 0, 0), properties: { src, volume, playbackRate } };
}

export function makeEffect(id, effectLayers, {
  x = 0, y = 0, w = 1920, h = 1080, start, end, name, opacity = 1, blendMode,
} = {}) {
  return { id, type: "effect", name: name ?? id, opacity, ...(blendMode && { blendMode }), timeFrame: { start, end }, placement: placement(x, y, w, h), properties: { effectLayers } };
}
