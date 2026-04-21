import { makeSvg } from "./elements.mjs";

// 65 SVG template helpers

// ─── SVG Template Helpers ─────────────────────────────────────────────────────
// One-call replacements for svg-templates.md entries.
// No need to manually write SVG XML or base64-encode — just call and place.
//
// All animated helpers accept: { x, y, w, h, start, end, opacity, color, dur }
// All static helpers accept:   { x, y, w, h, start, end, opacity, color }

function _svg(id, markup, opts) {
  return makeSvg(id, Buffer.from(markup).toString("base64"), opts);
}

// Animated ────────────────────────────────────────────────────────────────────

export function svgBreathingRing(id, { x, y, w = 300, h = 300, start, end, opacity = 0.15, color = "#7c3aed", dur = "3s" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><circle cx='100' cy='100' r='80' fill='none' stroke='${color}' stroke-width='2' opacity='0.6'><animate attributeName='r' values='70;90;70' dur='${dur}' repeatCount='indefinite'/><animate attributeName='opacity' values='0.3;0.8;0.3' dur='${dur}' repeatCount='indefinite'/></circle></svg>`, { x, y, w, h, start, end, opacity });
}

export function svgOrbitRing(id, { x, y, w = 300, h = 300, start, end, opacity = 0.12, color = "#818cf8", dur = "8s" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><circle cx='100' cy='100' r='85' fill='none' stroke='${color}' stroke-width='1.5' stroke-dasharray='12 8' stroke-linecap='round'><animateTransform attributeName='transform' type='rotate' from='0 100 100' to='360 100 100' dur='${dur}' repeatCount='indefinite'/></circle></svg>`, { x, y, w, h, start, end, opacity });
}

export function svgPulseRipple(id, { x, y, w = 300, h = 300, start, end, opacity = 0.6, color = "#a78bfa", dur = "2s" } = {}) {
  const ring = (begin) => `<circle cx='100' cy='100' r='20' fill='none' stroke='${color}' stroke-width='2'><animate attributeName='r' values='20;90' dur='${dur}' begin='${begin}' repeatCount='indefinite'/><animate attributeName='opacity' values='0.8;0' dur='${dur}' begin='${begin}' repeatCount='indefinite'/></circle>`;
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>${ring("0s")}${ring("0.7s")}${ring("1.4s")}<circle cx='100' cy='100' r='8' fill='${color}' opacity='0.9'/></svg>`, { x, y, w, h, start, end, opacity });
}

export function svgGradientOrb(id, { x, y, w = 600, h = 600, start, end, opacity = 0.12, color = "#8b5cf6", dur = "4s" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><radialGradient id='orb'><stop offset='0%' stop-color='${color}' stop-opacity='0.5'/><stop offset='100%' stop-color='${color}' stop-opacity='0'/></radialGradient></defs><circle cx='100' cy='100' r='80' fill='url(#orb)'><animate attributeName='r' values='70;95;70' dur='${dur}' repeatCount='indefinite'/></circle></svg>`, { x, y, w, h, start, end, opacity });
}

export function svgParticles(id, { x, y, w = 800, h = 800, start, end, opacity = 0.3, colors = ["#ffffff", "#818cf8", "#a78bfa"] } = {}) {
  const [c0, c1, c2] = colors;
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><circle cx='50' cy='200' r='3' fill='${c0}'><animate attributeName='cy' values='200;180;200' dur='3s' repeatCount='indefinite'/><animate attributeName='opacity' values='0.2;0.5;0.2' dur='3s' repeatCount='indefinite'/></circle><circle cx='150' cy='120' r='2' fill='${c1}'><animate attributeName='cy' values='120;100;120' dur='4s' repeatCount='indefinite'/><animate attributeName='opacity' values='0.3;0.6;0.3' dur='4s' repeatCount='indefinite'/></circle><circle cx='280' cy='300' r='2.5' fill='${c2}'><animate attributeName='cy' values='300;275;300' dur='3.5s' repeatCount='indefinite'/><animate attributeName='opacity' values='0.2;0.5;0.2' dur='3.5s' repeatCount='indefinite'/></circle><circle cx='350' cy='80' r='1.5' fill='${c0}'><animate attributeName='cy' values='80;65;80' dur='5s' repeatCount='indefinite'/><animate attributeName='opacity' values='0.15;0.4;0.15' dur='5s' repeatCount='indefinite'/></circle></svg>`, { x, y, w, h, start, end, opacity });
}

export function svgScanLine(id, { x = 0, y = 0, w = 1920, h = 1080, start, end, opacity = 0.4, color = "#7c3aed", dur = "3s" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><defs><linearGradient id='scan' x1='0' y1='0' x2='0' y2='1'><stop offset='45%' stop-color='${color}' stop-opacity='0'/><stop offset='50%' stop-color='${color}' stop-opacity='0.6'/><stop offset='55%' stop-color='${color}' stop-opacity='0'/></linearGradient></defs><rect width='400' height='400' fill='url(#scan)'><animateTransform attributeName='transform' type='translate' values='0 -200;0 200;0 -200' dur='${dur}' repeatCount='indefinite'/></rect></svg>`, { x, y, w, h, start, end, opacity });
}

