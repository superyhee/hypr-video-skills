---
name: gen-canvas
description: Config code generation spec for gen_canvas.mjs — how to write a valid build(h) config. Covers theme, role helpers, inline animations, autoTracks, buildCanvas, and SVG helpers. For SVG params see svg-helpers.md.
---

# Config Generation Spec

> **Contents:** 1. Config File Structure · 2. Theme & Role Helpers (24 themes, 11 roles) · 3. Inline Animations & Keyframes · 4. Element Creation (text, shape, media, effects, **14 composite components + emoji guide**) · 5. Assembly (autoTracks, buildCanvas, transitions) · 6. SVG Helpers (65 total)

## 1. Config File Structure

Every config exports a single `build(h)` function. Destructure all helpers from `h`.

```js
export default function build(h) {
  const {
    makeShape, buildCanvas, theme, autoTracks,
    svgVignette, svgGradientOrb, // ...SVG helpers as needed
  } = h;

  const t = theme("sunset");   // colors + type scale + role helpers + fonts
  const MAX = 30000;

  const elements = [
    svgVignette("vig", { start: 0, end: MAX, opacity: 0.6 }),
    t.hero("s1_title", "Product Name", {
      x: 160, y: 340, start: 0, end: 7000,
      animIn: ["blurIn", 1400], animOut: ["blurOut", 800],
      kf: { scale: { dur: 7000, amp: 0.02 } },
    }),
    t.subtitle("s1_sub", "Supporting tagline", {
      x: 260, y: 540, start: 500, end: 7000,
      animIn: ["fadeIn", 800], animOut: ["fadeOut", 500],
    }),
  ];

  return buildCanvas({
    bg: t.BG, maxTime: MAX, fontAssets: t.fonts,
    elements, tracks: autoTracks(elements),
  });
}
```

## 2. Theme & Role Helpers

### theme(name, overrides?)

Returns `t.BG / t.PRIMARY / t.SECONDARY / t.ACCENT / t.SUCCESS`, type scale constants, `t.fonts`, and **11 role helper functions**.

```js
const t = theme("cyberpunk");
const t = theme("ocean", { ACCENT: "#0d9488" });  // override any color
```

**24 themes:**

| Theme | Accent | Best for | | Theme | Accent | Best for |
| ----- | ------ | -------- | - | ----- | ------ | -------- |
| `cyberpunk` | purple | Tech, SaaS | | `neon` | magenta | Nightclub, music |
| `cinematic` | blue | Apple-style | | `sunset` | orange | Travel, lifestyle |
| `gradient` | lavender | Creative | | `tech` | green | Hacker, terminal |
| `retro` | orange | Gaming | | `slate` | gray | Industrial, B2B |
| `midnight` | indigo | Startups | | `noir` | white | Film noir |
| `ember` | red | Sales, food | | `electric` | blue | Sports, esports |
| `ocean` | sky blue | Corporate | | `vintage` | sepia | Nostalgia |
| `forest` | green | Health, eco | | `professional` | blue | Business (light) |
| `gold` | amber | Luxury | | `minimal` | black | Clean (light) |
| `aurora` | cyan | Science | | `warm` | orange | Food, craft (light) |
| `coral` | rose | Fashion | | `pastel` | purple | Education (light) |
| `monochrome` | white | Editorial | | `candy` | fuchsia | Youth, social |

### Role Helpers — always use instead of raw makeText

`t.role(id, text, { x, y, start, end, ...overrides })` — font/size/weight/color/align/w/h pre-filled. Only `id, text, x, y, start, end` required.

| Role | Size | Weight | Font | Color | w | h | Center x at 960 |
| ---- | ---- | ------ | ---- | ----- | - | - | --------------- |
| `t.eyebrow` | 14 | 700 | Montserrat | ACCENT | 800 | 28 | x=560 |
| `t.hero` | 120 | 700 | Montserrat | PRIMARY | 1600 | 160 | x=160 |
| `t.display` | 96 | 700 | Montserrat | ACCENT | 1400 | 130 | x=260 |
| `t.heading` | 64 | 700 | Montserrat | PRIMARY | 1600 | 90 | x=160 |
| `t.subheading` | 48 | 600 | Montserrat | PRIMARY | 1400 | 70 | x=260 |
| `t.subtitle` | 36 | 400 | Montserrat | SECONDARY | 1400 | 60 | x=260 |
| `t.cta` | 28 | 700 | Montserrat | PRIMARY | 800 | 48 | x=560 |
| `t.quote` | 28 | 400 | Playfair Display | SECONDARY | 1200 | 48 | x=360 |
| `t.body` | 24 | 400 | Montserrat | SECONDARY | 1000 | 44 | x=460 |
| `t.code` | 20 | 400 | Fira Code | SECONDARY | 1000 | 36 | x=460 |
| `t.label` | 18 | 400 | Montserrat | SECONDARY | 1100 | 40 | x=410 |
| `t.tag` | 16 | 700 | Montserrat | ACCENT | 600 | 32 | x=660 |

