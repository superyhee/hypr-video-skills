# Elements

Every visual or audio item in the video is an element. Elements are placed on the canvas with position, size, and time range.

## Restrictions

- Every element **MUST** have a unique `id`
- `opacity` is a **top-level** field on the element, **NOT** inside `placement`
- `timeFrame.start` and `timeFrame.end` are in **milliseconds**
- `placement` coordinates are in the **canvas coordinate space** (not normalized)

## Base Structure

```json
{
  "id": "el_abc123",
  "type": "text",
  "name": "Title",
  "opacity": 1,
  "timeFrame": { "start": 0, "end": 5000 },
  "placement": {
    "x": 100, "y": 200,
    "width": 800, "height": 100,
    "rotation": 0,
    "scaleX": 1, "scaleY": 1
  },
  "properties": { ... }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique ID. Use prefix: `el_` + random chars |
| `type` | string | yes | `video` / `audio` / `image` / `text` / `shape` / `gif` / `svg` / `effect` |
| `name` | string | yes | Display name |
| `opacity` | number | no | 0.0–1.0, default 1. **TOP-LEVEL, not in placement** |
| `timeFrame.start` | number | yes | Start time in ms |
| `timeFrame.end` | number | yes | End time in ms |
| `placement` | object | yes | Position and transform (see below) |
| `properties` | object | yes | Type-specific properties (see below) |

### placement

```json
{
  "x": 0, "y": 0,
  "width": 1920, "height": 1080,
  "rotation": 0,
  "scaleX": 1, "scaleY": 1
}
```

Do **NOT** put `opacity` here. It will be silently ignored.

## Element Types

### text

```json
{
  "type": "text",
  "properties": {
    "text": "Hello World",
    "fontFamily": "Arial",
    "fontSize": 48,
    "fontWeight": 700,
    "fontColor": "#ffffff",
    "textAlign": "center"
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `text` | string | — | Text content |
| `fontFamily` | string | — | Font name. Use system fonts (Arial, Georgia) or registered Google Fonts |
| `fontSize` | number | — | Font size in pixels |
| `fontWeight` | number/string | 400 | 100–900 or `"bold"` |
| `fontColor` | string | `"#000000"` | Text color (CSS color). **Use `fontColor`, NOT `fill`** — `fill` is for shapes only |
| `textAlign` | string | `"left"` | `"left"` / `"center"` / `"right"` |
| `styles` | string[] | `[]` | `["bold"]`, `["italic"]`, `["underline"]`, `["linethrough"]` |

### video

```json
{
  "type": "video",
  "properties": {
    "src": "https://cdn.example.com/video.mp4",
    "volume": 1,
    "playbackRate": 1
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `src` | string | — | Video URL (see src formats below) |
| `volume` | number | 1 | 0.0–1.0 |
| `playbackRate` | number | 1 | Playback speed multiplier |
| `trimStart` | number | 0 | Trim start in ms |
| `trimEnd` | number | 0 | Trim end in ms |

### image

```json
{
  "type": "image",
  "properties": { "src": "https://cdn.example.com/photo.jpg" }
}
```

### shape

```json
{
  "type": "shape",
  "properties": {
    "shapeType": "rect",
    "fill": "#ff0000",
    "stroke": "#000000",
    "strokeWidth": 2,
    "rx": 10,
    "ry": 10
  }
}
```

`shapeType`: `"rect"` / `"circle"` / `"triangle"`

`rx`/`ry`: Corner radius (rect only).

### audio

```json
{
  "type": "audio",
  "properties": {
    "src": "https://cdn.example.com/music.mp3",
    "volume": 0.5,
    "playbackRate": 1
  }
}
```

Audio elements have no visual placement but need `timeFrame` for timing.

### effect

```json
{
  "type": "effect",
  "properties": {
    "effectLayers": [
      { "effectType": "gaussianBlur", "effectParams": { "radius": 10 }, "enabled": true }
    ]
  }
}
```

## src Formats

| Format | Example | Description |
|--------|---------|-------------|
| Remote URL | `https://cdn.example.com/file.mp4` | Server downloads directly |
| Local media | `local://media_abc123` | Server resolves via MediaRepository → S3 |
| Brand logo | `brandlogo://logo_id\|Logo Name` | Server resolves from brand kit |

## ID Convention

Use short prefix + random suffix:

- Elements: `el_a1b2c3`
- Tracks: `track_x1y2`
- Animations: `anim_m1n2`
- Keyframe tracks: `kf_p1q2`
- Transitions: `trans_r1s2`
- Captions: `cap_t1u2`
