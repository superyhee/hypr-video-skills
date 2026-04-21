import { makeText, makeShape, makeImage } from "./elements.mjs";
import {
  svgTypingCursor,
  svgConcentricRings, svgBreathingRing, svgNumberCounter,
  svgPulseRipple, svgHeartbeat, svgBurstRays, svgOrbitDot,
} from "./svg.mjs";
import { tokenize as _tokenize, HL_COLORS as _HL_COLORS } from "./highlight.mjs";

// ── Shared private helpers ────────────────────────────────────────────────────

/**
 * _windowFrame — macOS-style window chrome: bg + header-cover pattern + dots.
 * Shared by makeCodeBlock and makeTerminal.
 * Returns an array of shape elements (no content).
 */
function _windowFrame(id, {
  x, y, w, totalH, headerH,
  rx = 10,
  bgColor, headerBg, borderColor,
  bdrOpacity = 0.8, sepOpacity = 0.9,
  showDots = true, dotOpacity = 0.85, dotXOffset = 18,
  glowColor = null,
  start, end, inline,
}) {
  return [
    makeShape(`${id}_bg`,   "rect", bgColor,        { x, y, w, h: totalH, rx, start, end, ...inline }),
    makeShape(`${id}_hbg`,  "rect", headerBg,        { x: x+1, y: y+1, w: w-2, h: headerH+10, rx: rx-1, start, end, ...inline }),
    makeShape(`${id}_cov`,  "rect", bgColor,          { x: x+1, y: y+headerH, w: w-2, h: 12, start, end, ...inline }),
    makeShape(`${id}_sep`,  "rect", borderColor,      { x, y: y+headerH, w, h: 1, start, end, opacity: sepOpacity, ...inline }),
    ...(glowColor ? [makeShape(`${id}_glow`, "rect", "transparent", {
      x: x-1, y: y-1, w: w+2, h: totalH+2, rx: rx+1,
      stroke: glowColor, strokeWidth: 1, start, end, opacity: 0.12, ...inline,
    })] : []),
    makeShape(`${id}_bdr`,  "rect", "transparent",    { x, y, w, h: totalH, rx, stroke: borderColor, strokeWidth: 1, start, end, opacity: bdrOpacity, ...inline }),
    ...(showDots ? ["#ff5f57", "#febc2e", "#28c840"].map((c, i) =>
      makeShape(`${id}_dot${i}`, "circle", c, {
        x: x + dotXOffset + i * 22, y: y + headerH / 2 - 6, w: 12, h: 12,
        start, end, opacity: dotOpacity, ...inline,
      })
    ) : []),
  ];
}

// ── Module-level terminal constants ───────────────────────────────────────────

// (shadow removed — without blur support it creates a ghost/double-image effect)

const _TERM_COLOR  = { cmd: "#f8f8f2", output: "#8b8b8b", success: "#4ade80", error: "#f87171", comment: "#6272a4" };
const _TERM_PREFIX = { success: "✅  ", error: "❌  " };
const _TERM_INDENT = { output: 2, comment: 2 }; // chars

// 14 composite UI components

// ── makeCodeBlock ────────────────────────────────────────────────────────────

/**
 * makeCodeBlock — Markdown-style code block: macOS header + line numbers + syntax highlight.
 * Returns an array of elements — use spread: elements = [...makeCodeBlock(...), ...]
 *
 * @example
 *   ...makeCodeBlock("cb1", `const x = 1\nconst y = 2`, {
 *     x: 160, y: 280, w: 1000, start, end,
 *     lang: "js", accentColor: t.ACCENT,
 *   })
 */
export function makeCodeBlock(id, code, {
  t,
  x = 160, y = 280, w = 1000,
  start, end,
  lang = "",
  fontSize = 22,
  highlight = true,
  showLineNumbers = true,
  color       = t?.PRIMARY  ?? "#e2e8f0",
  hlColors = {},
  bgColor     = t?.BG       ?? "#0d0d1a",
  headerBg    = "#161625",
  borderColor = t?.SECONDARY ?? "#2d2d4e",
  accentColor = t?.ACCENT   ?? "#7c3aed",
  showDots = true,
  animIn = ["blurIn", 600],
  animOut = ["fadeOut", 300],
} = {}) {
  const lines = code.split("\n");
  const lineCount = lines.length;
  const lineH = Math.round(fontSize * 1.65);
  const padX = 32;
  const padY = 22;
  const headerH = 48;
  const codeH = lineCount * lineH + padY * 2;
  const totalH = headerH + codeH;
  const inline = { animIn, animOut };
  const charW = Math.round(fontSize * 0.6); // Fira Code monospace advance ratio — integer px prevents drift

  // Line number column width: digit chars + left/right padding
  const lnDigits = String(lineCount).length;
  const lnColW = showLineNumbers ? lnDigits * charW + 32 : 0;
  const codeX = x + padX + lnColW; // where code text starts

  const tokenColors  = { ..._HL_COLORS, identifier: color, ...hlColors };
  const codeW        = w - padX - lnColW - padX;  // available width for code text
  const codeRightX   = codeX + codeW;             // right clipping boundary
  const lineBaseY    = y + headerH + padY;

  // ── Code content ────────────────────────────────────────────────────────────
  // Both modes render PER LINE to guarantee:
  //   • pixel-perfect alignment with line numbers
  //   • no cross-line Y drift from renderer lineHeight interpretation
  //   • long lines are clipped at the right boundary, not overflowing
  const codeEls = [];

  if (highlight) {
    // Group tokens by line, then render each line's tokens
    const byLine = {};
    for (const tok of _tokenize(code, lang)) {
      if (!byLine[tok.line]) byLine[tok.line] = [];
      byLine[tok.line].push(tok);
    }
    let tokIdx = 0;
    for (const [li, lineToks] of Object.entries(byLine)) {
      const lineY = lineBaseY + Number(li) * lineH;
      for (const tok of lineToks) {
        const tokX = codeX + tok.col * charW;
        if (tokX >= codeRightX) continue;             // fully off-screen → skip
        // Use full remaining width — prevents renderer from wrapping within token
        const tokW = codeRightX - tokX;
        codeEls.push(makeText(`${id}_t${tokIdx++}`, tok.text, {
          x: tokX, y: lineY, w: tokW, h: lineH,
          font: "Fira Code", size: fontSize, weight: 400,
          color: tokenColors[tok.type] ?? color,
          align: "left",
          start, end, ...inline,
        }));
      }
    }
  } else {
    // Plain mode: one makeText per line — explicit Y, no lineHeight dependency
    for (const [li, lineText] of lines.entries()) {
      codeEls.push(makeText(`${id}_l${li}`, lineText || " ", {
        x: codeX, y: lineBaseY + li * lineH, w: codeW, h: lineH,
        font: "Fira Code", size: fontSize, weight: 400,
        color, align: "left",
        start, end, ...inline,
      }));
    }
  }

  // ── Line numbers: per-line elements — exact Y matches code tokens ──────────
  const lnEls = showLineNumbers ? lines.map((_, li) =>
    makeText(`${id}_ln${li}`, String(li + 1), {
      x: x + padX, y: lineBaseY + li * lineH,
      w: lnColW - 12, h: lineH,
      font: "Fira Code", size: fontSize, weight: 400,
      color: "#4b5563", align: "right",
      start, end, ...inline,
    })
  ) : [];

  return [
    // ①–⑥ Window chrome
    ..._windowFrame(id, { x, y, w, totalH, headerH, bgColor, headerBg, borderColor, showDots, start, end, inline }),
    // ⑦ Language label
    ...(lang ? [makeText(`${id}_lang`, lang, {
      x: x + w - 120, y: y + 10, w: 110, h: 22,
      font: "Fira Code", size: 13, weight: 400,
      color: accentColor, align: "right",
      start, end, opacity: 0.65, ...inline,
    })] : []),
    // ⑧ Line number separator
    ...(showLineNumbers ? [makeShape(`${id}_lsep`, "rect", borderColor, {
      x: x + padX + lnColW - 8, y: y + headerH, w: 1, h: codeH + padY * 2,
      start, end, opacity: 0.3, ...inline,
    })] : []),
    // ⑧ Line numbers (per-line, Y-locked to token positions)
    ...lnEls,
    // ⑨ Code tokens / plain lines
    ...codeEls,
  ];
}

// ── makeFeatureList ──────────────────────────────────────────────────────────

/**
 * makeFeatureList — Professional animated checklist with icon bubbles and row highlights.
 * Items stagger in one by one.
 *
 * @param items  string[] | { icon?, iconColor?, text, subtext? }[]
 * @example
 *   ...makeFeatureList("fl", [
 *     { text: "Zero config setup", subtext: "Works out of the box" },
 *     "Built-in CI/CD",
 *     { icon: "🚀", text: "Deploy in seconds" },
 *   ], { x: 260, y: 340, w: 1100, start, end, iconColor: t.ACCENT })
 */
