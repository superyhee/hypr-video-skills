import { makeText } from "./elements.mjs";

// Theme presets, type scale, role helpers

// ─── Theme Presets ──────────────────────────────────────────────────────────

const _themes = {
  // ── Dark themes ──
  cyberpunk:     { BG: "#050510", PRIMARY: "#ffffff", SECONDARY: "#9ca3af", ACCENT: "#7c3aed", SUCCESS: "#4ade80" },
  cinematic:     { BG: "#0a0a0a", PRIMARY: "#ffffff", SECONDARY: "#86868b", ACCENT: "#2997ff", SUCCESS: "#4ade80" },
  gradient:      { BG: "#0f0c29", PRIMARY: "#ffffff", SECONDARY: "#a0a0b0", ACCENT: "#c084fc", SUCCESS: "#4ade80" },
  retro:         { BG: "#1a1a1a", PRIMARY: "#ffdd00", SECONDARY: "#ff6b6b", ACCENT: "#ff9500", SUCCESS: "#4ade80" },
  midnight:      { BG: "#0b1120", PRIMARY: "#e2e8f0", SECONDARY: "#64748b", ACCENT: "#6366f1", SUCCESS: "#34d399" },
  ember:         { BG: "#1a0a0a", PRIMARY: "#ffffff", SECONDARY: "#a8a29e", ACCENT: "#ef4444", SUCCESS: "#4ade80" },
  ocean:         { BG: "#0a1628", PRIMARY: "#f0f9ff", SECONDARY: "#7dd3fc", ACCENT: "#0ea5e9", SUCCESS: "#34d399" },
  forest:        { BG: "#0a1a0a", PRIMARY: "#f0fdf4", SECONDARY: "#86efac", ACCENT: "#22c55e", SUCCESS: "#4ade80" },
  gold:          { BG: "#0f0d08", PRIMARY: "#fef3c7", SECONDARY: "#a89065", ACCENT: "#f59e0b", SUCCESS: "#4ade80" },
  aurora:        { BG: "#070b1a", PRIMARY: "#ffffff", SECONDARY: "#94a3b8", ACCENT: "#06b6d4", SUCCESS: "#a78bfa" },
  coral:         { BG: "#1a0f0f", PRIMARY: "#ffffff", SECONDARY: "#c4a8a8", ACCENT: "#f43f5e", SUCCESS: "#4ade80" },
  monochrome:    { BG: "#111111", PRIMARY: "#ffffff", SECONDARY: "#737373", ACCENT: "#ffffff", SUCCESS: "#a3a3a3" },
  candy:         { BG: "#1a0a1e", PRIMARY: "#ffffff", SECONDARY: "#d8b4fe", ACCENT: "#e879f9", SUCCESS: "#4ade80" },
  neon:          { BG: "#0a0a0a", PRIMARY: "#ffffff", SECONDARY: "#a3e635", ACCENT: "#ff00ff", SUCCESS: "#00ff88" },
  sunset:        { BG: "#1a0810", PRIMARY: "#fff1f2", SECONDARY: "#fda4af", ACCENT: "#f97316", SUCCESS: "#4ade80" },
  tech:          { BG: "#0a0a0a", PRIMARY: "#00ff41", SECONDARY: "#22c55e", ACCENT: "#00ff41", SUCCESS: "#00ff88" },
  slate:         { BG: "#0f172a", PRIMARY: "#e2e8f0", SECONDARY: "#64748b", ACCENT: "#94a3b8", SUCCESS: "#34d399" },
  noir:          { BG: "#000000", PRIMARY: "#ffffff", SECONDARY: "#525252", ACCENT: "#fafafa", SUCCESS: "#a3a3a3" },
  electric:      { BG: "#0c0a1e", PRIMARY: "#ffffff", SECONDARY: "#93c5fd", ACCENT: "#3b82f6", SUCCESS: "#facc15" },
  vintage:       { BG: "#1c1410", PRIMARY: "#fef3c7", SECONDARY: "#d4a574", ACCENT: "#c2956a", SUCCESS: "#a3b18a" },
  // ── Light themes ──
  professional:  { BG: "#f5f5f7", PRIMARY: "#1d1d1f", SECONDARY: "#6e6e73", ACCENT: "#0071E3", SUCCESS: "#34c759" },
  minimal:       { BG: "#ffffff", PRIMARY: "#171717", SECONDARY: "#737373", ACCENT: "#171717", SUCCESS: "#16a34a" },
  warm:          { BG: "#fef7ed", PRIMARY: "#422006", SECONDARY: "#a16207", ACCENT: "#ea580c", SUCCESS: "#16a34a" },
  pastel:        { BG: "#faf5ff", PRIMARY: "#3b0764", SECONDARY: "#7e22ce", ACCENT: "#a855f7", SUCCESS: "#22c55e" },
};

