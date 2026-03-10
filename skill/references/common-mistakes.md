# Common Mistakes

Read this before building your first canvasState. These are the most frequent causes of blank or broken video output.

## 1. Missing `isVisible: true` on tracks

**Symptom:** Video renders but is completely black/empty — no elements visible.

**Cause:** `DataConverter` sets `isVisible: !!track.isVisible`, so `undefined` becomes `false`.

Wrong:
```json
{ "id": "t1", "type": "text", "elementIds": ["el_1"] }
```

Right:
```json
{ "id": "t1", "name": "Text", "type": "text", "elementIds": ["el_1"], "isVisible": true }
```

## 2. Putting `opacity` inside `placement`

**Symptom:** Element opacity is always 1.0 regardless of the value set.

**Cause:** `DataConverter` reads `element.opacity`, not `element.placement.opacity`.

Wrong:
```json
{ "id": "el_1", "placement": { "x": 0, "y": 0, "opacity": 0.5, ... } }
```

Right:
```json
{ "id": "el_1", "opacity": 0.5, "placement": { "x": 0, "y": 0, ... } }
```

## 3. Using `fill` instead of `fontColor` for text elements

**Symptom:** Text is invisible (black text on black background).

**Cause:** `DataConverter` reads `props.fontColor` for text color, NOT `props.fill`. `fill` is only for shapes. When `fontColor` is missing, it defaults to `"#000000"`.

Wrong:
```json
{ "type": "text", "properties": { "text": "Hello", "fill": "#ffffff" } }
```

Right:
```json
{ "type": "text", "properties": { "text": "Hello", "fontColor": "#ffffff" } }
```

Note: `fill` is correct for **shape** elements. Only **text** elements use `fontColor`.

## 4. Missing `name` on tracks

**Symptom:** Potential rendering errors or empty track conversion.

**Cause:** `DataConverter` accesses `track.name` for the render model.

Fix: Always include `"name": "My Track"` on every track.

## 5. `maxTime` smaller than element timeFrames

**Symptom:** Elements cut off early or video is shorter than expected.

**Cause:** `maxTime` determines total video duration. If set to 5000 but an element ends at 10000, the element gets truncated.

Fix: Set `maxTime` >= the largest `timeFrame.end` across all elements.

## 6. Wrong time units

**Symptom:** Elements appear for a fraction of a second or don't show up.

| Field | Unit | Example |
|-------|------|---------|
| `timeFrame.start/end` | milliseconds | `5000` = 5 seconds |
| `animation.duration` | milliseconds | `500` = 0.5 seconds |
| `transition.duration` | milliseconds | `800` = 0.8 seconds |
| `caption.startTime/endTime` | SRT format | `"00:00:05.000"` = 5 seconds |
| `caption.wordTimings.start/end` | seconds (float) | `5.0` = 5 seconds |
| `keyframe.time` | milliseconds, **relative to element start** | `1000` = 1s after element appears |
| `maxTime` | milliseconds | `20000` = 20 seconds |

## 7. Non-adjacent transition elements

**Symptom:** Transition doesn't render or causes errors.

**Cause:** `sourceElementId` and `targetElementId` must be adjacent in the same track's `elementIds`.

Wrong (not on same track):
```json
"tracks": [
  { "elementIds": ["el_1"] },
  { "elementIds": ["el_2"] }
],
"transitions": [{ "sourceElementId": "el_1", "targetElementId": "el_2" }]
```

Right (same track, adjacent):
```json
"tracks": [
  { "elementIds": ["el_1", "el_2"] }
],
"transitions": [{ "trackId": "track_1", "sourceElementId": "el_1", "targetElementId": "el_2" }]
```

## 8. Using fonts not available on the server

**Symptom:** Text renders in a fallback font or looks wrong.

**Cause:** Server only has pre-registered Google Fonts and system fonts.

Safe fonts: `Arial`, `Georgia`, `Times New Roman`, `Courier New`, `Verdana`

For custom fonts: Use `fontAssets` in canvasState to provide download URLs.

## 9. Duplicate element IDs

**Symptom:** Only one of the duplicated elements renders; unpredictable behavior.

Fix: Every `id` must be globally unique. Use the `el_` + random suffix convention.
