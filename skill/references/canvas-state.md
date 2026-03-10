# canvasState Top-Level Fields

The root canvasState object defines the canvas dimensions, background, and contains all sub-structures.

## Required Fields

```json
{
  "width": 1920,
  "height": 1080,
  "backgroundColor": "#000000",
  "maxTime": 10000,
  "elements": [],
  "tracks": [],
  "animations": [],
  "captions": [],
  "globalCaptionStyle": { ... },
  "keyframeTracks": [],
  "transitions": []
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `width` | number | yes | Canvas width in pixels. Common: 1920, 1280, 1080 |
| `height` | number | yes | Canvas height in pixels. Common: 1080, 720, 1920 |
| `backgroundColor` | string | yes | CSS color (`"#000000"`) or gradient (`"linear-gradient(135deg, #667eea, #764ba2)"`) |
| `maxTime` | number | yes | Timeline max time in milliseconds. **MUST** >= latest element `timeFrame.end` |
| `elements` | array | yes | All elements. See [elements.md](elements.md) |
| `tracks` | array | yes | Track groupings. See [tracks.md](tracks.md) |
| `animations` | array | yes | Can be empty `[]`. See [animations.md](animations.md) |
| `captions` | array | yes | Can be empty `[]`. See [captions.md](captions.md) |
| `globalCaptionStyle` | object | yes | Always provide full object. See [captions.md](captions.md) |
| `keyframeTracks` | array | no | Defaults to `[]`. See [keyframes.md](keyframes.md) |
| `transitions` | array | no | Defaults to `[]`. See [transitions.md](transitions.md) |

## Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `backgroundType` | string | — | Set to `"blur"` for blurred video background |
| `blurIntensity` | number | 8 | Blur radius in pixels. Only used when `backgroundType === "blur"` |
| `fontAssets` | object | — | Custom font mapping: `{ "FontName": { "url": "https://...", "fileType": "ttf" } }` |
| `projectName` | string | — | Project display name |

## outputFormat (sibling of canvasState)

```json
{
  "canvasState": { ... },
  "outputFormat": { "fps": 30, "quality": "medium", "format": "mp4" },
  "resolution": { "width": 1280, "height": 720 }
}
```

| Field | Required | Values |
|-------|----------|--------|
| `fps` | yes | `24` / `30` / `60` |
| `quality` | yes | `"low"` (1Mbps) / `"medium"` (2.5Mbps) / `"high"` (5Mbps) / `"very_high"` (10Mbps) |
| `format` | no | `"mp4"` (default, H.264) / `"mov"` / `"mp3"` (audio only) |

## resolution (optional, sibling of canvasState)

Overrides output dimensions. Omit to use canvasState width/height.

```json
"resolution": { "width": 1280, "height": 720 }
```

Keep the aspect ratio consistent with canvasState dimensions.

## Common Canvas Sizes

| Name | width | height | Use case |
|------|-------|--------|----------|
| 1080p Landscape | 1920 | 1080 | YouTube, general video |
| 720p Landscape | 1280 | 720 | Smaller file size |
| 9:16 Portrait | 1080 | 1920 | TikTok, Reels, Shorts |
| 1:1 Square | 1080 | 1080 | Instagram feed |
| 4:3 Standard | 1440 | 1080 | Presentations |
