# Keyframe Tracks

Keyframe tracks animate element properties over time with interpolation between key points.

## Restrictions

- `time` is in **milliseconds**, relative to the element's `timeFrame.start` (NOT absolute timeline time)
- Keyframes **MUST** be sorted by `time` in ascending order
- `targetId` **MUST** reference an existing element ID
- Set `"enabled": true` — disabled tracks are ignored

## Structure

```json
{
  "id": "kf_track_001",
  "targetId": "el_text01",
  "propertyType": "opacity",
  "enabled": true,
  "keyframes": [
    { "id": "kf_1", "time": 0, "properties": { "opacity": 0 }, "easing": "easeOut" },
    { "id": "kf_2", "time": 1000, "properties": { "opacity": 1 }, "easing": "linear" }
  ]
}
```

## Property Types

| propertyType | properties keys | Description |
|-------------|----------------|-------------|
| `position` | `x`, `y` | Move element across canvas |
| `scale` | `scaleX`, `scaleY` | Resize element |
| `rotation` | `rotation` | Rotate (degrees) |
| `opacity` | `opacity` | Fade (0.0–1.0) |
| `speed` | `speed` | Variable speed (video/audio) |
| `effectParam` | effect-specific keys | Animate effect parameters (requires `layerIndex`) |

## Easing Values

Basic: `linear`, `easeIn`, `easeOut`, `easeInOut`

Quad: `inQuad`, `outQuad`, `inOutQuad`

Cubic: `inCubic`, `outCubic`, `inOutCubic`

Elastic: `inElastic`, `outElastic`

Bounce: `inBounce`, `outBounce`

Spring: `spring`, `springGentle`, `springBouncy`, `springStiff`

Custom: `"cubicBezier:0.4,0,0.2,1"`, `"spring:180,12,1"`

## Example: Position animation (move element from left to right)

```json
{
  "id": "kf_move",
  "targetId": "el_box",
  "propertyType": "position",
  "enabled": true,
  "keyframes": [
    { "id": "kf_1", "time": 0, "properties": { "x": 0, "y": 400 }, "easing": "easeOut" },
    { "id": "kf_2", "time": 2000, "properties": { "x": 1600, "y": 400 }, "easing": "linear" }
  ]
}
```

## Example: Scale bounce effect

```json
{
  "id": "kf_bounce",
  "targetId": "el_logo",
  "propertyType": "scale",
  "enabled": true,
  "keyframes": [
    { "id": "kf_1", "time": 0, "properties": { "scaleX": 0.5, "scaleY": 0.5 }, "easing": "outBounce" },
    { "id": "kf_2", "time": 800, "properties": { "scaleX": 1, "scaleY": 1 }, "easing": "linear" }
  ]
}
```
