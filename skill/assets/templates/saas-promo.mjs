// SaaS Promo template — 4 scenes (Hero → Pain → Features → CTA), 30s
// HIGH IMPACT: glow titles, rgb-split transitions, flash cuts, pulsing CTA, particle layers
// Copy: cp skill/assets/templates/saas-promo.mjs /tmp/video-my.mjs
//        node skill/scripts/gen_canvas.mjs /tmp/video-my.mjs /tmp/video-my.json

export default function build(h) {
  const {
    makeShape, makeEffect, makeCaption, buildCanvas, theme, autoTracks,
    svgGradientOrb, svgVignette, svgParticles, svgCircuitTrace,
    svgCheckMark, svgHexGrid, svgPulseRipple, svgArrowPointer,
    svgBurstRays, svgNeonRing, svgDotGrid, svgAurora,
    svgLiquidBlob, svgConfetti, svgTwinkleStars, svgScanLine,
    svgParticleNetwork, svgFireworks, svgBadgeStamp, svgNumberCounter,
  } = h;

  const MAX = 30000;
  const t = theme("cyberpunk");

  // ── Global layers (span full video) ───────────────────────────
  const g_vig  = svgVignette("g_vig",  { start: 0, end: MAX, opacity: 0.65 });
  const g_dots = svgDotGrid("g_dots", {
    x: 0, y: 0, w: 1920, h: 1080, start: 0, end: MAX, opacity: 0.03, color: "#a78bfa",
  });

  // ============================================================
  // SCENE 1: HERO (0–7000ms)
  // ============================================================

  const s1_aurora = svgAurora("s1_aurora", {
    x: 0, y: 0, w: 1920, h: 1080, start: 0, end: 7500, opacity: 0.12,
    colors: [t.ACCENT, "#4f46e5", "#06b6d4"],
  });
  const s1_orb = svgGradientOrb("s1_orb", {
    x: 260, y: 60, w: 900, h: 900, start: 0, end: 7500, opacity: 0.13, color: t.ACCENT,
    kf: { scale: { dur: 7000, amp: 0.03 } },
  });
  const s1_particles = svgParticles("s1_particles", {
    x: 0, y: 0, w: 1920, h: 1080, start: 0, end: 7500, opacity: 0.28,
    colors: ["#a78bfa", "#818cf8", "#c4b5fd"],
  });
  const s1_neon = svgNeonRing("s1_neon", {
    x: 660, y: 240, w: 600, h: 600, start: 0, end: 7500, opacity: 0.13, color: t.ACCENT,
  });
  const s1_stars = svgTwinkleStars("s1_stars", {
    x: 0, y: 0, w: 1920, h: 1080, start: 0, end: 7500, opacity: 0.30,
  });

  // Opening punch
  const s1_flash = makeEffect("s1_flash", [
    { effectType: "flash", effectParams: { intensity: 0.55, speed: 2, decay: 0.3 }, enabled: true },
  ], { start: 0, end: 1400 });

  const s1_eye = t.eyebrow("s1_eye", "INTRODUCING", {
    x: 560, y: 270, start: 200, end: 7000,
    animIn: ["fadeIn", 600], animOut: ["fadeOut", 400],
  });
  const s1_title = t.hero("s1_title", "PRODUCT NAME", {
    x: 160, y: 318, start: 450, end: 7000,
    shadowColor: t.ACCENT, shadowBlur: 28,
    animIn: ["blurIn", 1200], animOut: ["blurOut", 700],
    animLoop: ["glow", 4000],
    kf: { scale: { dur: 6500, amp: 0.02 } },
  });
  const s1_line = makeShape("s1_line", "rect", t.ACCENT, {
    x: 760, y: 496, w: 400, h: 4, start: 900, end: 7000, rx: 2,
    animIn: ["expandIn", 900], animOut: ["fadeOut", 500],
  });
  const s1_tagline = t.subtitle("s1_tagline", "Your compelling tagline here", {
    x: 260, y: 516, start: 1100, end: 7000, color: "#a78bfa",
    animIn: ["fadeIn", 800], animOut: ["fadeOut", 500],
    animLoop: ["float", 5000],
  });
  const s1_label = t.label("s1_label", "Short descriptor or category", {
    x: 410, y: 600, start: 1400, end: 7000, font: "Fira Code",
    animIn: ["fadeIn", 600], animOut: ["fadeOut", 400],
  });

  // ============================================================
  // SCENE 2: PAIN POINT (6000–13000ms)  — rgb-split transition
  // ============================================================

  const tr_12 = makeEffect("tr_12", [
    { effectType: "rgbSplit",   effectParams: { amount: 14, angle: 0, speed: 3 }, enabled: true },
    { effectType: "glitchBlock", effectParams: { intensity: 0.4, blockSize: 30, speed: 4 }, enabled: true },
  ], { start: 5700, end: 6500 });

  const s2_circuit = svgCircuitTrace("s2_circuit", {
    x: 0, y: 0, w: 1920, h: 1080, start: 5500, end: 13500, opacity: 0.07,
    color: "#a78bfa", glowColor: t.ACCENT,
  });
  const s2_blob = svgLiquidBlob("s2_blob", {
    x: 900, y: 200, w: 900, h: 700, start: 5500, end: 13500, opacity: 0.06, color: t.ACCENT,
  });
  const s2_scan = svgScanLine("s2_scan", {
    x: 0, y: 0, w: 1920, h: 1080, start: 5500, end: 13500, opacity: 0.12, color: "#a78bfa",
  });

  const s2_line1 = t.heading("s2_line1", "The problem statement", {
    x: 160, y: 360, start: 6300, end: 13000,
    shadowColor: "rgba(124,58,237,0.4)", shadowBlur: 18,
    animIn: ["expandIn", 900], animOut: ["blurOut", 600],
    kf: { scale: { dur: 6500, amp: 0.015 } },
  });
  const s2_line2 = t.heading("s2_line2", "your product solves.", {
    x: 160, y: 458, start: 6300, end: 13000,
    shadowColor: "rgba(124,58,237,0.4)", shadowBlur: 18,
    animIn: ["expandIn", 900], animOut: ["blurOut", 600],
    kf: { scale: { dur: 6500, amp: 0.015 } },
  });
  const s2_sub = t.subtitle("s2_sub", "Supporting detail about the pain point", {
    x: 260, y: 580, start: 6800, end: 13000,
    animIn: ["fadeIn", 800], animOut: ["fadeOut", 500],
  });

  // ============================================================
  // SCENE 3: FEATURES (13000–23000ms)  — flash transition
  // ============================================================

  const tr_23 = makeEffect("tr_23", [
    { effectType: "flash", effectParams: { intensity: 0.55, speed: 3, decay: 0.35 }, enabled: true },
  ], { start: 12600, end: 13400 });

  const s3_hex = svgHexGrid("s3_hex", {
    x: 0, y: 0, w: 1920, h: 1080, start: 12500, end: 23500, opacity: 0.06, color: t.ACCENT,
  });
  const s3_burst = svgBurstRays("s3_burst", {
    x: 760, y: 60, w: 400, h: 200, start: 13000, end: 15000, opacity: 0.12,
    color: t.PRIMARY, rays: 16,
  });
  const s3_network = svgParticleNetwork("s3_network", {
    x: 0, y: 0, w: 1920, h: 1080, start: 12500, end: 23500, opacity: 0.06, color: t.ACCENT,
  });

  const s3_heading = t.heading("s3_heading", "Key Features", {
    x: 160, y: 130, start: 13000, end: 23000,
    shadowColor: t.ACCENT, shadowBlur: 14,
    animIn: ["slideIn", 800], animOut: ["fadeOut", 500],
  });
  const s3_hline = makeShape("s3_hline", "rect", t.ACCENT, {
    x: 810, y: 228, w: 300, h: 3, start: 13000, end: 23000, rx: 2,
    animIn: ["expandIn", 800], animOut: ["fadeOut", 400],
  });

  // Cards: y=280/500/720, spacing=220px, subheading title + body desc
  const featureEls = [
    { id: "f1", title: "Feature One",   desc: "Brief description of this feature", delay: 0    },
    { id: "f2", title: "Feature Two",   desc: "Brief description of this feature", delay: 600  },
    { id: "f3", title: "Feature Three", desc: "Brief description of this feature", delay: 1200 },
  ].flatMap(({ id, title, desc, delay }, i) => {
    const y = 280 + i * 220, s = 13500 + delay;
    return [
      makeShape(`s3_${id}_bg`, "rect", "#ffffff", {
        x: 260, y, w: 1400, h: 160, start: s, end: 23000, opacity: 0.05, rx: 14,
        animIn: ["slideIn", 700], animOut: ["fadeOut", 400],
      }),
      svgCheckMark(`s3_${id}_ck`, {
        x: 284, y: y + 50, w: 50, h: 50, start: s + 250, end: 23000, color: t.SUCCESS,
      }),
      t.subheading(`s3_${id}_t`, title, {
        x: 354, y: y + 22, w: 1200, start: s, end: 23000, align: "left",
        animIn: ["slideIn", 600], animOut: ["fadeOut", 400],
      }),
      t.body(`s3_${id}_d`, desc, {
        x: 354, y: y + 104, w: 1200, start: s + 120, end: 23000, align: "left",
        animIn: ["fadeIn", 500], animOut: ["fadeOut", 400],
      }),
    ];
  });

  // ============================================================
  // SCENE 4: CTA (23000–30000ms)  — flash + rgb-split transition
  // ============================================================

  const tr_34 = makeEffect("tr_34", [
    { effectType: "flash",    effectParams: { intensity: 0.60, speed: 4, decay: 0.3 }, enabled: true },
    { effectType: "rgbSplit", effectParams: { amount: 8, angle: 0, speed: 3 },         enabled: true },
  ], { start: 22700, end: 23500 });

  const s4_pulse = svgPulseRipple("s4_pulse", {
    x: 560, y: 80, w: 800, h: 800, start: 23000, end: MAX, opacity: 0.10, color: t.ACCENT,
  });
  const s4_fireworks = svgFireworks("s4_fireworks", {
    x: 0, y: 0, w: 1920, h: 1080, start: 23200, end: 26000, opacity: 0.80,
    colors: [t.ACCENT, "#a78bfa", "#06b6d4", "#fbbf24", "#f43f5e", t.SUCCESS],
  });
  const s4_badge = svgBadgeStamp("s4_badge", {
    x: 1500, y: 80, w: 280, h: 280, start: 24500, end: MAX, opacity: 0.92,
    text: "FREE", color: t.ACCENT, textColor: t.PRIMARY,
  });
  const s4_counter = svgNumberCounter("s4_counter", {
    x: 1300, y: 130, w: 500, h: 200, start: 26500, end: MAX, opacity: 0.90,
    value: 10000, suffix: "+", color: t.ACCENT,
  });
  const s4_confetti = svgConfetti("s4_confetti", {
    x: 0, y: 0, w: 1920, h: 1080, start: 24000, end: MAX, opacity: 0.5,
    colors: [t.ACCENT, "#a78bfa", "#06b6d4", t.SUCCESS, "#fbbf24", "#f43f5e"],
  });

  const s4_headline = t.heading("s4_headline", "Get Started Free", {
    x: 160, y: 380, start: 23200, end: MAX,
    shadowColor: t.ACCENT, shadowBlur: 22,
    animIn: ["blurIn", 1000], animOut: ["fadeOut", 600],
    kf: { scale: { dur: 7000, amp: 0.02 } },
  });
  const s4_sub = t.subtitle("s4_sub", "No credit card required", {
    x: 260, y: 496, start: 23700, end: MAX,
    animIn: ["fadeIn", 800], animOut: ["fadeOut", 500],
  });
  const s4_cta_bg = makeShape("s4_cta_bg", "rect", t.ACCENT, {
    x: 560, y: 606, w: 800, h: 76, start: 24200, end: MAX, rx: 38,
    animIn: ["zoomIn", 800], animOut: ["fadeOut", 500],
    animLoop: ["pulse", 2000],
    kf: { opacity: { dur: 6000, amp: 0.18 } },
  });
  const s4_cta = t.cta("s4_cta", "Sign Up Now", {
    x: 560, y: 620, start: 24200, end: MAX,
    animIn: ["fadeIn", 800], animOut: ["fadeOut", 500],
    animLoop: ["glow", 2500],
  });
  const s4_arrow = svgArrowPointer("s4_arrow", {
    x: 438, y: 608, w: 100, h: 76, start: 25500, end: MAX,
    opacity: 0.85, color: t.PRIMARY, direction: "right",
  });
  const s4_url = t.label("s4_url", "yourproduct.com", {
    x: 460, y: 744, start: 25500, end: MAX, font: "Fira Code", color: "#06b6d4",
    animIn: ["fadeIn", 600], animOut: ["fadeOut", 400],
  });

  // ============================================================
  // ASSEMBLY
  // ============================================================

  const elements = [
    g_vig, g_dots,
    // Scene 1
    s1_aurora, s1_orb, s1_particles, s1_neon, s1_stars, s1_flash,
    s1_eye, s1_title, s1_line, s1_tagline, s1_label,
    // Scene 2
    tr_12, s2_circuit, s2_blob, s2_scan,
    s2_line1, s2_line2, s2_sub,
    // Scene 3
    tr_23, s3_hex, s3_burst, s3_network,
    s3_heading, s3_hline, ...featureEls,
    // Scene 4
    tr_34, s4_pulse, s4_fireworks, s4_confetti, s4_badge, s4_counter,
    s4_headline, s4_sub, s4_cta_bg, s4_cta, s4_arrow, s4_url,
  ];

  // ============================================================
  // CAPTIONS
  // ============================================================

  const captions = [
    // Scene 1: Hero
    makeCaption("cap1", "00:00:01.500", "00:00:04.500", "Discover a smarter way to work"),
    makeCaption("cap2", "00:00:05.000", "00:00:06.800", "Trusted by teams worldwide"),
    // Scene 2: Pain Point
    makeCaption("cap3", "00:00:07.300", "00:00:10.000", "We know the struggle is real"),
    makeCaption("cap4", "00:00:10.500", "00:00:12.800", "But it doesn't have to be this way"),
    // Scene 3: Features
    makeCaption("cap5", "00:00:14.000", "00:00:17.000", "Powerful features, zero complexity"),
    makeCaption("cap6", "00:00:17.500", "00:00:21.000", "Everything your team needs to ship faster"),
    makeCaption("cap7", "00:00:21.500", "00:00:22.800", "Simple. Powerful. Yours."),
    // Scene 4: CTA
    makeCaption("cap8", "00:00:23.800", "00:00:27.000", "Join 10,000+ teams already winning"),
    makeCaption("cap9", "00:00:27.500", "00:00:29.500", "Start free. No credit card needed."),
  ];
  const captionAnimation = {
    preset: "word-stagger", inType: "slideIn", inDuration: 350,
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
    bg: t.BG, maxTime: MAX, projectName: "SaaS Promo Template",
    fontAssets: t.fonts, elements, tracks: autoTracks(elements),
    captions, captionAnimation, globalCaptionStyle,
    fps: 30, quality: "high",
  });
}
