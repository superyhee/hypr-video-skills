# Tracks

Tracks group elements into visual layers on the timeline. Every element **MUST** belong to exactly one track.

## Restrictions

- **MUST** set `"isVisible": true` — defaults to `false` if omitted, making the **entire track invisible**
- **MUST** include a `"name"` field
- Every ID in `elementIds` **MUST** reference an existing element

## Structure

```json
{ "id": "track_1", "name": "Video", "type": "video", "elementIds": ["el_a", "el_b"], "isVisible": true }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique track ID |
| `name` | string | yes | Display name |
| `type` | string | yes | Track type (see below) |
| `elementIds` | string[] | yes | Ordered element IDs |
| `isVisible` | boolean | **yes** | **MUST be `true`** to render |

## Track Types

`video` / `audio` / `text` / `shape` / `image` / `effect` / `caption`

## Rendering Order

- Elements within a track are **sequential** (ordered by their `timeFrame`)
- Tracks render as **layers** — first track is the bottom layer, last track is on top
- Put background shapes on early tracks, text/overlays on later tracks

## Common Pattern

```json
"tracks": [
  { "id": "track_bg", "name": "Background", "type": "shape", "elementIds": ["el_bg"], "isVisible": true },
  { "id": "track_video", "name": "Video", "type": "video", "elementIds": ["el_v1", "el_v2"], "isVisible": true },
  { "id": "track_text", "name": "Text", "type": "text", "elementIds": ["el_title", "el_sub"], "isVisible": true },
  { "id": "track_audio", "name": "Music", "type": "audio", "elementIds": ["el_bgm"], "isVisible": true }
]
```

## Wrong vs Right

Wrong — track missing `isVisible` and `name` (will NOT render):
```json
{ "id": "t1", "type": "text", "elementIds": ["el_1"] }
```

Right:
```json
{ "id": "t1", "name": "Text", "type": "text", "elementIds": ["el_1"], "isVisible": true }
```