export function makeFeatureList(id, items, {
  t,
  x = 260, y = 300, w = 1100,
  start, end,
  icon = "✓",
  iconColor    = t?.ACCENT    ?? "#4ade80",
  textColor    = t?.PRIMARY   ?? "#ffffff",
  subtextColor = t?.SECONDARY ?? "#9ca3af",
  fontSize = 28,
  stagger = 300,
  animIn = ["slideIn", 500],
  animOut = ["fadeOut", 300],
} = {}) {
  const bubSize = Math.round(fontSize * 1.6);   // icon circle diameter
  const iconW   = Math.round(fontSize * 2.6);   // column width for icon + gap
  const rowH    = Math.round(fontSize * 1.8);
  const subH    = Math.round(fontSize * 1.15);
  const gap     = Math.round(fontSize * 0.55);
  const inline  = { animIn, animOut };

  // Uniform row height — all items same height regardless of subtext
  // ensures consistent list appearance and correct icon centering
  const hasAnySub  = items.some(item => typeof item !== "string" && item.subtext);
  const uniformH   = rowH + (hasAnySub ? subH : 0);
  const els        = [];
  let curY         = y;

  items.forEach((item, i) => {
    const isStr    = typeof item === "string";
    const ico      = isStr ? icon      : (item.icon      ?? icon);
    const icoColor = isStr ? iconColor : (item.iconColor ?? iconColor);
    const text     = isStr ? item      : item.text;
    const sub      = isStr ? null      : (item.subtext ?? null);
    const iStart   = start + i * stagger;
    const iy       = curY;

    // Subtle row background — uniform height for all items
    els.push(makeShape(`${id}_rbg${i}`, "rect", icoColor, {
      x, y: iy, w, h: uniformH, rx: 10,
      start: iStart, end, opacity: 0.06, ...inline,
    }));

    // Icon bubble — centered in uniformH (not just rowH)
    const bubX     = x + Math.round((iconW - bubSize) / 2);
    const bubY     = iy + Math.round((uniformH - bubSize) / 2);
    const bubInline = { animIn, animOut, animLoop: ["breathe", 2200 + i * 200] }; // staggered rates
    els.push(
      makeShape(`${id}_bub${i}`, "circle", icoColor, {
        x: bubX, y: bubY, w: bubSize, h: bubSize,
        start: iStart, end, opacity: 0.18, ...bubInline,
      }),
      makeText(`${id}_ico${i}`, ico, {
        x: bubX, y: bubY, w: bubSize, h: bubSize,
        font: "Montserrat", size: Math.round(fontSize * 0.9), weight: 700,
        color: icoColor, align: "center",
        start: iStart, end, ...bubInline,
      }),
    );

    // Main text (bold)
    els.push(makeText(`${id}_txt${i}`, text, {
      x: x + iconW, y: iy + Math.round((rowH - fontSize - 4) / 2), w: w - iconW - 16, h: rowH,
      font: "Montserrat", size: fontSize, weight: 600,
      color: textColor, align: "left",
      start: iStart, end, ...inline,
    }));

    // Subtext
    if (sub) {
      els.push(makeText(`${id}_sub${i}`, sub, {
        x: x + iconW, y: iy + rowH, w: w - iconW - 16, h: subH,
        font: "Montserrat", size: Math.round(fontSize * 0.7), weight: 400,
        color: subtextColor, align: "left",
        start: iStart, end, ...inline,
      }));
    }

    curY += uniformH + gap;
  });

  return els;
}

// ── makeTerminal ─────────────────────────────────────────────────────────────

/**
 * makeTerminal — Professional terminal window with path header, colored lines and stagger reveal.
 *
 * @param lines  { type: "cmd"|"output"|"success"|"error"|"comment", text: string }[]
 * @example
 *   ...makeTerminal("term", [
 *     { type: "cmd",     text: "npm install hypr-video-cli" },
 *     { type: "output",  text: "added 42 packages in 1.2s" },
 *     { type: "success", text: "Done" },
 *   ], { x: 260, y: 300, w: 1400, start, end, cwd: "~/project" })
 */
export function makeTerminal(id, lines, {
  t,
  x = 160, y = 280, w = 1000,
  start, end,
  cwd = "~",
  title = "bash",
  fontSize = 22,
  stagger = 400,
  showDots = true,
  bgColor     = "#0d0d0d",
  headerBg    = "#1c1c1e",
  borderColor = "#2d2d2d",
  promptColor = t?.ACCENT ?? "#4ade80",
  animIn = ["fadeIn", 400],
  animOut = ["fadeOut", 300],
} = {}) {
  const lineH   = Math.round(fontSize * 1.7);
  const padX    = 28;
  const padY    = 20;
  const headerH = 44;
  const codeH   = lines.length * lineH + padY * 2;
  const totalH  = headerH + codeH;
  const charW   = fontSize * 0.601;
  const inline  = { animIn, animOut };

  const pathText = `${cwd}  —  ${title}`;

  const els = [
    // Window chrome (bg, header-cover, sep, glow, border, dots)
    ..._windowFrame(id, {
      x, y, w, totalH, headerH, rx: 12,
      bgColor, headerBg, borderColor,
      bdrOpacity: 0.9, sepOpacity: 1,
      showDots, dotOpacity: 0.9, dotXOffset: 16,
      glowColor: promptColor,
      start, end, inline,
    }),
    // Path label centered in header
    makeText(`${id}_path`, pathText, {
      x: x + 80, y: y + Math.round((headerH - 16) / 2), w: w - 100, h: 20,
      font: "Fira Code", size: 13, weight: 400, color: "#6b7280", align: "center",
      start, end, opacity: 0.9, ...inline,
    }),
  ];

  // Lines with stagger
  lines.forEach((line, i) => {
    const isStr  = typeof line === "string";
    const type   = isStr ? "cmd"  : (line.type ?? "cmd");
    const text   = isStr ? line   : line.text;
    const lStart = start + i * stagger;
    const color  = _TERM_COLOR[type] ?? "#f8f8f2";
    const indent = (_TERM_INDENT[type] ?? 0) * charW;
    const lx     = x + padX + indent;
    const ly     = y + headerH + padY + i * lineH;
    const lw     = w - padX * 2 - indent;
    const li     = { animIn, animOut };

    // Subtle left accent stripe for indented lines (output / comment)
    if (_TERM_INDENT[type]) {
      els.push(makeShape(`${id}_stripe${i}`, "rect", color, {
        x: x + padX, y: ly + 4, w: 2, h: lineH - 8, rx: 1,
        start: lStart, end, opacity: 0.25, ...li,
      }));
    }

    if (type === "cmd") {
      const pW = Math.round(charW * 2 + 6);
      els.push(
        makeText(`${id}_pr${i}`, "$",  { x: lx,    y: ly, w: pW,    h: lineH, font: "Fira Code", size: fontSize, weight: 700, color: promptColor, align: "left", start: lStart, end, ...li }),
        makeText(`${id}_ln${i}`, text, { x: lx+pW, y: ly, w: lw-pW, h: lineH, font: "Fira Code", size: fontSize, weight: 400, color,              align: "left", start: lStart, end, ...li }),
      );
    } else {
      els.push(makeText(`${id}_ln${i}`, (_TERM_PREFIX[type] ?? "") + text, {
        x: lx, y: ly, w: lw, h: lineH,
        font: "Fira Code", size: fontSize, weight: 400, color, align: "left",
        start: lStart, end, ...li,
      }));
    }
  });

  // Blinking cursor after last cmd line
  const lastCmdIdx = [...lines].reverse().findIndex(l => (typeof l === "string") || (l.type ?? "cmd") === "cmd");
  if (lastCmdIdx !== -1) {
    const ci = lines.length - 1 - lastCmdIdx;
    const cursorStart = start + ci * stagger + 200;
    const ly = y + headerH + padY + ci * lineH;
    const lastText = typeof lines[ci] === "string" ? lines[ci] : lines[ci].text;
    const cursorX  = x + padX + Math.round(charW * 2 + 6) + Math.round(lastText.length * charW) + 4;
    els.push(svgTypingCursor(`${id}_cursor`, {
      x: cursorX, y: ly + 4, w: Math.round(fontSize * 0.6), h: lineH - 8,
      start: cursorStart, end, opacity: 0.8, color: promptColor,
    }));
  }

  return els;
}

// ── makeCallout ──────────────────────────────────────────────────────────────

const _CALLOUT = {
  info:    { accent: "#60a5fa", icon: "💡", bg: "rgba(96,165,250,0.07)",  label: "INFO"    },
  warning: { accent: "#fbbf24", icon: "⚠️", bg: "rgba(251,191,36,0.07)",  label: "WARNING" },
  success: { accent: "#4ade80", icon: "✅", bg: "rgba(74,222,128,0.07)",  label: "SUCCESS" },
  error:   { accent: "#f87171", icon: "🚫", bg: "rgba(248,113,113,0.07)", label: "ERROR"   },
  tip:     { accent: "#c084fc", icon: "🎯", bg: "rgba(192,132,252,0.07)", label: "TIP"     },
};

/**
 * makeCallout — Professional callout box: icon badge + left bar + type pill.
 *
 * @example
 *   ...makeCallout("c1", {
 *     type: "tip", title: "Pro Tip",
 *     body: "Use async/await for cleaner async code.",
 *     x: 260, y: 500, w: 1400, start, end,
 *   })
 */