## 3. Inline Animations & Keyframes

Attach directly to any element — **do not** use separate `makeAnim`/`makeKfTrack` calls.

```js
t.heading("id", "Title", {
  x: 160, y: 300, start: 0, end: 8000,
  animIn:   ["blurIn",  1000],   // [type, durationMs, easing?]  — default easeOut
  animOut:  ["blurOut",  600],   //                                default easeIn
  animLoop: ["glow",    3000],   //                                default easeInOut
  kf: { scale: { dur: 8000, amp: 0.02 } },  // subtle breathe
})
```

**`animIn` types (22):** `fadeIn` · `slideIn` · `zoomIn` · `bounceIn` · `blurIn` · `expandIn` · `foldIn` · `curtainIn` · `irisIn` · `pixelateIn` · `elasticIn` · `spiralIn` · `morphIn` · `waveIn` · `dropIn` · `scatterIn` · `rotateInByCharacter` · `flipInByCharacter` · `elasticInByCharacter` · `shakeInByCharacter` · `rotateIn` · `flipIn`

**`animOut` types (22):** `fadeOut` · `slideOut` · `zoomOut` · `bounceOut` · `blurOut` · `collapseOut` · `foldOut` · `curtainOut` · `irisOut` · `pixelateOut` · `spiralOut` · `dissolveOut` · `morphOut` · `waveOut` · `dropOut` · `scatterOut` · `rotateOutByCharacter` · `flipOutByCharacter` · `elasticOutByCharacter` · `shakeOutByCharacter` · `rotateOut` · `flipOut`

**`animLoop` types (17):** `breathe` · `rotate` · `bounce` · `shake` · `flash` · `zoom` · `pulse` · `swing` · `wobble` · `heartbeat` · `rubberBand` · `jello` · `tada` · `glow` · `glitch` · `float` · `headShake`

**`kf` presets:** `scale` (amp=±scaleXY) · `opacity` (amp=±opacity) · `position` (dx, dy). Custom: `{ scale: [[0, {scaleX:1}], [3000, {scaleX:1.05}]] }`

⚠️ **Per-character animations** (`waveIn`, `dropIn`, `scatterIn`, `*ByCharacter`) misalign centered text when `\n` is present. Safe on single-line text only.

⚠️ **Position keyframe initial `{x, y}` must exactly match element placement.** Mismatch → element jumps on frame 1. Prefer `scale`/`opacity` kf presets.

**Easing:** `easeIn/Out/InOut` · `easeIn/OutBounce` · `easeIn/OutElastic` · `linear` · `"spring:180,12,1"`

## 4. Element Creation

### Text & Shape

```js
// Raw text (only when role helpers don't fit)
makeText("id", "Hello", { x, y, w, h, start, end,
  font, size, weight, color, align,
  strokeColor, strokeWidth, shadowColor, shadowBlur,
  charSpacing, useGradient, gradientColors })
// ⚠️ Every element id must be globally unique — duplicates cause only one to render

// Accent divider line
makeShape("div", "rect", t.ACCENT, { x: 760, y: 500, w: 400, h: 3, start, end,
  animIn: ["expandIn", 500], animOut: ["fadeOut", 300] })
// shapeType: "rect" | "circle" | "triangle" — plus rx, stroke, strokeWidth
```

### Media & Effects

```js
makeImage("id", "https://…", { x, y, w, h, start, end, flipX, flipY, blendMode })
makeSvg("id", svgBase64, { … })          // auto-prefixes data:image/svg+xml;base64,
makeGif("id", "https://…", { x, y, w, h, start, end, flipX, flipY, blendMode })
makeVideo("id", "https://…", { …, volume, playbackRate, trimStart, trimEnd })
makeAudio("id", "https://…", { start, end, volume, playbackRate })
makeEffect("id", [{ effectType: "rgbSplit", effectParams: { amount: 8 }, enabled: true }], { start, end })
```

