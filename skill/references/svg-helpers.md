---
name: svg-helpers
description: Parameter reference for all 65 built-in SVG helpers. Load when you need specific SVG helper params beyond name and description.
---

# SVG Helpers Reference

All accept common opts: `{ x, y, w, h, start, end, opacity }`. Full-screen helpers omit x/y/w/h. Data helpers take `(id, data, opts)`.

### Animated (20)

| Helper | Unique params | Description |
| ------ | ------------- | ----------- |
| `svgBreathingRing` | `color="#7c3aed"`, `dur="3s"` | Ring that pulses in/out |
| `svgOrbitRing` | `color="#818cf8"`, `dur="8s"` | Dashed ring rotating continuously |
| `svgPulseRipple` | `color="#a78bfa"`, `dur="2s"` | Expanding ripple rings from center |
| `svgGradientOrb` | `color="#8b5cf6"`, `dur="4s"` | Soft radial gradient blob breathing |
| `svgParticles` | `colors=["#fff","#818cf8","#a78bfa"]` | Floating dots with drift |
| `svgScanLine` | `color="#7c3aed"`, `dur="3s"` | Horizontal scan line sweeping |
| `svgLoadingBar` | `color="#7c3aed"`, `dur="3s"` | Progress bar filling and resetting |
| `svgWaveLine` | `color="#818cf8"`, `dur="3s"` | Animated sine wave path |
| `svgStrokeDrawCircle` | `color="#7c3aed"`, `dur="2s"` | Circle stroke draw (once) |
| `svgStrokeDrawRect` | `color="#818cf8"`, `dur="1.5s"` | Rounded rect stroke draw (once) |
| `svgTwinkleStars` | `color="#ffffff"` | 7 stars twinkling staggered |
| `svgOrbitDot` | `color`, `trackColor`, `dur="4s"` | Two dots orbiting circular track |
| `svgHeartbeat` | `color="#7c3aed"`, `dur="1.2s"` | Pulsing circle with expanding ring |
| `svgDataFlow` | `color`, `lineColor`, `dur="2s"` | Dots flowing along horizontal line |
| `svgColorMorph` | `colors=[3]`, `dur="6s"` | Radial gradient cycling colors |
| `svgRotatingGear` | `color="#818cf8"`, `dur="12s"` | Gear outline rotating slowly |
| `svgShootingStar` | `color="#ffffff"`, `dur="3s"` | Star with trailing streak |
| `svgProgressRing` | `color`, `trackColor`, `pct=75`, `dur="1.5s"` | Arc filling to percentage (once) |
| `svgNeonRing` | `color="#00ffff"`, `dur="2s"` | Glowing neon ring pulsing |
| `svgAurora` | `colors=[3]`, `dur="6s"` | Undulating aurora borealis wave |

### Decorative (10)

| Helper | Unique params | Description |
| ------ | ------------- | ----------- |
| `svgVignette` | — | Dark edge vignette |
| `svgLetterbox` | — | Cinematic top/bottom bars |
| `svgGridPattern` | `color="#ffffff"` | Repeating line grid |
| `svgDotGrid` | `color="#ffffff"` | Repeating dot grid |
| `svgGlowOrb` | `color="#ffffff"` | Soft radial glow |
| `svgCornerBrackets` | `color="#6c63ff"`, `dur="0.8s"` | Corner brackets stroke draw-in |
| `svgTechNodes` | `color="#818cf8"` | Connected node/line network |
| `svgLightStreak` | `color="#ffffff"`, `dur="4s"` | Horizontal light band pulsing |
| `svgConcentricRings` | `color="#818cf8"` | Three concentric rings breathing |
| `svgDiamond` | `color="#a78bfa"` | Rotated square slow rotation |

### UI / Interaction (6)

| Helper | Unique params | Description |
| ------ | ------------- | ----------- |
| `svgCheckMark` | `color="#4ade80"`, `dur="0.6s"`, `strokeWidth=5` | Animated checkmark with circle |
| `svgArrowPointer` | `color="#fff"`, `direction="right"`, `dur="1s"` | Bouncing arrow (right/left/up/down) |
| `svgCountdownRing` | `color`, `trackColor`, `seconds=10` | Ring depleting with center number |
| `svgGradientBorder` | `colors=[...]`, `dur="3s"`, `rx=16`, `strokeWidth=2` | Flowing gradient border |
| `svgConfetti` | `colors=[6]`, `dur="3s"` | Falling confetti particles |
| `svgStarRating` | `rating=4.5`, `filledColor="#fbbf24"`, `emptyColor`, `dur` | Sequential star fill |