// SVG animation per callout type — rendered behind icon badge
const _CALLOUT_SVG = {
  info:    (id, bx, by, sz, c, s, e) => svgBreathingRing(`${id}_svg`, { x: bx, y: by, w: sz, h: sz, start: s, end: e, opacity: 0.35, color: c, dur: "3s" }),
  warning: (id, bx, by, sz, c, s, e) => svgHeartbeat(`${id}_svg`,    { x: bx, y: by, w: sz, h: sz, start: s, end: e, opacity: 0.45, color: c, dur: "1.4s" }),
  success: (id, bx, by, sz, c, s, e) => svgBurstRays(`${id}_svg`,    { x: bx, y: by, w: sz, h: sz, start: s, end: e, opacity: 0.5,  color: c, rays: 8, dur: "0.7s" }),
  error:   (id, bx, by, sz, c, s, e) => svgPulseRipple(`${id}_svg`,  { x: bx, y: by, w: sz, h: sz, start: s, end: e, opacity: 0.5,  color: c, dur: "1.2s" }),
  tip:     (id, bx, by, sz, c, s, e) => svgOrbitDot(`${id}_svg`,     { x: bx, y: by, w: sz, h: sz, start: s, end: e, opacity: 0.4,  color: c, trackColor: c, dur: "3s" }),
};

export function makeCallout(id, {
  t,
  title = "", body = "", icon,
  type = "info",
  x = 260, y = 400, w = 1400,
  start, end,
  fontSize = 24,
  bodyColor = t?.SECONDARY ?? "#d1d5db",
  innerStagger = 100,
  svgDecor = true,       // auto SVG animation behind icon badge, by type
  animIn = ["expandIn", 600],
  animOut = ["fadeOut", 300],
} = {}) {
  const cfg        = _CALLOUT[type] ?? _CALLOUT.info;
  const ico        = icon ?? cfg.icon;
  const inline     = { animIn, animOut };
  const is         = innerStagger;
  const barW       = 5;
  const padX       = 28;
  const padY       = 22;
  const badgeSize  = Math.round(fontSize * 2.0);
  const pillH      = Math.round(fontSize * 0.9);
  const pillW      = cfg.label.length * Math.round(fontSize * 0.52) + 20;
  const titleH     = title ? Math.round(fontSize * 1.55) : 0;
  const bodyLines  = body ? body.split("\n").length : 0;
  const bodyH      = bodyLines > 0 ? bodyLines * Math.round(fontSize * 1.5) + 4 : 0;
  const totalH     = padY * 2 + titleH + bodyH + (title && body ? 4 : 0);
  const cx         = x + barW + padX + badgeSize + 16;
  const cw         = w - barW - padX * 2 - badgeSize - 16 - pillW - 12;

  // SVG decor: centered on icon badge, slightly larger, rendered behind badge
  const svgSize = Math.round(badgeSize * 1.9);
  const svgX    = x + barW + padX - Math.round((svgSize - badgeSize) / 2);
  const svgY    = y + padY - Math.round((svgSize - badgeSize) / 2);
  const svgFn   = _CALLOUT_SVG[type];

  return [
    // Shadow + single uniform background (rx: 16)
    makeShape(`${id}_bg`, "rect", cfg.bg, { x, y, w, h: totalH, rx: 16, start, end, ...inline }),
    makeShape(`${id}_bar`, "rect", cfg.accent, { x, y, w: barW, h: totalH, rx: 4, start, end, ...inline }),
    makeShape(`${id}_bdr`, "rect", "transparent", { x, y, w, h: totalH, rx: 16, stroke: cfg.accent, strokeWidth: 1, start, end, opacity: 0.3, ...inline }),
    // SVG decor — behind badge, type-specific animation
    ...(svgDecor && svgFn ? [svgFn(id, svgX, svgY, svgSize, cfg.accent, start + is, end)] : []),
    // Icon badge — stagger tier 1
    makeShape(`${id}_ibg`, "rect", cfg.accent, {
      x: x + barW + padX, y: y + padY, w: badgeSize, h: badgeSize, rx: 10,
      start: start + is, end, opacity: 0.18, animIn, animOut, animLoop: ["breathe", 2500],
    }),
    makeText(`${id}_icon`, ico, {
      x: x + barW + padX, y: y + padY, w: badgeSize, h: badgeSize,
      font: "Montserrat", size: Math.round(fontSize * 1.1), weight: 700,
      color: cfg.accent, align: "center", start: start + is, end,
      animIn: ["bounceIn", 600, "easeOutElastic"], animOut,
    }),
    // Type pill — stagger tier 1
    makeShape(`${id}_pill`, "rect", cfg.accent, {
      x: x + w - padX - pillW, y: y + padY + Math.round((badgeSize - pillH) / 2),
      w: pillW, h: pillH, rx: Math.round(pillH / 2),
      start: start + is, end, opacity: 0.18, ...inline,
    }),
    makeText(`${id}_ptxt`, cfg.label, {
      x: x + w - padX - pillW, y: y + padY + Math.round((badgeSize - pillH) / 2),
      w: pillW, h: pillH,
      font: "Montserrat", size: Math.round(fontSize * 0.55), weight: 700,
      color: cfg.accent, align: "center", start: start + is, end, opacity: 0.9, ...inline,
    }),
    // Title — stagger tier 2
    ...(title ? [makeText(`${id}_title`, title, {
      x: cx, y: y + padY + Math.round((badgeSize - titleH) / 2 * (body ? 0 : 1)),
      w: cw, h: titleH,
      font: "Montserrat", size: fontSize, weight: 700,
      color: cfg.accent, align: "left", start: start + is * 2, end, ...inline,
    })] : []),
    // Body — stagger tier 3
    ...(body ? [makeText(`${id}_body`, body, {
      x: cx, y: y + padY + titleH + (title ? 6 : Math.round((badgeSize - bodyH) / 2)),
      w: cw + pillW + 12, h: bodyH,
      font: "Montserrat", size: Math.round(fontSize * 0.85), weight: 300,
      color: bodyColor, align: "left", lineHeight: 1.65,
      start: start + is * 3, end, ...inline,
    })] : []),
  ];
}

// ── makeStatHighlight ────────────────────────────────────────────────────────

/**
 * makeStatHighlight — Large metric display. Two modes:
 *
 * Standalone (default): ghost watermark + value + underline + label + trend pill
 * Card (showCard:true):  bordered card + optional icon/note. Replaces old makeStatCard.
 *
 * Short units (≤2 chars) render inline with value; longer units stack below.
 *
 * @example
 *   // Standalone — big dramatic number
 *   ...makeStatHighlight("s1", { t, value:"99.9", unit:"%", label:"Uptime", trend:"+0.3%", trendUp:true, x:560, y:280, w:800, start, end })
 *
 *   // Card mode — compact bordered stat (replaces makeStatCard)
 *   ...makeStatHighlight("s2", { t, showCard:true, icon:"🚀", value:"10x", label:"Faster", note:"✓ Zero-downtime", x:110, y:330, w:520, start, end })
 */
