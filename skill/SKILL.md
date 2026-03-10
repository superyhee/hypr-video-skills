---
name: hypr-video-cli
description: >
  Create programmatic videos from JSON via CLI. Generate canvasState JSON and render to MP4 locally.
  Use when: (1) user asks to make, create, or generate a video, promo, clip, or animation from a description,
  (2) composing video/image/text/shape elements into a rendered video,
  (3) building or editing canvasState JSON for video rendering,
  (4) rendering video via CLI (npx hypr-video-cli),
  (5) generating video with animations, transitions, captions, keyframes, or visual effects.
  Triggers on: "make me a video", "create a promo clip", "render an MP4", "product launch video",
  "social media video", "tutorial intro", "animated text", "video from this description".
  Do NOT use for frontend UI changes, MobX store, or code editing.
---

# hypr-video-cli

## Workflow

1. Read relevant references below, then build canvasState JSON
2. Save JSON to `/tmp/video-<name>.json`
3. Validate: `npx tsx scripts/validate-canvas-state.ts /tmp/video-<name>.json`
4. Render: `npx hypr-video-cli /tmp/video-<name>.json -o ./output/<name>.mp4`
5. On failure: check error output, fix JSON, re-validate, re-render

CLI options: `--fps 24|30|60`, `--quality low|medium|high|very_high`, `--format mp4|mov|mp3`, `--width N`, `--height N`, `-q` (quiet mode). CLI options override JSON values.

Prerequisites: Node.js >= 20, FFmpeg.

## Critical Rules

Violating these produces blank or broken output:

1. **Tracks: `"isVisible": true` required** — defaults to `false` if omitted, entire track invisible
2. **`opacity` is top-level on element, NOT inside `placement`** — `placement.opacity` silently ignored
3. **Text uses `fontColor`, NOT `fill`** — `fill` is shapes only; missing `fontColor` defaults to `#000000`
4. **`maxTime` >= largest `timeFrame.end`** — elements cut off otherwise
5. **Every track needs `"name"`** — omitting causes rendering errors
6. **Time units:** `timeFrame`/animations/transitions = ms; captions = SRT `"HH:MM:SS.mmm"`; `wordTimings` = seconds (float); keyframe `time` = ms relative to element start
7. **Transitions require adjacent elements on same track** — cross-track transitions fail
8. **Track layer order: first track = topmost layer** — `tracks[0]` renders on top, last track is the bottom layer. Put text tracks first, effect tracks last. Effect elements are post-processing overlays and should always be on bottom tracks to avoid occluding content
9. **Use `backgroundColor` instead of background shape elements** — a full-screen shape element on the top track will occlude all content below it and produce a blank video. Set canvas background color via the top-level `backgroundColor` field instead
10. **Group elements by role into tracks; non-overlapping elements of the same role share one track** — e.g. put all titles on one track, all subtitles on another, all descriptions on a third. Elements within a track must not overlap in time (e.g. titles appear one after another). Only elements that need to be visible simultaneously (e.g. a title and its subtitle) require separate tracks. Same principle applies to other element types (shape, video, image)
11. **Use safe fonts** — system fonts only (Arial, Georgia, Times New Roman, Courier New, Verdana). For custom fonts, register via `fontAssets` in canvasState

See [common-mistakes.md](references/common-mistakes.md) for detailed explanations with code examples.

## Animations vs Transitions

These are two different systems — do NOT confuse them:

### Animations — per-element entrance/exit/loop effects

Use `animations` to control how a **single element** appears, disappears, or continuously moves. Each animation targets one element by `targetId`.

- **Entrance** (`group: "in"`): `fadeIn`, `slideIn`, `zoomIn`, `bounceIn`, `dropIn`, `waveIn`, etc.
- **Exit** (`group: "out"`): `fadeOut`, `slideOut`, `zoomOut`, `dropOut`, `waveOut`, etc.
- **Loop** (`group: "loop"`): `breathe`, `rotate`, `bounce`, `shake`, `pulse`, `swing`, etc.

```json
{
  "id": "a_1",
  "targetId": "el_title",
  "type": "fadeIn",
  "duration": 800,
  "group": "in",
  "easing": "easeOut",
  "properties": {}
}
```

### Transitions — scene-to-scene blending

Use `transitions` to blend between **two adjacent elements on the same track** for smooth scene changes. Both elements must be neighbors in the track's `elementIds` array.

