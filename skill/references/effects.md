# Visual Effects

> **Contents:** [Restrictions](#restrictions) | [Structure](#structure) | [Effect Types](#effect-types-by-category) (blur, distortion, glitch, light, basic, stylize, other) | [Stacking](#stacking-multiple-effects) | [Presets](#common-presets) | [Keyframe Animation](#keyframe-animation)

Effect elements apply post-processing visual effects (blur, glow, glitch, particles, etc.) to the video. Effects are independent timeline elements — they overlay on top of all other elements during their active time range.

## Restrictions

- Effect elements use `"type": "effect"` — do NOT confuse with animation `type`
- Effects have their own `timeFrame` on the timeline — they apply to the **entire canvas** during that time
- Each effect element contains one or more `effectLayers` — multiple effects can stack
- Effect parameters have specific `min`/`max` ranges — values outside the range may produce artifacts

## Structure

```json
{
  "id": "el_fx1",
  "type": "effect",
  "name": "Blur Effect",
  "timeFrame": { "start": 2000, "end": 8000 },
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
        "effectType": "gaussianBlur",
        "effectParams": { "radius": 6, "speed": 0.5 },
        "enabled": true
      }
    ]
  }
}
```

Each `effectLayer`:

| Field          | Type    | Required | Description                                             |
| -------------- | ------- | -------- | ------------------------------------------------------- |
| `effectType`   | string  | yes      | Effect type from the registry (see below)               |
| `effectParams` | object  | yes      | Key-value params specific to the effect type            |
| `enabled`      | boolean | no       | Default `true`. Set `false` to disable without removing |

## Effect Types by Category

### blur (7 types)

| effectType         | Key Params                                                       | Description                |
| ------------------ | ---------------------------------------------------------------- | -------------------------- |
| `gaussianBlur`     | `radius` (0-20), `speed` (0-5)                                   | Classic soft blur          |
| `radialBlur`       | `intensity` (0-1), `centerX`/`centerY` (0-1)                     | Blur radiating from center |
| `motionBlur`       | `intensity` (0-1), `samples` (2-16)                              | Directional motion blur    |
| `tiltShift`        | `blurAmount` (0-20), `focusPosition` (0-1), `focusWidth` (0-0.5) | Miniature/focus effect     |
| `bokeh`            | `radius` (1-20), `threshold` (0-1), `intensity` (0-2)            | Bokeh light blur           |
| `kawaseBlur`       | `radius` (1-20), `quality` (1-10)                                | High-performance blur      |
| `cameraMotionBlur` | `samples` (2-32), `shutterAngle` (0-360)                         | Cinematic motion blur      |

### distortion (9 types)

| effectType     | Key Params                                            | Description                                                      |
| -------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| `wave`         | `amplitude` (0-50), `frequency` (0-20), `speed` (0-5) | Wave distortion                                                  |
| `ripple`       | `amplitude` (0-30), `frequency` (0-20), `speed` (0-5) | Water ripple                                                     |
| `fisheye`      | `intensity` (0-1), `radius` (0-1)                     | Fisheye lens                                                     |
| `swirl`        | `angle` (0-360), `radius` (0-1), `speed` (0-5)        | Swirl twist                                                      |
| `kaleidoscope` | `segments` (2-12), `angle` (0-360)                    | Kaleidoscope mirror                                              |
| `spherize`     | `intensity` (-1 to 1), `centerX`/`centerY` (0-1)      | Spherical warp                                                   |
| `mirror`       | `mode` (0-3), `offset` (-0.5 to 0.5)                  | Mirror reflection (0=horizontal, 1=vertical, 2=quad, 3=diagonal) |
| `split`        | `layout` (0-3), `zoom` (0.5-2)                        | Screen split (0=2x2, 1=3x3, 2=horizontal, 3=vertical)            |
| `zoomPulse`    | `amount` (0-0.5), `speed` (0.1-10)                    | Rhythmic zoom pulse                                              |

### glitch (3 types)

| effectType    | Key Params                                           | Description            |
| ------------- | ---------------------------------------------------- | ---------------------- |
| `rgbSplit`    | `amount` (0-30), `angle` (0-360), `speed` (0-5)      | RGB channel split      |
| `glitchBlock` | `intensity` (0-1), `blockSize` (0-50), `speed` (0-5) | Block glitch artifacts |
| `shake`       | `intensity` (0-20), `speed` (0-5)                    | Camera shake           |

### light (8 types)

| effectType  | Key Params                                                | Description          |
| ----------- | --------------------------------------------------------- | -------------------- |
| `vignette`  | `intensity` (0-1), `radius` (0-1), `softness` (0-1)       | Dark vignette border |
| `glow`      | `intensity` (0-1), `radius` (0-20), `threshold` (0-1)     | Soft glow bloom      |
| `lensFlare` | `intensity` (0-1), `posX`/`posY` (0-1), `rays` (4-12)     | Lens flare effect    |
| `lightLeak` | `intensity` (0-1), `colorR`/`colorG`/`colorB` (0-1)       | Film light leak      |
| `sparkle`   | `intensity` (0-1), `density` (0.1-1), `size` (1-10)       | Sparkle particles    |
| `flash`     | `intensity` (0-1), `speed` (0.1-10), `decay` (0.1-1)      | Flash/strobe         |
| `godray`    | `intensity` (0-2), `angle` (-180 to 180), `speed` (0-5)   | Volumetric god rays  |
| `spotlight` | `posX`/`posY` (0-1), `radius` (0.05-2), `intensity` (0-5) | Focused spotlight    |

### basic (4 types)

| effectType     | Key Params                                                                    | Description                |
| -------------- | ----------------------------------------------------------------------------- | -------------------------- |
| `invert`       | `intensity` (0-1)                                                             | Color inversion            |
| `duotone`      | `colorR1`-`colorB1`, `colorR2`-`colorB2` (0-1)                                | Two-tone color mapping     |
| `colorGrading` | `brightness`, `contrast`, `saturation`, `hue`, `temperature`, `tint`, `gamma` | Professional color grading |
| `sharpen`      | `intensity` (0-5), `threshold` (0-1)                                          | Image sharpening           |

### stylize (13 types)

| effectType   | Key Params                                               | Description           |
| ------------ | -------------------------------------------------------- | --------------------- |
| `vhs`        | `distortion` (0-1), `noise` (0-1), `colorBleed` (0-1)    | VHS retro             |
| `pixelate`   | `size` (1-50), `speed` (0-5)                             | Pixel mosaic          |
| `posterize`  | `levels` (2-16), `speed` (0-5)                           | Color posterization   |
| `halftone`   | `size` (1-20), `angle` (0-360)                           | Print halftone dots   |
| `emboss`     | `intensity` (0-5), `angle` (0-360)                       | 3D emboss relief      |
| `thermal`    | `intensity` (0-1), `speed` (0-5)                         | Thermal camera        |
| `echo`       | `decay` (0-1), `count` (2-8)                             | Temporal echo/trail   |
| `rain`       | `intensity` (0-1), `speed` (0-5), `angle` (-45 to 45)    | Rain overlay          |
| `snow`       | `intensity` (0-1), `speed` (0-5), `flakeSize` (1-5)      | Snow particles        |
| `ascii`      | `charSize` (4-32), `speed` (0-5)                         | ASCII art filter      |
| `crossHatch` | `spacing` (3-30), `lineWidth` (0.5-5)                    | Cross-hatching sketch |
| `neonEdge`   | `intensity` (0-1), `edgeWidth` (0.5-3), `bgDarken` (0-1) | Neon edge detection   |
| `colorShift` | `amount` (0-1), `speed` (0-5)                            | Hue shifting          |

### Other

| effectType  | Key Params                                                 | Description        |
| ----------- | ---------------------------------------------------------- | ------------------ |
| `fire`      | `intensity` (0-2), `scale` (1-10), `speed` (0-5)           | Fire overlay       |
| `fireworks` | `intensity` (0-2), `density` (1-8), `trailLength` (0.5-10) | Firework particles |

## Stacking Multiple Effects

An effect element can have multiple layers that apply sequentially:

```json
{
  "id": "el_fx_stack",
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
        "effectType": "glow",
        "effectParams": { "intensity": 0.6, "radius": 12, "threshold": 0.3 },
        "enabled": true
      },
      {
        "effectType": "colorGrading",
        "effectParams": {
          "contrast": 0.2,
          "saturation": -0.1,
          "temperature": 0.1
        },
        "enabled": true
      },
      {
        "effectType": "vignette",
        "effectParams": { "intensity": 0.4, "radius": 0.8, "softness": 0.5 },
        "enabled": true
      }
    ]
  }
}
```

## Common Presets

**Retro/VHS:** vhs (distortion 0.5, noise 0.3) + colorShift

**Dream:** gaussianBlur (radius 3) + glow (intensity 0.4) + lightLeak

**Glitch:** rgbSplit + glitchBlock + shake

**Night:** vignette (intensity 0.6) + colorGrading (brightness -0.2)

## Keyframe Animation

Effect parameters can be animated over time using keyframe tracks with `"propertyType": "effectParam"`:

```json
{
  "id": "kf_fx",
  "targetId": "el_fx1",
  "propertyType": "effectParam",
  "layerIndex": 0,
  "enabled": true,
  "keyframes": [
    {
      "id": "kf_1",
      "time": 0,
      "properties": { "radius": 0 },
      "easing": "easeOut"
    },
    {
      "id": "kf_2",
      "time": 2000,
      "properties": { "radius": 10 },
      "easing": "easeIn"
    },
    {
      "id": "kf_3",
      "time": 4000,
      "properties": { "radius": 0 },
      "easing": "linear"
    }
  ]
}
```

`layerIndex` specifies which effect layer in the `effectLayers` array to animate (0-based).