export function makeStatHighlight(id, {
  t,
  value = "", unit = "", label = "", trend = "",
  trendUp = true,
  // Card mode — adds bordered card + icon + note (replaces old makeStatCard)
  showCard    = false,
  icon        = "",
  note        = "",
  x = 560, y = 280, w = 800,
  start, end,
  valueColor  = t?.PRIMARY   ?? "#ffffff",
  unitColor,
  labelColor  = t?.SECONDARY ?? "#9ca3af",
  accentColor = t?.ACCENT    ?? "#7c3aed",  // used for card border and icon
  valueFontSize,                             // auto: 72 in card mode, 96 standalone
  // SVG decoration: "none" | "ring" (concentric rings behind value) | "counter" (animated count-up)
  svgDecor    = "none",
  animIn   = ["blurIn", 1000],
  animOut  = ["blurOut", 600],
  animLoop = ["breathe", 3000],
  kf,
} = {}) {
  const vfs        = valueFontSize ?? (showCard ? 72 : 96);
  const uColor     = unitColor ?? valueColor;
  const unitSize   = Math.round(vfs * 0.42);
  const labelSize  = Math.round(vfs * 0.24);
  const trendSize  = Math.round(vfs * 0.21);
  const trendColor = trendUp ? "#4ade80" : "#f87171";
  const trendArrow = trendUp ? "↑" : "↓";
  const inline     = { animIn, animOut };
  const inlineKf   = { animIn, animOut, animLoop, ...(kf && { kf }) };
  const inlineUnit = unit.length <= 2;
  const displayVal = inlineUnit ? value + unit : value;

  const valH    = Math.round(vfs * 1.15);
  const unitH   = Math.round(unitSize * 1.4);
  const labelH  = Math.round(labelSize * 1.6);
  const trendH  = Math.round(trendSize * 2.0);
  const ulW     = Math.min(w * 0.5, 200);

  // Card mode geometry
  const padCard  = 32;
  const iconSize = 48;
  const noteSize = 13;
  const iconH    = (showCard && icon) ? iconSize + 16 : 0;
  const noteH    = (showCard && note) ? Math.round(noteSize * 1.8) : 0;
  const cx       = showCard ? x + padCard : x;
  const cw       = showCard ? w - padCard * 2 : w;

  const els = [];

  // ── Card chrome ─────────────────────────────────────────────────────────────
  if (showCard) {
    const contentH   = valH
      + (unit && !inlineUnit ? unitH : 0)
      + (label ? labelH : 0)
      + (trend ? trendH : 0);
    const totalCardH = padCard * 2 + iconH + contentH + (note ? 12 + noteH : 0);

    els.push(
      makeShape(`${id}_card_bg`,  "rect", accentColor,   { x, y, w, h: totalCardH, rx: 16, start, end, opacity: 0.07, ...inline }),
      makeShape(`${id}_card_bdr`, "rect", "transparent", { x, y, w, h: totalCardH, rx: 16, stroke: accentColor, strokeWidth: 1, start, end, opacity: 0.35, ...inline }),
    );
    if (icon) {
      els.push(makeText(`${id}_icon`, icon, {
        x: cx, y: y + padCard, w: iconSize, h: iconSize,
        font: "Montserrat", size: 34, weight: 400, color: "#ffffff", align: "center",
        start, end, animIn: ["bounceIn", 600, "easeOutElastic"], animOut,
      }));
    }
  }

  let cy = y + (showCard ? padCard + iconH : 0);

  // ── Ghost watermark — standalone only ────────────────────────────────────────
  if (!showCard) {
    els.push(makeText(`${id}_ghost`, displayVal, {
      x: cx, y: cy - Math.round(vfs * 0.35), w: cw, h: Math.round(vfs * 1.8),
      font: "Montserrat", size: Math.round(vfs * 1.75), weight: 700,
      color: valueColor, align: "center", opacity: 0.05,
      start, end, animIn, animOut,
    }));
  }

  // ── SVG decor: ring (behind value) ──────────────────────────────────────────
  if (svgDecor === "ring") {
    const ringD  = Math.round(Math.min(cw * 0.75, valH * 2.8));
    const ringX  = cx + Math.round((cw - ringD) / 2);
    const ringY  = cy  + Math.round((valH - ringD) / 2);   // centered on value box
    const outerD = Math.round(ringD * 1.3);
    const outerX = cx + Math.round((cw - outerD) / 2);
    const outerY = cy  + Math.round((valH - outerD) / 2);
    els.push(
      svgBreathingRing(`${id}_br`,  { x: outerX, y: outerY, w: outerD, h: outerD, start, end, opacity: 0.08, color: valueColor, dur: "5s" }),
      svgConcentricRings(`${id}_cr`, { x: ringX,  y: ringY,  w: ringD,  h: ringD,  start, end, opacity: 0.14, color: valueColor }),
    );
  }

  // ── Value (text or animated counter) ────────────────────────────────────────
  if (svgDecor === "counter") {
    // svgNumberCounter: animated count-up from 0 → numeric value
    const numVal = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
    const suffix = inlineUnit ? unit : "";
    els.push(svgNumberCounter(`${id}_cnt`, {
      x: cx, y: cy, w: cw, h: valH,
      start, end, opacity: 1,
      value: numVal, suffix,
      color: valueColor, dur: "2s", steps: 40,
    }));
  } else {
    els.push(makeText(`${id}_val`, displayVal, {
      x: cx, y: cy, w: cw, h: valH,
      font: "Montserrat", size: vfs, weight: 700,
      color: valueColor, align: "center",
      start, end, ...inlineKf,
    }));
  }
  cy += valH;

  // ── Accent underline — standalone only ───────────────────────────────────────
  if (!showCard) {
    els.push(makeShape(`${id}_ul`, "rect", valueColor, {
      x: cx + Math.round((cw - ulW) / 2), y: cy - 6, w: ulW, h: 3, rx: 2,
      start, end, opacity: 0.5, animIn, animOut,
    }));
  }

  // ── Long unit ────────────────────────────────────────────────────────────────
  if (unit && !inlineUnit) {
    els.push(makeText(`${id}_unit`, unit, {
      x: cx, y: cy, w: cw, h: unitH,
      font: "Montserrat", size: unitSize, weight: 400,
      color: uColor, align: "center", start, end, ...inline,
    }));
    cy += unitH;
  }

  // ── Label ────────────────────────────────────────────────────────────────────
  if (label) {
    els.push(makeText(`${id}_label`, label.toUpperCase(), {
      x: cx, y: cy, w: cw, h: labelH,
      font: "Montserrat", size: labelSize, weight: 600,
      color: labelColor, align: "center", charSpacing: 4,
      start, end, ...inline,
    }));
    cy += labelH;
  }

  // ── Trend pill ───────────────────────────────────────────────────────────────
  if (trend) {
    const trendText  = `${trendArrow}  ${trend}`;
    const trendPillW = Math.round(trendText.length * trendSize * 0.58) + 36;
    const trendPillX = cx + Math.round((cw - trendPillW) / 2);
    els.push(
      makeShape(`${id}_tpill`, "rect", trendColor, {
        x: trendPillX, y: cy + 2, w: trendPillW, h: trendH - 4, rx: Math.round((trendH - 4) / 2),
        start, end, opacity: 0.15, animIn, animOut,
      }),
      makeText(`${id}_trend`, trendText, {
        x: trendPillX, y: cy, w: trendPillW, h: trendH,
        font: "Montserrat", size: trendSize, weight: 700,
        color: trendColor, align: "center", start, end, ...inline,
      }),
    );
  }

  // ── Note footnote — card mode only ───────────────────────────────────────────
  if (showCard && note) {
    cy += 12;
    els.push(makeText(`${id}_note`, note, {
      x: cx, y: cy, w: cw, h: noteH,
      font: "Fira Code", size: noteSize, weight: 400,
      color: "#6ee7b7", align: "center", opacity: 0.85,
      start, end, ...inline,
    }));
  }

  return els;
}

// ── makeQuoteCard ────────────────────────────────────────────────────────────

/**
 * makeQuoteCard — Elegant testimonial/quote card with decorative marks and attribution.
 *
 * @example
 *   ...makeQuoteCard("q1", {
 *     quote: "This tool cut our video production time by 80%.",
 *     author: "Sarah Chen",  role: "Head of Marketing, Acme Inc.",
 *     x: 260, y: 260, w: 1400, start, end, accentColor: t.ACCENT,
 *   })
 */
export function makeQuoteCard(id, {
  t,
  quote = "", author = "", role = "",
  x = 260, y = 260, w = 1400,
  start, end,
  accentColor = t?.ACCENT    ?? "#c084fc",
  quoteColor  = t?.PRIMARY   ?? "#ffffff",
  metaColor   = t?.SECONDARY ?? "#9ca3af",
  fontSize = 36,
  animIn = ["blurIn", 900],
  animOut = ["fadeOut", 400],
} = {}) {
  const inline      = { animIn, animOut };
  const padX        = 64;
  const padY        = 48;
  const charsPerRow = Math.floor((w - padX * 2) / (fontSize * 0.56)); // Playfair Display is wider than 0.52
  const lineCount   = Math.max(quote.split("\n").length, Math.ceil(quote.length / charsPerRow)) + 1; // +1 safety line
  const quoteH      = lineCount * Math.round(fontSize * 1.7) + 16; // extra bottom padding
  const qMarkSize   = Math.round(fontSize * 4.2);
  const divGap      = 28;
  const avatarSize  = Math.round(fontSize * 1.5);
  const authorH     = Math.round(fontSize * 1.3);
  const roleH       = role ? Math.round(fontSize * 0.95) : 0;
  const attrH       = avatarSize + 14 + authorH + (role ? 8 + roleH : 0);
  const totalH      = padY * 2 + quoteH + divGap + 2 + divGap + attrH;

  // Divider y
  const divY   = y + padY + quoteH + divGap;
  // Attribution start y
  const attrY  = divY + 2 + divGap;
  // Avatar centered horizontally
  const avX    = x + Math.round((w - avatarSize) / 2);
  const initial = author ? author.charAt(0).toUpperCase() : "?";

  return [
    // Shadow + single clean background (rx: 20)
    makeShape(`${id}_bg`, "rect", "rgba(255,255,255,0.05)", {
      x, y, w, h: totalH, rx: 20, start, end, ...inline,
    }),
    // Border
    makeShape(`${id}_bdr`, "rect", "transparent", {
      x, y, w, h: totalH, rx: 20,
      stroke: accentColor, strokeWidth: 1,
      start, end, opacity: 0.28, ...inline,
    }),
    // Opening quote mark — large, visible, accent
    makeText(`${id}_qo`, "\u201C", {
      x: x + 18, y: y - Math.round(qMarkSize * 0.28),
      w: qMarkSize, h: qMarkSize,
      font: "Playfair Display", size: qMarkSize, weight: 700,
      color: accentColor, align: "left", opacity: 0.28,
      start, end, ...inline,
    }),
    // Closing quote mark
    makeText(`${id}_qc`, "\u201D", {
      x: x + w - qMarkSize - 18,
      y: y + padY + quoteH - Math.round(qMarkSize * 0.72),
      w: qMarkSize, h: qMarkSize,
      font: "Playfair Display", size: qMarkSize, weight: 700,
      color: accentColor, align: "left", opacity: 0.28,
      start, end, ...inline,
    }),
    // Quote body
    makeText(`${id}_quote`, quote, {
      x: x + padX, y: y + padY, w: w - padX * 2, h: quoteH,
      font: "Playfair Display", size: fontSize, weight: 400,
      color: quoteColor, align: "center", lineHeight: 1.7,
      start, end, ...inline,
    }),
    // Ornamental divider: ─── ✦ ───
    makeShape(`${id}_dl`, "rect", accentColor, {
      x: x + Math.round(w * 0.22), y: divY + 1,
      w: Math.round(w * 0.26), h: 1, rx: 1,
      start, end, opacity: 0.45, ...inline,
    }),
    makeText(`${id}_ornament`, "✦", {
      x: x + Math.round(w / 2) - 14, y: divY - 9,
      w: 28, h: 22,
      font: "Montserrat", size: 14, weight: 700,
      color: accentColor, align: "center", opacity: 0.75,
      start, end, ...inline,
    }),
    makeShape(`${id}_dr`, "rect", accentColor, {
      x: x + Math.round(w * 0.52), y: divY + 1,
      w: Math.round(w * 0.26), h: 1, rx: 1,
      start, end, opacity: 0.45, ...inline,
    }),
    // Avatar circle
    makeShape(`${id}_av`, "circle", accentColor, {
      x: avX, y: attrY, w: avatarSize, h: avatarSize,
      start, end, opacity: 0.22, ...inline,
    }),
    makeText(`${id}_init`, initial, {
      x: avX, y: attrY, w: avatarSize, h: avatarSize,
      font: "Montserrat", size: Math.round(fontSize * 0.68), weight: 700,
      color: accentColor, align: "center",
      start, end, ...inline,
    }),
    // Author name
    makeText(`${id}_author`, author, {
      x: x + padX, y: attrY + avatarSize + 14,
      w: w - padX * 2, h: authorH,
      font: "Montserrat", size: Math.round(fontSize * 0.62), weight: 700,
      color: quoteColor, align: "center",
      start, end, ...inline,
    }),
    // Role
    ...(role ? [makeText(`${id}_role`, role, {
      x: x + padX, y: attrY + avatarSize + 14 + authorH + 8,
      w: w - padX * 2, h: roleH,
      font: "Montserrat", size: Math.round(fontSize * 0.46), weight: 300,
      color: metaColor, align: "center", charSpacing: 2,
      start, end, ...inline,
    })] : []),
  ];
}

