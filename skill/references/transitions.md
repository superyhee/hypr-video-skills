# Transitions

Transitions blend between two adjacent elements on the same track using a virtual overlap model — element timeFrames stay unchanged.

## Restrictions

- `sourceElementId` and `targetElementId` **MUST** be adjacent elements on the same track
- `duration` is in **milliseconds** — should not exceed the shorter element's duration
- Do **NOT** modify element `timeFrame` to create overlaps — the renderer handles this automatically

## Structure

```json
{
  "id": "trans_001",
  "trackId": "track_1",
  "sourceElementId": "el_clip1",
  "targetElementId": "el_clip2",
  "type": "crossfade",
  "duration": 500,
  "easing": "easeInOut"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique transition ID |
| `trackId` | string | yes | Track containing both elements |
| `sourceElementId` | string | yes | Outgoing element ID |
| `targetElementId` | string | yes | Incoming element ID |
| `type` | string | yes | Transition type (see below) |
| `duration` | number | yes | Blend duration in ms. Typical: 300–1000 |
| `easing` | string | no | `"easeInOut"` (default) |

## Transition Types

| Category | Types |
|----------|-------|
| Basic | `crossfade`, `dissolve`, `fadeToBlack`, `fadeToWhite` |
| Wipe | `wipeLeft`, `wipeRight`, `wipeUp`, `wipeDown`, `radialWipe` |
| Slide | `slideLeft`, `slideRight`, `slideUp`, `slideDown` |
| Creative | `irisOpen`, `irisClose`, `curtainOpen`, `curtainClose`, `pixelate`, `blur`, `zoomIn`, `zoomOut`, `glitch` |

## Example: Two video clips with crossfade

```json
{
  "elements": [
    { "id": "el_v1", "type": "video", "timeFrame": { "start": 0, "end": 5000 }, ... },
    { "id": "el_v2", "type": "video", "timeFrame": { "start": 5000, "end": 10000 }, ... }
  ],
  "tracks": [
    { "id": "track_v", "name": "Video", "type": "video", "elementIds": ["el_v1", "el_v2"], "isVisible": true }
  ],
  "transitions": [
    { "id": "tr_1", "trackId": "track_v", "sourceElementId": "el_v1", "targetElementId": "el_v2", "type": "crossfade", "duration": 500, "easing": "easeInOut" }
  ]
}
```
