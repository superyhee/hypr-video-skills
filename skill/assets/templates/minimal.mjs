// Minimal template — 2 scenes (Hero → CTA), 10s
// HIGH IMPACT: flash punch open, glowing hero, staggered entrance, pulsing CTA
// Copy: cp skill/assets/templates/minimal.mjs /tmp/video-my.mjs
//        node skill/scripts/gen_canvas.mjs /tmp/video-my.mjs /tmp/video-my.json

export default function build(h) {
  const {
    makeShape, makeEffect, makeCaption, buildCanvas, theme, autoTracks,
    svgGradientOrb, svgVignette, svgParticles, svgNeonRing,
    svgDotGrid, svgPulseRipple, svgArrowPointer, svgShootingStar,
    svgTwinkleStars, svgOrbitRing, svgFireworks,
  } = h;

  const MAX = 10000;
  const t = theme("cyberpunk");

  // ── Global layers ──────────────────────────────────────────────
  const g_vig  = svgVignette("g_vig",  { start: 0, end: MAX, opacity: 0.65 });
  const g_dots = svgDotGrid("g_dots", {
    x: 0, y: 0, w: 1920, h: 1080, start: 0, end: MAX, opacity: 0.03, color: t.ACCENT,
  });

  // ── Scene 1: Hero (0–5000ms) ───────────────────────────────────
  const s1_orb = svgGradientOrb("s1_orb", {
    x: 360, y: 60, w: 1200, h: 960, start: 0, end: 5500, opacity: 0.10, color: t.ACCENT,
  });
  const s1_neon = svgNeonRing("s1_neon", {
    x: 660, y: 240, w: 600, h: 600, start: 0, end: 5500, opacity: 0.12, color: t.ACCENT,
  });
  const s1_particles = svgParticles("s1_particles", {
    x: 0, y: 0, w: 1920, h: 1080, start: 0, end: 5500, opacity: 0.25,
    colors: ["#a78bfa", "#818cf8", "#c4b5fd"],
  });
  const s1_star = svgShootingStar("s1_star", {
    x: 300, y: 80, w: 400, h: 200, start: 900, end: 3500, opacity: 0.5, color: t.PRIMARY,
  });
  const s1_stars = svgTwinkleStars("s1_stars", {
    x: 0, y: 0, w: 1920, h: 1080, start: 0, end: 5500, opacity: 0.35,
  });

  // Opening punch: flash on frame 1
  const s1_flash = makeEffect("s1_flash", [
    { effectType: "flash", effectParams: { intensity: 0.55, speed: 2, decay: 0.3 }, enabled: true },
  ], { start: 0, end: 1200 });

  const s1_eye = t.eyebrow("s1_eye", "INTRODUCING", {
    x: 560, y: 278, start: 200, end: 5000,
    animIn: ["fadeIn", 600], animOut: ["fadeOut", 400],
  });
  const s1_title = t.hero("s1_title", "Your Product", {
    x: 160, y: 328, start: 400, end: 5000,
    shadowColor: t.ACCENT, shadowBlur: 24,
    animIn: ["blurIn", 1200], animOut: ["blurOut", 700],
    animLoop: ["glow", 3500],
    kf: { scale: { dur: 5000, amp: 0.02 } },
  });
  const s1_divider = makeShape("s1_divider", "rect", t.ACCENT, {
    x: 760, y: 506, w: 400, h: 4, start: 800, end: 5000, rx: 2,
    animIn: ["expandIn", 700], animOut: ["fadeOut", 400],
  });
  const s1_tagline = t.subtitle("s1_tagline", "A short tagline goes here", {
    x: 260, y: 526, start: 1000, end: 5000,
    animIn: ["fadeIn", 800], animOut: ["fadeOut", 500],
    animLoop: ["float", 5000],
  });

  // ── Transition: flash cut between scenes ───────────────────────
  const tr_flash = makeEffect("tr_flash", [
    { effectType: "flash", effectParams: { intensity: 0.55, speed: 4, decay: 0.35 }, enabled: true },
  ], { start: 4700, end: 5400 });

  // ── Scene 2: CTA (5000–10000ms) ────────────────────────────────
  const s2_orb = svgGradientOrb("s2_orb", {
    x: 360, y: 60, w: 1200, h: 960, start: 4500, end: MAX, opacity: 0.08, color: "#4f46e5",
  });
  const s2_pulse = svgPulseRipple("s2_pulse", {
    x: 560, y: 100, w: 800, h: 800, start: 5000, end: MAX, opacity: 0.10, color: t.ACCENT,
  });
  const s2_orbit = svgOrbitRing("s2_orbit", {
    x: 560, y: 80, w: 800, h: 800, start: 5000, end: MAX, opacity: 0.09, color: t.ACCENT,
  });
  const s2_fireworks = svgFireworks("s2_fireworks", {
    x: 260, y: 100, w: 1400, h: 600, start: 6200, end: 8500, opacity: 0.80,
    colors: [t.ACCENT, "#a78bfa", "#06b6d4", "#fbbf24", "#f43f5e", "#4ade80"],
  });

  const s2_heading = t.heading("s2_heading", "Get started today", {
    x: 160, y: 380, start: 5200, end: MAX,
    shadowColor: t.ACCENT, shadowBlur: 16,
    animIn: ["blurIn", 1000], animOut: ["fadeOut", 600],
    animLoop: ["breathe", 4000],
    kf: { scale: { dur: 8000, amp: 0.015 } },
  });
  const s2_sub = t.subtitle("s2_sub", "No credit card required", {
    x: 260, y: 498, start: 5600, end: MAX,
    animIn: ["fadeIn", 700], animOut: ["fadeOut", 500],
  });
  const s2_cta_bg = makeShape("s2_cta_bg", "rect", t.ACCENT, {
    x: 560, y: 608, w: 800, h: 76, start: 6000, end: MAX, rx: 38,
    animIn: ["zoomIn", 800], animOut: ["fadeOut", 500],
    animLoop: ["pulse", 2000],
    kf: { opacity: { dur: 8000, amp: 0.15 } },
  });
  const s2_cta = t.cta("s2_cta", "Get Started Free", {
    x: 560, y: 622, start: 6000, end: MAX,
    animIn: ["fadeIn", 800], animOut: ["fadeOut", 500],
    animLoop: ["glow", 2500],
  });
  const s2_arrow = svgArrowPointer("s2_arrow", {
    x: 438, y: 612, w: 100, h: 76, start: 7000, end: MAX,
    opacity: 0.8, color: t.PRIMARY, direction: "right",
  });

  // ── Assembly ───────────────────────────────────────────────────
  const elements = [
    g_vig, g_dots,
    s1_orb, s1_neon, s1_particles, s1_star, s1_stars, s1_flash,
    s1_eye, s1_title, s1_divider, s1_tagline,
    tr_flash,
    s2_orb, s2_pulse, s2_orbit, s2_fireworks,
    s2_heading, s2_sub, s2_cta_bg, s2_cta, s2_arrow,
  ];

  // ── Captions ───────────────────────────────────────────────────
  const captions = [
    makeCaption("cap1", "00:00:01.500", "00:00:04.000", "The next big thing is here"),
    makeCaption("cap2", "00:00:05.500", "00:00:08.000", "Join thousands of happy users today"),
    makeCaption("cap3", "00:00:08.300", "00:00:09.700", "Your future starts now"),
  ];
  const captionAnimation = {
    preset: "charFadeIn", inType: "slideIn", inDuration: 400,
    outType: "fadeOut", outDuration: 300, easing: "easeOut",
  };
  const globalCaptionStyle = {
    fontSize: 34, fontFamily: "Montserrat", fontColor: "#ffffff", fontWeight: 700,
    textAlign: "center", lineHeight: 1.2, charSpacing: 0, styles: [],
    strokeWidth: 0, strokeColor: "#000000",
    shadowColor: "rgba(0,0,0,0.9)", shadowBlur: 12, shadowOffsetX: 0, shadowOffsetY: 2,
    backgroundColor: "", originX: "center", originY: "bottom",
  };

  return buildCanvas({
    bg: t.BG, maxTime: MAX, projectName: "Minimal Template",
    fontAssets: t.fonts, elements, tracks: autoTracks(elements),
    captions, captionAnimation, globalCaptionStyle,
    fps: 30, quality: "high",
  });
}