// ── makePricingCard ───────────────────────────────────────────────────────────

/**
 * makePricingCard — Pricing tier card: plan name, price, features list, CTA button.
 *
 * @param features  string[] | { text, included? }[]
 * @example
 *   ...makePricingCard("p1", {
 *     plan: "Pro", price: "$49", period: "/mo",
 *     features: ["Unlimited videos", "4K export", { text: "Custom domain", included: false }],
 *     cta: "Get Started", popular: true,
 *     x: 560, y: 180, w: 540, start, end, accentColor: t.ACCENT,
 *   })
 */
export function makePricingCard(id, {
  t,
  plan = "Pro", price = "$49", period = "/mo",
  description = "", features = [], cta = "Get Started",
  popular = false,
  savingsText = "",       // e.g. "Save 20% annually" — shown below price
  innerStagger = 80,      // ms between card sections revealing
  x = 560, y = 180, w = 540,
  start, end,
  accentColor = t?.ACCENT ?? "#7c3aed",
  animIn = ["zoomIn", 700],
  animOut = ["fadeOut", 400],
} = {}) {
  const inline    = { animIn, animOut };
  const is        = innerStagger;
  const padX      = 36;
  const padY      = 36;
  const planH     = 32;
  const priceH    = 100;
  const descH     = description ? 44 : 0;
  const featH     = 44;
  const featuresH = features.length * featH;
  const ctaH      = 58;
  // All cards same height — badge floats ABOVE the card boundary
  const totalH    = padY * 2 + planH + priceH + descH + 20 + 1 + 20 + featuresH + 20 + 1 + 24 + ctaH;

  const els = [
    // Shadow + card background
    makeShape(`${id}_bg`,  "rect", "#0d0d1a", { x, y, w, h: totalH, rx: 16, start, end, ...inline }),
    // Border — brighter + thicker for popular, subtle for others
    makeShape(`${id}_bdr`, "rect", "transparent", {
      x, y, w, h: totalH, rx: 16,
      stroke: accentColor, strokeWidth: popular ? 2 : 1,
      start, end, opacity: popular ? 0.9 : 0.28, ...inline,
    }),
  ];

  // Popular badge floats above card (y - 46), doesn't affect card height
  if (popular) {
    const bw = 128;
    const bh = 32;
    const bx = x + Math.round((w - bw) / 2);
    const by = y - bh - 10;
    els.push(
      makeShape(`${id}_pill`,    "rect", accentColor, { x: bx, y: by, w: bw, h: bh, rx: bh/2, start, end, ...inline }),
      makeText(`${id}_pilltxt`, "🌟  MOST POPULAR", {
        x: bx, y: by, w: bw, h: bh,
        font: "Montserrat", size: 16, weight: 700, color: "#ffffff", align: "center",
        start, end, ...inline,
      }),
    );
  }

  let cy = y + padY;

  // Plan name — tier 1
  els.push(makeText(`${id}_plan`, plan.toUpperCase(), {
    x: x + padX, y: cy, w: w - padX * 2, h: planH,
    font: "Montserrat", size: 14, weight: 700,
    color: accentColor, align: "center", charSpacing: 3,
    start: start + is, end, ...inline,
  }));
  cy += planH;

  // Price — tier 2
  const priceStr = price + period;
  els.push(makeText(`${id}_price`, priceStr, {
    x: x + padX, y: cy + 8, w: w - padX * 2, h: priceH - 8,
    font: "Montserrat", size: 64, weight: 700,
    color: "#ffffff", align: "center",
    start: start + is * 2, end, ...inline,
  }));
  cy += priceH;

  // savingsText (optional "Save 20% annually")
  if (savingsText) {
    const svH = 28;
    els.push(makeText(`${id}_save`, savingsText, {
      x: x + padX, y: cy - 10, w: w - padX * 2, h: svH,
      font: "Montserrat", size: 14, weight: 400, color: accentColor,
      align: "center", opacity: 0.75,
      start: start + is * 2, end, ...inline,
    }));
  }

  // Description — tier 3
  if (description) {
    els.push(makeText(`${id}_desc`, description, {
      x: x + padX, y: cy, w: w - padX * 2, h: descH,
      font: "Montserrat", size: 15, weight: 400,
      color: "#9ca3af", align: "center",
      start: start + is * 3, end, ...inline,
    }));
    cy += descH;
  }

  // Divider 1
  cy += 20;
  els.push(makeShape(`${id}_dv1`, "rect", "#2a2a3e", { x: x + padX, y: cy, w: w - padX*2, h: 1, start, end, ...inline }));
  cy += 21;

  // Feature list
  features.forEach((feat, i) => {
    const isStr    = typeof feat === "string";
    const text     = isStr ? feat : feat.text;
    const included = isStr ? true : (feat.included !== false);
    const icoClr   = included ? accentColor : "#4b5563";
    const txtClr   = included ? "#e2e8f0"   : "#6b7280";
    const ico      = included ? "✓" : "✗";
    const icoW     = 32;
    const fy       = cy + i * featH + Math.round((featH - 24) / 2);
    els.push(
      makeText(`${id}_fi${i}`, ico, {
        x: x + padX, y: fy, w: icoW, h: 24,
        font: "Montserrat", size: 15, weight: 700, color: icoClr, align: "center",
        start, end, ...inline,
      }),
      makeText(`${id}_ft${i}`, text, {
        x: x + padX + icoW + 8, y: fy, w: w - padX * 2 - icoW - 8, h: 24,
        font: "Montserrat", size: 16, weight: 400, color: txtClr, align: "left",
        start, end, ...inline,
      }),
    );
  });
  cy += featuresH;

  // Divider 2
  cy += 20;
  els.push(makeShape(`${id}_dv2`, "rect", "#2a2a3e", { x: x + padX, y: cy, w: w - padX*2, h: 1, start, end, ...inline }));
  cy += 25;

  // CTA button
  els.push(
    makeShape(`${id}_ctabg`, "rect", accentColor, {
      x: x + padX, y: cy, w: w - padX * 2, h: ctaH, rx: ctaH / 2,
      start, end, ...inline,
    }),
    makeShape(`${id}_ctahi`, "rect", "#ffffff", {
      x: x + padX + 4, y: cy + 3, w: w - padX * 2 - 8, h: Math.round(ctaH * 0.4), rx: ctaH / 2,
      start, end, opacity: 0.08, ...inline,
    }),
    makeText(`${id}_ctatxt`, cta, {
      x: x + padX, y: cy, w: w - padX * 2, h: ctaH,
      font: "Montserrat", size: 17, weight: 700, color: "#ffffff", align: "center",
      start, end, ...inline,
    }),
  );

  return els;
}

// ── makeProgressBar ───────────────────────────────────────────────────────────

/**
 * makeProgressBar — Labeled progress bar with glow fill and end cap.
 *
 * @example
 *   ...makeProgressBar("pb1", {
 *     label: "Performance", pct: 92,
 *     x: 260, y: 400, w: 1000, start, end, color: t.ACCENT,
 *   })
 */