**Effect types:** `rgbSplit` · `glitchBlock` · `shake` · `flash` · `spotlight` · `colorShift` · `posterize` · `invert` · `duotone` · `thermal` · `sharpen` · `emboss` · `mirror` · `pixelate` · `echo` · `ascii`

### Composite Components

全部返回数组，用 `...spread` 展开。公共参数 `x, y, start, end, animIn, animOut` 均支持（下方省略）。**不同组件必须使用不同 `id` 前缀。**

| 组件 | 用途 | 核心独有参数 |
| ---- | ---- | ------------ |
| `makeCodeBlock` | 代码块（语法高亮+行号） | `lang` `highlight` `showLineNumbers` `hlColors` |
| `makeFeatureList` | 功能列表（图标泡泡+逐项入场） | `items[]` `icon` `iconColor` `stagger` |
| `makeTerminal` | 终端窗口 | `lines[{type,text}]` `cwd` `stagger` |
| `makeCallout` | 提示框 5 种 | `type` `title` `body` `icon` |
| `makeStatHighlight` | 大指标 / 指标卡片 | `value` `unit` `label` `trend` `showCard` `icon` `note` `valueFontSize` `kf` |
| `makeQuoteCard` | 引言/testimonial | `quote` `author` `role` `fontSize` |
| `makePricingCard` | 定价卡片 | `plan` `price` `features[]` `cta` `popular` |
| `makeProgressBar` | 进度条 | `label` `pct` `color` `showPct` |
| `makeCTAButton` | CTA 按钮 | `text` `icon` `bgColor` `kf` |
| `makeBadge` | 小 pill 标签 | `text` `bgColor` `borderColor` |
| `makeLowerThird` | 下三分之一条 | `name` `title` `emoji` |
| `makeCompareTable` | 功能对比表 | `headers[]` `rows[{label,a,b}]` `colorA` `stagger` |
| `makeProfileCard` | 人物卡片 | `name` `title` `company` `bio` `avatar` `layout` |
| `makeListCard` | 标题+列表 | `title` `icon` `items[]` `ordered` `stagger` |