### Narrative / Flow (6)

| Helper | Data format | Unique params | Description |
| ------ | ----------- | ------------- | ----------- |
| `svgTimeline` | `[{ label, color? }]` | `color`, `lineColor`, `textColor`, `dur` | Timeline with animated nodes |
| `svgTypingCursor` | — | `color="#fff"`, `dur="1s"` | Blinking cursor |
| `svgRadarChart` | `[0–100, ...]` | `color`, `gridColor`, `labels=[]`, `dur` | Spider chart expanding |
| `svgBurstRays` | — | `color="#fff"`, `rays=12`, `dur="0.8s"` | Radial lines expanding |
| `svgNumberCounter` | — | `value=1000`, `prefix`, `suffix`, `color`, `dur` | Animated counting number |
| `svgStepIndicator` | — | `steps=4`, `activeStep=0`, `activeColor`, `dur` | Step dots with progress line |

### Visual Effects (6)

| Helper | Data format | Unique params | Description |
| ------ | ----------- | ------------- | ----------- |
| `svgLiquidBlob` | — | `color`, `dur="6s"` | Organic morphing fluid blob |
| `svgTypewriter` | `(id, text, opts)` | `fontSize=24`, `dur="2s"`, `cursorColor` | Character-by-character text reveal |
| `svgFireworks` | — | `colors=[6]`, `dur="2s"` | 3 burst explosions with trails |
| `svgWaveformEQ` | — | `color`, `bars=16`, `dur="0.6s"` | Audio equalizer bars bouncing |
| `svgHexGrid` | — | `color`, `dur="0.3s"` | Honeycomb grid staggered reveal |
| `svgParticleNetwork` | — | `color`, `nodes=12`, `dur="4s"` | Connected floating particles |

### Tech / Sci-Fi (2)

| Helper | Unique params | Description |
| ------ | ------------- | ----------- |
| `svgMatrixRain` | `color="#00ff41"`, `columns=20`, `dur="3s"` | Falling code characters |
| `svgCircuitTrace` | `color`, `glowColor`, `dur="1.5s"` | Circuit lines lighting up |

### Commerce / Social (4)

| Helper | Data format | Unique params | Description |
| ------ | ----------- | ------------- | ----------- |
| `svgPriceTag` | `{ oldPrice, newPrice, label?, savings? }` | `oldColor`, `newColor`, `accentColor`, `dur` | Price slam + sparkles + savings |
| `svgLikeHeart` | — | `color="#f43f5e"`, `dur="0.6s"` | Heart with pop-scale + ripple |
| `svgMorphShape` | — | `color`, `dur="4s"` | Shape morph loop |
| `svgBadgeStamp` | — | `text="VERIFIED"`, `color`, `textColor`, `dur` | Badge slam with radiating lines |

### Data Visualization (11)

| Helper | Data format | Unique params | Description |
| ------ | ----------- | ------------- | ----------- |
| `svgBarChart` | `[{ label, value, color }]` | `labelColor`, `animDur="1.2s"`, `maxValue` | Vertical bar chart |
| `svgHBarChart` | `[{ label, value, color }]` | `labelColor`, `animDur="1s"`, `maxValue` | Horizontal bar chart |
| `svgLineChart` | `[number]` | `color`, `strokeWidth`, `animDur="1.5s"`, `showDots` | Line chart with clip reveal |
| `svgAreaChart` | `[number]` | `color`, `animDur="1.5s"` | Filled area chart |
| `svgDonutChart` | `[{ value, color, label? }]` | `r=70`, `strokeWidth=28`, `animDur="1s"`, `centerText` | Donut/ring segments |
| `svgStatCard` | `{ value, label, trend, trendUp }` | `bg`, `accent`, `textColor` | KPI card |
| `svgGauge` | `{ pct, label }` | `color`, `trackColor`, `dur="1.5s"` | Semicircle gauge |
| `svgSparkline` | `[number]` | `color`, `animDur="1s"` | Mini inline chart |
| `svgTable` | `{ headers, rows }` | `headerBg`, `headerColor`, `textColor`, `animDur` | Data table |
| `svgCompareBar` | `{ labelA, valueA, labelB, valueB, unit }` | `colorA`, `colorB`, `animDur="1s"` | Side-by-side comparison |
| `svgFunnel` | `[{ label, value }]` | `colors[]`, `textColor`, `animDur="0.5s"` | Funnel/pipeline stages |