export function makeProgressBar(id, {
  t,
  label = "", pct = 75,
  x = 260, y = 400, w = 1000, h = 14,
  start, end,
  color      = t?.ACCENT   ?? "#7c3aed",
  trackColor = "rgba(255,255,255,0.08)",
  labelColor = t?.PRIMARY  ?? "#ffffff",
  showPct = true,
  fontSize = 20,
  animateFill = true,     // animate fill bar growing in on entrance
  animFillDur = 800,      // fill grow duration ms
  animIn = ["fadeIn", 400],
  animOut = ["fadeOut", 300],
} = {}) {
  const inline     = { animIn, animOut };
  const fillInline = animateFill ? { animIn: ["expandIn", animFillDur], animOut } : inline;
  const labelH  = Math.round(fontSize * 1.5);
  const fillW   = Math.round(w * Math.min(Math.max(pct, 0), 100) / 100);
  const barY    = (label || showPct) ? y + labelH + 10 : y;
  const els     = [];

  // Label row
  if (label) {
    els.push(makeText(`${id}_label`, label, {
      x, y, w: w - 70, h: labelH,
      font: "Montserrat", size: fontSize, weight: 500, color: labelColor, align: "left",
      start, end, ...inline,
    }));
  }
  if (showPct) {
    els.push(makeText(`${id}_pct`, `${pct}%`, {
      x: x + w - 70, y, w: 70, h: labelH,
      font: "Montserrat", size: fontSize, weight: 700, color, align: "right",
      start, end, ...inline,
    }));
  }

  // Track background
  els.push(makeShape(`${id}_track`, "rect", trackColor, {
    x, y: barY, w, h, rx: Math.round(h / 2), start, end, ...inline,
  }));

  // Soft glow behind fill (uses fillInline for animated entrance)
  if (fillW > 0) {
    els.push(makeShape(`${id}_glow`, "rect", color, {
      x, y: barY - 3, w: fillW, h: h + 6, rx: Math.round((h + 6) / 2),
      start, end, opacity: 0.22, ...fillInline,
    }));
  }

  // Fill bar (expandIn = left-to-right grow)
  if (fillW > 0) {
    els.push(makeShape(`${id}_fill`, "rect", color, {
      x, y: barY, w: fillW, h, rx: Math.round(h / 2),
      start, end, ...fillInline,
    }));
  }

  // End cap (bright dot at fill boundary)
  if (fillW > 0 && fillW < w) {
    els.push(makeShape(`${id}_cap`, "circle", "#ffffff", {
      x: x + fillW - h, y: barY, w: h, h,
      start, end, opacity: 0.85, ...inline,
    }));
  }

  return els;
}

// ── makeCTAButton ─────────────────────────────────────────────────────────────

/**
 * makeCTAButton — Styled call-to-action button with glow and inner highlight.
 *
 * @example
 *   ...makeCTAButton("btn1", {
 *     text: "Get Started Free", icon: "→",
 *     x: 710, y: 600, w: 500, h: 76,
 *     start, end, bgColor: t.ACCENT,
 *     kf: { scale: { dur: 5000, amp: 0.02 } },
 *   })
 */
export function makeCTAButton(id, {
  t,
  text = "Get Started", icon = "→",
  x = 710, y = 600, w = 500, h = 72,
  start, end,
  color   = t?.PRIMARY ?? "#ffffff",
  bgColor = t?.ACCENT  ?? "#7c3aed",
  fontSize = 24,
  animIn = ["zoomIn", 600],
  animOut = ["fadeOut", 300],
  animLoop = ["pulse", 2000],
  kf,
} = {}) {
  const rx     = Math.round(h / 2);
  const label  = icon ? `${icon}  ${text}` : text;
  const inline = { animIn, animOut, animLoop, ...(kf && { kf }) };

  return [
    // Outer glow ring
    makeShape(`${id}_glow`, "rect", bgColor, {
      x: x - 8, y: y - 8, w: w + 16, h: h + 16, rx: rx + 8,
      start, end, opacity: 0.18, animIn, animOut,
    }),
    // Mid glow ring
    makeShape(`${id}_glow2`, "rect", bgColor, {
      x: x - 4, y: y - 4, w: w + 8, h: h + 8, rx: rx + 4,
      start, end, opacity: 0.12, animIn, animOut,
    }),
    // Button background
    makeShape(`${id}_bg`, "rect", bgColor, { x, y, w, h, rx, start, end, ...inline }),
    // Inner top highlight (glass effect)
    makeShape(`${id}_hi`, "rect", "#ffffff", {
      x: x + 6, y: y + 3, w: w - 12, h: Math.round(h * 0.38), rx: rx - 2,
      start, end, opacity: 0.1, ...inline,
    }),
    // Label
    makeText(`${id}_txt`, label, {
      x, y, w, h,
      font: "Montserrat", size: fontSize, weight: 700, color, align: "center",
      start, end, ...inline,
    }),
  ];
}

// ── makeBadge ─────────────────────────────────────────────────────────────────

/**
 * makeBadge — Small pill label: "NEW", "BETA", "PRO", "SALE", etc.
 * Width auto-calculated from text length.
 *
 * @example
 *   ...makeBadge("b1", "NEW", {
 *     x: 860, y: 120, start, end, bgColor: t.ACCENT,
 *   })
 */
export function makeBadge(id, text, {
  t,
  x = 860, y = 120, h = 32,
  start, end,
  color   = t?.PRIMARY ?? "#ffffff",
  bgColor = t?.ACCENT  ?? "#7c3aed",
  borderColor,
  fontSize = 13,
  animIn = ["fadeIn", 400],
  animOut = ["fadeOut", 300],
} = {}) {
  const padX   = 16;
  const w      = Math.round(text.length * fontSize * 0.64) + padX * 2;
  const rx     = Math.round(h / 2);
  const inline = { animIn, animOut };

  return [
    makeShape(`${id}_bg`, "rect", bgColor, { x, y, w, h, rx, start, end, ...inline }),
    ...(borderColor ? [makeShape(`${id}_bdr`, "rect", "transparent", {
      x, y, w, h, rx, stroke: borderColor, strokeWidth: 1,
      start, end, opacity: 0.6, ...inline,
    })] : []),
    makeText(`${id}_txt`, text, {
      x, y, w, h,
      font: "Montserrat", size: fontSize, weight: 700, color, align: "center", charSpacing: 1,
      start, end, ...inline,
    }),
  ];
}

// ── makeLowerThird ────────────────────────────────────────────────────────────

/**
 * makeLowerThird — Broadcast-style name/title overlay for lower screen area.
 * Width auto-calculated from text length; override with w parameter.
 *
 * @example
 *   ...makeLowerThird("lt1", {
 *     name: "Sarah Chen",
 *     title: "Head of Marketing · Acme Inc.",
 *     x: 80, y: 840, start, end, accentColor: t.ACCENT,
 *   })
 */
export function makeLowerThird(id, {
  t,
  name = "", title = "",
  emoji = "",
  x = 80, y = 840,
  w,
  start, end,
  accentColor = t?.ACCENT    ?? "#7c3aed",
  nameColor   = t?.PRIMARY   ?? "#ffffff",
  titleColor  = t?.SECONDARY ?? "#d1d5db",
  bgColor     = "rgba(8,8,18,0.90)",
  fontSize = 28,
  animIn = ["slideIn", 500],
  animOut = ["slideOut", 400],
} = {}) {
  const inline      = { animIn, animOut };
  const padX        = 22;
  const padY        = 14;
  const barW        = 5;
  const nameH       = Math.round(fontSize * 1.35);
  const titleSize   = Math.round(fontSize * 0.64);
  const titleH      = title ? Math.round(titleSize * 1.3) : 0;
  const gap         = title ? 5 : 0;
  const totalH      = padY * 2 + nameH + gap + titleH;
  const displayName = emoji ? `${emoji}  ${name}` : name;

  // Auto-estimate width (emoji counts ~1.8× a normal char)
  const emojiExtraW = emoji ? Math.round(fontSize * 1.8) : 0;
  const nameEstW    = Math.round(name.length  * fontSize * 0.58) + 8 + emojiExtraW;
  const titleEstW   = title ? Math.round(title.length * titleSize * 0.58) + 8 : 0;
  const totalW      = w ?? (barW + padX * 2 + Math.max(nameEstW, titleEstW, 180));
  const textX       = x + barW + padX;
  const textW       = totalW - barW - padX * 2;

  return [
    makeShape(`${id}_bg`,  "rect", bgColor,     { x, y, w: totalW, h: totalH, rx: 8, start, end, ...inline }),
    makeShape(`${id}_bar`, "rect", accentColor, { x, y, w: barW, h: totalH, rx: 2, start, end, ...inline }),
    makeShape(`${id}_hi`,  "rect", "#ffffff",   { x: x+barW, y, w: totalW-barW, h: 1, start, end, opacity: 0.06, ...inline }),
    makeText(`${id}_name`, displayName, {
      x: textX, y: y + padY, w: textW, h: nameH,
      font: "Montserrat", size: fontSize, weight: 700,
      color: nameColor, align: "left",
      start, end, ...inline,
    }),
    ...(title ? [makeText(`${id}_title`, title, {
      x: textX, y: y + padY + nameH + gap, w: textW, h: titleH,
      font: "Montserrat", size: titleSize, weight: 400,
      color: titleColor, align: "left", charSpacing: 1.5,
      start, end, ...inline,
    })] : []),
  ];
}

// ── makeCompareTable ──────────────────────────────────────────────────────────

/**
 * makeCompareTable — Side-by-side feature comparison with staggered row reveal.
 *
 * @param rows  { label, a: boolean|string, b: boolean|string }[]
 * @example
 *   ...makeCompareTable("ct", {
 *     headers: ["Our Product", "Competitor"],
 *     rows: [
 *       { label: "Unlimited videos", a: true,  b: false },
 *       { label: "4K export",        a: true,  b: false },
 *       { label: "Custom domain",    a: true,  b: true  },
 *     ],
 *     x: 260, y: 240, w: 1400, start, end, colorA: t.ACCENT,
 *   })
 */