```js
makeCodeBlock("cb", code, { w: 1000, lang: "js",
  highlight: true, showLineNumbers: true,          // 语法高亮+行号，默认均开启
  color, hlColors: { keyword, string, comment, number, function, punct },
  bgColor, accentColor })
// ⚠️ 缩进用空格，不用 Tab；highlight:false 退回单色

makeFeatureList("fl", [
  { icon: "🚀", text: "Feature", subtext: "Optional detail" },  // icon/iconColor 可按项覆盖
  "Plain string item also works",
], { w: 1100, icon: "✅", iconColor: t.ACCENT, stagger: 300 })

// types: cmd(白) · output(灰,缩进) · success(✅绿) · error(❌红) · comment(蓝灰,缩进)
makeTerminal("term", [
  { type: "cmd",     text: "npm install hypr-video-cli" },
  { type: "output",  text: "added 42 packages" },
  { type: "success", text: "Done in 1.2s" },
], { w: 1400, cwd: "~/project", stagger: 400 })
// 最后一条 cmd 行末自动添加闪烁光标

// types 默认 icon: info(💡) · warning(⚠️) · success(✅) · error(🚫) · tip(🎯)
makeCallout("c1", { type: "tip", title: "Pro Tip",
  body: "Use quality: \"medium\" for previews.",
  icon: "🔮",   // 可选覆盖
  w: 1400, fontSize: 24 })

// 独立模式：水印 + 大数字 + 下划线 + trend pill（默认）
makeStatHighlight("s1", { t, value: "99.9", unit: "%",  // unit ≤2字符内联；更长放值下方
  label: "Uptime SLA", trend: "+2.1% MoM", trendUp: true,
  w: 800, valueColor: t.ACCENT, valueFontSize: 96,
  kf: { scale: { dur: 6000, amp: 0.02 } } })

// 卡片模式：带边框卡片 + icon + note（原 makeStatCard，已合并）
makeStatHighlight("s2", { t, showCard: true,
  icon: "🚀", value: "10x", label: "Faster Shipping",
  note: "✓ Zero-downtime deploys",                   // 绿色脚注
  w: 520, accentColor: t.ACCENT })
// showCard 时 valueFontSize 默认 72（更紧凑），standalone 默认 96

makeQuoteCard("q", { quote: "This tool cut our production time by 80%.",
  author: "Sarah Chen", role: "CMO · Acme Inc.",
  w: 1520, accentColor: t.ACCENT, fontSize: 36 })

makePricingCard("p", { plan: "⭐ Pro", price: "$49", period: "/mo",
  features: ["🚀 Unlimited videos", { text: "Custom domain", included: false }],
  cta: "Get Started", popular: true,
  w: 500, accentColor: t.ACCENT })
// ⚠️ 多卡并排：popular 卡片必须最后加入 elements → [...p1, ...p3, ...p2Popular]

makeProgressBar("pb", { label: "Performance", pct: 92,
  w: 1200, h: 14, color: t.ACCENT })

makeCTAButton("btn", { text: "Get Started", icon: "→",  // icon + text 自动合并居中
  w: 800, h: 84, bgColor: t.ACCENT, fontSize: 26,
  kf: { scale: { dur: 8000, amp: 0.018 } } })

makeBadge("b1", "NEW",  { h: 32, bgColor: t.ACCENT })                             // 填充
makeBadge("b2", "BETA", { h: 30, bgColor: "transparent", borderColor: "#4b5563",
  color: "#9ca3af" })                                                               // ghost

makeLowerThird("lt", { name: "Sarah Chen", title: "CMO · Acme", emoji: "🎙️",
  y: 840, accentColor: t.ACCENT })   // y ≈ 800–900; width 自动估算; 多人错开 start/end

makeCompareTable("ct", {
  headers: ["Our Product", "Competitor"],
  rows: [                             // A: true→✅/false→—  B: true→✓/false→❌
    { label: "⚡ Render speed", a: "< 5s", b: "2h"   },  // string 原样
    { label: "🔧 Code-driven",  a: true,   b: false  },   // boolean 自动转符号
  ],
  w: 1400, colorA: t.ACCENT, stagger: 150 })

// layout: "vertical" (窄 ~400px, 头像居上) | "horizontal" (宽 ~600px+, 头像居左)
makeProfileCard("pc", { name: "Sarah Chen", title: "CMO", company: "Acme",
  bio: "10+ years in marketing.", avatar: "👩‍💼",  // emoji/char, 默认取首字母
  layout: "horizontal", w: 700, accentColor: t.ACCENT })

makeListCard("lc", { title: "Agenda", icon: "📋",
  items: [
    "Plain item",
    { text: "New feature", note: "🆕" },  // note → 右侧 pill
  ],
  ordered: true,   // true=序号 01/02, false=圆点
  w: 1400, stagger: 200 })
```

**Emoji 速查 —** macOS 可靠：`✅ ❌ ⚠️ 🚫 💡 🎯 🚀 ⚡ 🔧 🔒 📋 📊 🎬 🎙️ ⭐ 🌟 👩‍💻 👨‍💼`

| 组件 | emoji 接入点 | 示例 |
| ---- | ------------ | ---- |
| `makeCallout` | `icon`（默认已为 emoji） | `icon: "🔮"` |
| `makeStatHighlight` | `icon`（卡片模式，bounceIn 入场） | `showCard:true, icon:"🚀"` |
| `makeFeatureList` | `items[].icon` | `{ icon: "🚀", text: "..." }` |
| `makeLowerThird` | `emoji` 参数 | `emoji: "🎙️"` |
| `makePricingCard` | `plan` / `features[]` / `cta` 文字 | `plan: "⭐ Pro"` |
| `makeListCard` | `icon` / `items[].note` | `icon: "📋"`, `note: "🆕"` |
| `makeProfileCard` | `avatar` | `avatar: "👩‍💼"` |
| `makeCompareTable` | `rows[].label` 文字 | `label: "⚡ Speed"` |

⚠️ Unicode 符号（`✓ ✦ ● ★ →`）所有字体均可靠；emoji 依赖系统字体，macOS 下正常，不确定环境时用 Unicode。

## 5. Assembly

### autoTracks(elements)

Always use instead of manual `makeTrack`. Groups by type, bin-packs overlapping elements into separate lanes.

```js
tracks: autoTracks(elements)   // order: effect → text → shape → image → gif → video → svg → audio
```

### buildCanvas(opts)

