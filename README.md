# hypr-video-cli

[![npm version](https://img.shields.io/npm/v/hypr-video-cli.svg)](https://www.npmjs.com/package/hypr-video-cli)
[![license](https://img.shields.io/npm/l/hypr-video-cli.svg)](https://github.com/superyhee/hypr-video-cli/blob/main/LICENSE)

A Claude Code Skill for creating programmatic videos with CLI.

Describe your video in natural language, and Claude builds the structured JSON (text, shapes, animations, transitions, captions, keyframes, 50+ visual effects) and renders it to MP4 — all from your terminal. Powered by skia-canvas + FFmpeg.

## Demo

<p align="center">
  <img src="assets/demo-preview.gif" alt="hypr-video-cli demo preview" width="640" />
</p>

<p align="center">
  <a href="assets/project-intro-demo.mp4">▶ Watch full demo video (MP4)</a>
</p>

```
 "Create a product launch video"
            │
            ▼
   ┌─────────────────┐
   │  Claude builds   │
   │  canvasState JSON │
   └────────┬─────────┘
            │
            ▼
   npx hypr-video-cli input.json -o output.mp4
            │
            ▼
       📹 output.mp4
```

## Features

- 🎬 Text, images, video clips, shapes, audio — all composable on a timeline
- ✨ 30+ animations (fade, slide, zoom, bounce, wave, character-by-character effects)
- 🔀 20+ transitions (crossfade, wipe, iris, glitch, blur between clips)
- 🎨 50+ visual effects (film grain, VHS, glow, rain, snow, color grading, and more)
- 🎯 Keyframe animation for position, scale, rotation, opacity over time
- 💬 Timed captions with word-level karaoke support
- 📐 Any aspect ratio — 16:9, 9:16 (TikTok/Reels), 1:1 (Instagram), 4:3
- 🤖 Claude Code Skill included — generate videos from natural language

## Quick Start

```bash
# Render from a JSON file
npx hypr-video-cli input.json -o output.mp4

# Install globally for repeated use
npm install -g hypr-video-cli
hypr-video-cli input.json -o output.mp4
```

Try with the built-in examples (clone the repo first):

```bash
git clone https://github.com/superyhee/hypr-video-cli.git
npx hypr-video-cli hypr-video-cli/examples/hello-world.json -o hello.mp4
```

Prerequisites: Node.js >= 20, FFmpeg installed and in PATH.

## Claude Code Skill

This project ships as a Claude Code skill — install it and Claude generates videos from natural language.

```bash
# Clone the repo, then install the skill
git clone https://github.com/superyhee/hypr-video-cli.git
# In Claude Code:
/install-skill ./hypr-video-cli/skill
```

Then just describe what you want:

> "Create a 15-second product launch video with a dark background, animated title, feature list that slides in, and a pricing CTA at the end"

Claude builds the canvasState JSON, validates it, and renders the MP4 — no manual JSON editing needed. The `skill/references/` directory gives Claude detailed knowledge of every feature so it produces correct JSON on the first try.

## Usage

```bash
# Basic render
npx hypr-video-cli input.json -o output.mp4

# Custom frame rate and quality
npx hypr-video-cli input.json -o out.mp4 --fps 60 --quality high

# Override output resolution
npx hypr-video-cli input.json -o out.mp4 --width 1280 --height 720

# Quiet mode — prints only output path (useful for scripting)
npx hypr-video-cli input.json -q

# Validate JSON before rendering
npx tsx scripts/validate-canvas-state.ts input.json
```

### CLI Options

| Option                | Default                   | Description                                                                    |
| --------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| `-o, --output <path>` | `./output/video-<ts>.mp4` | Output file path                                                               |
| `--fps <n>`           | `30`                      | Frame rate (`24` / `30` / `60`)                                                |
| `--quality <level>`   | `medium`                  | `low` (1 Mbps) / `medium` (2.5 Mbps) / `high` (5 Mbps) / `very_high` (10 Mbps) |
| `--format <fmt>`      | `mp4`                     | `mp4` (H.264) / `mov` / `mp3` (audio only)                                     |
| `--width <n>`         | from JSON                 | Override output width                                                          |
| `--height <n>`        | from JSON                 | Override output height                                                         |
| `-q, --quiet`         | `false`                   | Only print output path                                                         |

CLI options override values in the JSON file.

## Input JSON Format

The CLI accepts two input formats:

### Full payload (with outputFormat)

```json
{
  "canvasState": {
    "width": 1920,
    "height": 1080,
    "backgroundColor": "#000000",
    "maxTime": 5000,
    "elements": [ ... ],
    "tracks": [ ... ],
    "animations": [],
    "captions": [],
    "globalCaptionStyle": { ... },
    "keyframeTracks": [],
    "transitions": []
  },
  "outputFormat": { "fps": 30, "quality": "medium", "format": "mp4" },
  "resolution": { "width": 1280, "height": 720 }
}
```

### Bare canvasState (defaults applied)

```json
{
  "width": 1920,
  "height": 1080,
  "backgroundColor": "#000000",
  "maxTime": 5000,
  "elements": [ ... ],
  "tracks": [ ... ],
  "animations": [],
  "captions": [],
  "globalCaptionStyle": { ... }
}
```

### canvasState Top-Level Fields

| Field                | Type   | Required | Description                                                                             |
| -------------------- | ------ | -------- | --------------------------------------------------------------------------------------- |
| `width`              | number | yes      | Canvas width in px (e.g. `1920`)                                                        |
| `height`             | number | yes      | Canvas height in px (e.g. `1080`)                                                       |
| `backgroundColor`    | string | yes      | CSS color or gradient (e.g. `"#000000"`, `"linear-gradient(135deg, #667eea, #764ba2)"`) |
| `maxTime`            | number | yes      | Total duration in ms. Must be >= latest element `timeFrame.end`                         |
| `elements`           | array  | yes      | All visual/audio elements                                                               |
| `tracks`             | array  | yes      | Track groupings (layer order)                                                           |
| `animations`         | array  | yes      | Entrance/exit/loop animations (can be `[]`)                                             |
| `captions`           | array  | yes      | Timed subtitles (can be `[]`)                                                           |
| `globalCaptionStyle` | object | yes      | Default caption styling (always provide full object)                                    |
| `keyframeTracks`     | array  | no       | Property animation over time                                                            |
| `transitions`        | array  | no       | Blend effects between adjacent clips                                                    |

### Common Canvas Sizes

| Name            | Width | Height | Use Case               |
| --------------- | ----- | ------ | ---------------------- |
| 1080p Landscape | 1920  | 1080   | YouTube, general video |
| 720p Landscape  | 1280  | 720    | Smaller file size      |
| 9:16 Portrait   | 1080  | 1920   | TikTok, Reels, Shorts  |
| 1:1 Square      | 1080  | 1080   | Instagram feed         |
| 4:3 Standard    | 1440  | 1080   | Presentations          |

## Element Types

Every visual or audio item is an element with a unique ID, time range, and placement.

```json
{
  "id": "el_abc123",
  "type": "text",
  "name": "Title",
  "opacity": 1,
  "timeFrame": { "start": 0, "end": 5000 },
  "placement": { "x": 100, "y": 200, "width": 800, "height": 100, "rotation": 0, "scaleX": 1, "scaleY": 1 },
  "properties": { ... }
}
```

| Type     | Key Properties                                                                        | Description                                          |
| -------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `text`   | `text`, `fontFamily`, `fontSize`, `fontWeight`, `fontColor`, `textAlign`              | Text overlay. Use `fontColor` for color (NOT `fill`) |
| `video`  | `src`, `volume`, `playbackRate`, `trimStart`, `trimEnd`                               | Video clip                                           |
| `image`  | `src`                                                                                 | Static image                                         |
| `shape`  | `shapeType` (`rect`/`circle`/`triangle`), `fill`, `stroke`, `strokeWidth`, `rx`, `ry` | Vector shape                                         |
| `audio`  | `src`, `volume`, `playbackRate`                                                       | Audio track (no visual)                              |
| `effect` | `effectLayers` (array of effect configs)                                              | Post-processing visual effects                       |

## Animations

Animations attach to elements and control entrance, exit, and looping effects.

```json
{
  "id": "a_1",
  "targetId": "el_1",
  "type": "fadeIn",
  "duration": 800,
  "group": "in",
  "easing": "easeOut",
  "properties": {}
}
```

| Group               | Available Types                                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `in` (entrance)     | `fadeIn`, `slideIn`, `zoomIn`, `bounceIn`, `waveIn`, `dropIn`, `scatterIn`, `rotateInByCharacter`, `flipInByCharacter`, `elasticInByCharacter`, `shakeInByCharacter` |
| `out` (exit)        | `fadeOut`, `slideOut`, `zoomOut`, `waveOut`, `dropOut`, `scatterOut`, `rotateOutByCharacter`, `flipOutByCharacter`, `elasticOutByCharacter`, `shakeOutByCharacter`   |
| `loop` (continuous) | `breathe`, `rotate`, `bounce`, `shake`, `flash`, `zoom`, `pulse`, `swing`, `wobble`                                                                                  |

Easing: `linear`, `easeIn`, `easeOut`, `easeInOut`, `easeInBounce`, `easeOutBounce`, `easeInElastic`, `easeOutElastic`, or custom `"cubicBezier:0.4,0,0.2,1"` / `"spring:180,12,1"`.

## Transitions

Transitions blend between two adjacent elements on the same track.

```json
{
  "id": "tr_1",
  "trackId": "track_v",
  "sourceElementId": "el_v1",
  "targetElementId": "el_v2",
  "type": "crossfade",
  "duration": 500,
  "easing": "easeInOut"
}
```

| Category | Types                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------- |
| Basic    | `crossfade`, `dissolve`, `fadeToBlack`, `fadeToWhite`                                                     |
| Wipe     | `wipeLeft`, `wipeRight`, `wipeUp`, `wipeDown`, `radialWipe`                                               |
| Slide    | `slideLeft`, `slideRight`, `slideUp`, `slideDown`                                                         |
| Creative | `irisOpen`, `irisClose`, `curtainOpen`, `curtainClose`, `pixelate`, `blur`, `zoomIn`, `zoomOut`, `glitch` |

## Keyframe Tracks

Animate element properties over time with interpolation between key points.

```json
{
  "id": "kf_1",
  "targetId": "el_box",
  "propertyType": "position",
  "enabled": true,
  "keyframes": [
    {
      "id": "k1",
      "time": 0,
      "properties": { "x": 0, "y": 400 },
      "easing": "easeOut"
    },
    {
      "id": "k2",
      "time": 2000,
      "properties": { "x": 1600, "y": 400 },
      "easing": "linear"
    }
  ]
}
```

Supported property types: `position`, `scale`, `rotation`, `opacity`, `speed`, `effectParam`.

> Note: keyframe `time` is relative to the element's `timeFrame.start`, not the absolute timeline.

## Captions

Timed subtitles with optional word-level karaoke support.

```json
{
  "id": "cap_001",
  "startTime": "00:00:01.000",
  "endTime": "00:00:04.500",
  "text": "Welcome to the video",
  "wordTimings": [
    { "word": "Welcome", "start": 1.0, "end": 1.4 },
    { "word": "to", "start": 1.4, "end": 1.5 },
    { "word": "the", "start": 1.5, "end": 1.6 },
    { "word": "video", "start": 1.6, "end": 2.0 }
  ]
}
```

Caption presets: `none`, `fadeWord`, `karaoke`, `typewriter`, `slideUp`, `popIn`, `bounceIn`, `glowIn`, `blurIn`, `skew-in`, `tiktok`.

> Note: `startTime`/`endTime` use SRT format (`"HH:MM:SS.mmm"`), while `wordTimings` use seconds (float).

## Visual Effects

50+ post-processing effects applied to the entire canvas during their active time range.

```json
{
  "id": "el_fx1",
  "type": "effect",
  "name": "Cinematic Look",
  "timeFrame": { "start": 0, "end": 10000 },
  "placement": {
    "x": 0,
    "y": 0,
    "width": 1920,
    "height": 1080,
    "rotation": 0,
    "scaleX": 1,
    "scaleY": 1
  },
  "properties": {
    "effectLayers": [
      {
        "effectType": "colorGrading",
        "effectParams": { "contrast": 0.2, "saturation": -0.1 },
        "enabled": true
      }
    ]
  }
}
```

| Category       | Effect Types                                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Blur (7)       | `gaussianBlur`, `radialBlur`, `motionBlur`, `tiltShift`, `bokeh`, `kawaseBlur`, `cameraMotionBlur`                                       |
| Distortion (9) | `wave`, `ripple`, `fisheye`, `swirl`, `kaleidoscope`, `spherize`, `mirror`, `split`, `zoomPulse`                                         |
| Glitch (3)     | `rgbSplit`, `glitchBlock`, `shake`                                                                                                       |
| Light (8)      | `vignette`, `glow`, `lensFlare`, `lightLeak`, `sparkle`, `flash`, `godray`, `spotlight`                                                  |
| Basic (4)      | `invert`, `duotone`, `colorGrading`, `sharpen`                                                                                           |
| Stylize (14)   | `vhs`, `pixelate`, `posterize`, `halftone`, `emboss`, `thermal`, `echo`, `rain`, `snow`, `ascii`, `crossHatch`, `neonEdge`, `colorShift` |
| Other (2)      | `fire`, `fireworks`                                                                                                                      |

Common presets:

- Retro/VHS: `vhs` + + `colorShift`
- Dream: `gaussianBlur` + `glow` + `lightLeak`
- Glitch: `rgbSplit` + `glitchBlock` + `shake`

## Examples

| Template           | File                        | Canvas    | Duration | Description                                   |
| ------------------ | --------------------------- | --------- | -------- | --------------------------------------------- |
| Hello World        | `hello-world.json`          | 1920×1080 | 5s       | Minimal text with fade-in                     |
| Apple Style        | `apple-style-promo.json`    | 1920×1080 | 15s      | Minimalist brand promo (black + white + blue) |
| Tutorial Intro     | `tutorial-intro.json`       | 1920×1080 | 20s      | Step-by-step numbered slides                  |
| Product Launch     | `product-launch.json`       | 1920×1080 | 25s      | Feature specs + pricing + CTA                 |
| Instagram Story    | `instagram-story-9x16.json` | 1080×1920 | 15s      | Vertical 9:16 sale promo                      |
| Instagram Square   | `instagram-square-1x1.json` | 1080×1080 | 12s      | 1:1 quote + design tip carousel               |
| Event Announcement | `event-announcement.json`   | 1920×1080 | 20s      | Conference with speakers list                 |
| Flash Sale         | `sale-countdown.json`       | 1920×1080 | 15s      | E-commerce 70% off countdown                  |

```bash
# Render any example (from cloned repo)
npx hypr-video-cli examples/product-launch.json -o product.mp4
```

## Validation

The validator catches common mistakes before you spend time rendering:

```bash
npx tsx scripts/validate-canvas-state.ts input.json
```

Checks performed:

- `isVisible: true` on all tracks
- `opacity` not placed inside `placement`
- Text elements use `fontColor` (not `fill`)
- `maxTime` >= latest element end time
- All element IDs are unique
- Track `elementIds` reference existing elements
- Animation `targetId` references existing elements
- Transition elements exist
- `outputFormat` fields present

## Common Gotchas

| #   | Mistake                             | Symptom                               | Fix                                                                                |
| --- | ----------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | Missing `isVisible: true` on tracks | Video renders but is completely black | Always set `"isVisible": true`                                                     |
| 2   | `opacity` inside `placement`        | Opacity always 1.0                    | Put `opacity` at the element top level                                             |
| 3   | Using `fill` for text color         | Text invisible (black on black)       | Use `fontColor` for text, `fill` for shapes only                                   |
| 4   | `maxTime` < element end times       | Elements cut off early                | Set `maxTime` >= largest `timeFrame.end`                                           |
| 5   | Missing `name` on tracks            | Rendering errors                      | Always include `"name"` on every track                                             |
| 6   | Wrong time units                    | Elements flash or don't appear        | `timeFrame`/`animation`/`transition` = ms; captions = SRT; `wordTimings` = seconds |
| 7   | Non-adjacent transition elements    | Transition doesn't render             | Source and target must be adjacent on the same track                               |
| 8   | Unavailable fonts                   | Text renders in fallback font         | Use system fonts (Arial, Georgia, etc.) or register via `fontAssets`               |
| 9   | Duplicate element IDs               | Only one element renders              | Every `id` must be globally unique                                                 |

## Development

```bash
git clone https://github.com/superyhee/hypr-video-cli.git
cd hypr-video-cli
npm install
node dist/render-video.mjs examples/hello-world.json -o output.mp4
```

## Project Structure

```
hypr-video-cli/
├── assets/                 # Demo video and preview GIF
├── bin/                    # Entry script
├── dist/                   # Bundled CLI (render-video.mjs)
├── examples/               # Ready-to-render JSON templates
├── scripts/
│   └── validate-canvas-state.ts   # JSON validator
├── skill/
│   ├── SKILL.md            # Claude Code skill definition
│   └── references/         # Feature docs Claude reads for accurate JSON generation
└── package.json
```

## License

MIT
