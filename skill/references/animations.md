# Animations

Animations attach to elements and control entrance, exit, and looping effects.

## Restrictions

- `targetId` **MUST** reference an existing element ID
- Each element can have at most one animation per group (`in`, `out`, `loop`)
- `duration` is in **milliseconds**
- Do **NOT** use CSS animation names — only the types listed below

## Structure

```json
{
  "id": "anim_001",
  "targetId": "el_text01",
  "type": "fadeIn",
  "duration": 500,
  "group": "in",
  "easing": "easeOut",
  "properties": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique animation ID |
| `targetId` | string | yes | Element ID to animate |
| `type` | string | yes | Animation type (see below) |
| `duration` | number | yes | Duration in ms. Typical: 300–1000 |
| `group` | string | yes | `"in"` (entrance), `"out"` (exit), `"loop"` (continuous) |
| `easing` | string | no | Easing function (see below) |
| `properties` | object | yes | Can be empty `{}` for most types |

## Entrance Types (group: "in")

`fadeIn`, `slideIn`, `zoomIn`, `bounceIn`, `waveIn`, `dropIn`, `scatterIn`, `rotateInByCharacter`, `flipInByCharacter`, `elasticInByCharacter`, `shakeInByCharacter`

## Exit Types (group: "out")

`fadeOut`, `slideOut`, `zoomOut`, `waveOut`, `dropOut`, `scatterOut`, `rotateOutByCharacter`, `flipOutByCharacter`, `elasticOutByCharacter`, `shakeOutByCharacter`

## Loop Types (group: "loop")

`breathe`, `rotate`, `bounce`, `shake`, `flash`, `zoom`, `pulse`, `swing`, `wobble`

## Easing Values

Basic: `linear`, `easeIn`, `easeOut`, `easeInOut`

Bounce: `easeInBounce`, `easeOutBounce`, `easeInOutBounce`

Elastic: `easeInElastic`, `easeOutElastic`, `easeInOutElastic`

Custom: `"cubicBezier:0.4,0,0.2,1"`, `"spring:180,12,1"`

## Common Patterns

Fade in + fade out on a text element:

```json
[
  { "id": "a_in", "targetId": "el_1", "type": "fadeIn", "duration": 600, "group": "in", "easing": "easeOut", "properties": {} },
  { "id": "a_out", "targetId": "el_1", "type": "fadeOut", "duration": 400, "group": "out", "easing": "easeIn", "properties": {} }
]
```

Continuous breathing on a shape:

```json
{ "id": "a_loop", "targetId": "el_circle", "type": "breathe", "duration": 2000, "group": "loop", "easing": "easeInOut", "properties": {} }
```