export function svgLoadingBar(id, { x, y, w = 400, h = 20, start, end, opacity = 0.8, color = "#7c3aed", dur = "3s" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 20'><rect width='300' height='20' rx='10' fill='#1a1040'/><rect x='2' y='2' width='0' height='16' rx='8' fill='${color}'><animate attributeName='width' values='0;296;0' dur='${dur}' repeatCount='indefinite'/></rect></svg>`, { x, y, w, h, start, end, opacity });
}

export function svgWaveLine(id, { x, y, w = 1920, h = 80, start, end, opacity = 0.5, color = "#818cf8", dur = "3s" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'><path fill='none' stroke='${color}' stroke-width='2' d='M0,40 Q50,10 100,40 T200,40 T300,40 T400,40'><animate attributeName='d' values='M0,40 Q50,10 100,40 T200,40 T300,40 T400,40;M0,40 Q50,70 100,40 T200,40 T300,40 T400,40;M0,40 Q50,10 100,40 T200,40 T300,40 T400,40' dur='${dur}' repeatCount='indefinite'/></path></svg>`, { x, y, w, h, start, end, opacity });
}

// Decorative (SMIL-enabled) ───────────────────────────────────────────────────

/** Full-screen dark vignette — place on a decoration track above background */
export function svgVignette(id, { start, end, opacity = 0.5, w = 1920, h = 1080 } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 1080'><defs><radialGradient id='vig' cx='50%' cy='50%' r='70%'><stop offset='0%' stop-color='#000' stop-opacity='0'/><stop offset='100%' stop-color='#000' stop-opacity='1'/></radialGradient></defs><rect width='1920' height='1080' fill='url(#vig)' opacity='0'><animate attributeName='opacity' values='0;1' dur='0.8s' fill='freeze'/></rect></svg>`, { x: 0, y: 0, w, h, start, end, opacity });
}

/** Full-screen cinematic top/bottom gradient letterbox */
export function svgLetterbox(id, { start, end, opacity = 1, w = 1920, h = 1080 } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 1080'><defs><linearGradient id='tb' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stop-color='#000' stop-opacity='0.6'/><stop offset='15%' stop-color='#000' stop-opacity='0'/><stop offset='85%' stop-color='#000' stop-opacity='0'/><stop offset='100%' stop-color='#000' stop-opacity='0.6'/></linearGradient></defs><rect width='1920' height='1080' fill='url(#tb)' opacity='0'><animate attributeName='opacity' values='0;1' dur='0.6s' fill='freeze'/></rect></svg>`, { x: 0, y: 0, w, h, start, end, opacity });
}

export function svgGridPattern(id, { x = 0, y = 0, w = 1920, h = 1080, start, end, opacity = 0.08, color = "#ffffff" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><defs><pattern id='grid' width='40' height='40' patternUnits='userSpaceOnUse'><path d='M 40 0 L 0 0 0 40' fill='none' stroke='${color}' stroke-width='0.5' opacity='${opacity}'/></pattern></defs><rect width='400' height='400' fill='url(#grid)' opacity='0'><animate attributeName='opacity' values='0;1' dur='0.6s' fill='freeze'/></rect></svg>`, { x, y, w, h, start, end, opacity: 1 });
}

export function svgDotGrid(id, { x = 0, y = 0, w = 1920, h = 1080, start, end, opacity = 0.15, color = "#ffffff" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><defs><pattern id='dots' width='30' height='30' patternUnits='userSpaceOnUse'><circle cx='15' cy='15' r='1.2' fill='${color}' opacity='${opacity}'/></pattern></defs><rect width='400' height='400' fill='url(#dots)' opacity='0'><animate attributeName='opacity' values='0;1' dur='0.6s' fill='freeze'/></rect></svg>`, { x, y, w, h, start, end, opacity: 1 });
}

export function svgGlowOrb(id, { x, y, w = 400, h = 400, start, end, opacity = 0.15, color = "#ffffff" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><radialGradient id='gl'><stop offset='0%' stop-color='${color}' stop-opacity='0.3'/><stop offset='50%' stop-color='${color}' stop-opacity='0.05'/><stop offset='100%' stop-color='${color}' stop-opacity='0'/></radialGradient></defs><circle cx='100' cy='100' r='100' fill='url(#gl)'><animate attributeName='r' values='95;100;95' dur='4s' repeatCount='indefinite'/></circle></svg>`, { x, y, w, h, start, end, opacity });
}

// ─── More SVG Animations (from svg-templates.md) ─────────────────────────────

/** Circle stroke-draw reveal — good for logo or icon entrance */
export function svgStrokeDrawCircle(id, { x, y, w = 300, h = 300, start, end, opacity = 0.6, color = "#7c3aed", dur = "2s" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><circle cx='100' cy='100' r='80' fill='none' stroke='${color}' stroke-width='3' stroke-dasharray='502' stroke-dashoffset='502' stroke-linecap='round'><animate attributeName='stroke-dashoffset' values='502;0' dur='${dur}' fill='freeze' repeatCount='1'/></circle></svg>`, { x, y, w, h, start, end, opacity });
}

/** Rounded rect stroke-draw reveal — card border or UI frame entrance */
export function svgStrokeDrawRect(id, { x, y, w = 300, h = 300, start, end, opacity = 0.6, color = "#818cf8", dur = "1.5s" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect x='20' y='20' width='160' height='160' rx='12' fill='none' stroke='${color}' stroke-width='2' stroke-dasharray='640' stroke-dashoffset='640'><animate attributeName='stroke-dashoffset' values='640;0' dur='${dur}' fill='freeze' repeatCount='1'/></rect></svg>`, { x, y, w, h, start, end, opacity });
}

/** Twinkling star field — premium/brand/space themes */
export function svgTwinkleStars(id, { x, y, w = 600, h = 600, start, end, opacity = 0.5, color = "#ffffff" } = {}) {
  const s = (cx, cy, d, b, c) => `<circle cx='${cx}' cy='${cy}' r='2' fill='${c}'><animate attributeName='r' values='1;3;1' dur='${d}' begin='${b}' repeatCount='indefinite'/><animate attributeName='opacity' values='0.2;0.9;0.2' dur='${d}' begin='${b}' repeatCount='indefinite'/></circle>`;
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'>${s(80,80,'2s','0s',color)}${s(250,120,'3s','0.5s','#c4b5fd')}${s(160,300,'2.5s','1s','#818cf8')}${s(330,260,'4s','1.5s',color)}${s(60,320,'3.5s','0.8s','#a78bfa')}${s(190,50,'2.8s','0.3s',color)}${s(380,170,'3.2s','1.2s','#c4b5fd')}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Two dots orbiting on a circular path — tech/satellite animation */
export function svgOrbitDot(id, { x, y, w = 300, h = 300, start, end, opacity = 0.6, color = "#a78bfa", trackColor = "#818cf8", dur = "4s" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><circle cx='100' cy='100' r='70' fill='none' stroke='${trackColor}' stroke-width='0.8' opacity='0.3'/><circle r='5' fill='${color}'><animateMotion dur='${dur}' repeatCount='indefinite'><mpath href='#op'/></animateMotion></circle><path id='op' d='M100,30 A70,70 0 1,1 99.9,30' fill='none'/><circle r='3' fill='${trackColor}' opacity='0.6'><animateMotion dur='${dur}' begin='2s' repeatCount='indefinite'><mpath href='#op'/></animateMotion></circle></svg>`, { x, y, w, h, start, end, opacity });
}

/** Dual-ring heartbeat pulse — health, emphasis, countdown */
export function svgHeartbeat(id, { x, y, w = 300, h = 300, start, end, opacity = 0.6, color = "#7c3aed", dur = "1.2s" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><circle cx='100' cy='100' r='40' fill='${color}' opacity='0.8'><animate attributeName='r' values='40;48;40;42;40' dur='${dur}' repeatCount='indefinite'/><animate attributeName='opacity' values='0.8;1;0.8;0.9;0.8' dur='${dur}' repeatCount='indefinite'/></circle><circle cx='100' cy='100' r='40' fill='none' stroke='${color}' stroke-width='2'><animate attributeName='r' values='40;65;40' dur='${dur}' repeatCount='indefinite'/><animate attributeName='opacity' values='0.5;0;0.5' dur='${dur}' repeatCount='indefinite'/></circle></svg>`, { x, y, w, h, start, end, opacity });
}

/** Particles flowing along a horizontal line — data/network transfer */
export function svgDataFlow(id, { x, y, w = 800, h = 200, start, end, opacity = 0.5, color = "#a78bfa", lineColor = "#818cf8", dur = "2s" } = {}) {
  const d = (r, begin, c) => `<circle r='${r}' fill='${c}'><animate attributeName='cx' values='0;400' dur='${dur}' begin='${begin}' repeatCount='indefinite'/><animate attributeName='cy' values='100;100' dur='${dur}' begin='${begin}' repeatCount='indefinite'/><animate attributeName='opacity' values='0;1;1;0' dur='${dur}' begin='${begin}' repeatCount='indefinite'/></circle>`;
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 200'><line x1='0' y1='100' x2='400' y2='100' stroke='${lineColor}' stroke-width='0.5' opacity='0.2'/>${d(4,'0s',color)}${d(3,'0.5s',lineColor)}${d(3.5,'1s','#c4b5fd')}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Radial gradient that morphs between brand colors — ambient background layer */
export function svgColorMorph(id, { x, y, w = 400, h = 400, start, end, opacity = 0.2, colors = ["#7c3aed","#3b82f6","#8b5cf6"], dur = "6s" } = {}) {
  const [c0,c1,c2] = colors; const v = `${c0};${c1};${c2};${c0}`;
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><radialGradient id='cm'><stop offset='0%' stop-opacity='0.4'><animate attributeName='stop-color' values='${v}' dur='${dur}' repeatCount='indefinite'/></stop><stop offset='100%' stop-opacity='0'><animate attributeName='stop-color' values='${v}' dur='${dur}' repeatCount='indefinite'/></stop></radialGradient></defs><circle cx='100' cy='100' r='95' fill='url(#cm)'/></svg>`, { x, y, w, h, start, end, opacity });
}

/** Rotating gear — settings/automation/engineering themes */
export function svgRotatingGear(id, { x, y, w = 300, h = 300, start, end, opacity = 0.3, color = "#818cf8", dur = "12s" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><path d='M100 20 L108 50 L130 35 L125 60 L150 60 L132 78 L155 90 L130 95 L140 120 L115 108 L108 135 L100 112 L92 135 L85 108 L60 120 L70 95 L45 90 L68 78 L50 60 L75 60 L70 35 L92 50 Z' fill='none' stroke='${color}' stroke-width='2' opacity='0.4'><animateTransform attributeName='transform' type='rotate' from='0 100 100' to='360 100 100' dur='${dur}' repeatCount='indefinite'/></path><circle cx='100' cy='100' r='20' fill='none' stroke='${color}' stroke-width='1.5' opacity='0.3'/></svg>`, { x, y, w, h, start, end, opacity });
}

// ─── Additional Animated SVGs ─────────────────────────────────────────────────

/** Shooting star / comet with gradient trail */
export function svgShootingStar(id, { x, y, w = 600, h = 150, start, end, opacity = 0.7, color = "#ffffff", dur = "3s" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 100'><defs><linearGradient id='st'><stop offset='0%' stop-color='${color}' stop-opacity='0'/><stop offset='100%' stop-color='${color}' stop-opacity='0.8'/></linearGradient></defs><g><animateTransform attributeName='transform' type='translate' values='-180 0;580 0' dur='${dur}' repeatCount='indefinite'/><rect x='-130' y='49' width='130' height='2' rx='1' fill='url(#st)'/><circle cx='0' cy='50' r='2.5' fill='${color}'/></g></svg>`, { x, y, w, h, start, end, opacity });
}

/** Circular progress ring — animates from 0% to pct on enter. pct: 0–100 */
export function svgProgressRing(id, { x, y, w = 200, h = 200, start, end, opacity = 0.8, color = "#7c3aed", trackColor = "#1a1040", pct = 75, dur = "1.5s" } = {}) {
  const r = 85, circ = +(2 * Math.PI * r).toFixed(1), dash = +((pct / 100) * circ).toFixed(1);
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><circle cx='100' cy='100' r='${r}' fill='none' stroke='${trackColor}' stroke-width='6'/><circle cx='100' cy='100' r='${r}' fill='none' stroke='${color}' stroke-width='6' stroke-dasharray='${dash} ${circ}' stroke-linecap='round' transform='rotate(-90 100 100)'><animate attributeName='stroke-dasharray' values='0 ${circ};${dash} ${circ}' dur='${dur}' fill='freeze' repeatCount='1'/></circle></svg>`, { x, y, w, h, start, end, opacity });
}

/** Neon glowing ring — cyberpunk/neon themes, logo border */
export function svgNeonRing(id, { x, y, w = 300, h = 300, start, end, opacity = 0.7, color = "#00ffff", dur = "2s" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><circle cx='100' cy='100' r='85' fill='none' stroke='${color}' stroke-width='1' opacity='0.3'/><circle cx='100' cy='100' r='85' fill='none' stroke='${color}' stroke-width='2'><animate attributeName='opacity' values='0.5;1;0.5' dur='${dur}' repeatCount='indefinite'/><animate attributeName='stroke-width' values='1.5;3;1.5' dur='${dur}' repeatCount='indefinite'/></circle><circle cx='100' cy='100' r='85' fill='none' stroke='${color}' stroke-width='8' opacity='0.08'><animate attributeName='opacity' values='0.04;0.15;0.04' dur='${dur}' repeatCount='indefinite'/></circle></svg>`, { x, y, w, h, start, end, opacity });
}

/** Aurora wave — full-width morphing gradient, beautiful background layer */
export function svgAurora(id, { x = 0, y, w = 1920, h = 400, start, end, opacity = 0.15, colors = ["#7c3aed","#06b6d4","#8b5cf6"], dur = "6s" } = {}) {
  const [c0,c1,c2] = colors;
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 400'><defs><linearGradient id='ag' x1='0' y1='0' x2='1' y2='0'><stop offset='0%' stop-color='${c0}' stop-opacity='0.4'/><stop offset='40%' stop-color='${c1}' stop-opacity='0.3'/><stop offset='100%' stop-color='${c2}' stop-opacity='0.2'/></linearGradient></defs><path fill='url(#ag)'><animate attributeName='d' values='M0,200 Q480,50 960,180 T1920,150 L1920,400 L0,400 Z;M0,150 Q480,250 960,100 T1920,200 L1920,400 L0,400 Z;M0,200 Q480,50 960,180 T1920,150 L1920,400 L0,400 Z' dur='${dur}' repeatCount='indefinite'/></path></svg>`, { x, y, w, h, start, end, opacity });
}

// ─── Static SVG Decorations ───────────────────────────────────────────────────

/** 4-corner L-shaped brackets — UI frame, tech interface overlay */
export function svgCornerBrackets(id, { x, y, w = 400, h = 300, start, end, opacity = 0.4, color = "#6c63ff", dur = "0.8s" } = {}) {
  const dashAnim = (pts, begin) => `<polyline points='${pts}' fill='none' stroke='${color}' stroke-width='2' stroke-dasharray='60' stroke-dashoffset='60'><animate attributeName='stroke-dashoffset' values='60;0' dur='${dur}' begin='${begin}' fill='freeze'/></polyline>`;
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'>${dashAnim('0,20 0,0 20,0','0s')}${dashAnim('180,0 200,0 200,20','0.1s')}${dashAnim('200,130 200,150 180,150','0.2s')}${dashAnim('20,150 0,150 0,130','0.3s')}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Connected dot network — data/AI/network themes. Center node pulses. */
export function svgTechNodes(id, { x, y, w = 400, h = 400, start, end, opacity = 0.4, color = "#818cf8" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'><line x1='60' y1='80' x2='150' y2='150' stroke='${color}' stroke-width='0.5' opacity='0.3'/><line x1='150' y1='150' x2='240' y2='100' stroke='${color}' stroke-width='0.5' opacity='0.3'/><line x1='150' y1='150' x2='120' y2='240' stroke='${color}' stroke-width='0.5' opacity='0.3'/><line x1='150' y1='150' x2='220' y2='220' stroke='${color}' stroke-width='0.5' opacity='0.3'/><circle cx='60' cy='80' r='4' fill='${color}' opacity='0.5'/><circle cx='150' cy='150' r='6' fill='${color}' opacity='0.6'><animate attributeName='r' values='5;7;5' dur='2s' repeatCount='indefinite'/></circle><circle cx='240' cy='100' r='4' fill='${color}' opacity='0.5'/><circle cx='120' cy='240' r='3' fill='${color}' opacity='0.4'/><circle cx='220' cy='220' r='5' fill='${color}' opacity='0.5'/></svg>`, { x, y, w, h, start, end, opacity });
}

/** Horizontal glowing light streak — divider or scene accent */
export function svgLightStreak(id, { x = 0, y, w = 1920, h = 80, start, end, opacity = 0.3, color = "#ffffff", dur = "4s" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 80'><defs><linearGradient id='ls' x1='0' y1='0' x2='1' y2='0'><stop offset='0%' stop-color='${color}' stop-opacity='0'/><stop offset='50%' stop-color='${color}' stop-opacity='0.15'/><stop offset='100%' stop-color='${color}' stop-opacity='0'/></linearGradient></defs><rect width='1920' height='80' fill='url(#ls)'><animate attributeName='opacity' values='0.5;1;0.5' dur='${dur}' repeatCount='indefinite'/></rect></svg>`, { x, y, w, h, start, end, opacity });
}

/** Concentric rings / radar decoration */
export function svgConcentricRings(id, { x, y, w = 300, h = 300, start, end, opacity = 0.3, color = "#818cf8" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><circle cx='100' cy='100' r='30' fill='none' stroke='${color}' stroke-width='0.8' opacity='0.5'><animate attributeName='r' values='28;32;28' dur='3s' repeatCount='indefinite'/></circle><circle cx='100' cy='100' r='55' fill='none' stroke='${color}' stroke-width='0.6' opacity='0.35'><animate attributeName='r' values='53;57;53' dur='4s' repeatCount='indefinite'/></circle><circle cx='100' cy='100' r='80' fill='none' stroke='${color}' stroke-width='0.4' opacity='0.2'><animate attributeName='r' values='78;82;78' dur='5s' repeatCount='indefinite'/></circle><circle cx='100' cy='100' r='3' fill='${color}' opacity='0.6'/></svg>`, { x, y, w, h, start, end, opacity });
}

/** Rotated square diamond — geometric accent */
export function svgDiamond(id, { x, y, w = 200, h = 200, start, end, opacity = 0.4, color = "#a78bfa" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect x='15' y='15' width='70' height='70' fill='none' stroke='${color}' stroke-width='1.5' transform='rotate(45 50 50)'><animateTransform attributeName='transform' type='rotate' values='45 50 50;405 50 50' dur='20s' repeatCount='indefinite'/></rect></svg>`, { x, y, w, h, start, end, opacity });
}

// ─── Data Visualization SVGs ──────────────────────────────────────────────────
// Array-data charts: svgFoo(id, dataArray, opts)
// Object-data charts: svgFoo(id, { key: val, ... }, opts)

/** Vertical bar chart — bars grow from bottom. data = [{label, value, color}] */
export function svgBarChart(id, data, { x, y, w = 600, h = 400, start, end, opacity = 1, labelColor = "#888888", animDur = "1.2s", maxValue } = {}) {
  const n = data.length;
  const [vw, vh, pL, pR, pT, pB] = [420, 300, 15, 15, 20, 40];
  const [cw, ch] = [vw - pL - pR, vh - pT - pB];
  const gap = cw / n, bw = (gap * 0.6).toFixed(1);
  const max = maxValue ?? Math.max(...data.map(d => d.value));
  const grid = [0.25, 0.5, 0.75].map(v => {
    const gy = (pT + ch - v * ch).toFixed(1);
    return `<line x1='${pL}' y1='${gy}' x2='${vw - pR}' y2='${gy}' stroke='#444' stroke-width='0.4' opacity='0.4'/>`;
  }).join("");
  const bars = data.map((d, i) => {
    const bh = ((d.value / max) * ch).toFixed(1);
    const bx = (pL + i * gap + (gap - +bw) / 2).toFixed(1);
    const by = (pT + ch - +bh).toFixed(1), bot = (pT + ch).toFixed(1);
    const c = d.color ?? "#7c3aed", begin = `${(i * 0.08).toFixed(2)}s`;
    return `<rect x='${bx}' y='${bot}' width='${bw}' height='0' rx='3' fill='${c}'><animate attributeName='height' values='0;${bh}' dur='${animDur}' begin='${begin}' fill='freeze' repeatCount='1'/><animate attributeName='y' values='${bot};${by}' dur='${animDur}' begin='${begin}' fill='freeze' repeatCount='1'/></rect><text x='${(+bx + +bw / 2).toFixed(1)}' y='${(pT + ch + 18).toFixed(1)}' fill='${labelColor}' font-size='10' text-anchor='middle' font-family='sans-serif'>${d.label ?? ""}</text>`;
  }).join("");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}'>${grid}${bars}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Horizontal bar chart — bars extend from left. data = [{label, value, color}] */
export function svgHBarChart(id, data, { x, y, w = 600, h = 300, start, end, opacity = 1, labelColor = "#cccccc", animDur = "1s", maxValue } = {}) {
  const n = data.length, vw = 420, rowH = 44, labelW = 110, pR = 50;
  const bAreaW = vw - labelW - pR, bh = 22, vh = n * rowH + 20;
  const max = maxValue ?? Math.max(...data.map(d => d.value));
  const rows = data.map((d, i) => {
    const bw = (d.value / max * bAreaW).toFixed(1), by = i * rowH + 11;
    const c = d.color ?? "#7c3aed", begin = `${(i * 0.1).toFixed(1)}s`;
    return `<text x='${labelW - 8}' y='${by + 15}' fill='${labelColor}' font-size='12' text-anchor='end' font-family='sans-serif'>${d.label ?? ""}</text><rect x='${labelW}' y='${by}' width='0' height='${bh}' rx='3' fill='${c}'><animate attributeName='width' values='0;${bw}' dur='${animDur}' begin='${begin}' fill='freeze' repeatCount='1'/></rect><text x='${(labelW + +bw + 6).toFixed(1)}' y='${by + 15}' fill='${c}' font-size='10' font-family='sans-serif'>${d.value}</text>`;
  }).join("");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}'>${rows}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Line chart — line draws left-to-right. points = [number, ...] (raw values, auto-scaled) */
export function svgLineChart(id, points, { x, y, w = 600, h = 300, start, end, opacity = 1, color = "#7c3aed", strokeWidth = 2.5, animDur = "1.5s", showDots = true, gridColor = "#444" } = {}) {
  const [vw, vh] = [400, 200], p = { l: 20, r: 20, t: 15, b: 15 };
  const [cw, ch, n] = [vw - p.l - p.r, vh - p.t - p.b, points.length];
  const [mn, mx] = [Math.min(...points), Math.max(...points)];
  const coords = points.map((v, i) => [+(p.l + i / (n - 1) * cw).toFixed(1), +(p.t + ch - (v - mn) / ((mx - mn) || 1) * ch).toFixed(1)]);
  const d = "M" + coords.map(([x, y]) => `${x},${y}`).join(" L");
  const grid = [0.25, 0.5, 0.75].map(v => { const gy = (p.t + ch - v * ch).toFixed(1); return `<line x1='${p.l}' y1='${gy}' x2='${vw - p.r}' y2='${gy}' stroke='${gridColor}' stroke-width='0.5' opacity='0.3'/>`; }).join("");
  const dots = showDots ? coords.map(([cx, cy]) => `<circle cx='${cx}' cy='${cy}' r='3' fill='${color}'/>`).join("") : "";
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}'><defs><clipPath id='lc'><rect x='${p.l}' y='0' height='${vh}'><animate attributeName='width' values='0;${cw}' dur='${animDur}' fill='freeze' repeatCount='1'/></rect></clipPath></defs>${grid}<path d='${d}' fill='none' stroke='${color}' stroke-width='${strokeWidth}' stroke-linecap='round' clip-path='url(#lc)'/>${dots}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Area chart — filled area reveals left-to-right. points = [number, ...] (auto-scaled) */
export function svgAreaChart(id, points, { x, y, w = 600, h = 300, start, end, opacity = 1, color = "#7c3aed", animDur = "1.5s", gridColor = "#444" } = {}) {
  const [vw, vh] = [400, 200], p = { l: 20, r: 20, t: 15, b: 15 };
  const [cw, ch, n] = [vw - p.l - p.r, vh - p.t - p.b, points.length];
  const [mn, mx] = [Math.min(...points), Math.max(...points)];
  const coords = points.map((v, i) => [+(p.l + i / (n - 1) * cw).toFixed(1), +(p.t + ch - (v - mn) / ((mx - mn) || 1) * ch).toFixed(1)]);
  const line = "M" + coords.map(([x, y]) => `${x},${y}`).join(" L");
  const area = `${line} L${coords[n - 1][0]},${p.t + ch} L${p.l},${p.t + ch} Z`;
  const grid = [0.25, 0.5, 0.75].map(v => { const gy = (p.t + ch - v * ch).toFixed(1); return `<line x1='${p.l}' y1='${gy}' x2='${vw - p.r}' y2='${gy}' stroke='${gridColor}' stroke-width='0.5' opacity='0.3'/>`; }).join("");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}'><defs><clipPath id='ac'><rect x='${p.l}' y='0' height='${vh}'><animate attributeName='width' values='0;${cw}' dur='${animDur}' fill='freeze' repeatCount='1'/></rect></clipPath></defs>${grid}<path d='${area}' fill='${color}' opacity='0.15' clip-path='url(#ac)'/><path d='${line}' fill='none' stroke='${color}' stroke-width='2' stroke-linecap='round' clip-path='url(#ac)'/></svg>`, { x, y, w, h, start, end, opacity });
}

/** Donut chart — segments animate in sequentially. segments = [{value, color}] */
export function svgDonutChart(id, segments, { x, y, w = 300, h = 300, start, end, opacity = 1, r = 70, strokeWidth = 28, animDur = "1s", centerText = "" } = {}) {
  const circ = +(2 * Math.PI * r).toFixed(1);
  const total = segments.reduce((s, d) => s + d.value, 0);
  let cum = 0;
  const arcs = segments.map((seg, i) => {
    const dash = +(seg.value / total * circ).toFixed(1), rot = +(cum / total * 360).toFixed(1);
    cum += seg.value;
    const c = seg.color ?? "#7c3aed", begin = `${(i * 0.15).toFixed(2)}s`;
    return `<circle cx='100' cy='100' r='${r}' fill='none' stroke='${c}' stroke-width='${strokeWidth}' stroke-dasharray='${dash} ${circ}' transform='rotate(${rot - 90} 100 100)'><animate attributeName='stroke-dasharray' values='0 ${circ};${dash} ${circ}' dur='${animDur}' begin='${begin}' fill='freeze' repeatCount='1'/></circle>`;
  }).join("");
  const label = centerText ? `<text x='100' y='105' fill='#fff' font-size='20' font-weight='700' text-anchor='middle' font-family='sans-serif'>${centerText}</text>` : "";
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><circle cx='100' cy='100' r='${r}' fill='none' stroke='#fff' stroke-width='${strokeWidth}' opacity='0.05'/>${arcs}${label}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Stat/KPI card with big number, label, and optional trend. { value, label, trend, trendUp } */
export function svgStatCard(id, { value = "", label = "", trend = "", trendUp = true } = {}, { x, y, w = 300, h = 180, start, end, opacity = 1, bg = "#1a1040", accent = "#7c3aed", textColor = "#ffffff" } = {}) {
  const tc = trendUp ? "#4ade80" : "#f87171", ta = trendUp ? "↑" : "↓";
  const tr = trend ? `<text x='20' y='110' fill='${tc}' font-size='13' font-family='monospace' opacity='0'>${ta} ${trend}<animate attributeName='opacity' values='0;1' dur='0.4s' begin='0.6s' fill='freeze'/></text>` : "";
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 150'><rect width='300' height='150' rx='12' fill='${bg}' opacity='0'><animate attributeName='opacity' values='0;0.95' dur='0.5s' fill='freeze'/></rect><rect x='0' y='0' width='4' height='0' rx='2' fill='${accent}'><animate attributeName='height' values='0;150' dur='0.4s' begin='0.15s' fill='freeze'/></rect><text x='20' y='38' fill='${textColor}' font-size='12' font-family='sans-serif' opacity='0'>${label}<animate attributeName='opacity' values='0;0.6' dur='0.3s' begin='0.25s' fill='freeze'/></text><text x='20' y='82' fill='${textColor}' font-size='38' font-weight='700' font-family='sans-serif' opacity='0'>${value}<animate attributeName='opacity' values='0;1' dur='0.4s' begin='0.35s' fill='freeze'/></text>${tr}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Semicircle gauge — animates fill from 0 to pct. { pct: 0-100, label } */
export function svgGauge(id, { pct = 75, label = "" } = {}, { x, y, w = 300, h = 200, start, end, opacity = 1, color = "#7c3aed", trackColor = "#1e1b4b", textColor = "#ffffff", dur = "1.5s" } = {}) {
  const [r, cx, cy] = [75, 100, 120];
  const hcirc = +(Math.PI * r).toFixed(1), fill = +((pct / 100) * hcirc).toFixed(1);
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><path d='M${cx - r},${cy} A${r},${r} 0 0,1 ${cx + r},${cy}' fill='none' stroke='${trackColor}' stroke-width='14' stroke-linecap='round'/><path d='M${cx - r},${cy} A${r},${r} 0 0,1 ${cx + r},${cy}' fill='none' stroke='${color}' stroke-width='14' stroke-linecap='round' stroke-dasharray='0 ${hcirc}'><animate attributeName='stroke-dasharray' values='0 ${hcirc};${fill} ${hcirc}' dur='${dur}' fill='freeze' repeatCount='1'/></path><text x='${cx}' y='${cy - 12}' fill='${textColor}' font-size='28' font-weight='700' text-anchor='middle' font-family='sans-serif'>${pct}%</text><text x='${cx}' y='${cy + 18}' fill='${textColor}' font-size='11' text-anchor='middle' font-family='sans-serif' opacity='0.6'>${label}</text></svg>`, { x, y, w, h, start, end, opacity });
}

/** Mini sparkline trend. points = [number, ...] */
export function svgSparkline(id, points, { x, y, w = 200, h = 60, start, end, opacity = 1, color = "#7c3aed", animDur = "1s" } = {}) {
  const [vw, vh, pd] = [200, 50, 5], n = points.length;
  const [mn, mx] = [Math.min(...points), Math.max(...points)];
  const coords = points.map((p, i) => [+(pd + i / (n - 1) * (vw - 2 * pd)).toFixed(1), +(pd + (1 - (p - mn) / ((mx - mn) || 1)) * (vh - 2 * pd)).toFixed(1)]);
  const d = "M" + coords.map(([x, y]) => `${x},${y}`).join(" L");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}'><defs><clipPath id='sc'><rect x='0' y='0' height='${vh}'><animate attributeName='width' values='0;${vw}' dur='${animDur}' fill='freeze' repeatCount='1'/></rect></clipPath></defs><path d='${d}' fill='none' stroke='${color}' stroke-width='2' stroke-linecap='round' clip-path='url(#sc)'/><circle cx='${coords[n - 1][0]}' cy='${coords[n - 1][1]}' r='3' fill='${color}'/></svg>`, { x, y, w, h, start, end, opacity });
}

/** Data table — rows fade in sequentially. { headers: [str], rows: [[str]] } */
export function svgTable(id, { headers = [], rows = [] } = {}, { x, y, w = 600, h = 300, start, end, opacity = 1, headerBg = "#1e1b4b", headerColor = "#ffffff", rowAltBg = "#0d0b25", textColor = "#cccccc", accent = "#7c3aed", animDur = "0.5s" } = {}) {
  const cols = headers.length || 1, vw = 500, rh = 32, hh = 38;
  const colW = (vw / cols).toFixed(1), vh = hh + rows.length * rh + 2;
  const hcells = headers.map((h, i) => `<text x='${(i * +colW + 12).toFixed(1)}' y='25' fill='${headerColor}' font-size='12' font-weight='700' font-family='sans-serif'>${h}</text>`).join("");
  const rbgs = rows.map((_, ri) => { const ry = hh + ri * rh, begin = `${(ri * 0.07).toFixed(2)}s`; return `<rect x='0' y='${ry}' width='${vw}' height='${rh}' fill='${ri % 2 ? rowAltBg : "transparent"}' opacity='0'><animate attributeName='opacity' values='0;1' dur='${animDur}' begin='${begin}' fill='freeze' repeatCount='1'/></rect>`; }).join("");
  const rtxts = rows.map((row, ri) => row.map((cell, ci) => `<text x='${(ci * +colW + 12).toFixed(1)}' y='${hh + ri * rh + 21}' fill='${textColor}' font-size='11' font-family='sans-serif'>${cell}</text>`).join("")).join("");
  const divs = Array.from({ length: cols - 1 }, (_, i) => `<line x1='${((i + 1) * +colW).toFixed(1)}' y1='${hh}' x2='${((i + 1) * +colW).toFixed(1)}' y2='${vh}' stroke='${accent}' stroke-width='0.5' opacity='0.2'/>`).join("");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}'><rect width='${vw}' height='${hh}' fill='${headerBg}'/><rect x='0' y='0' width='3' height='${vh}' fill='${accent}'/>${hcells}<line x1='0' y1='${hh}' x2='${vw}' y2='${hh}' stroke='${accent}' stroke-width='1' opacity='0.3'/>${rbgs}${rtxts}${divs}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Two-row A/B comparison bars. { labelA, valueA, labelB, valueB, unit } */
export function svgCompareBar(id, { labelA = "A", valueA = 0, labelB = "B", valueB = 0, unit = "" } = {}, { x, y, w = 500, h = 120, start, end, opacity = 1, colorA = "#7c3aed", colorB = "#4ade80", textColor = "#cccccc", animDur = "1s" } = {}) {
  const [vw, vh, lw, pR] = [400, 90, 90, 50], baw = 400 - 90 - pR;
  const max = Math.max(valueA, valueB) || 1;
  const wA = (valueA / max * baw).toFixed(1), wB = (valueB / max * baw).toFixed(1);
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}'><text x='${lw - 6}' y='26' fill='${textColor}' font-size='12' text-anchor='end' font-family='sans-serif'>${labelA}</text><rect x='${lw}' y='12' height='20' rx='3' fill='${colorA}' width='0'><animate attributeName='width' values='0;${wA}' dur='${animDur}' fill='freeze' repeatCount='1'/></rect><text x='${(lw + +wA + 6).toFixed(1)}' y='26' fill='${colorA}' font-size='11' font-family='sans-serif'>${valueA}${unit}</text><text x='${lw - 6}' y='62' fill='${textColor}' font-size='12' text-anchor='end' font-family='sans-serif'>${labelB}</text><rect x='${lw}' y='48' height='20' rx='3' fill='${colorB}' width='0'><animate attributeName='width' values='0;${wB}' dur='${animDur}' begin='0.15s' fill='freeze' repeatCount='1'/></rect><text x='${(lw + +wB + 6).toFixed(1)}' y='62' fill='${colorB}' font-size='11' font-family='sans-serif'>${valueB}${unit}</text></svg>`, { x, y, w, h, start, end, opacity });
}

/** Funnel chart — stages fade in top-down. stages = [{label, value, color}] */
export function svgFunnel(id, stages, { x, y, w = 400, h = 400, start, end, opacity = 1, colors = ["#7c3aed", "#6d28d9", "#5b21b6", "#4c1d95", "#3b0764"], textColor = "#ffffff", animDur = "0.5s" } = {}) {
  const n = stages.length, vw = 300, sH = 48, padV = 4, maxW = 260;
  const vh = n * (sH + padV) + 20;
  const shapes = stages.map((s, i) => {
    const [tw, bw] = [maxW * (1 - i * 0.14), maxW * (1 - (i + 1) * 0.14)];
    const [tx, bx, sy] = [(vw - tw) / 2, (vw - bw) / 2, i * (sH + padV) + 10];
    const c = s.color ?? colors[i % colors.length], begin = `${(i * 0.1).toFixed(1)}s`;
    const d = `M${tx.toFixed(1)},${sy} L${(tx + tw).toFixed(1)},${sy} L${(bx + bw).toFixed(1)},${sy + sH} L${bx.toFixed(1)},${sy + sH} Z`;
    return `<path d='${d}' fill='${c}' opacity='0'><animate attributeName='opacity' values='0;0.85' dur='${animDur}' begin='${begin}' fill='freeze' repeatCount='1'/></path><text x='${vw / 2}' y='${sy + sH / 2 + 5}' fill='${textColor}' font-size='12' text-anchor='middle' font-family='sans-serif'>${s.label ?? ""}${s.value != null ? "  " + s.value : ""}</text>`;
  }).join("");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}'>${shapes}</svg>`, { x, y, w, h, start, end, opacity });
}

// ─── UI / Interaction SVGs ────────────────────────────────────────────────────

/** Animated checkmark — feature lists, success states. Stroke draws then stays. */
export function svgCheckMark(id, { x, y, w = 200, h = 200, start, end, opacity = 0.9, color = "#4ade80", dur = "0.6s", strokeWidth = 5 } = {}) {
  const circ = +(2 * Math.PI * 42).toFixed(1);
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='42' fill='none' stroke='${color}' stroke-width='${strokeWidth}' stroke-dasharray='${circ}' stroke-dashoffset='${circ}' opacity='0.3'><animate attributeName='stroke-dashoffset' values='${circ};0' dur='${dur}' fill='freeze'/></circle><path d='M30,52 L45,67 L72,35' fill='none' stroke='${color}' stroke-width='${strokeWidth}' stroke-linecap='round' stroke-linejoin='round' stroke-dasharray='60' stroke-dashoffset='60'><animate attributeName='stroke-dashoffset' values='60;0' dur='0.4s' begin='${dur}' fill='freeze'/></path></svg>`, { x, y, w, h, start, end, opacity });
}

/** Animated directional arrow — CTA guidance, flow direction. Bounces in direction. */
export function svgArrowPointer(id, { x, y, w = 200, h = 100, start, end, opacity = 0.8, color = "#ffffff", direction = "right", dur = "1s" } = {}) {
  const arrows = {
    right: "M30,50 L70,50 M55,35 L70,50 L55,65",
    left: "M70,50 L30,50 M45,35 L30,50 L45,65",
    down: "M50,25 L50,75 M35,60 L50,75 L65,60",
    up: "M50,75 L50,25 M35,40 L50,25 L65,40",
  };
  const axis = direction === "right" || direction === "left" ? "translate" : "translate";
  const vals = direction === "right" ? "0 0;8 0;0 0" : direction === "left" ? "0 0;-8 0;0 0" : direction === "down" ? "0 0;0 8;0 0" : "0 0;0 -8;0 0";
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><g><path d='${arrows[direction] || arrows.right}' fill='none' stroke='${color}' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/><animateTransform attributeName='transform' type='${axis}' values='${vals}' dur='${dur}' repeatCount='indefinite'/></g></svg>`, { x, y, w, h, start, end, opacity });
}

/** Countdown ring — fills counterclockwise, great for urgency/CTA. seconds: countdown from N. */
export function svgCountdownRing(id, { x, y, w = 200, h = 200, start, end, opacity = 0.9, color = "#7c3aed", trackColor = "#1e1b4b", seconds = 10 } = {}) {
  const r = 80, circ = +(2 * Math.PI * r).toFixed(1);
  const dur = `${seconds}s`;
  const step = seconds > 0 ? 1 : 1;
  const nums = Array.from({ length: seconds + 1 }, (_, i) => {
    const n = seconds - i;
    const tShow = `${i}s`, tHide = `${i + 1}s`;
    const isLast = i === seconds;
    return `<text x='100' y='115' fill='#ffffff' font-size='48' font-weight='700' text-anchor='middle' font-family='sans-serif' opacity='${i === 0 ? 1 : 0}'>${n}${i === 0 ? "" : `<animate attributeName='opacity' from='0' to='1' begin='${tShow}' dur='0.01s' fill='freeze'/>`}${isLast ? "" : `<animate attributeName='opacity' from='1' to='0' begin='${tHide}' dur='0.01s' fill='freeze'/>`}</text>`;
  }).join("");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><circle cx='100' cy='100' r='${r}' fill='none' stroke='${trackColor}' stroke-width='8'/><circle cx='100' cy='100' r='${r}' fill='none' stroke='${color}' stroke-width='8' stroke-dasharray='${circ}' stroke-linecap='round' transform='rotate(-90 100 100)'><animate attributeName='stroke-dashoffset' values='0;${circ}' dur='${dur}' fill='freeze'/></circle>${nums}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Animated gradient border — flowing color around a rounded rect. Great for card highlights. */
export function svgGradientBorder(id, { x, y, w = 400, h = 250, start, end, opacity = 0.7, colors = ["#7c3aed", "#3b82f6", "#06b6d4", "#7c3aed"], dur = "3s", rx = 16, strokeWidth = 2 } = {}) {
  const vw = 400, vh = 250, perim = 2 * (vw + vh);
  const stops = colors.map((c, i) => `<stop offset='${(i / (colors.length - 1) * 100).toFixed(0)}%' stop-color='${c}'/>`).join("");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}'><defs><linearGradient id='gb' x1='0' y1='0' x2='1' y2='1'>${stops}</linearGradient></defs><rect x='${strokeWidth / 2}' y='${strokeWidth / 2}' width='${vw - strokeWidth}' height='${vh - strokeWidth}' rx='${rx}' fill='none' stroke='url(#gb)' stroke-width='${strokeWidth}' stroke-dasharray='${(perim * 0.25).toFixed(0)} ${(perim * 0.75).toFixed(0)}'><animateTransform attributeName='transform' type='rotate' from='0 ${vw / 2} ${vh / 2}' to='360 ${vw / 2} ${vh / 2}' dur='${dur}' repeatCount='indefinite'/></rect></svg>`, { x, y, w, h, start, end, opacity });
}

/** Confetti / celebration particles — launch, achievement, milestone */
export function svgConfetti(id, { x = 0, y = 0, w = 1920, h = 1080, start, end, opacity = 0.8, colors = ["#f472b6", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#fb923c"], dur = "3s" } = {}) {
  const n = 24, vw = 400, vh = 400;
  const pieces = Array.from({ length: n }, (_, i) => {
    const cx = (Math.random() * vw).toFixed(0), sz = (3 + Math.random() * 5).toFixed(1);
    const c = colors[i % colors.length], d = (2 + Math.random() * 2).toFixed(1);
    const rot = (Math.random() * 360).toFixed(0), delay = (Math.random() * 1.5).toFixed(2);
    return `<rect x='${cx}' y='-10' width='${sz}' height='${(+sz * 0.6).toFixed(1)}' rx='1' fill='${c}' transform='rotate(${rot} ${cx} -10)'><animate attributeName='y' values='-10;${(vh + 20).toFixed(0)}' dur='${d}s' begin='${delay}s' repeatCount='indefinite'/><animateTransform attributeName='transform' type='rotate' values='${rot} ${cx} 0;${+rot + 360} ${cx} ${vh}' dur='${d}s' begin='${delay}s' repeatCount='indefinite' additive='replace'/><animate attributeName='opacity' values='1;1;0' dur='${d}s' begin='${delay}s' repeatCount='indefinite'/></rect>`;
  }).join("");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}'>${pieces}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Animated star rating — stars fill sequentially. rating: 0–5, supports halves. */
export function svgStarRating(id, { x, y, w = 400, h = 80, start, end, opacity = 1, rating = 4.5, filledColor = "#fbbf24", emptyColor = "#374151", dur = "0.3s" } = {}) {
  const star = (cx, filled, begin) => {
    const d = "M50,15 L61,40 L88,40 L66,56 L75,82 L50,66 L25,82 L34,56 L12,40 L39,40 Z";
    const fc = filled ? filledColor : emptyColor;
    return `<g transform='translate(${cx},0)'><path d='${d}' fill='${emptyColor}' stroke='none'/><path d='${d}' fill='${fc}' stroke='none' opacity='0'>${filled ? `<animate attributeName='opacity' values='0;1' dur='${dur}' begin='${begin}' fill='freeze'/>` : ""}</path></g>`;
  };
  const stars = Array.from({ length: 5 }, (_, i) => {
    const filled = i < Math.floor(rating) || (i === Math.floor(rating) && rating % 1 >= 0.5);
    return star(i * 96, filled, `${(i * 0.15).toFixed(2)}s`);
  }).join("");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 100'>${stars}</svg>`, { x, y, w, h, start, end, opacity });
}

// ─── Narrative / Flow SVGs ────────────────────────────────────────────────────

/** Horizontal timeline with labeled nodes. nodes = [{label, color?}] */
export function svgTimeline(id, nodes, { x, y, w = 1200, h = 120, start, end, opacity = 1, color = "#7c3aed", lineColor = "#374151", textColor = "#ffffff", dur = "0.5s" } = {}) {
  const n = nodes.length, vw = 600, vh = 80, pd = 40;
  const step = (vw - 2 * pd) / Math.max(n - 1, 1);
  const line = `<line x1='${pd}' y1='30' x2='${vw - pd}' y2='30' stroke='${lineColor}' stroke-width='2'/>`;
  const lineAnim = `<line x1='${pd}' y1='30' x2='${pd}' y2='30' stroke='${color}' stroke-width='2'><animate attributeName='x2' values='${pd};${vw - pd}' dur='${(n * 0.3).toFixed(1)}s' fill='freeze'/></line>`;
  const pts = nodes.map((nd, i) => {
    const cx = pd + i * step, c = nd.color ?? color, begin = `${(i * 0.3).toFixed(1)}s`;
    return `<circle cx='${cx.toFixed(1)}' cy='30' r='0' fill='${c}'><animate attributeName='r' values='0;7' dur='${dur}' begin='${begin}' fill='freeze'/></circle><text x='${cx.toFixed(1)}' y='60' fill='${textColor}' font-size='9' text-anchor='middle' font-family='sans-serif' opacity='0'>${nd.label ?? ""}<animate attributeName='opacity' values='0;1' dur='0.3s' begin='${(+begin.replace("s", "") + 0.2).toFixed(1)}s' fill='freeze'/></text>`;
  }).join("");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}'>${line}${lineAnim}${pts}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Blinking typing cursor — code/tech themes. Pair with monospace text. */
export function svgTypingCursor(id, { x, y, w = 30, h = 60, start, end, opacity = 0.9, color = "#ffffff", dur = "1s" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 50'><rect x='6' y='2' width='3' height='46' rx='1' fill='${color}'><animate attributeName='opacity' values='1;0;1' dur='${dur}' repeatCount='indefinite'/></rect></svg>`, { x, y, w, h, start, end, opacity });
}

/** Radar/spider chart — multi-dimensional comparison. values = [0–100, ...], labels = [str, ...] */
export function svgRadarChart(id, values, { x, y, w = 300, h = 300, start, end, opacity = 1, color = "#7c3aed", gridColor = "#374151", textColor = "#cccccc", labels = [], dur = "1s" } = {}) {
  const n = values.length, cx = 100, cy = 100, r = 75;
  const angleStep = (2 * Math.PI) / n;
  const gridLevels = [0.33, 0.66, 1].map(lv => {
    const pts = Array.from({ length: n }, (_, i) => {
      const a = i * angleStep - Math.PI / 2;
      return `${(cx + Math.cos(a) * r * lv).toFixed(1)},${(cy + Math.sin(a) * r * lv).toFixed(1)}`;
    }).join(" ");
    return `<polygon points='${pts}' fill='none' stroke='${gridColor}' stroke-width='0.5' opacity='0.4'/>`;
  }).join("");
  const axes = Array.from({ length: n }, (_, i) => {
    const a = i * angleStep - Math.PI / 2;
    return `<line x1='${cx}' y1='${cy}' x2='${(cx + Math.cos(a) * r).toFixed(1)}' y2='${(cy + Math.sin(a) * r).toFixed(1)}' stroke='${gridColor}' stroke-width='0.5' opacity='0.3'/>`;
  }).join("");
  const dataPts = values.map((v, i) => {
    const a = i * angleStep - Math.PI / 2, rv = (v / 100) * r;
    return `${(cx + Math.cos(a) * rv).toFixed(1)},${(cy + Math.sin(a) * rv).toFixed(1)}`;
  }).join(" ");
  const lbls = labels.length ? labels.map((l, i) => {
    const a = i * angleStep - Math.PI / 2, lr = r + 14;
    return `<text x='${(cx + Math.cos(a) * lr).toFixed(1)}' y='${(cy + Math.sin(a) * lr + 3).toFixed(1)}' fill='${textColor}' font-size='8' text-anchor='middle' font-family='sans-serif'>${l}</text>`;
  }).join("") : "";
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>${gridLevels}${axes}<polygon points='${Array(n).fill(`${cx},${cy}`).join(" ")}' fill='${color}' fill-opacity='0.15' stroke='${color}' stroke-width='1.5'><animate attributeName='points' values='${Array(n).fill(`${cx},${cy}`).join(" ")};${dataPts}' dur='${dur}' fill='freeze'/></polygon><polygon points='${Array(n).fill(`${cx},${cy}`).join(" ")}' fill='none' stroke='${color}' stroke-width='1.5' stroke-dasharray='2 0'><animate attributeName='points' values='${Array(n).fill(`${cx},${cy}`).join(" ")};${dataPts}' dur='${dur}' fill='freeze'/></polygon>${lbls}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Burst rays — radial lines expanding from center. Emphasis, reveal, celebration. */
export function svgBurstRays(id, { x, y, w = 400, h = 400, start, end, opacity = 0.5, color = "#ffffff", rays = 12, dur = "0.8s" } = {}) {
  const lines = Array.from({ length: rays }, (_, i) => {
    const a = (i / rays * 360) * (Math.PI / 180);
    const x2 = (100 + Math.cos(a) * 90).toFixed(1), y2 = (100 + Math.sin(a) * 90).toFixed(1);
    const begin = `${(i * 0.03).toFixed(2)}s`;
    return `<line x1='100' y1='100' x2='100' y2='100' stroke='${color}' stroke-width='${i % 2 ? 1 : 1.5}' stroke-linecap='round' opacity='${i % 2 ? 0.4 : 0.7}'><animate attributeName='x2' values='100;${x2}' dur='${dur}' begin='${begin}' fill='freeze'/><animate attributeName='y2' values='100;${y2}' dur='${dur}' begin='${begin}' fill='freeze'/></line>`;
  }).join("");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>${lines}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Animated number counter — counts from 0 to target via stacked opacity-switched text frames. */
export function svgNumberCounter(id, { x, y, w = 300, h = 120, start, end, opacity = 1, value = 1000, prefix = "", suffix = "", color = "#ffffff", dur = "2s", steps = 20 } = {}) {
  const durSec = parseFloat(dur);
  const stepDur = durSec / steps;
  const frames = Array.from({ length: steps + 1 }, (_, i) => {
    const v = Math.round((i / steps) * value);
    const label = `${prefix}${v.toLocaleString("en-US")}${suffix}`;
    const tShow = (i * stepDur).toFixed(3), tHide = ((i + 1) * stepDur).toFixed(3);
    const isFirst = i === 0, isLast = i === steps;
    return `<text x='150' y='55' fill='${color}' font-size='48' font-weight='700' text-anchor='middle' font-family='sans-serif' opacity='${isFirst ? 1 : 0}'>${label}${isFirst ? "" : `<animate attributeName='opacity' from='0' to='1' begin='${tShow}s' dur='0.01s' fill='freeze'/>`}${isLast ? "" : `<animate attributeName='opacity' from='1' to='0' begin='${tHide}s' dur='0.01s' fill='freeze'/>`}</text>`;
  }).join("");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 80'>${frames}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Step indicator / progress dots — tutorial, onboarding, multi-step flows. activeStep: 0-based. */
export function svgStepIndicator(id, { x, y, w = 600, h = 60, start, end, opacity = 1, steps = 4, activeStep = 0, activeColor = "#7c3aed", inactiveColor = "#374151", lineColor = "#374151", dur = "0.4s" } = {}) {
  const vw = 400, vh = 40, pd = 30;
  const gap = (vw - 2 * pd) / Math.max(steps - 1, 1);
  const els = Array.from({ length: steps }, (_, i) => {
    const cx = pd + i * gap, isActive = i <= activeStep;
    const c = isActive ? activeColor : inactiveColor;
    const begin = `${(i * 0.2).toFixed(1)}s`;
    const line = i < steps - 1 ? `<line x1='${(cx + 10).toFixed(1)}' y1='20' x2='${(cx + gap - 10).toFixed(1)}' y2='20' stroke='${i < activeStep ? activeColor : lineColor}' stroke-width='2'${i < activeStep ? `><animate attributeName='stroke' values='${lineColor};${activeColor}' dur='0.3s' begin='${begin}' fill='freeze'/` : ""}>` + "</line>" : "";
    return `${line}<circle cx='${cx.toFixed(1)}' cy='20' r='${isActive ? 0 : 6}' fill='${c}'${isActive ? `><animate attributeName='r' values='0;8' dur='${dur}' begin='${begin}' fill='freeze'/` : ""}></circle><text x='${cx.toFixed(1)}' y='20' fill='#fff' font-size='8' text-anchor='middle' dominant-baseline='central' font-family='sans-serif' opacity='0'>${i + 1}${isActive ? `<animate attributeName='opacity' values='0;1' dur='0.2s' begin='${(+begin.replace("s", "") + 0.2).toFixed(1)}s' fill='freeze'/>` : ""}</text>`;
  }).join("");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}'>${els}</svg>`, { x, y, w, h, start, end, opacity });
}

// ─── Visual Effects SVGs ──────────────────────────────────────────────────────

/** Organic morphing liquid blob — trendy modern brand decoration */
export function svgLiquidBlob(id, { x, y, w = 400, h = 400, start, end, opacity = 0.2, color = "#7c3aed", dur = "6s" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><radialGradient id='lb'><stop offset='0%' stop-color='${color}' stop-opacity='0.6'/><stop offset='100%' stop-color='${color}' stop-opacity='0'/></radialGradient></defs><path fill='url(#lb)'><animate attributeName='d' values='M100,30 C130,30 170,60 170,100 C170,140 140,170 100,170 C60,170 30,140 30,100 C30,60 70,30 100,30 Z;M100,25 C140,35 175,55 165,100 C155,145 135,175 95,170 C55,165 25,135 35,95 C45,55 60,15 100,25 Z;M105,30 C135,40 165,65 160,105 C155,145 130,165 95,165 C60,165 35,140 40,100 C45,60 75,20 105,30 Z;M100,30 C130,30 170,60 170,100 C170,140 140,170 100,170 C60,170 30,140 30,100 C30,60 70,30 100,30 Z' dur='${dur}' repeatCount='indefinite'/></path></svg>`, { x, y, w, h, start, end, opacity });
}

/** Typewriter text reveal — characters appear one by one. text: string to type. */
export function svgTypewriter(id, text, { x, y, w = 800, h = 80, start, end, opacity = 1, color = "#ffffff", fontSize = 24, dur = "2s", cursorColor = "#4ade80" } = {}) {
  const durSec = parseFloat(dur), n = text.length;
  const chars = text.split("").map((ch, i) => {
    const tShow = ((i / n) * durSec).toFixed(3);
    const cx = 10 + i * fontSize * 0.6;
    return `<text x='${cx.toFixed(1)}' y='35' fill='${color}' font-size='${fontSize}' font-weight='600' font-family='monospace' opacity='0'>${ch === " " ? "&#160;" : ch.replace(/&/g,"&amp;").replace(/</g,"&lt;")}<animate attributeName='opacity' from='0' to='1' begin='${tShow}s' dur='0.01s' fill='freeze'/></text>`;
  }).join("");
  const cursorX = 10 + n * fontSize * 0.6;
  const cursor = `<rect x='${cursorX.toFixed(1)}' y='14' width='${Math.max(2, fontSize * 0.08).toFixed(0)}' height='${fontSize}' fill='${cursorColor}'><animate attributeName='opacity' values='1;0;1' dur='0.8s' repeatCount='indefinite'/></rect>`;
  const vw = Math.max(400, cursorX + 30);
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw.toFixed(0)} 50'>${chars}${cursor}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Fireworks burst — multiple explosions with particle trails */
export function svgFireworks(id, { x = 0, y = 0, w = 1920, h = 1080, start, end, opacity = 0.8, colors = ["#f472b6", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa"], dur = "2s" } = {}) {
  const vw = 400, vh = 400;
  const bursts = [
    { cx: 120, cy: 120, begin: "0s" },
    { cx: 280, cy: 100, begin: "0.5s" },
    { cx: 200, cy: 250, begin: "1s" },
  ];
  const particles = bursts.map((b, bi) => {
    const rays = 10;
    return Array.from({ length: rays }, (_, i) => {
      const a = (i / rays) * 2 * Math.PI;
      const r = 40 + Math.random() * 30;
      const ex = (b.cx + Math.cos(a) * r).toFixed(1), ey = (b.cy + Math.sin(a) * r).toFixed(1);
      const c = colors[(bi * rays + i) % colors.length];
      const d = (1 + Math.random() * 0.5).toFixed(2);
      return `<circle cx='${b.cx}' cy='${b.cy}' r='3' fill='${c}' opacity='0'><animate attributeName='cx' values='${b.cx};${ex}' dur='${d}s' begin='${b.begin}' fill='freeze'/><animate attributeName='cy' values='${b.cy};${ey}' dur='${d}s' begin='${b.begin}' fill='freeze'/><animate attributeName='opacity' values='0;1;1;0' dur='${d}s' begin='${b.begin}' fill='freeze'/><animate attributeName='r' values='3;1' dur='${d}s' begin='${b.begin}' fill='freeze'/></circle>`;
    }).join("");
  }).join("");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}'>${particles}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Audio equalizer bars — bouncing bars for music/podcast themes */
export function svgWaveformEQ(id, { x, y, w = 400, h = 200, start, end, opacity = 0.9, color = "#7c3aed", bars = 16, dur = "0.6s" } = {}) {
  const vw = 200, vh = 100, gap = vw / bars, bw = (gap * 0.65).toFixed(1);
  const barEls = Array.from({ length: bars }, (_, i) => {
    const bx = (i * gap + (gap - +bw) / 2).toFixed(1);
    const maxH = 20 + Math.random() * 60, midH = 10 + Math.random() * 30, minH = 5 + Math.random() * 10;
    const d = (0.3 + Math.random() * 0.5).toFixed(2);
    const c = color;
    return `<rect x='${bx}' y='${(vh - minH).toFixed(1)}' width='${bw}' height='${minH.toFixed(1)}' rx='1.5' fill='${c}'><animate attributeName='height' values='${minH.toFixed(1)};${maxH.toFixed(1)};${midH.toFixed(1)};${maxH.toFixed(1)};${minH.toFixed(1)}' dur='${d}s' repeatCount='indefinite'/><animate attributeName='y' values='${(vh - minH).toFixed(1)};${(vh - maxH).toFixed(1)};${(vh - midH).toFixed(1)};${(vh - maxH).toFixed(1)};${(vh - minH).toFixed(1)}' dur='${d}s' repeatCount='indefinite'/></rect>`;
  }).join("");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}'>${barEls}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Hexagonal honeycomb grid — futuristic background with staggered reveal */
export function svgHexGrid(id, { x = 0, y = 0, w = 1920, h = 1080, start, end, opacity = 0.15, color = "#818cf8", dur = "0.3s" } = {}) {
  const vw = 400, vh = 400, s = 22, h6 = s * Math.sqrt(3);
  const hexPath = (cx, cy) => {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      return `${(cx + s * Math.cos(a)).toFixed(1)},${(cy + s * Math.sin(a)).toFixed(1)}`;
    }).join(" ");
    return pts;
  };
  const hexes = [];
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 12; col++) {
      const cx = col * s * 1.5 + s, cy = row * h6 / 2 * 2 + (col % 2 ? h6 / 2 : 0) + s;
      if (cx > vw + s || cy > vh + s) continue;
      const delay = ((row * 0.05 + col * 0.03) + Math.random() * 0.1).toFixed(2);
      hexes.push(`<polygon points='${hexPath(cx, cy)}' fill='none' stroke='${color}' stroke-width='0.5' opacity='0'><animate attributeName='opacity' from='0' to='0.6' begin='${delay}s' dur='${dur}' fill='freeze'/></polygon>`);
    }
  }
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}'>${hexes.join("")}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Dynamic particle network with connecting lines — AI, neural network themes */
export function svgParticleNetwork(id, { x = 0, y = 0, w = 800, h = 600, start, end, opacity = 0.3, color = "#818cf8", nodes = 12, dur = "4s" } = {}) {
  const vw = 400, vh = 300;
  const pts = Array.from({ length: nodes }, () => ({
    x: 20 + Math.random() * (vw - 40), y: 20 + Math.random() * (vh - 40),
    dx: (Math.random() - 0.5) * 40, dy: (Math.random() - 0.5) * 30,
  }));
  const lines = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      if (d < 120) {
        const op = (0.1 + (1 - d / 120) * 0.3).toFixed(2);
        lines.push(`<line x1='${pts[i].x.toFixed(1)}' y1='${pts[i].y.toFixed(1)}' x2='${pts[j].x.toFixed(1)}' y2='${pts[j].y.toFixed(1)}' stroke='${color}' stroke-width='0.5' opacity='${op}'><animate attributeName='x1' values='${pts[i].x.toFixed(1)};${(pts[i].x + pts[i].dx).toFixed(1)};${pts[i].x.toFixed(1)}' dur='${dur}' repeatCount='indefinite'/><animate attributeName='y1' values='${pts[i].y.toFixed(1)};${(pts[i].y + pts[i].dy).toFixed(1)};${pts[i].y.toFixed(1)}' dur='${dur}' repeatCount='indefinite'/><animate attributeName='x2' values='${pts[j].x.toFixed(1)};${(pts[j].x + pts[j].dx).toFixed(1)};${pts[j].x.toFixed(1)}' dur='${dur}' repeatCount='indefinite'/><animate attributeName='y2' values='${pts[j].y.toFixed(1)};${(pts[j].y + pts[j].dy).toFixed(1)};${pts[j].y.toFixed(1)}' dur='${dur}' repeatCount='indefinite'/></line>`);
      }
    }
  }
  const dots = pts.map(p => `<circle cx='${p.x.toFixed(1)}' cy='${p.y.toFixed(1)}' r='3' fill='${color}' opacity='0.6'><animate attributeName='cx' values='${p.x.toFixed(1)};${(p.x + p.dx).toFixed(1)};${p.x.toFixed(1)}' dur='${dur}' repeatCount='indefinite'/><animate attributeName='cy' values='${p.y.toFixed(1)};${(p.y + p.dy).toFixed(1)};${p.y.toFixed(1)}' dur='${dur}' repeatCount='indefinite'/></circle>`).join("");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}'>${lines.join("")}${dots}</svg>`, { x, y, w, h, start, end, opacity });
}

// ─── Tech / Sci-Fi SVGs ───────────────────────────────────────────────────────

/** Matrix-style falling characters — hacker/cyberpunk aesthetic */
export function svgMatrixRain(id, { x = 0, y = 0, w = 1920, h = 1080, start, end, opacity = 0.3, color = "#00ff41", columns = 20, dur = "3s" } = {}) {
  const vw = 400, vh = 400, chars = "0123456789ABCDEF{}<>/\\|=+-_[]()@#$%&*";
  const cols = Array.from({ length: columns }, (_, i) => {
    const cx = (i / columns * vw + vw / columns / 2).toFixed(1);
    const speed = (2 + Math.random() * 3).toFixed(1);
    const delay = (Math.random() * 3).toFixed(2);
    const charCount = 6 + Math.floor(Math.random() * 6);
    const stream = Array.from({ length: charCount }, (_, j) => {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      const yOff = j * 18;
      const op = (1 - j / charCount).toFixed(2);
      const esc = ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch;
      return `<text x='${cx}' y='${yOff}' fill='${j === 0 ? "#ffffff" : color}' font-size='12' font-family='monospace' opacity='${j === 0 ? "1" : op}'>${esc}</text>`;
    }).join("");
    return `<g><animateTransform attributeName='transform' type='translate' values='0 -${charCount * 18};0 ${vh + 20}' dur='${speed}s' begin='${delay}s' repeatCount='indefinite'/>${stream}</g>`;
  }).join("");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}'>${cols}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Circuit trace lines lighting up — chip/hardware/AI infrastructure */
export function svgCircuitTrace(id, { x, y, w = 400, h = 400, start, end, opacity = 0.5, color = "#818cf8", glowColor = "#a78bfa", dur = "1.5s" } = {}) {
  const paths = [
    { d: "M20,100 L80,100 L80,50 L150,50 L150,100 L200,100", begin: "0s" },
    { d: "M20,150 L60,150 L60,200 L120,200 L120,150 L180,150 L180,200", begin: "0.3s" },
    { d: "M100,20 L100,80 L150,80 L150,130 L200,130", begin: "0.6s" },
    { d: "M40,200 L40,170 L100,170 L100,120 L160,120 L160,170 L200,170", begin: "0.9s" },
  ];
  const traces = paths.map((p, i) => {
    const len = 500;
    return `<path d='${p.d}' fill='none' stroke='${color}' stroke-width='1' opacity='0.2'/><path d='${p.d}' fill='none' stroke='${glowColor}' stroke-width='2' stroke-linecap='round' stroke-dasharray='${len}' stroke-dashoffset='${len}'><animate attributeName='stroke-dashoffset' values='${len};0' dur='${dur}' begin='${p.begin}' fill='freeze'/></path>`;
  }).join("");
  const nodes = [[80,50],[150,50],[80,100],[150,100],[60,150],[120,200],[120,150],[180,150],[100,80],[150,130],[40,170],[100,170],[160,170]];
  const dots = nodes.map((n, i) => `<circle cx='${n[0]}' cy='${n[1]}' r='0' fill='${glowColor}'><animate attributeName='r' values='0;3' dur='0.2s' begin='${(0.3 + i * 0.08).toFixed(2)}s' fill='freeze'/></circle>`).join("");
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 220'>${traces}${dots}</svg>`, { x, y, w, h, start, end, opacity });
}

// ─── Commerce / Social SVGs ───────────────────────────────────────────────────

/** Price tag — dramatic strikethrough + new price slam with sparkles, glow pulse, and savings badge */
export function svgPriceTag(id, { oldPrice = "$99", newPrice = "$49", label = "", savings = "" } = {}, { x, y, w = 400, h = 200, start, end, opacity = 1, oldColor = "#6b7280", newColor = "#4ade80", strikeColor = "#f87171", accentColor = "#7c3aed", bg = "#1a1040", dur = "0.8s" } = {}) {
  const vw = 340, cx = vw / 2;
  const d = parseFloat(dur);
  const hasLabel = !!label, hasSavings = !!savings;
  // Vertical layout — content block centered in card
  const pad = 22;
  const labelH = hasLabel ? 28 : 0;     // pill height
  const gapLabelOld = hasLabel ? 14 : 0;
  const oldFontSize = 24, newFontSize = 44;
  const gapOldNew = 14;
  const savingsH = hasSavings ? 28 : 0;  // badge height
  const gapNewSav = hasSavings ? 10 : 0;
  const contentH = labelH + gapLabelOld + oldFontSize + gapOldNew + newFontSize + gapNewSav + savingsH;
  const vh = contentH + pad * 2;
  // Center content vertically
  const topY = (vh - contentH) / 2;
  let curY = topY;
  const labelPillY = curY;
  const labelTextY = curY + 18;
  curY += labelH + gapLabelOld;
  const oldY = curY + oldFontSize * 0.82;  // baseline ≈ 82% of font size
  curY += oldFontSize + gapOldNew;
  const newY = curY + newFontSize * 0.76;  // baseline ≈ 76% for large bold
  curY += newFontSize + gapNewSav;
  const savBadgeY = curY;
  const savTextY = savBadgeY + 16;

  const oldLen = oldPrice.length * (oldFontSize * 0.58);
  const sx1 = ((cx - oldLen / 2) - 6).toFixed(0), sx2 = ((cx + oldLen / 2) + 6).toFixed(0);
  // Timing
  const tOld = "0.3", tStrike = d.toFixed(2), tFlash = (d + 0.05).toFixed(2);
  const tNew = (d + 0.15).toFixed(2), tGlow = (d + 0.2).toFixed(2);
  const tSparkle = (d + 0.25).toFixed(2), tSavings = (d + 0.55).toFixed(2);

  // Card bg
  const card = `<rect x='1' y='1' width='${vw - 2}' height='${vh - 2}' rx='14' fill='${bg}' stroke='${accentColor}' stroke-width='1.5' stroke-opacity='0' opacity='0'><animate attributeName='opacity' values='0;0.97' dur='0.35s' fill='freeze'/><animate attributeName='stroke-opacity' values='0;0.4' dur='0.4s' begin='0.1s' fill='freeze'/></rect>`;
  // Top accent sweep
  const sweep = `<rect x='0' y='0' width='0' height='2.5' rx='1' fill='${accentColor}'><animate attributeName='width' values='0;${vw}' dur='0.4s' begin='0.05s' fill='freeze'/></rect>`;
  // Label pill
  const pillW = Math.min(120, label.length * 9 + 28);
  const labelEl = hasLabel ? `<rect x='${(cx - pillW / 2).toFixed(0)}' y='${labelPillY}' width='${pillW}' height='24' rx='12' fill='${accentColor}' opacity='0'><animate attributeName='opacity' values='0;1' dur='0.2s' begin='0.15s' fill='freeze'/></rect><text x='${cx}' y='${labelTextY}' fill='#fff' font-size='10' font-weight='800' letter-spacing='1' text-anchor='middle' font-family='sans-serif' opacity='0'>${label}<animate attributeName='opacity' values='0;1' dur='0.15s' begin='0.2s' fill='freeze'/></text>` : "";
  // Old price
  const oldEl = `<text x='${cx}' y='${oldY}' fill='${oldColor}' font-size='${oldFontSize}' text-anchor='middle' font-family='sans-serif' opacity='0'>${oldPrice}<animate attributeName='opacity' values='0;0.85;0.3' dur='${d.toFixed(1)}s' begin='${tOld}s' fill='freeze' keyTimes='0;0.7;1'/></text>`;
  // Angled strike with glow trail
  const strikeY = oldY - oldFontSize * 0.3;
  const strikeEl = `<g transform='rotate(-3 ${cx} ${strikeY})'><line x1='${sx1}' y1='${strikeY}' x2='${sx1}' y2='${strikeY}' stroke='${strikeColor}' stroke-width='3' stroke-linecap='round'><animate attributeName='x2' values='${sx1};${sx2}' dur='0.15s' begin='${tStrike}s' fill='freeze'/></line><line x1='${sx1}' y1='${strikeY}' x2='${sx1}' y2='${strikeY}' stroke='${strikeColor}' stroke-width='8' stroke-linecap='round' opacity='0.2'><animate attributeName='x2' values='${sx1};${sx2}' dur='0.15s' begin='${tStrike}s' fill='freeze'/><animate attributeName='opacity' values='0.2;0' dur='0.4s' begin='${(d + 0.15).toFixed(2)}s' fill='freeze'/></line></g>`;
  // Flash
  const flash = `<rect width='${vw}' height='${vh}' rx='14' fill='#fff' opacity='0'><animate attributeName='opacity' values='0;0.15;0' dur='0.3s' begin='${tFlash}s' fill='freeze'/></rect>`;
  // Glow behind new price
  const glowW = Math.max(140, newPrice.length * 28 + 20);
  const glow = `<rect x='${(cx - glowW / 2).toFixed(0)}' y='${(newY - newFontSize * 0.75).toFixed(0)}' width='${glowW}' height='${(newFontSize * 1.1).toFixed(0)}' rx='10' fill='${newColor}' opacity='0'><animate attributeName='opacity' values='0;0.1;0.05;0.08;0.05' dur='2s' begin='${tGlow}s' repeatCount='indefinite'/></rect>`;
  // New price slam
  const newEl = `<g transform-origin='${cx} ${(newY - newFontSize * 0.3).toFixed(0)}'><text x='${cx}' y='${newY}' fill='${newColor}' font-size='${newFontSize}' font-weight='900' text-anchor='middle' font-family='sans-serif' opacity='0'>${newPrice}<animate attributeName='opacity' values='0;1' dur='0.01s' begin='${tNew}s' fill='freeze'/></text><animateTransform attributeName='transform' type='scale' values='2.2 2.2;0.95 0.95;1.05 1.05;1 1' dur='0.45s' begin='${tNew}s' fill='freeze'/></g>`;
  // Sparkles
  const sparkles = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    const r1 = 28, r2 = 55 + Math.random() * 20;
    const py0 = newY - newFontSize * 0.3;
    const px = cx + Math.cos(a) * r1, py = py0 + Math.sin(a) * r1;
    const ex = cx + Math.cos(a) * r2, ey = py0 + Math.sin(a) * r2;
    const sz = (1.5 + Math.random() * 2).toFixed(1);
    const delay = (+tSparkle + i * 0.03).toFixed(3);
    return `<circle cx='${px.toFixed(1)}' cy='${py.toFixed(1)}' r='${sz}' fill='${newColor}' opacity='0'><animate attributeName='cx' values='${px.toFixed(1)};${ex.toFixed(1)}' dur='0.4s' begin='${delay}s' fill='freeze'/><animate attributeName='cy' values='${py.toFixed(1)};${ey.toFixed(1)}' dur='0.4s' begin='${delay}s' fill='freeze'/><animate attributeName='opacity' values='0;0.9;0' dur='0.4s' begin='${delay}s' fill='freeze'/></circle>`;
  }).join("");
  // Savings badge
  const savPillW = Math.min(100, savings.length * 8 + 24);
  const savingsEl = hasSavings ? `<g transform-origin='${vw - savPillW / 2 - 12} ${savBadgeY + 12}'><rect x='${vw - savPillW - 12}' y='${savBadgeY}' width='${savPillW}' height='24' rx='12' fill='${strikeColor}' opacity='0'><animate attributeName='opacity' values='0;1' dur='0.01s' begin='${tSavings}s' fill='freeze'/></rect><text x='${vw - savPillW / 2 - 12}' y='${savTextY}' fill='#fff' font-size='10' font-weight='800' text-anchor='middle' font-family='sans-serif' opacity='0'>${savings}<animate attributeName='opacity' values='0;1' dur='0.01s' begin='${tSavings}s' fill='freeze'/></text><animateTransform attributeName='transform' type='scale' values='0;1.2;1' dur='0.3s' begin='${tSavings}s' fill='freeze'/></g>` : "";

  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}'>${card}${sweep}${labelEl}${oldEl}${glow}${strikeEl}${flash}${newEl}${sparkles}${savingsEl}</svg>`, { x, y, w, h, start, end, opacity });
}

/** Heart with pop/scale animation — social proof, user love */
export function svgLikeHeart(id, { x, y, w = 200, h = 200, start, end, opacity = 0.9, color = "#f43f5e", dur = "0.6s" } = {}) {
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M50,85 C25,65 5,50 5,30 C5,15 18,5 30,5 C38,5 46,10 50,18 C54,10 62,5 70,5 C82,5 95,15 95,30 C95,50 75,65 50,85 Z' fill='${color}' opacity='0' transform='scale(0.3) translate(115,115)'><animate attributeName='opacity' values='0;1' dur='0.2s' begin='0.1s' fill='freeze'/><animateTransform attributeName='transform' type='scale' values='0.3;1.15;1' dur='${dur}' fill='freeze' keyTimes='0;0.6;1'/></path><circle cx='50' cy='45' r='0' fill='none' stroke='${color}' stroke-width='1.5' opacity='0.4'><animate attributeName='r' values='0;45' dur='0.5s' begin='0.3s' fill='freeze'/><animate attributeName='opacity' values='0.4;0' dur='0.5s' begin='0.3s' fill='freeze'/></circle></svg>`, { x, y, w, h, start, end, opacity });
}

/** Shape morphing between forms — circle → star → diamond → circle */
export function svgMorphShape(id, { x, y, w = 300, h = 300, start, end, opacity = 0.5, color = "#a78bfa", dur = "4s" } = {}) {
  const circle = "M100,30 C138,30 170,62 170,100 C170,138 138,170 100,170 C62,170 30,138 30,100 C30,62 62,30 100,30 Z";
  const star = "M100,20 L115,70 L170,70 L125,100 L140,155 L100,125 L60,155 L75,100 L30,70 L85,70 Z";
  const diamond = "M100,15 L170,100 L100,185 L30,100 Z";
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><path fill='none' stroke='${color}' stroke-width='2'><animate attributeName='d' values='${circle};${star};${diamond};${circle}' dur='${dur}' repeatCount='indefinite'/></path><path fill='${color}' opacity='0.1'><animate attributeName='d' values='${circle};${star};${diamond};${circle}' dur='${dur}' repeatCount='indefinite'/></path></svg>`, { x, y, w, h, start, end, opacity });
}

/** Badge/stamp slam — certification, achievement, quality seal */
export function svgBadgeStamp(id, { text = "VERIFIED", x, y, w = 250, h = 250, start, end, opacity = 0.9, color = "#7c3aed", textColor = "#ffffff", dur = "0.5s" } = {}) {
  const r = 70;
  return _svg(id, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><g transform='scale(1)' transform-origin='100 100'><animateTransform attributeName='transform' type='scale' values='2.5;0.9;1.05;1' dur='${dur}' fill='freeze' keyTimes='0;0.5;0.8;1'/><circle cx='100' cy='100' r='${r}' fill='none' stroke='${color}' stroke-width='4' opacity='0'><animate attributeName='opacity' values='0;1' dur='0.1s' begin='0.1s' fill='freeze'/></circle><circle cx='100' cy='100' r='${r - 8}' fill='none' stroke='${color}' stroke-width='1.5' stroke-dasharray='4 4' opacity='0'><animate attributeName='opacity' values='0;0.5' dur='0.1s' begin='0.1s' fill='freeze'/></circle>${Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * 2 * Math.PI;
    const ix = (100 + Math.cos(a) * (r + 8)).toFixed(1), iy = (100 + Math.sin(a) * (r + 8)).toFixed(1);
    const ox = (100 + Math.cos(a) * (r + 16)).toFixed(1), oy = (100 + Math.sin(a) * (r + 16)).toFixed(1);
    return `<line x1='${ix}' y1='${iy}' x2='${ox}' y2='${oy}' stroke='${color}' stroke-width='2' opacity='0'><animate attributeName='opacity' values='0;0.6' dur='0.1s' begin='0.1s' fill='freeze'/></line>`;
  }).join("")}<text x='100' y='95' fill='${textColor}' font-size='${Math.min(16, 160 / text.length)}' font-weight='700' text-anchor='middle' font-family='sans-serif' opacity='0'>${text}<animate attributeName='opacity' values='0;1' dur='0.15s' begin='0.15s' fill='freeze'/></text><text x='100' y='115' fill='${textColor}' font-size='8' text-anchor='middle' font-family='sans-serif' opacity='0'>★ ★ ★<animate attributeName='opacity' values='0;0.5' dur='0.15s' begin='0.2s' fill='freeze'/></text></g><circle cx='100' cy='100' r='0' fill='none' stroke='${color}' stroke-width='2' opacity='0.3'><animate attributeName='r' values='0;100' dur='0.5s' begin='0.15s' fill='freeze'/><animate attributeName='opacity' values='0.3;0' dur='0.5s' begin='0.15s' fill='freeze'/></circle></svg>`, { x, y, w, h, start, end, opacity });
}