const _typeScale = {
  HERO: 120, DISPLAY: 96, HEADING: 64, SUBHEADING: 48,
  SUBTITLE: 36, CTA: 28, QUOTE: 28, BODY: 24, CODE: 20, LABEL: 18, TAG: 16, EYEBROW: 14,
};

const _defaultFonts = {
  Montserrat: { url: "skill/assets/fonts/Montserrat-Variable.ttf", fileType: "ttf" },
  "Fira Code": { url: "skill/assets/fonts/FiraCode-Variable.ttf", fileType: "ttf" },
  "Playfair Display": { url: "skill/assets/fonts/PlayfairDisplay-Variable.ttf", fileType: "ttf" },
};

const _roles = {
  hero:       { size: 120, weight: 700, colorKey: "PRIMARY",   align: "center", w: 1600, h: 160 },
  display:    { size: 96,  weight: 700, colorKey: "ACCENT",    align: "center", w: 1400, h: 130 },
  heading:    { size: 64,  weight: 700, colorKey: "PRIMARY",   align: "center", w: 1600, h: 90 },
  subheading: { size: 48,  weight: 600, colorKey: "PRIMARY",   align: "center", w: 1400, h: 70 },
  subtitle:   { size: 36,  weight: 400, colorKey: "SECONDARY", align: "center", w: 1400, h: 60 },
  cta:        { size: 28,  weight: 700, colorKey: "PRIMARY",   align: "center", w: 800,  h: 48 },
  quote:      { size: 28,  weight: 400, colorKey: "SECONDARY", align: "center", w: 1200, h: 48, font: "Playfair Display" },
  body:       { size: 24,  weight: 400, colorKey: "SECONDARY", align: "center", w: 1000, h: 44 },
  code:       { size: 20,  weight: 400, colorKey: "SECONDARY", align: "center", w: 1000, h: 36, font: "Fira Code", opacity: 0.7 },
  label:      { size: 18,  weight: 400, colorKey: "SECONDARY", align: "center", w: 1100, h: 40, opacity: 0.6 },
  tag:        { size: 16,  weight: 700, colorKey: "ACCENT",    align: "center", w: 600,  h: 32 },
  eyebrow:    { size: 14,  weight: 700, colorKey: "ACCENT",    align: "center", w: 800,  h: 28, charSpacing: 3 },
};

export function theme(name = "cyberpunk", overrides = {}) {
  const base = _themes[name] ?? _themes.cyberpunk;
  const t = { ...base, ..._typeScale, fonts: { ..._defaultFonts }, ...overrides };

  // Attach role-based text helpers: t.hero(id, text, opts), t.heading(...), etc.
  for (const [role, defaults] of Object.entries(_roles)) {
    t[role] = (id, text, opts = {}) => makeText(id, text, {
      font: defaults.font ?? "Montserrat",
      size: defaults.size,
      weight: defaults.weight,
      color: t[defaults.colorKey],
      align: defaults.align,
      w: defaults.w,
      h: defaults.h,
      ...(defaults.opacity != null && { opacity: defaults.opacity }),
      ...(defaults.charSpacing != null && { charSpacing: defaults.charSpacing }),
      ...opts,
    });
  }

  return t;
}