```js
return buildCanvas({
  bg: t.BG,                           // backgroundColor
  maxTime: MAX,                       // ⚠️ MUST be >= last element end — too small = elements cut off
  fontAssets: t.fonts,
  elements,
  tracks: autoTracks(elements),
  width: 1920, height: 1080,          // default, omit for 1080p
  fps: 30,                            // 24 | 30 | 60
  quality: "medium",                  // low | medium | high | very_high
  format: "mp4",                      // mp4 | mov | mp3
  // optional:
  projectName: "My Video",
  backgroundType: "blur",             // enables blur background; use with blurIntensity
  blurIntensity: 20,
  resolution: { width: 1280, height: 720 },  // override output resolution
  captions: [],                       // optional — makeCaption(id, "HH:MM:SS.mmm", "HH:MM:SS.mmm", text)
  captionAnimation: { preset: "word-stagger", inType: "slideIn", inDuration: 400, outType: "fadeOut", outDuration: 300 },
  globalCaptionStyle: { fontSize: 36, fontFamily: "Arial", fontColor: "#ffffff",
    fontWeight: 700, textAlign: "center", lineHeight: 1.2,
    charSpacing: 0, styles: [], strokeWidth: 0, strokeColor: "#000000",
    shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
    backgroundColor: "", originX: "center", originY: "bottom" },  // must be complete object
})
```

⚠️ **Time units — don't mix up:**

| Field | Unit | Example |
| ----- | ---- | ------- |
| `start` / `end` / animation duration | milliseconds | `5000` = 5s |
| `caption startTime/endTime` | SRT format | `"00:00:05.000"` |
| `wordTimings.start/end` | seconds (float) | `5.0` |
| `kf` time | ms relative to element start | `1000` = 1s after element starts |

### makeTransition (optional)

```js
makeTransition("tr1", trackId, sourceId, targetId, "crossfade", 500)
// ⚠️ sourceId + targetId MUST be adjacent on the same track — non-adjacent = transition won't render
```

**Types:** `crossfade` · `dissolve` · `blur` · `fadeToBlack/White` · `wipeLeft/Right/Up/Down` · `radialWipe` · `slideLeft/Right/Up/Down` · `whipPan` · `irisOpen/Close` · `curtainOpen/Close` · `zoomIn/Out` · `crossZoom` · `spin` · `glitch` · …(31 total)

## 6. SVG Helpers

All accept `{ x, y, w, h, start, end, opacity }`. Full-screen omit x/y/w/h. For params see [svg-helpers.md](references/svg-helpers.md). (65 total)

- **Animated (20):** `svgBreathingRing` · `svgOrbitRing` · `svgPulseRipple` · `svgGradientOrb` · `svgParticles` · `svgScanLine` · `svgLoadingBar` · `svgWaveLine` · `svgStrokeDrawCircle` · `svgStrokeDrawRect` · `svgTwinkleStars` · `svgOrbitDot` · `svgHeartbeat` · `svgDataFlow` · `svgColorMorph` · `svgRotatingGear` · `svgShootingStar` · `svgProgressRing` · `svgNeonRing` · `svgAurora`
- **Decorative (10):** `svgVignette` · `svgLetterbox` · `svgGridPattern` · `svgDotGrid` · `svgGlowOrb` · `svgCornerBrackets` · `svgTechNodes` · `svgLightStreak` · `svgConcentricRings` · `svgDiamond`
- **UI (6):** `svgCheckMark` · `svgArrowPointer` · `svgCountdownRing` · `svgGradientBorder` · `svgConfetti` · `svgStarRating`
- **Narrative (6):** `svgTimeline` · `svgTypingCursor` · `svgRadarChart` · `svgBurstRays` · `svgNumberCounter` · `svgStepIndicator`
- **VFX (6):** `svgLiquidBlob` · `svgTypewriter` · `svgFireworks` · `svgWaveformEQ` · `svgHexGrid` · `svgParticleNetwork`
- **Tech (2):** `svgMatrixRain` · `svgCircuitTrace`
- **Commerce (4):** `svgPriceTag` · `svgLikeHeart` · `svgMorphShape` · `svgBadgeStamp`
- **Data Viz (11):** `svgBarChart` · `svgHBarChart` · `svgLineChart` · `svgAreaChart` · `svgDonutChart` · `svgStatCard` · `svgGauge` · `svgSparkline` · `svgTable` · `svgCompareBar` · `svgFunnel`