export function makeCompareTable(id, {
  t,
  headers = ["Us", "Them"],
  rows = [],
  x = 260, y = 240, w = 1400,
  start, end,
  colorA = t?.ACCENT ?? "#7c3aed",
  colorB = "#6b7280",
  fontSize = 22,
  stagger = 150,
  animIn = ["fadeIn", 500],
  animOut = ["fadeOut", 300],
} = {}) {
  const inline   = { animIn, animOut };
  const rowH     = Math.round(fontSize * 2.2);
  const headerH  = Math.round(fontSize * 2.0);
  const col0W    = Math.round(w * 0.52);
  const col1W    = Math.round(w * 0.24);
  const col2W    = w - col0W - col1W;
  const col1X    = x + col0W;
  const col2X    = x + col0W + col1W;
  const totalH   = headerH + rows.length * rowH;
  const els      = [];

  // Header background
  els.push(makeShape(`${id}_hbg`, "rect", "rgba(255,255,255,0.06)", {
    x, y, w, h: headerH, rx: 12, start, end, ...inline,
  }));
  // Header A tint
  els.push(makeShape(`${id}_h1bg`, "rect", colorA, {
    x: col1X + 8, y: y + Math.round((headerH - Math.round(fontSize * 1.6)) / 2),
    w: col1W - 16, h: Math.round(fontSize * 1.6), rx: 6,
    start, end, opacity: 0.14, ...inline,
  }));
  // Header labels
  els.push(
    makeText(`${id}_h0`, "FEATURE", {
      x: x + 24, y, w: col0W - 24, h: headerH,
      font: "Montserrat", size: Math.round(fontSize * 0.68), weight: 600,
      color: "#6b7280", align: "left", charSpacing: 4,
      start, end, ...inline,
    }),
    makeText(`${id}_h1`, headers[0] ?? "Us", {
      x: col1X, y, w: col1W, h: headerH,
      font: "Montserrat", size: Math.round(fontSize * 0.82), weight: 700,
      color: colorA, align: "center",
      start, end, ...inline,
    }),
    makeText(`${id}_h2`, headers[1] ?? "Them", {
      x: col2X, y, w: col2W, h: headerH,
      font: "Montserrat", size: Math.round(fontSize * 0.82), weight: 600,
      color: "#6b7280", align: "center",
      start, end, ...inline,
    }),
  );

  // Data rows
  rows.forEach((row, i) => {
    const ry      = y + headerH + i * rowH;
    const rStart  = start + i * stagger;
    const ri      = { animIn, animOut };

    // Alternating row tint (odd rows 1, 3, 5…)
    if (i % 2 === 1) {
      els.push(makeShape(`${id}_rbg${i}`, "rect", "rgba(255,255,255,0.04)", {
        x, y: ry, w, h: rowH, start: rStart, end, ...ri,
      }));
    }

    // Row divider
    if (i > 0) {
      els.push(makeShape(`${id}_rdv${i}`, "rect", "rgba(255,255,255,0.08)", {
        x, y: ry, w, h: 1, start: rStart, end, ...ri,
      }));
    }

    // Feature label
    els.push(makeText(`${id}_rl${i}`, row.label, {
      x: x + 24, y: ry, w: col0W - 24, h: rowH,
      font: "Montserrat", size: fontSize, weight: 400,
      color: "#e2e8f0", align: "left",
      start: rStart, end, ...ri,
    }));

    // Value A — ✅ / — / custom string (string values get subtle pill bg)
    const aVal = row.a === true ? "✅" : row.a === false ? "—" : String(row.a);
    const aIsStr = typeof row.a === "string";
    const aClr = row.a === false ? "#374151" : colorA;
    if (aIsStr) {
      els.push(makeShape(`${id}_ra${i}_bg`, "rect", colorA, {
        x: col1X + 8, y: ry + Math.round((rowH - Math.round(fontSize * 1.3)) / 2),
        w: col1W - 16, h: Math.round(fontSize * 1.3), rx: 6,
        start: rStart, end, opacity: 0.12, ...ri,
      }));
    }
    els.push(makeText(`${id}_ra${i}`, aVal, {
      x: col1X, y: ry, w: col1W, h: rowH,
      font: "Montserrat", size: Math.round(fontSize * 1.1), weight: 700,
      color: aClr, align: "center",
      start: rStart, end, ...ri,
    }));

    // Value B — ✓ / ❌ / custom string
    const bVal = row.b === true ? "✓" : row.b === false ? "❌" : String(row.b);
    const bClr = row.b === true ? "#9ca3af" : "#374151";
    els.push(makeText(`${id}_rb${i}`, bVal, {
      x: col2X, y: ry, w: col2W, h: rowH,
      font: "Montserrat", size: Math.round(fontSize * 1.1), weight: 600,
      color: bClr, align: "center",
      start: rStart, end, ...ri,
    }));
  });

  // Shadow + outer border (rx: 14)
  els.push(
    makeShape(`${id}_bdr`, "rect", "transparent", {
      x, y, w, h: totalH, rx: 14,
      stroke: "rgba(255,255,255,0.12)", strokeWidth: 1,
      start, end, ...inline,
    }),
  );

  // Column separators — more visible
  els.push(
    makeShape(`${id}_cv1`, "rect", "rgba(255,255,255,0.18)", { x: col1X, y, w: 1, h: totalH, start, end, ...inline }),
    makeShape(`${id}_cv2`, "rect", "rgba(255,255,255,0.18)", { x: col2X, y, w: 1, h: totalH, start, end, ...inline }),
  );

  return els;
}

// ── makeProfileCard ───────────────────────────────────────────────────────────

/**
 * makeProfileCard — Person/speaker card with avatar circle, name, title, optional bio.
 * layout: "vertical" (avatar above text) | "horizontal" (avatar left, text right)
 *
 * @example
 *   ...makeProfileCard("pc1", {
 *     name: "Sarah Chen", title: "Head of Marketing", company: "Acme Inc.",
 *     bio: "Building brands that matter for 10+ years.",
 *     layout: "horizontal",
 *     x: 260, y: 300, w: 700, start, end, accentColor: t.ACCENT,
 *   })
 */
export function makeProfileCard(id, {
  t,
  name = "", title = "", company = "", bio = "",
  avatar,              // emoji/char, defaults to first letter; OR avatarUrl takes priority
  avatarUrl = "",      // image URL for photo avatar
  innerStagger = 80,   // ms between card sections
  layout = "vertical",
  x = 660, y = 240, w = 600,
  start, end,
  accentColor = t?.ACCENT    ?? "#7c3aed",
  nameColor   = t?.PRIMARY   ?? "#ffffff",
  titleColor  = t?.SECONDARY ?? "#d1d5db",
  metaColor   = t?.SECONDARY ?? "#9ca3af",
  animIn = ["blurIn", 800],
  animOut = ["fadeOut", 400],
} = {}) {
  const inline     = { animIn, animOut };
  const is         = innerStagger;
  const isVert     = layout !== "horizontal";
  const padX       = 32;
  const padY       = 36;
  const initial    = avatar ?? (name ? name.charAt(0).toUpperCase() : "?");
  const avSize     = isVert ? Math.round(w * 0.22) : Math.min(96, Math.round(w * 0.17));
  const nameSize   = isVert ? 28 : 26;
  const titleSize  = Math.round(nameSize * 0.68);
  const compSize   = Math.round(nameSize * 0.60);
  const bioSize    = Math.round(nameSize * 0.58);
  const nameH      = Math.round(nameSize  * 1.4);
  const titleH     = title   ? Math.round(titleSize * 1.3) : 0;
  const compH      = company ? Math.round(compSize  * 1.3) : 0;
  const bioH       = bio     ? Math.round(bioSize   * 1.55 * Math.max(1, Math.ceil(bio.length / 55))) : 0;
  const textBlockH = nameH + (title ? 8+titleH : 0) + (company ? 6+compH : 0) + (bio ? 14+bioH : 0);
  const totalH     = isVert
    ? padY * 2 + avSize + 24 + textBlockH
    : padY * 2 + Math.max(avSize, textBlockH);

  const els = [
    makeShape(`${id}_bg`,  "rect", "rgba(255,255,255,0.05)", { x, y, w, h: totalH, rx: 16, start, end, ...inline }),
    makeShape(`${id}_bdr`, "rect", "transparent",            { x, y, w, h: totalH, rx: 16, stroke: accentColor, strokeWidth: 1, start, end, opacity: 0.25, ...inline }),
  ];

  const avX  = isVert ? x + Math.round((w - avSize) / 2) : x + padX;
  const avY  = isVert ? y + padY : y + Math.round((totalH - avSize) / 2);
  const txX  = isVert ? x + padX : x + padX + avSize + 24;
  const txW  = isVert ? w - padX * 2 : w - padX * 2 - avSize - 24;
  const txY  = isVert
    ? avY + avSize + 24
    : y + Math.round((totalH - textBlockH) / 2);
  const aln  = isVert ? "center" : "left";

  // Avatar — photo (avatarUrl) or circle with initial/emoji
  if (avatarUrl) {
    els.push(
      makeImage(`${id}_avimg`, avatarUrl, { x: avX, y: avY, w: avSize, h: avSize, start: start + is, end, ...inline }),
      makeShape(`${id}_av_ring`, "circle", accentColor, { x: avX, y: avY, w: avSize, h: avSize, stroke: accentColor, strokeWidth: 2, start: start + is, end, opacity: 0.5, ...{ animIn, animOut } }),
    );
  } else {
    els.push(
      makeShape(`${id}_av`,   "circle", accentColor, { x: avX, y: avY, w: avSize, h: avSize, start: start + is, end, opacity: 0.22, ...inline }),
      makeText(`${id}_init`, initial, {
        x: avX, y: avY, w: avSize, h: avSize,
        font: "Montserrat", size: Math.round(avSize * 0.42), weight: 700,
        color: accentColor, align: "center", start: start + is, end, ...inline,
      }),
    );
  }

  let cy = txY;

  els.push(makeText(`${id}_name`, name, {
    x: txX, y: cy, w: txW, h: nameH,
    font: "Montserrat", size: nameSize, weight: 700, color: nameColor, align: aln,
    start: start + is * 2, end, ...inline,
  }));
  cy += nameH;

  if (title) {
    cy += 8;
    els.push(makeText(`${id}_title`, title, {
      x: txX, y: cy, w: txW, h: titleH,
      font: "Montserrat", size: titleSize, weight: 400, color: titleColor, align: aln,
      start: start + is * 3, end, ...inline,
    }));
    cy += titleH;
  }

  if (company) {
    cy += 6;
    els.push(makeText(`${id}_co`, company, {
      x: txX, y: cy, w: txW, h: compH,
      font: "Montserrat", size: compSize, weight: 600, color: accentColor, align: aln, charSpacing: 0.5,
      start: start + is * 4, end, ...inline,
    }));
    cy += compH;
  }

  if (bio) {
    cy += 14;
    els.push(makeText(`${id}_bio`, bio, {
      x: txX, y: cy, w: txW, h: bioH,
      font: "Montserrat", size: bioSize, weight: 300, color: metaColor, align: aln, lineHeight: 1.55,
      start: start + is * 5, end, ...inline,
    }));
  }

  return els;
}

