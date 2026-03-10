# Captions

Captions display timed subtitle text. Optionally support word-level timing for karaoke effects.

## Restrictions

- `startTime` and `endTime` use SRT format: `"HH:MM:SS.mmm"` (NOT milliseconds)
- `wordTimings[].start` and `.end` are in **seconds** (float), NOT milliseconds
- `globalCaptionStyle` **MUST** always be a complete object with all fields — partial objects may cause rendering errors

## Caption Structure

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

`wordTimings` is optional. Required for karaoke/highlight presets.

## globalCaptionStyle

Always provide the full object:

```json
{
  "fontSize": 36,
  "fontFamily": "Arial",
  "fontColor": "#ffffff",
  "fontWeight": 700,
  "textAlign": "center",
  "lineHeight": 1.2,
  "charSpacing": 0,
  "styles": [],
  "strokeWidth": 2,
  "strokeColor": "#000000",
  "shadowColor": "rgba(0,0,0,0.5)",
  "shadowBlur": 4,
  "shadowOffsetX": 0,
  "shadowOffsetY": 2,
  "backgroundColor": "",
  "positionY": 0.85,
  "originX": "center",
  "originY": "center"
}
```

For no captions, still provide a default style:

```json
"globalCaptionStyle": {
  "fontSize": 36, "fontFamily": "Arial", "fontColor": "#ffffff", "fontWeight": 700,
  "textAlign": "center", "lineHeight": 1.2, "charSpacing": 0, "styles": [],
  "strokeWidth": 0, "strokeColor": "#000000",
  "shadowColor": "", "shadowBlur": 0, "shadowOffsetX": 0, "shadowOffsetY": 0,
  "backgroundColor": ""
}
```

## captionAnimation

```json
{
  "preset": "karaoke",
  "inType": "fadeIn",
  "inDuration": 300,
  "outType": "fadeOut",
  "outDuration": 200,
  "karaokeHighlightColor": "#FFD700",
  "karaokeStyle": "fill",
  "easing": "easeOut"
}
```

**Presets:** `none`, `fadeWord`, `karaoke`, `typewriter`, `slideUp`, `popIn`, `bounceIn`, `glowIn`, `blurIn`, `skew-in`, `tiktok`

**Entrance types:** `none`, `fadeIn`, `slideIn`, `zoomIn`, `popIn`, `bounceIn`, `blurIn`, `rotateIn`, `typewriter`, `karaoke`, `highlight`, `glow`, `skew-in`, `tiktok`

**Exit types:** `none`, `fadeOut`, `slideOut`, `zoomOut`, `popOut`, `bounceOut`, `blurOut`, `rotateOut`

**Directions** (for slide types): `top`, `bottom`, `left`, `right`