- **Basic**: `crossfade`, `dissolve`, `fadeToBlack`, `fadeToWhite`
- **Wipe**: `wipeLeft`, `wipeRight`, `wipeUp`, `wipeDown`, `radialWipe`
- **Slide**: `slideLeft`, `slideRight`, `slideUp`, `slideDown`
- **Creative**: `irisOpen`, `irisClose`, `curtainOpen`, `curtainClose`, `pixelate`, `blur`, `zoomIn`, `zoomOut`, `glitch`

```json
{
  "id": "tr_1",
  "trackId": "track_v",
  "sourceElementId": "el_scene1",
  "targetElementId": "el_scene2",
  "type": "crossfade",
  "duration": 500,
  "easing": "easeInOut"
}
```

### When to use which

| Scenario                             | Use                                  | Example            |
| ------------------------------------ | ------------------------------------ | ------------------ |
| Text fades in at start of scene      | Animation (`fadeIn`, group `"in"`)   | Title appearing    |
| Text fades out at end of scene       | Animation (`fadeOut`, group `"out"`) | Title disappearing |
| Element pulses continuously          | Animation (`pulse`, group `"loop"`)  | Breathing button   |
| Scene A smoothly blends into Scene B | Transition (`crossfade`)             | Video clip change  |
| Scene slides to next scene           | Transition (`slideLeft`)             | Slide deck effect  |

## References

Read the linked file when building that part of canvasState:

| Part                                              | Reference                                     | When to read                           |
| ------------------------------------------------- | --------------------------------------------- | -------------------------------------- |
| Top-level fields, canvas sizes, outputFormat      | [canvas-state.md](references/canvas-state.md) | Always                                 |
| Elements + Tracks (types, structure, layer order) | [elements.md](references/elements.md)         | Always                                 |
| Animations (fadeIn, slideIn, breathe, etc.)       | [animations.md](references/animations.md)     | When adding entrance/exit/loop effects |
| Transitions (crossfade, wipe, dissolve)           | [transitions.md](references/transitions.md)   | When blending between adjacent clips   |
| Captions & globalCaptionStyle template            | [captions.md](references/captions.md)         | When adding subtitles or karaoke       |
| Keyframe tracks                                   | [keyframes.md](references/keyframes.md)       | When animating properties over time    |

## Minimal Example

```json
{
  "canvasState": {
    "width": 1920,
    "height": 1080,
    "backgroundColor": "#1a1a2e",
    "maxTime": 5000,
    "elements": [
      {
        "id": "el_title",
        "type": "text",
        "name": "Title",
        "timeFrame": { "start": 0, "end": 5000 },
        "placement": {
          "x": 260,
          "y": 400,
          "width": 1400,
          "height": 200,
          "rotation": 0,
          "scaleX": 1,
          "scaleY": 1
        },
        "properties": {
          "text": "Hello World",
          "fontFamily": "Arial",
          "fontSize": 96,
          "fontWeight": 700,
          "fontColor": "#ffffff",
          "textAlign": "center"
        }
      }
    ],
    "tracks": [
      {
        "id": "t_text",
        "name": "Text",
        "type": "text",
        "elementIds": ["el_title"],
        "isVisible": true
      }
    ],
    "animations": [
      {
        "id": "a_1",
        "targetId": "el_title",
        "type": "fadeIn",
        "duration": 800,
        "group": "in",
        "easing": "easeOut",
        "properties": {}
      }
    ],
    "captions": [],
    "globalCaptionStyle": {
      "fontSize": 36,
      "fontFamily": "Arial",
      "fontColor": "#ffffff",
      "fontWeight": 700,
      "textAlign": "center",
      "lineHeight": 1.2,
      "charSpacing": 0,
      "styles": [],
      "strokeWidth": 0,
      "strokeColor": "#000000",
      "shadowColor": "",
      "shadowBlur": 0,
      "shadowOffsetX": 0,
      "shadowOffsetY": 0,
      "backgroundColor": ""
    }
  },
  "outputFormat": { "fps": 30, "quality": "medium", "format": "mp4" }
}
```

## Example Templates

9 templates in `examples/` for structural reference:

- `hello-world.json` — Minimal text + fade-in (start here)
- `product-launch.json` — Features + pricing + CTA (25s)
- `apple-style-promo.json` — Minimalist brand promo (15s)
- `tutorial-intro.json` — Step-by-step slides (20s)
- `instagram-story-9x16.json` — Vertical 9:16 (15s)
- `instagram-square-1x1.json` — Square 1:1 (12s)
- `event-announcement.json` — Conference + speakers (20s)
- `sale-countdown.json` — E-commerce countdown (15s)
- `cinematic-effects.json` — Vignette + grain + glow effects