// ── makeListCard ──────────────────────────────────────────────────────────────

/**
 * makeListCard — Card with title + ordered/bulleted list; items stagger in.
 *
 * @param items  string[] | { text, note? }[]
 * @example
 *   ...makeListCard("lc1", {
 *     title: "What You'll Learn", icon: "✦",
 *     items: [
 *       "Intro to async/await",
 *       { text: "Performance patterns", note: "Advanced" },
 *       "Real-world examples",
 *     ],
 *     ordered: true,
 *     x: 260, y: 220, w: 1400, start, end, accentColor: t.ACCENT,
 *   })
 */
export function makeListCard(id, {
  t,
  title = "", icon = "",
  items = [],
  ordered = false,
  x = 260, y = 220, w = 1400,
  start, end,
  accentColor = t?.ACCENT    ?? "#7c3aed",
  titleColor  = t?.PRIMARY   ?? "#ffffff",
  itemColor   = t?.PRIMARY   ?? "#e2e8f0",
  metaColor   = t?.SECONDARY ?? "#9ca3af",
  fontSize    = 24,
  stagger     = 200,
  animIn  = ["fadeIn", 500],
  animOut = ["fadeOut", 300],
} = {}) {
  const inline    = { animIn, animOut };
  const padX      = 36;
  const padY      = 28;
  const titleSize = Math.round(fontSize * 1.08);
  const titleH    = Math.round(titleSize * 1.5);
  const markerW   = ordered ? Math.round(fontSize * 2.0) : Math.round(fontSize * 1.4);
  const itemH     = Math.round(fontSize * 1.95);
  const totalH    = padY * 2 + titleH + 14 + 1 + 16 + items.length * itemH;

  const els = [
    // Shadow + card background (rx: 16)
    makeShape(`${id}_bg`,  "rect", "rgba(255,255,255,0.04)", { x, y, w, h: totalH, rx: 16, start, end, ...inline }),
    // Top accent bar
    makeShape(`${id}_top`, "rect", accentColor,              { x, y, w, h: 3, rx: 2, start, end, ...inline }),
    // Border
    makeShape(`${id}_bdr`, "rect", "transparent",            { x, y, w, h: totalH, rx: 16, stroke: accentColor, strokeWidth: 1, start, end, opacity: 0.22, ...inline }),
    // Title
    makeText(`${id}_title`, icon ? `${icon}  ${title}` : title, {
      x: x + padX, y: y + padY, w: w - padX * 2, h: titleH,
      font: "Montserrat", size: titleSize, weight: 700, color: titleColor, align: "left",
      start, end, ...inline,
    }),
    // Divider below title
    makeShape(`${id}_div`, "rect", accentColor, {
      x: x + padX, y: y + padY + titleH + 14, w: w - padX * 2, h: 1,
      start, end, opacity: 0.18, ...inline,
    }),
  ];

  const listY = y + padY + titleH + 14 + 1 + 16;

  items.forEach((item, i) => {
    const isStr  = typeof item === "string";
    const text   = isStr ? item : item.text;
    const note   = isStr ? null : (item.note ?? null);
    const iStart = start + i * stagger;
    const iy     = listY + i * itemH;
    const ri     = { animIn, animOut };

    // Row tint (alternating)
    if (i % 2 === 0) {
      els.push(makeShape(`${id}_rbg${i}`, "rect", "rgba(255,255,255,0.02)", {
        x, y: iy, w, h: itemH, start: iStart, end, ...ri,
      }));
    }

    // Marker (number or bullet)
    const marker     = ordered ? String(i + 1).padStart(2, "0") : "●";
    const markerFont = ordered ? "Fira Code" : "Montserrat";
    const markerSize = ordered ? Math.round(fontSize * 0.76) : Math.round(fontSize * 0.5);
    els.push(makeText(`${id}_mk${i}`, marker, {
      x: x + padX, y: iy, w: markerW, h: itemH,
      font: markerFont, size: markerSize, weight: 700,
      color: accentColor, align: "left",
      start: iStart, end, ...ri,
    }));

    // Note badge width estimate
    const noteW = note ? Math.round(note.length * 11 * 0.64 + 22) : 0;

    // Item text
    els.push(makeText(`${id}_it${i}`, text, {
      x: x + padX + markerW, y: iy, w: w - padX * 2 - markerW - (note ? noteW + 16 : 0), h: itemH,
      font: "Montserrat", size: fontSize, weight: 400, color: itemColor, align: "left",
      start: iStart, end, ...ri,
    }));

    // Note badge
    if (note) {
      const nx = x + w - padX - noteW;
      const ny = iy + Math.round((itemH - 22) / 2);
      els.push(
        makeShape(`${id}_nb${i}`, "rect", accentColor, { x: nx, y: ny, w: noteW, h: 22, rx: 11, start: iStart, end, opacity: 0.2, ...ri }),
        makeText(`${id}_nt${i}`, note, {
          x: nx, y: ny, w: noteW, h: 22,
          font: "Montserrat", size: 11, weight: 700, color: accentColor, align: "center",
          start: iStart, end, ...ri,
        }),
      );
    }
  });

  return els;
}

// ── makeAnnotation ────────────────────────────────────────────────────────────

/**
 * makeAnnotation — Arrow + label pointing to a target position.
 * Draws: label pill → connecting line (rotated rect) → dot at target.
 * Use for tutorial callouts, product screenshot annotations, diagram labels.
 *
 * @example
 *   ...makeAnnotation("a1", "Click here", {
 *     t,
 *     x: 400, y: 300,    // label position
 *     tx: 640, ty: 480,  // target point (where arrow tip lands)
 *     start, end,
 *   })
 */
export function makeAnnotation(id, text, {
  t,
  x, y,           // label top-left
  tx, ty,          // target point
  color    = t?.ACCENT  ?? "#7c3aed",
  textColor = t?.PRIMARY ?? "#ffffff",
  fontSize = 16,
  dotRadius = 6,
  start, end,
  animIn  = ["fadeIn", 500],
  animOut = ["fadeOut", 300],
} = {}) {
  const inline  = { animIn, animOut };
  const padX    = 14;
  const padY    = 8;
  const labelW  = Math.round(text.length * fontSize * 0.58) + padX * 2;
  const labelH  = Math.round(fontSize * 1.8);

  // Center of label box
  const lcx = x + labelW / 2;
  const lcy = y + labelH / 2;

  // Line geometry — from label center to target
  const dx    = tx - lcx;
  const dy    = ty - lcy;
  const dist  = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const lineCx = (lcx + tx) / 2;
  const lineCy = (lcy + ty) / 2;

  return [
    // Connecting line (rotated rect — center at midpoint, angled toward target)
    makeShape(`${id}_line`, "rect", color, {
      x: lineCx - dist / 2, y: lineCy - 1, w: dist, h: 2,
      rotation: angle, start, end, opacity: 0.65, ...inline,
    }),
    // Dot at target
    makeShape(`${id}_dot`, "circle", color, {
      x: tx - dotRadius, y: ty - dotRadius, w: dotRadius * 2, h: dotRadius * 2,
      start, end, opacity: 0.9, ...inline,
    }),
    // Outer dot ring
    makeShape(`${id}_ring`, "circle", "transparent", {
      x: tx - dotRadius * 2, y: ty - dotRadius * 2,
      w: dotRadius * 4, h: dotRadius * 4,
      stroke: color, strokeWidth: 1,
      start, end, opacity: 0.4, animIn, animOut, animLoop: ["pulse", 2000],
    }),
    // Label background pill
    makeShape(`${id}_bg`, "rect", color, {
      x, y, w: labelW, h: labelH, rx: Math.round(labelH / 2),
      start, end, ...inline,
    }),
    // Label text
    makeText(`${id}_txt`, text, {
      x, y, w: labelW, h: labelH,
      font: "Montserrat", size: fontSize, weight: 700,
      color: textColor, align: "center",
      start, end, ...inline,
    }),
  ];
}
