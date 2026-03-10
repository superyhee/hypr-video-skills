#!/usr/bin/env tsx
// Bundled Fabric Video Editor CLI — render videos from canvasState JSON
// Native deps required: skia-canvas, sharp. System: FFmpeg.
import { createRequire } from 'module'; const require = createRequire(import.meta.url);

// ../../server/src/cli/render-video.ts
import * as fs5 from "fs";
import * as path5 from "path";

// ../../server/src/renderer/ServerRenderExporter.ts
import { Canvas, loadImage as loadImage3 } from "skia-canvas";
import * as path4 from "path";
import * as os4 from "os";
import * as fs4 from "fs";
import { spawn as spawnProcess, execSync } from "child_process";
import sharp from "sharp";

// ../../shared/utils/LRUCache.ts
var LRUCache = class {
  constructor(_max) {
    this._max = _max;
    this._map = /* @__PURE__ */ new Map();
  }
  get(key) {
    const v = this._map.get(key);
    if (v !== void 0) {
      this._map.delete(key);
      this._map.set(key, v);
    }
    return v;
  }
  set(key, value) {
    if (this._map.has(key)) this._map.delete(key);
    this._map.set(key, value);
    if (this._map.size > this._max) {
      this._map.delete(this._map.keys().next().value);
    }
  }
  get size() {
    return this._map.size;
  }
};

// ../../shared/caption-animation/captionAnimationConstants.ts
var NEON_COLORS = [
  "#FF1493",
  // 深粉红
  "#00FFFF",
  // 青色
  "#00FF00",
  // 绿色
  "#FF00FF",
  // 洋红
  "#FFFF00",
  // 黄色
  "#FF6600"
];
var ANIMATION_SPEEDS = {
  NEON_FLICKER: 3e-3,
  NEON_COLOR_CYCLE: 1e-3,
  NEON_CHAR_PHASE: 0.3,
  WAVE_FREQUENCY: 4e-3,
  WAVE_CHAR_PHASE: 0.6,
  BREATHE_FREQUENCY: 2e-3,
  FLOAT_FREQUENCY: 15e-4,
  GLITCH_FREQUENCY: 8e-3,
  CHAR_STAGGER_OVERLAP: 0.4,
  WORD_POP_OVERLAP: 0.3,
  CHAR_BLUR_REVEAL_OVERLAP: 0.4,
  COLOR_FLOW_SPEED: 2e-3
};
var ANIMATION_SIZES = {
  SLIDE_DISTANCE_RATIO: 0.1,
  NEON_BASE_STROKE_WIDTH: 2,
  NEON_MIN_STROKE_WIDTH: 1,
  KARAOKE_GLOW_STROKE_WIDTH: 2,
  KARAOKE_GRADIENT_RANGE: 3,
  BLUR_MAX: 8,
  WAVE_AMPLITUDE: 6,
  BREATHE_AMPLITUDE: 0.04,
  FLOAT_AMPLITUDE: 8,
  GLITCH_AMPLITUDE: 6,
  ROTATE_END_ANGLE: 90,
  WORD_POP_OVERSHOOT: 1.3,
  CHAR_BLUR_MAX: 6,
  BLUR_SHIMMER_WARM_R: 255,
  BLUR_SHIMMER_WARM_G: 215,
  BLUR_SHIMMER_WARM_B: 0
};
var ANIMATION_THRESHOLDS = {
  TYPEWRITER_COMPLETE: 0.98,
  BOUNCE_OPACITY_RATIO: 0.3,
  WORD_STAGGER_OVERLAP: 0.3,
  BLUR_SHIMMER_OVERLAP: 0.45
};
var CACHE_CONFIG = {
  CHAR_WIDTH_MAX_SIZE: 500,
  GRAPHEME_CACHE_MAX_SIZE: 500,
  WORD_BOUNDARY_CACHE_MAX_SIZE: 256
};
var KARAOKE_PRESET_STYLE_MAP = {
  "karaoke-glow": "glow",
  "karaoke-underline": "underline",
  "karaoke-gradient": "gradient",
  "karaoke-bold": "bold",
  "karaoke-rainbow": "rainbow"
};
var _segmenter = null;
var _graphemeCache = new LRUCache(CACHE_CONFIG.GRAPHEME_CACHE_MAX_SIZE);
function toGraphemes(text) {
  const cached = _graphemeCache.get(text);
  if (cached) return cached;
  if (!_segmenter) {
    _segmenter = new Intl.Segmenter(void 0, { granularity: "grapheme" });
  }
  const result = Array.from(_segmenter.segment(text), (s) => s.segment);
  _graphemeCache.set(text, result);
  return result;
}
var _wordBoundaryCache = new LRUCache(CACHE_CONFIG.WORD_BOUNDARY_CACHE_MAX_SIZE);
function getWordBoundaries(text) {
  let cached = _wordBoundaryCache.get(text);
  if (cached) return cached;
  const chars = toGraphemes(text);
  const boundaries = [];
  let i = 0;
  while (i < chars.length) {
    while (i < chars.length && /\s/.test(chars[i])) i++;
    const wordStart = i;
    while (i < chars.length && !/\s/.test(chars[i])) i++;
    if (i > wordStart) boundaries.push(i);
  }
  _wordBoundaryCache.set(text, boundaries);
  return boundaries;
}
function getRainbowColor(index, total) {
  const hue = index / Math.max(total, 1) * 360;
  return `hsl(${hue}, 100%, 50%)`;
}
function srtTimeToMs(srtTime) {
  if (!srtTime) return 0;
  const norm = srtTime.replace(",", ".");
  const parts = norm.split(":");
  let h = 0, m = 0, sec = 0;
  if (parts.length === 3) {
    h = parseInt(parts[0], 10) || 0;
    m = parseInt(parts[1], 10) || 0;
    sec = parseFloat(parts[2]) || 0;
  } else if (parts.length === 2) {
    m = parseInt(parts[0], 10) || 0;
    sec = parseFloat(parts[1]) || 0;
  } else if (parts.length === 1) {
    sec = parseFloat(parts[0]) || 0;
  }
  return (h * 3600 + m * 60 + sec) * 1e3;
}
var CaptionIndex = class {
  constructor(captions) {
    this.lastHitIdx = -1;
    this.entries = captions.map((c) => ({
      startMs: srtTimeToMs(c.startTime),
      endMs: srtTimeToMs(c.endTime),
      caption: c
    })).sort((a, b) => a.startMs - b.startMs);
  }
  findAt(timeSec) {
    const tMs = timeSec * 1e3;
    if (this.lastHitIdx >= 0) {
      const e = this.entries[this.lastHitIdx];
      if (tMs >= e.startMs && tMs < e.endMs) return e.caption;
    }
    const entries = this.entries;
    let lo = 0;
    let hi = entries.length - 1;
    let result = -1;
    while (lo <= hi) {
      const mid = lo + hi >>> 1;
      if (entries[mid].startMs <= tMs) {
        result = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (result >= 0 && tMs < entries[result].endMs) {
      this.lastHitIdx = result;
      return entries[result].caption;
    }
    return null;
  }
};

// ../../shared/render/DataConverter.ts
var DataConverter = class _DataConverter {
  static convertTracks(tracks, editorElements, animations, keyframeTracks) {
    const elementMap = new Map(editorElements.map((el) => [el.id, el]));
    const animationsByTarget = this.groupAnimationsByTarget(animations);
    const keyframesByTarget = this.groupKeyframesByTarget(keyframeTracks || []);
    return tracks.map((track) => ({
      id: track.id,
      name: track.name,
      type: track.type,
      elements: track.elementIds.map((elementId) => {
        const element = elementMap.get(elementId);
        if (!element) return null;
        return this.convertElement(
          element,
          animationsByTarget.get(elementId) || [],
          keyframesByTarget.get(elementId) || []
        );
      }).filter(Boolean),
      isVisible: !!track.isVisible,
      isLocked: track.isLocked ?? false,
      muted: false
    }));
  }
  /**
   * Convert a single editor element to a RenderElement.
   */
  static convertElement(element, animations, keyframeTracks = []) {
    const placement = element.placement || {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      flipX: false,
      flipY: false
    };
    const timeFrame = element.timeFrame;
    const duration = (timeFrame.end - timeFrame.start) / 1e3;
    let centerX;
    let centerY;
    const isValidNumber = (n) => typeof n === "number" && Number.isFinite(n) && !isNaN(n);
    if (isValidNumber(placement.centerX) && isValidNumber(placement.centerY)) {
      centerX = placement.centerX;
      centerY = placement.centerY;
    } else if (isValidNumber(placement.x) && isValidNumber(placement.y) && isValidNumber(placement.width) && isValidNumber(placement.height)) {
      centerX = placement.x + placement.width / 2;
      centerY = placement.y + placement.height / 2;
    } else {
      centerX = placement.width ? placement.width / 2 : 960;
      centerY = placement.height ? placement.height / 2 : 540;
    }
    const baseElement = {
      id: element.id,
      type: element.type,
      startTime: timeFrame.start / 1e3,
      duration,
      trimStart: 0,
      trimEnd: 0,
      hidden: false,
      x: placement.x ?? 0,
      y: placement.y ?? 0,
      centerX,
      centerY,
      width: placement.width ?? 100,
      height: placement.height ?? 100,
      rotation: placement.rotation ?? 0,
      scaleX: placement.scaleX ?? 1,
      scaleY: placement.scaleY ?? 1,
      opacity: element.opacity ?? 1,
      flipX: placement.flipX ?? false,
      flipY: placement.flipY ?? false,
      blendMode: element.blendMode,
      cropX: placement.cropX,
      cropY: placement.cropY,
      cropWidth: placement.cropWidth,
      cropHeight: placement.cropHeight,
      animations: animations.map((a) => _DataConverter.convertAnimation(a)),
      keyframeTracks: keyframeTracks.filter((t) => t.enabled && t.keyframes.length > 0)
    };
    const props = element.properties;
    const visualProps = () => ({
      borderWidth: props.border?.width || 0,
      borderColor: props.border?.color,
      borderStyle: props.border?.style,
      borderRadius: props.border?.borderRadius || 0,
      effectType: props.effect?.type,
      filterIntensity: props.effect?.intensity ?? 1,
      brightness: props.filters?.brightness ?? 0,
      contrast: props.filters?.contrast ?? 0,
      saturation: props.filters?.saturation ?? 0,
      hue: props.filters?.hue ?? 0,
      blur: props.filters?.blur ?? 0,
      // Background removal (frontend-only)
      bgRemovalEnabled: props.bgRemoval?.enabled ?? false,
      bgRemovalMode: props.bgRemoval?.mode,
      bgRemovalBlurAmount: props.bgRemoval?.blurAmount,
      bgRemovalSolidColor: props.bgRemoval?.solidColor,
      bgRemovalReplacementImageSrc: props.bgRemoval?.replacementImageSrc,
      bgRemovalResultUrl: props.bgRemoval?.resultUrl
    });
    const playableProps = () => ({
      muted: Boolean(element.muted) || false,
      mediaStartTime: props.mediaStartTime || 0,
      volume: element.volume ?? props.volume ?? 1,
      playbackSpeed: element.playbackSpeed ?? props.playbackRate ?? 1,
      preservePitch: element.preservePitch ?? props.preservePitch ?? true,
      fadeInDuration: props.fadeInDuration ?? element.fadeInDuration ?? 500,
      fadeOutDuration: props.fadeOutDuration ?? element.fadeOutDuration ?? 500,
      audioEffect: props.audioEffect
    });
    switch (element.type) {
      case "video":
        return {
          ...baseElement,
          src: props.src,
          ...playableProps(),
          ...visualProps()
        };
      case "image": {
        const src = props.src || "";
        const isSvg = _DataConverter.isSvgSource(src);
        return {
          ...baseElement,
          type: isSvg ? "svg" : "image",
          src: props.src,
          ...visualProps()
        };
      }
      case "gif":
        return {
          ...baseElement,
          src: props.src,
          ...visualProps()
        };
      case "audio":
        return {
          ...baseElement,
          src: props.src,
          ...playableProps()
        };
      case "text": {
        const styles = props.styles || [];
        const isBold = styles.includes("bold");
        const isItalic = styles.includes("italic");
        const underline = styles.includes("underline");
        const linethrough = styles.includes("linethrough") || styles.includes("strike") || styles.includes("strikethrough");
        const finalFontWeight = isBold ? "bold" : props.fontWeight?.toString() || "normal";
        const finalFontStyle = isItalic ? "italic" : "normal";
        const fabricObject = element.fabricObject;
        let actualWidth = placement.width ?? 100;
        let actualHeight = placement.height ?? 100;
        let actualText = props.text;
        let textboxWidth = placement.width ?? 100;
        let wrappedLines;
        if (fabricObject && fabricObject.type === "text") {
          actualWidth = fabricObject.width || actualWidth;
          actualHeight = fabricObject.height || actualHeight;
          actualText = fabricObject.text || props.text;
          textboxWidth = fabricObject.width || textboxWidth;
          if (fabricObject.dynamicMinWidth !== void 0) {
            textboxWidth = Math.max(fabricObject.dynamicMinWidth, actualWidth);
          }
          if (Array.isArray(fabricObject.textLines) && fabricObject.textLines.length > 0) {
            wrappedLines = fabricObject.textLines;
          }
        }
        return {
          ...baseElement,
          width: actualWidth,
          height: actualHeight,
          text: actualText,
          fontSize: props.fontSize || 24,
          fontFamily: props.fontFamily || "Arial",
          fontWeight: finalFontWeight,
          fontStyle: finalFontStyle,
          color: props.fontColor || "#000000",
          textAlign: props.textAlign || "center",
          backgroundColor: props.backgroundColor,
          strokeWidth: props.strokeWidth || 0,
          strokeColor: props.strokeColor,
          shadowColor: props.shadowColor,
          shadowBlur: props.shadowBlur,
          shadowOffsetX: props.shadowOffsetX,
          shadowOffsetY: props.shadowOffsetY,
          underline,
          linethrough,
          textboxWidth,
          wrappedLines,
          padding: fabricObject?.padding || 5,
          lineHeight: fabricObject?.lineHeight ?? props.lineHeight ?? 1.16,
          charSpacing: fabricObject?.charSpacing ?? props.charSpacing ?? 0,
          useGradient: props.useGradient ?? false,
          gradientColors: props.gradientColors
        };
      }
      case "shape":
        return {
          ...baseElement,
          fill: props.fill || "#000000",
          stroke: props.stroke || "transparent",
          strokeWidth: props.strokeWidth || 0,
          shapeType: props.shapeType,
          shapeBorderRadius: props.borderRadius || 0,
          shapePoints: props.points
        };
      case "effect":
        return {
          ...baseElement,
          globalEffectLayers: props.effectLayers
        };
      default:
        return baseElement;
    }
  }
  static convertAnimation(animation) {
    let group;
    if (animation.group === "in" || animation.group === "out" || animation.group === "emphasis") {
      group = animation.group;
    } else {
      group = _DataConverter.getAnimationGroup(animation.type);
    }
    const duration = group === "emphasis" ? animation.duration || 0 : (animation.duration || 0) / 1e3;
    return {
      id: animation.id,
      type: animation.type,
      duration,
      group,
      easing: animation.easing,
      properties: animation.properties || {}
    };
  }
  static getAnimationGroup(animationType) {
    if (animationType.endsWith("In")) return "in";
    if (animationType.endsWith("Out")) return "out";
    return "emphasis";
  }
  static groupAnimationsByTarget(animations) {
    const grouped = /* @__PURE__ */ new Map();
    for (const animation of animations) {
      const targetId = animation.targetId;
      if (!targetId) continue;
      if (!grouped.has(targetId)) {
        grouped.set(targetId, []);
      }
      grouped.get(targetId).push(animation);
    }
    return grouped;
  }
  static groupKeyframesByTarget(keyframeTracks) {
    const grouped = /* @__PURE__ */ new Map();
    for (const track of keyframeTracks) {
      if (!track.targetId) continue;
      if (!grouped.has(track.targetId)) {
        grouped.set(track.targetId, []);
      }
      grouped.get(track.targetId).push(track);
    }
    return grouped;
  }
  static calculateTotalDuration(tracks) {
    let maxDuration = 0;
    for (const track of tracks) {
      for (const element of track.elements) {
        const elementEnd = element.startTime + element.duration - element.trimEnd;
        maxDuration = Math.max(maxDuration, elementEnd);
      }
    }
    return maxDuration;
  }
  static getActiveElements(tracks, time) {
    const active = [];
    for (let i = tracks.length - 1; i >= 0; i--) {
      const track = tracks[i];
      if (!track.isVisible) continue;
      for (const element of track.elements) {
        if (element.hidden) continue;
        const elementStart = element.startTime + element.trimStart;
        const elementEnd = element.startTime + element.duration - element.trimEnd;
        if (time >= elementStart && time <= elementEnd) {
          active.push({ track, element });
        }
      }
    }
    return active;
  }
  static isSvgSource(src) {
    if (!src) return false;
    if (src.startsWith("data:image/svg+xml")) return true;
    const lowerSrc = src.toLowerCase();
    const urlWithoutQuery = lowerSrc.split("?")[0];
    if (urlWithoutQuery.endsWith(".svg")) return true;
    if (lowerSrc.includes("image/svg+xml")) return true;
    try {
      const url = new URL(src);
      if (url.pathname.toLowerCase().endsWith(".svg")) return true;
    } catch {
    }
    return false;
  }
  static getActiveEffectElements(tracks, timeSec) {
    const active = [];
    for (const track of tracks) {
      if (track.type !== "effect") continue;
      for (const element of track.elements) {
        if (element.type !== "effect") continue;
        if (timeSec >= element.startTime && timeSec < element.startTime + element.duration) {
          active.push(element);
        }
      }
    }
    return active;
  }
  // ---------------------------------------------------------------------------
  // Export optimisation helpers (scan-line active-element pre-computation)
  // ---------------------------------------------------------------------------
  /**
   * Scan-line algorithm: pre-compute per-frame active element lists.
   * Reduces complexity from O(N*T*E) to O(T*E + sum(element_frame_spans)).
   */
  static buildActiveElementsByFrame(tracks, totalFrames, fps, duration, transitions) {
    const extendBefore = /* @__PURE__ */ new Map();
    const extendAfter = /* @__PURE__ */ new Map();
    if (transitions) {
      for (const t of transitions) {
        const halfDur = t.duration / 2;
        const prevAfter = extendAfter.get(t.sourceElementId) ?? 0;
        extendAfter.set(t.sourceElementId, Math.max(prevAfter, halfDur));
        const prevBefore = extendBefore.get(t.targetElementId) ?? 0;
        extendBefore.set(t.targetElementId, Math.max(prevBefore, halfDur));
      }
    }
    const elementRanges = [];
    for (let i = tracks.length - 1; i >= 0; i--) {
      const track = tracks[i];
      if (!track.isVisible) continue;
      for (const element of track.elements) {
        if (element.hidden) continue;
        const start = element.startTime + element.trimStart;
        const end = element.startTime + element.duration - element.trimEnd;
        const extBefore = (extendBefore.get(element.id) ?? 0) / 1e3;
        const extAfter = (extendAfter.get(element.id) ?? 0) / 1e3;
        const startFrame = Math.max(0, Math.floor((start - extBefore) * fps));
        const endFrame = Math.min(
          totalFrames - 1,
          end + extAfter >= duration ? totalFrames - 1 : Math.floor((end + extAfter) * fps)
        );
        if (startFrame <= endFrame) {
          elementRanges.push({ track, element, startFrame, endFrame });
        }
      }
    }
    const result = new Array(totalFrames);
    for (let f = 0; f < totalFrames; f++) result[f] = [];
    for (const { track, element, startFrame, endFrame } of elementRanges) {
      for (let f = startFrame; f <= endFrame; f++) {
        result[f].push({ track, element });
      }
    }
    return result;
  }
  /**
   * Pre-compute per-frame "is static" flags.
   * A static frame is visually identical to the previous frame and can be
   * skipped (the canvas content is reused for encoding).
   */
  static buildStaticFrameFlags(activeElementsByFrame, totalFrames, fps, transitions, captions, captionAnimation) {
    const isStatic = new Array(totalFrames).fill(false);
    const captionTimesMs = captions?.map((cap) => ({
      startMs: srtTimeToMs(cap.startTime),
      endMs: srtTimeToMs(cap.endTime)
    }));
    for (let f = 1; f < totalFrames; f++) {
      const curr = activeElementsByFrame[f];
      const prev = activeElementsByFrame[f - 1];
      const timeSec = f / fps;
      if (curr.length !== prev.length) continue;
      let sameElements = true;
      for (let i = 0; i < curr.length; i++) {
        if (curr[i].element.id !== prev[i].element.id) {
          sameElements = false;
          break;
        }
      }
      if (!sameElements) continue;
      let hasDynamicElement = false;
      for (let i = 0; i < curr.length; i++) {
        const el = curr[i].element;
        if (el.type === "video" || el.type === "gif" || el.type === "effect") {
          hasDynamicElement = true;
          break;
        }
        if (_DataConverter._hasActiveAnimation(el, timeSec)) {
          hasDynamicElement = true;
          break;
        }
        if (_DataConverter._hasActiveKeyframes(el, timeSec)) {
          hasDynamicElement = true;
          break;
        }
      }
      if (hasDynamicElement) continue;
      if (_DataConverter._hasActiveCaptionAnimation(captionTimesMs, captionAnimation, timeSec)) continue;
      isStatic[f] = true;
    }
    return isStatic;
  }
  // -- private helpers for static frame detection --
  static _hasActiveAnimation(element, timeSec) {
    if (!element.animations || element.animations.length === 0) return false;
    const elStart = element.startTime + element.trimStart;
    const elEnd = element.startTime + element.duration - element.trimEnd;
    const localTime = timeSec - elStart;
    const elDuration = elEnd - elStart;
    for (const anim of element.animations) {
      if (anim.duration <= 0) continue;
      if (anim.group === "in" && localTime < anim.duration) return true;
      if (anim.group === "out" && localTime > elDuration - anim.duration) return true;
      if (anim.group === "emphasis") return true;
    }
    return false;
  }
  static _hasActiveKeyframes(element, timeSec) {
    if (!element.keyframeTracks || element.keyframeTracks.length === 0) return false;
    const localTime = timeSec - element.startTime;
    for (const track of element.keyframeTracks) {
      if (!track.enabled || track.keyframes.length < 2) continue;
      const first = track.keyframes[0].time;
      const last = track.keyframes[track.keyframes.length - 1].time;
      if (localTime >= first && localTime <= last) return true;
    }
    return false;
  }
  static {
    /**
     * Continuous caption animation presets that animate throughout the entire
     * caption duration (not just in/out windows).
     */
    this.CONTINUOUS_CAPTION_PRESETS = /* @__PURE__ */ new Set([
      "typewriter",
      "typewriter-word",
      "neon",
      "wave",
      "breathe",
      "float",
      "glitch",
      "word-stagger",
      "char-fade-in",
      "char-scale-in",
      "karaoke",
      "karaoke-glow",
      "karaoke-underline",
      "karaoke-gradient",
      "karaoke-bold",
      "karaoke-rainbow",
      "word-pop",
      "char-blur-reveal",
      "color-flow",
      "char-rotate-in",
      "elastic-char-in",
      "shadow-glow-pulse",
      "tracking-expand",
      "blur-shimmer",
      "drop-bounce",
      "word-slide-up",
      "skew-in"
    ]);
  }
  static _hasActiveCaptionAnimation(captionTimesMs, captionAnimation, timeSec) {
    if (!captionTimesMs || captionTimesMs.length === 0) return false;
    if (!captionAnimation) return false;
    const timeMs = timeSec * 1e3;
    const inDur = captionAnimation.inDuration || 0;
    const outDur = captionAnimation.outDuration || 0;
    const isContinuous = _DataConverter.CONTINUOUS_CAPTION_PRESETS.has(captionAnimation.preset);
    const hasAnimation = inDur > 0 || outDur > 0 || isContinuous;
    if (!hasAnimation) return false;
    for (const { startMs, endMs } of captionTimesMs) {
      if (timeMs < startMs || timeMs > endMs) continue;
      if (isContinuous) return true;
      if (inDur > 0 && timeMs < startMs + inDur) return true;
      if (outDur > 0 && timeMs > endMs - outDur) return true;
    }
    return false;
  }
};

// ../../server/src/renderer/ServerImageLoader.ts
import { loadImage } from "skia-canvas";
var ServerImageLoader = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
  }
  async load(src) {
    if (this.cache.has(src)) return this.cache.get(src);
    const img = await loadImage(src);
    this.cache.set(src, img);
    return img;
  }
  has(src) {
    return this.cache.has(src);
  }
  clear() {
    this.cache.clear();
  }
  get size() {
    return this.cache.size;
  }
};

// ../../server/src/renderer/ServerVideoFrameExtractor.ts
import { spawn } from "child_process";
import { loadImage as loadImage2 } from "skia-canvas";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
var ServerVideoFrameExtractor = class {
  constructor() {
    this.frameCache = /* @__PURE__ */ new Map();
    this.MAX_CACHE_SIZE = 300;
  }
  setCacheLimit(size) {
    this.MAX_CACHE_SIZE = Math.max(100, size);
  }
  async extractFrame(videoPath, timeSeconds) {
    const cacheKey = `${videoPath}@${timeSeconds.toFixed(3)}`;
    const cached = this.frameCache.get(cacheKey);
    if (cached) {
      this.refreshCacheEntry(cacheKey, cached);
      return cached;
    }
    const jpegBuffer = await this.ffmpegExtractFrame(videoPath, timeSeconds);
    const img = await loadImage2(jpegBuffer);
    this.addToCache(cacheKey, img);
    return img;
  }
  refreshCacheEntry(key, img) {
    this.frameCache.delete(key);
    this.frameCache.set(key, img);
  }
  addToCache(key, img) {
    if (this.frameCache.size >= this.MAX_CACHE_SIZE) {
      const oldest = this.frameCache.keys().next().value;
      this.frameCache.delete(oldest);
    }
    this.frameCache.set(key, img);
  }
  ffmpegExtractFrame(videoPath, timeSeconds) {
    return new Promise((resolve3, reject) => {
      const args = [
        "-ss",
        String(timeSeconds),
        "-i",
        videoPath,
        "-vframes",
        "1",
        "-f",
        "image2pipe",
        "-vcodec",
        "mjpeg",
        "-q:v",
        "2",
        "pipe:1"
      ];
      const proc = spawn("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] });
      const chunks = [];
      proc.stdout.on("data", (chunk) => chunks.push(chunk));
      proc.stderr.on("data", () => {
      });
      proc.on("close", (code) => {
        if (code === 0 && chunks.length > 0) {
          resolve3(Buffer.concat(chunks));
        } else {
          reject(new Error(`FFmpeg frame extraction failed (code ${code}) for ${videoPath} at ${timeSeconds}s`));
        }
      });
      proc.on("error", (err) => {
        reject(new Error(`FFmpeg spawn error: ${err.message}`));
      });
    });
  }
  async preextractFrames(videoPath, times, onProgress) {
    for (let i = 0; i < times.length; i++) {
      await this.extractFrame(videoPath, times[i]);
      onProgress?.(i + 1, times.length);
    }
  }
  /**
   * 批量预提取帧 — 单个 FFmpeg 进程顺序解码，预填充到 frameCache。
   * 渲染循环调用 extractFrame() 时直接命中缓存，避免每帧 spawn 新进程。
   */
  async batchPreExtract(videoPath, cacheKeys, mediaTimes, onProgress) {
    if (mediaTimes.length === 0) return;
    const needed = this.filterUncachedFrames(cacheKeys, mediaTimes);
    if (needed.length === 0) return;
    const firstTime = needed[0].mediaTime;
    const lastTime = needed[needed.length - 1].mediaTime;
    const decodeFps = this.calculateDecodeFps(needed);
    console.log(
      `[VideoExtractor] Batch: ${needed.length} frames, ${firstTime.toFixed(2)}s\u2013${lastTime.toFixed(2)}s, decode@${decodeFps}fps`
    );
    const batchDir = fs.mkdtempSync(path.join(os.tmpdir(), "vbatch-"));
    try {
      await this.extractFramesToDir(videoPath, firstTime, lastTime, decodeFps, batchDir);
      const files = fs.readdirSync(batchDir).filter((f) => f.endsWith(".jpg")).sort();
      const toLoad = this.matchFramesToFiles(files, needed, firstTime, decodeFps);
      await this.loadFramesInBatches(batchDir, toLoad, onProgress);
      console.log(
        `[VideoExtractor] Batch done: cached ${toLoad.length}/${needed.length} frames`
      );
    } finally {
      this.cleanupBatchDir(batchDir);
    }
  }
  filterUncachedFrames(cacheKeys, mediaTimes) {
    const needed = [];
    for (let i = 0; i < mediaTimes.length; i++) {
      if (!this.frameCache.has(cacheKeys[i])) {
        needed.push({ cacheKey: cacheKeys[i], mediaTime: mediaTimes[i] });
      }
    }
    return needed;
  }
  calculateDecodeFps(needed) {
    if (needed.length < 2) return 30;
    let minStep = Infinity;
    for (let i = 1; i < needed.length; i++) {
      const step = needed[i].mediaTime - needed[i - 1].mediaTime;
      if (step > 1e-3) minStep = Math.min(minStep, step);
    }
    const fps = minStep < Infinity ? Math.ceil(1 / minStep) : 30;
    return Math.max(1, Math.min(120, fps));
  }
  async extractFramesToDir(videoPath, startTime, endTime, fps, outputDir) {
    const seekStart = Math.max(0, startTime);
    const seekEnd = endTime + 1 / fps + 0.05;
    await new Promise((resolve3, reject) => {
      const args = [
        "-ss",
        String(seekStart),
        "-to",
        String(seekEnd),
        "-i",
        videoPath,
        "-vf",
        `fps=${fps}`,
        "-q:v",
        "2",
        "-y",
        path.join(outputDir, "f_%06d.jpg")
      ];
      const proc = spawn("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] });
      proc.stderr.on("data", () => {
      });
      proc.on("close", (code) => {
        if (code === 0) resolve3();
        else reject(new Error(`Batch extract FFmpeg exited with code ${code}`));
      });
      proc.on("error", reject);
    });
  }
  matchFramesToFiles(files, needed, seekStart, decodeFps) {
    const tolerance = 0.5 / decodeFps + 5e-3;
    const toLoad = [];
    let neededIdx = 0;
    for (let i = 0; i < files.length && neededIdx < needed.length; i++) {
      const frameMediaTime = seekStart + i / decodeFps;
      while (neededIdx < needed.length && needed[neededIdx].mediaTime < frameMediaTime - tolerance) {
        neededIdx++;
      }
      if (neededIdx >= needed.length) break;
      if (Math.abs(frameMediaTime - needed[neededIdx].mediaTime) <= tolerance) {
        toLoad.push({ file: files[i], cacheKey: needed[neededIdx].cacheKey });
        neededIdx++;
      }
    }
    return toLoad;
  }
  async loadFramesInBatches(batchDir, toLoad, onProgress) {
    const batchSize = 20;
    for (let i = 0; i < toLoad.length; i += batchSize) {
      const batch = toLoad.slice(i, i + batchSize);
      const images = await Promise.all(
        batch.map(({ file }) => loadImage2(path.join(batchDir, file)).catch(() => null))
      );
      for (let j = 0; j < batch.length; j++) {
        if (images[j]) {
          this.addToCache(batch[j].cacheKey, images[j]);
        }
      }
      onProgress?.(Math.min(i + batchSize, toLoad.length), toLoad.length);
    }
  }
  cleanupBatchDir(dir) {
    try {
      for (const f of fs.readdirSync(dir)) {
        fs.unlinkSync(path.join(dir, f));
      }
      fs.rmdirSync(dir);
    } catch {
    }
  }
  clear() {
    this.frameCache.clear();
  }
  get cacheSize() {
    return this.frameCache.size;
  }
};

// ../../server/src/renderer/ServerAudioExtractor.ts
import { spawn as spawn2 } from "child_process";
var ServerAudioExtractor = class {
  /**
   * 从单个媒体文件提取音频为 PCM（Float32LE, stereo, 48kHz）
   */
  async extractAudio(src, startSec, durationSec, sampleRate = 48e3) {
    return new Promise((resolve3, reject) => {
      const args = [
        "-ss",
        String(startSec),
        "-t",
        String(durationSec),
        "-i",
        src,
        "-f",
        "f32le",
        "-acodec",
        "pcm_f32le",
        "-ar",
        String(sampleRate),
        "-ac",
        "2",
        "pipe:1"
      ];
      const proc = spawn2("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] });
      const chunks = [];
      proc.stdout.on("data", (chunk) => chunks.push(chunk));
      proc.stderr.on("data", () => {
      });
      proc.on("close", (code) => {
        if (code === 0) {
          resolve3(Buffer.concat(chunks));
        } else {
          reject(new Error(`FFmpeg audio extraction failed (code ${code})`));
        }
      });
      proc.on("error", reject);
    });
  }
  /**
   * 混合多个音轨到单个 WAV 文件
   * 使用 FFmpeg amix 滤镜
   */
  async mixAudioTracks(tracks, totalDuration, outputPath, sampleRate = 48e3) {
    if (tracks.length === 0) return null;
    const args = [];
    const filterParts = [];
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      args.push("-i", track.src);
      const filters = [];
      if (track.mediaStartTime > 0) {
        filters.push(`atrim=start=${track.mediaStartTime}`);
        filters.push("asetpts=PTS-STARTPTS");
      }
      if (track.playbackSpeed !== 1) {
        filters.push(`atempo=${track.playbackSpeed}`);
      }
      if (track.volume !== 1) {
        filters.push(`volume=${track.volume}`);
      }
      const delayMs = Math.round(track.startTime * 1e3);
      if (delayMs > 0) {
        filters.push(`adelay=${delayMs}|${delayMs}`);
      }
      const duration = track.endTime - track.startTime;
      filters.push(`atrim=duration=${duration}`);
      const filterChain = filters.length > 0 ? `[${i}:a]${filters.join(",")}[a${i}]` : `[${i}:a]anull[a${i}]`;
      filterParts.push(filterChain);
    }
    const inputLabels = tracks.map((_, i) => `[a${i}]`).join("");
    filterParts.push(
      `${inputLabels}amix=inputs=${tracks.length}:duration=longest:dropout_transition=0:normalize=0[mix]`,
      "[mix]loudnorm=I=-16:TP=-1.5:LRA=11[out]"
    );
    const filterGraph = filterParts.join(";");
    args.push(
      "-filter_complex",
      filterGraph,
      "-map",
      "[out]",
      "-t",
      String(totalDuration),
      "-ar",
      String(sampleRate),
      "-ac",
      "2",
      "-y",
      outputPath
    );
    return new Promise((resolve3, reject) => {
      const proc = spawn2("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] });
      proc.stderr.on("data", () => {
      });
      proc.on("close", (code) => {
        if (code === 0) {
          resolve3(outputPath);
        } else {
          resolve3(null);
        }
      });
      proc.on("error", reject);
    });
  }
};

// ../../server/src/renderer/MediaResolver.ts
import * as fs2 from "fs";
import * as path2 from "path";
import * as https from "https";
import * as http from "http";
import * as os2 from "os";
import * as crypto2 from "crypto";
var MediaResolver = class {
  constructor(workDir) {
    this.downloadCache = /* @__PURE__ */ new Map();
    this.downloadDir = workDir || path2.join(os2.tmpdir(), "video-export-media");
    if (!fs2.existsSync(this.downloadDir)) {
      fs2.mkdirSync(this.downloadDir, { recursive: true });
    }
  }
  /**
   * 解析媒体 src 为本地文件路径
   */
  async resolve(src) {
    if (!src) throw new Error("Empty media source");
    if (this.downloadCache.has(src)) {
      return this.downloadCache.get(src);
    }
    if (src.startsWith("https://") || src.startsWith("http://")) {
      const localPath = await this.downloadToLocal(src);
      this.downloadCache.set(src, localPath);
      return localPath;
    }
    if (src.startsWith("data:")) {
      const localPath = this.dataUrlToFile(src);
      this.downloadCache.set(src, localPath);
      return localPath;
    }
    if (fs2.existsSync(src)) {
      return src;
    }
    if (src.startsWith("local://")) {
      throw new Error(`local:// media resolution not yet implemented: ${src}`);
    }
    if (src.startsWith("brandlogo://")) {
      throw new Error(`brandlogo:// media resolution not yet implemented: ${src}`);
    }
    throw new Error(`Cannot resolve media source: ${src.substring(0, 100)}`);
  }
  async downloadToLocal(url) {
    const hash = crypto2.createHash("md5").update(url).digest("hex");
    const ext = this.getExtFromUrl(url);
    const localPath = path2.join(this.downloadDir, `${hash}${ext}`);
    if (fs2.existsSync(localPath)) return localPath;
    return new Promise((resolve3, reject) => {
      const protocol = url.startsWith("https") ? https : http;
      const file = fs2.createWriteStream(localPath);
      protocol.get(url, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          file.close();
          fs2.unlinkSync(localPath);
          this.downloadToLocal(response.headers.location).then(resolve3).catch(reject);
          return;
        }
        if (response.statusCode !== 200) {
          file.close();
          fs2.unlinkSync(localPath);
          reject(new Error(`Download failed: HTTP ${response.statusCode} for ${url.substring(0, 100)}`));
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve3(localPath);
        });
      }).on("error", (err) => {
        file.close();
        if (fs2.existsSync(localPath)) fs2.unlinkSync(localPath);
        reject(err);
      });
    });
  }
  dataUrlToFile(dataUrl) {
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) throw new Error("Invalid data URL");
    const mime = matches[1];
    const data = Buffer.from(matches[2], "base64");
    const ext = mime.includes("svg") ? ".svg" : mime.includes("png") ? ".png" : mime.includes("jpeg") ? ".jpg" : ".bin";
    const hash = crypto2.createHash("md5").update(data).digest("hex");
    const localPath = path2.join(this.downloadDir, `${hash}${ext}`);
    if (!fs2.existsSync(localPath)) {
      fs2.writeFileSync(localPath, data);
    }
    return localPath;
  }
  getExtFromUrl(url) {
    try {
      const pathname = new URL(url).pathname;
      const ext = path2.extname(pathname).split("?")[0];
      return ext || ".bin";
    } catch {
      return ".bin";
    }
  }
  /**
   * 清理下载的临时文件
   */
  cleanup() {
    this.downloadCache.clear();
    if (fs2.existsSync(this.downloadDir)) {
      const files = fs2.readdirSync(this.downloadDir);
      for (const file of files) {
        try {
          fs2.unlinkSync(path2.join(this.downloadDir, file));
        } catch {
        }
      }
    }
  }
};

// ../../shared/animations/interpolationEasings.ts
var BACK_OVERSHOOT = 1.70158;
var BACK_OVERSHOOT_LARGE = 3.5;
var BOUNCE_N1 = 7.5625;
var BOUNCE_D1 = 2.75;
var ELASTIC_PERIOD = 2 * Math.PI / 3;
function springEasing(t, decay, velocity) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.exp(-decay * t) * Math.cos(velocity * t);
}
var EASING = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => t * (2 - t),
  inOutQuad: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  inBack: (t) => {
    const c3 = BACK_OVERSHOOT + 1;
    return c3 * t * t * t - BACK_OVERSHOOT * t * t;
  },
  outBack: (t) => {
    const c3 = BACK_OVERSHOOT + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + BACK_OVERSHOOT * Math.pow(t - 1, 2);
  },
  inOutBack: (t) => {
    const c2 = BACK_OVERSHOOT * 1.525;
    return t < 0.5 ? Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  outBackLarge: (t) => {
    const c3 = BACK_OVERSHOOT_LARGE + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + BACK_OVERSHOOT_LARGE * Math.pow(t - 1, 2);
  },
  outBounce: (t) => {
    if (t < 1 / BOUNCE_D1) {
      return BOUNCE_N1 * t * t;
    } else if (t < 2 / BOUNCE_D1) {
      return BOUNCE_N1 * (t -= 1.5 / BOUNCE_D1) * t + 0.75;
    } else if (t < 2.5 / BOUNCE_D1) {
      return BOUNCE_N1 * (t -= 2.25 / BOUNCE_D1) * t + 0.9375;
    } else {
      return BOUNCE_N1 * (t -= 2.625 / BOUNCE_D1) * t + 0.984375;
    }
  },
  inBounce: (t) => 1 - EASING.outBounce(1 - t),
  inOutBounce: (t) => t < 0.5 ? (1 - EASING.outBounce(1 - 2 * t)) / 2 : (1 + EASING.outBounce(2 * t - 1)) / 2,
  outElastic: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ELASTIC_PERIOD) + 1;
  },
  inElastic: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ELASTIC_PERIOD);
  },
  inOutElastic: (t) => {
    const c5 = 2 * Math.PI / 4.5;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5 ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2 : Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5) / 2 + 1;
  },
  inExpo: (t) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  outExpo: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inOutExpo: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  inCirc: (t) => 1 - Math.sqrt(1 - Math.pow(t, 2)),
  outCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  inOutCirc: (t) => t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  inSine: (t) => 1 - Math.cos(t * Math.PI / 2),
  outSine: (t) => Math.sin(t * Math.PI / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  // Spring easings — damped harmonic oscillation
  spring: (t) => springEasing(t, 8, 6 * Math.PI),
  springGentle: (t) => springEasing(t, 12, 4 * Math.PI),
  springBouncy: (t) => springEasing(t, 6, 8 * Math.PI),
  springStiff: (t) => springEasing(t, 18, 6 * Math.PI)
};
var NEWTON_ITERATIONS = 8;
var NEWTON_MIN_SLOPE = 1e-3;
var SUBDIVISION_PRECISION = 1e-7;
var SUBDIVISION_MAX_ITERS = 10;
function calcBezier(t, a1, a2) {
  return (((1 + 3 * (a1 - a2)) * t + 3 * (a2 - 2 * a1)) * t + 3 * a1) * t;
}
function getSlope(t, a1, a2) {
  return (3 * (1 + 3 * (a1 - a2)) * t + 6 * (a2 - 2 * a1)) * t + 3 * a1;
}
function cubicBezier(x1, y1, x2, y2) {
  if (x1 === y1 && x2 === y2) return EASING.linear;
  const sampleValues = new Float32Array(11);
  for (let i = 0; i <= 10; i++) {
    sampleValues[i] = calcBezier(i * 0.1, x1, x2);
  }
  function getTForX(x) {
    let intervalStart = 0;
    let currentSample = 1;
    const lastSample = 10;
    for (; currentSample !== lastSample && sampleValues[currentSample] <= x; ++currentSample) {
      intervalStart += 0.1;
    }
    --currentSample;
    const dist = (x - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
    let guessForT = intervalStart + dist * 0.1;
    const initialSlope = getSlope(guessForT, x1, x2);
    if (initialSlope >= NEWTON_MIN_SLOPE) {
      for (let i = 0; i < NEWTON_ITERATIONS; i++) {
        const currentSlope = getSlope(guessForT, x1, x2);
        if (currentSlope === 0) break;
        guessForT -= (calcBezier(guessForT, x1, x2) - x) / currentSlope;
      }
    } else if (initialSlope !== 0) {
      let aA = intervalStart;
      let bB = intervalStart + 0.1;
      for (let i = 0; i < SUBDIVISION_MAX_ITERS; i++) {
        guessForT = aA + (bB - aA) / 2;
        if (calcBezier(guessForT, x1, x2) - x > 0) bB = guessForT;
        else aA = guessForT;
        if (Math.abs(calcBezier(guessForT, x1, x2) - x) < SUBDIVISION_PRECISION) break;
      }
    }
    return guessForT;
  }
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return calcBezier(getTForX(x), y1, y2);
  };
}
var ZETA_EPSILON = 1e-4;
function createSpring(stiffness, damping, mass = 1) {
  const omega = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1 - ZETA_EPSILON) {
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    const zetaOmegaOverOmegaD = zeta * omega / omegaD;
    return (t) => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      const decay = Math.exp(-zeta * omega * t);
      return 1 - decay * (Math.cos(omegaD * t) + zetaOmegaOverOmegaD * Math.sin(omegaD * t));
    };
  }
  if (zeta > 1 + ZETA_EPSILON) {
    const s = Math.sqrt(zeta * zeta - 1);
    const r1 = -omega * (zeta - s);
    const r2 = -omega * (zeta + s);
    const invR1MinusR2 = 1 / (r1 - r2);
    return (t) => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      return 1 + (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) * invR1MinusR2;
    };
  }
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return 1 - Math.exp(-omega * t) * (1 + omega * t);
  };
}
var _parametricCache = /* @__PURE__ */ new Map();
function resolveEasing(name) {
  const named = EASING[name];
  if (named) return named;
  const cached = _parametricCache.get(name);
  if (cached) return cached;
  let fn;
  if (name.startsWith("cubicBezier:")) {
    const s = name.slice(12);
    const i1 = s.indexOf(",");
    const i2 = i1 > 0 ? s.indexOf(",", i1 + 1) : -1;
    const i3 = i2 > 0 ? s.indexOf(",", i2 + 1) : -1;
    if (i1 > 0 && i2 > 0 && i3 > 0) {
      const x1 = +s.slice(0, i1), y1 = +s.slice(i1 + 1, i2);
      const x2 = +s.slice(i2 + 1, i3), y2 = +s.slice(i3 + 1);
      if (x1 === x1 && y1 === y1 && x2 === x2 && y2 === y2) {
        fn = cubicBezier(x1, y1, x2, y2);
      }
    }
  } else if (name.startsWith("spring:")) {
    const s = name.slice(7);
    const i1 = s.indexOf(",");
    const i2 = i1 > 0 ? s.indexOf(",", i1 + 1) : -1;
    if (i1 > 0) {
      const stiffness = +s.slice(0, i1);
      const damping = i2 > 0 ? +s.slice(i1 + 1, i2) : +s.slice(i1 + 1);
      const mass = i2 > 0 ? +s.slice(i2 + 1) : 1;
      if (stiffness === stiffness && damping === damping && mass === mass) {
        fn = createSpring(stiffness, damping, mass);
      }
    }
  }
  if (fn) {
    _parametricCache.set(name, fn);
    return fn;
  }
  return EASING.linear;
}

// ../../shared/animations/constants.ts
var ENTRANCE_ANIMATION_TYPES = /* @__PURE__ */ new Set([
  "fadeIn",
  "slideIn",
  "zoomIn",
  "rotateIn",
  "bounceIn",
  "blurIn",
  "flipIn",
  "irisIn",
  "pixelateIn",
  "spiralIn",
  "expandIn",
  "foldIn",
  "curtainIn",
  "morphIn",
  "elasticIn"
]);
var EXIT_ANIMATION_TYPES = /* @__PURE__ */ new Set([
  "fadeOut",
  "slideOut",
  "zoomOut",
  "rotateOut",
  "blurOut",
  "flipOut",
  "irisOut",
  "pixelateOut",
  "spiralOut",
  "collapseOut",
  "foldOut",
  "curtainOut",
  "dissolveOut",
  "bounceOut"
]);
var ANIMATION_AFFECTED_PROPERTIES = {
  fadeIn: ["opacity"],
  fadeOut: ["opacity"],
  blurIn: ["opacity"],
  blurOut: ["opacity"],
  irisIn: ["opacity"],
  irisOut: ["opacity"],
  pixelateIn: ["opacity"],
  pixelateOut: ["opacity"],
  curtainIn: ["opacity"],
  curtainOut: ["opacity"],
  flipIn: ["opacity"],
  flipOut: ["opacity"],
  dissolveOut: ["opacity"],
  glitch: ["opacity"],
  foldIn: ["opacity", "scaleX"],
  foldOut: ["opacity", "scaleX"],
  slideOut: ["opacity", "x", "y"],
  slideIn: ["opacity", "x", "y", "scaleX", "scaleY"],
  zoomIn: ["opacity", "scaleX", "scaleY"],
  zoomOut: ["opacity", "scaleX", "scaleY"],
  bounceIn: ["opacity", "scaleX", "scaleY"],
  bounceOut: ["opacity", "scaleX", "scaleY"],
  elasticIn: ["opacity", "scaleX", "scaleY"],
  expandIn: ["opacity", "scaleX", "scaleY"],
  collapseOut: ["opacity", "scaleX", "scaleY"],
  morphIn: ["opacity", "scaleX", "scaleY"],
  rotateIn: ["opacity", "scaleX", "scaleY", "rotation"],
  rotateOut: ["opacity", "scaleX", "scaleY", "rotation"],
  spiralIn: ["opacity", "scaleX", "scaleY", "rotation"],
  spiralOut: ["opacity", "scaleX", "scaleY", "rotation"]
};
var DEFAULT_AFFECTED_PROPERTIES = ["opacity", "x", "y", "scaleX", "scaleY", "rotation"];
var _affectedPropertiesCache = /* @__PURE__ */ new Map();
var _defaultAffectedSet = new Set(DEFAULT_AFFECTED_PROPERTIES);
function getAnimationAffectedProperties(animType) {
  const cached = _affectedPropertiesCache.get(animType);
  if (cached) return cached;
  const properties = ANIMATION_AFFECTED_PROPERTIES[animType];
  if (!properties) return _defaultAffectedSet;
  const result = new Set(properties);
  _affectedPropertiesCache.set(animType, result);
  return result;
}
var LOOP_ANIMATION_TYPES = /* @__PURE__ */ new Set([
  "breathe",
  "rotate",
  "bounce",
  "shake",
  "flash",
  "zoom",
  "pulse",
  "swing",
  "wobble",
  "heartbeat",
  "rubberBand",
  "jello",
  "tada",
  "glow",
  "glitch",
  "float"
]);
var TEXT_ANIMATION_TYPES = /* @__PURE__ */ new Set([
  "typewriter",
  "highlight",
  "popIn",
  "popOut",
  "slideInByCharacter",
  "slideOutByCharacter",
  "fadeInByCharacter",
  "fadeOutByCharacter",
  "blurInByCharacter",
  "blurOutByCharacter",
  "bounceInByCharacter",
  "bounceOutByCharacter",
  "zoomInByCharacter",
  "zoomOutByCharacter",
  "rotateInByCharacter",
  "rotateOutByCharacter",
  "waveIn",
  "dropIn",
  "flipInByCharacter",
  "flipOutByCharacter",
  "scatterIn",
  "scatterOut",
  "elasticInByCharacter",
  "elasticOutByCharacter",
  "shakeInByCharacter",
  "waveOut",
  "dropOut",
  "shakeOutByCharacter"
]);
var PERSPECTIVE = {
  FLIP_FACTOR: 8e-4
};

// ../../shared/animations/animPropKeys.ts
var ANIM_PROPS = {
  // ─── Clip 效果 ───
  WIPE_PROGRESS: "_wipeProgress",
  WIPE_DIR: "_wipeDir",
  IRIS_PROGRESS: "_irisProgress",
  IRIS_TYPE: "_irisType",
  CURTAIN_PROGRESS: "_curtainProgress",
  CURTAIN_TYPE: "_curtainType",
  // ─── Filter 效果 ───
  BLUR_AMOUNT: "_blurAmount",
  // ─── Post-process 效果 ───
  PIXEL_SIZE: "_pixelSize",
  DISSOLVE_PROGRESS: "_dissolveProgress",
  ROTATE_X: "_rotateX",
  ROTATE_Y: "_rotateY",
  GLITCH_OFFSET_X: "_glitchOffsetX",
  GLITCH_OFFSET_Y: "_glitchOffsetY",
  RGB_SPLIT: "_rgbSplit"
};

// ../../shared/animations/animationRegistry.ts
var ANIMATION_REGISTRY = {
  // ─── 入场动画 ───
  fadeIn: {
    easing: "inOutQuad",
    properties: [{ target: "opacity", from: 0, to: 1, multiply: "baseOpacity" }]
  },
  expandIn: {
    easing: "outBack",
    properties: [
      { target: "scaleX", from: 0, to: 1, multiply: "baseScaleX" },
      { target: "scaleY", from: 0, to: 1, multiply: "baseScaleY" },
      { target: "opacity", from: 0, to: 1, multiply: "baseOpacity" }
    ]
  },
  foldIn: {
    easing: "outQuad",
    properties: [
      { target: "scaleX", from: 0, to: 1, multiply: "baseScaleX" },
      { target: "opacity", from: 0, to: 1, multiply: "baseOpacity" }
    ]
  },
  blurIn: {
    easing: "outQuad",
    properties: [
      { target: ANIM_PROPS.BLUR_AMOUNT, from: 20, to: 0 },
      { target: "opacity", from: 0, to: 1, multiply: "baseOpacity" }
    ]
  },
  curtainIn: {
    easing: "outQuad",
    properties: [
      { target: ANIM_PROPS.CURTAIN_PROGRESS, from: 0, to: 1 },
      { target: "opacity", from: 0, to: 1, multiply: "baseOpacity" }
    ],
    customRender: { typeKey: ANIM_PROPS.CURTAIN_TYPE, typeValue: "in" }
  },
  irisIn: {
    easing: "outQuad",
    properties: [
      { target: ANIM_PROPS.IRIS_PROGRESS, from: 0, to: 1 },
      { target: "opacity", from: 0, to: 1, multiply: "baseOpacity" }
    ],
    customRender: { typeKey: ANIM_PROPS.IRIS_TYPE, typeValue: "in" }
  },
  pixelateIn: {
    easing: "outQuad",
    properties: [
      { target: ANIM_PROPS.PIXEL_SIZE, from: { param: "pixelSize", default: 20 }, to: 0 },
      { target: "opacity", from: 0, to: 1, multiply: "baseOpacity" }
    ]
  },
  zoomIn: {
    easing: "outQuad",
    properties: [
      { target: "scaleX", from: 1, to: { param: "scale", default: 1.5 }, multiply: "baseScaleX" },
      { target: "scaleY", from: 1, to: { param: "scale", default: 1.5 }, multiply: "baseScaleY" },
      { target: "opacity", from: 0, to: 1, multiply: "baseOpacity" }
    ]
  },
  elasticIn: {
    easing: "outElastic",
    properties: [
      { target: "scaleX", from: 0, to: 1, multiply: "baseScaleX" },
      { target: "scaleY", from: 0, to: 1, multiply: "baseScaleY" },
      {
        target: "opacity",
        segments: [
          { start: 0, end: 0.25, from: 0, to: 1, easing: "linear" },
          { start: 0.25, end: 1, from: 1, to: 1 }
        ],
        multiply: "baseOpacity"
      }
    ]
  },
  // ─── 出场动画 ───
  fadeOut: {
    easing: "inOutQuad",
    properties: [{ target: "opacity", from: 1, to: 0, multiply: "baseOpacity" }]
  },
  collapseOut: {
    easing: "inQuad",
    properties: [
      { target: "scaleX", from: 1, to: 0, multiply: "baseScaleX" },
      { target: "scaleY", from: 1, to: 0, multiply: "baseScaleY" },
      { target: "opacity", from: 1, to: 0, multiply: "baseOpacity" }
    ]
  },
  foldOut: {
    easing: "inQuad",
    properties: [
      { target: "scaleX", from: 1, to: 0, multiply: "baseScaleX" },
      { target: "opacity", from: 1, to: 0, multiply: "baseOpacity" }
    ]
  },
  blurOut: {
    easing: "inQuad",
    properties: [
      { target: ANIM_PROPS.BLUR_AMOUNT, from: 0, to: 20 },
      { target: "opacity", from: 1, to: 0, multiply: "baseOpacity" }
    ]
  },
  curtainOut: {
    easing: "linear",
    properties: [
      { target: ANIM_PROPS.CURTAIN_PROGRESS, from: 1, to: 0 },
      { target: "opacity", from: 1, to: 0, multiply: "baseOpacity" }
    ],
    customRender: { typeKey: ANIM_PROPS.CURTAIN_TYPE, typeValue: "out" }
  },
  irisOut: {
    easing: "inQuad",
    properties: [
      { target: ANIM_PROPS.IRIS_PROGRESS, from: 1, to: 0 }
    ],
    customRender: { typeKey: ANIM_PROPS.IRIS_TYPE, typeValue: "out" }
  },
  pixelateOut: {
    easing: "inQuad",
    properties: [
      { target: ANIM_PROPS.PIXEL_SIZE, from: 0, to: { param: "pixelSize", default: 20 } },
      { target: "opacity", from: 1, to: 0, multiply: "baseOpacity" }
    ]
  },
  zoomOut: {
    easing: "inQuad",
    properties: [
      { target: "scaleX", from: 1, to: { param: "scale", default: 0 }, multiply: "baseScaleX" },
      { target: "scaleY", from: 1, to: { param: "scale", default: 0 }, multiply: "baseScaleY" },
      { target: "opacity", from: 1, to: 0, multiply: "baseOpacity" }
    ]
  },
  // ─── 循环 ───
  breathe: {
    easing: "linear",
    properties: [
      {
        target: "scaleX",
        segments: [
          { start: 0, end: 0.5, from: 1, to: 1.05, easing: "inOutQuad" },
          { start: 0.5, end: 1, from: 1.05, to: 1, easing: "inOutQuad" }
        ],
        multiply: "baseScaleX"
      },
      {
        target: "scaleY",
        segments: [
          { start: 0, end: 0.5, from: 1, to: 1.05, easing: "inOutQuad" },
          { start: 0.5, end: 1, from: 1.05, to: 1, easing: "inOutQuad" }
        ],
        multiply: "baseScaleY"
      }
    ]
  },
  flash: {
    easing: "linear",
    properties: [{
      target: "opacity",
      segments: [
        { start: 0, end: 0.5, from: 1, to: 0 },
        { start: 0.5, end: 1, from: 0, to: 1 }
      ],
      multiply: "baseOpacity"
    }]
  },
  zoom: {
    easing: "linear",
    properties: [
      {
        target: "scaleX",
        segments: [
          { start: 0, end: 0.5, from: 1, to: { param: "scale", default: 1.5 } },
          { start: 0.5, end: 1, from: { param: "scale", default: 1.5 }, to: 1 }
        ],
        multiply: "baseScaleX"
      },
      {
        target: "scaleY",
        segments: [
          { start: 0, end: 0.5, from: 1, to: { param: "scale", default: 1.5 } },
          { start: 0.5, end: 1, from: { param: "scale", default: 1.5 }, to: 1 }
        ],
        multiply: "baseScaleY"
      }
    ]
  },
  rotate: {
    easing: "linear",
    properties: [
      { target: "rotation", from: 0, to: { param: "rotationDegrees", default: 360 }, mode: "add" }
    ]
  },
  // ─── 飘浮 ───
  float: {
    easing: "linear",
    properties: [
      {
        target: "y",
        segments: [
          { start: 0, end: 0.5, from: 0, to: -8, easing: "inOutSine" },
          { start: 0.5, end: 1, from: -8, to: 0, easing: "inOutSine" }
        ],
        mode: "add"
      },
      {
        target: "x",
        segments: [
          { start: 0, end: 0.25, from: 0, to: 3, easing: "inOutSine" },
          { start: 0.25, end: 0.75, from: 3, to: -3, easing: "inOutSine" },
          { start: 0.75, end: 1, from: -3, to: 0, easing: "inOutSine" }
        ],
        mode: "add"
      }
    ]
  },
  // ─── 螺旋 ───
  spiralIn: {
    easing: "outQuad",
    properties: [
      { target: "scaleX", from: 0, to: 1, multiply: "baseScaleX" },
      { target: "scaleY", from: 0, to: 1, multiply: "baseScaleY" },
      { target: "rotation", from: 360, to: 0, mode: "add" },
      { target: "opacity", from: 0, to: 1, multiply: "baseOpacity" }
    ]
  },
  spiralOut: {
    easing: "inQuad",
    properties: [
      { target: "scaleX", from: 1, to: 0, multiply: "baseScaleX" },
      { target: "scaleY", from: 1, to: 0, multiply: "baseScaleY" },
      { target: "rotation", from: 0, to: 720, mode: "add" },
      { target: "opacity", from: 1, to: 0, multiply: "baseOpacity" }
    ]
  }
};

// ../../shared/keyframes/interpolate.ts
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function interpolate(value, inputRange, outputRange, options) {
  const len = inputRange.length;
  if (len < 2 || outputRange.length < 2) {
    throw new Error("interpolate: inputRange and outputRange must have at least 2 elements");
  }
  if (len !== outputRange.length) {
    throw new Error("interpolate: inputRange and outputRange must have the same length");
  }
  const extraLeft = options?.extrapolateLeft ?? "clamp";
  const extraRight = options?.extrapolateRight ?? "clamp";
  const easing = options?.easing;
  const inMin = inputRange[0];
  const inMax = inputRange[len - 1];
  if (value < inMin) {
    return extrapolateValue(value, inputRange, outputRange, easing, extraLeft, "left");
  }
  if (value > inMax) {
    return extrapolateValue(value, inputRange, outputRange, easing, extraRight, "right");
  }
  const segIdx = findSegment(value, inputRange);
  return interpolateSegment(value, inputRange, outputRange, segIdx, easing);
}
function findSegment(value, inputRange) {
  let lo = 0;
  let hi = inputRange.length - 2;
  while (lo < hi) {
    const mid = lo + hi >>> 1;
    if (inputRange[mid + 1] < value) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}
function interpolateSegment(value, inputRange, outputRange, segIdx, easing) {
  const inStart = inputRange[segIdx];
  const inEnd = inputRange[segIdx + 1];
  const outStart = outputRange[segIdx];
  const outEnd = outputRange[segIdx + 1];
  const segLen = inEnd - inStart;
  if (segLen === 0) return outStart;
  let t = (value - inStart) / segLen;
  if (easing) t = easing(t);
  return outStart + (outEnd - outStart) * t;
}
function extrapolateValue(value, inputRange, outputRange, easing, mode, side) {
  switch (mode) {
    case "clamp":
      return side === "left" ? outputRange[0] : outputRange[outputRange.length - 1];
    case "identity":
      return value;
    case "extend": {
      const segIdx = side === "left" ? 0 : inputRange.length - 2;
      const inStart = inputRange[segIdx];
      const inEnd = inputRange[segIdx + 1];
      const outStart = outputRange[segIdx];
      const outEnd = outputRange[segIdx + 1];
      const segLen = inEnd - inStart;
      if (segLen === 0) return outStart;
      const slope = (outEnd - outStart) / segLen;
      const anchor = side === "left" ? inStart : inEnd;
      const anchorOut = side === "left" ? outStart : outEnd;
      return anchorOut + slope * (value - anchor);
    }
    case "wrap": {
      const inMin = inputRange[0];
      const inMax = inputRange[inputRange.length - 1];
      const range = inMax - inMin;
      if (range === 0) return outputRange[0];
      const wrapped = inMin + ((value - inMin) % range + range) % range;
      return interpolate(wrapped, inputRange, outputRange, {
        easing,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp"
      });
    }
    default:
      return side === "left" ? outputRange[0] : outputRange[outputRange.length - 1];
  }
}

// ../../shared/animations/animationEngine.ts
function getOrCacheEasing(obj) {
  if (obj._cachedEasingFn) return obj._cachedEasingFn;
  const fn = resolveEasing(obj.easing);
  obj._cachedEasingFn = fn;
  return fn;
}
function resolveValue(val, animationProperties) {
  if (typeof val === "number") return val;
  return animationProperties?.[val.param] ?? val.default;
}
function interpolateSegments(segments, rawProgress, animationProperties, globalEasing) {
  for (const seg of segments) {
    if (rawProgress >= seg.start && rawProgress <= seg.end) {
      const segEasing = seg.easing ? getOrCacheEasing(seg) : globalEasing;
      return interpolate(
        rawProgress,
        [seg.start, seg.end],
        [resolveValue(seg.from, animationProperties), resolveValue(seg.to, animationProperties)],
        { easing: segEasing }
      );
    }
  }
  if (segments.length > 0) {
    if (rawProgress < segments[0].start) {
      return resolveValue(segments[0].from, animationProperties);
    }
    const last = segments[segments.length - 1];
    return resolveValue(last.to, animationProperties);
  }
  return 0;
}
function applyAnimationSpec(props, spec, clamped, animationProperties, ctx) {
  const defaultEasing = getOrCacheEasing(spec);
  for (const prop of spec.properties) {
    let value;
    if (prop.segments) {
      value = interpolateSegments(prop.segments, clamped, animationProperties, defaultEasing);
    } else {
      const eased = ctx.ease(clamped, defaultEasing);
      const from = prop.from !== void 0 ? resolveValue(prop.from, animationProperties) : 0;
      const to = prop.to !== void 0 ? resolveValue(prop.to, animationProperties) : 0;
      value = lerp(from, to, eased);
    }
    if (prop.multiply) {
      value *= ctx[prop.multiply];
    }
    if (prop.mode === "add") {
      props[prop.target] = (props[prop.target] ?? 0) + value;
    } else {
      props[prop.target] = value;
    }
  }
  if (spec.customRender) {
    props[spec.customRender.typeKey] = spec.customRender.typeValue;
  }
}

// ../../shared/animations/canvas2dEffects.ts
function applyIrisClip(ctx, width, height, progress) {
  const p = Math.max(0, Math.min(1, progress));
  const maxRadius = Math.sqrt(width * width + height * height) / 2;
  const currentRadius = maxRadius * p;
  ctx.beginPath();
  ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
  ctx.clip();
}
function applyCurtainClip(ctx, width, height, progress) {
  const p = Math.max(0, Math.min(1, progress));
  const clipWidth = width * p / 2;
  ctx.beginPath();
  ctx.rect(-width / 2, -height / 2, clipWidth, height);
  ctx.rect(width / 2 - clipWidth, -height / 2, clipWidth, height);
  ctx.clip();
}
function applyWipeClip(ctx, width, height, progress, direction) {
  const dir = direction === "top" ? "up" : direction === "bottom" ? "down" : direction;
  const p = Math.max(0, Math.min(1, progress));
  const w = width;
  const h = height;
  ctx.beginPath();
  switch (dir) {
    case "left":
      ctx.rect(-w / 2, -h / 2, w * p, h);
      break;
    case "right":
      ctx.rect(w / 2 - w * p, -h / 2, w * p, h);
      break;
    case "up":
      ctx.rect(-w / 2, -h / 2, w, h * p);
      break;
    case "down":
      ctx.rect(-w / 2, h / 2 - h * p, w, h * p);
      break;
    case "top-left":
      ctx.moveTo(-w / 2, -h / 2);
      ctx.lineTo(-w / 2 + w * p, -h / 2);
      ctx.lineTo(-w / 2, -h / 2 + h * p);
      ctx.closePath();
      break;
    case "top-right":
      ctx.moveTo(w / 2, -h / 2);
      ctx.lineTo(w / 2 - w * p, -h / 2);
      ctx.lineTo(w / 2, -h / 2 + h * p);
      ctx.closePath();
      break;
    case "bottom-left":
      ctx.moveTo(-w / 2, h / 2);
      ctx.lineTo(-w / 2 + w * p, h / 2);
      ctx.lineTo(-w / 2, h / 2 - h * p);
      ctx.closePath();
      break;
    case "bottom-right":
      ctx.moveTo(w / 2, h / 2);
      ctx.lineTo(w / 2 - w * p, h / 2);
      ctx.lineTo(w / 2, h / 2 - h * p);
      ctx.closePath();
      break;
    default:
      ctx.rect(-w / 2, -h / 2, w, h);
      break;
  }
  ctx.clip();
}
function apply3DRotation(ctx, rotateX, rotateY, width, height) {
  const angleX = rotateX * Math.PI / 180;
  const angleY = rotateY * Math.PI / 180;
  const cosX = Math.cos(angleX);
  const sinX = Math.sin(angleX);
  const cosY = Math.cos(angleY);
  const sinY = Math.sin(angleY);
  const perspectiveFactor = PERSPECTIVE.FLIP_FACTOR;
  if (rotateY !== 0) {
    const skewY = -sinY * perspectiveFactor * height;
    ctx.transform(cosY, 0, skewY, 1, 0, 0);
  }
  if (rotateX !== 0) {
    const skewX = -sinX * perspectiveFactor * width;
    ctx.transform(1, skewX, 0, cosX, 0, 0);
  }
}
function calculatePixelateDownsample(width, height, pixelSize) {
  const factor = Math.max(1, pixelSize);
  const pixelWidth = Math.max(1, Math.floor(width / factor));
  const pixelHeight = Math.max(1, Math.floor(height / factor));
  return { factor, pixelWidth, pixelHeight };
}
function calculateDissolvePixelSize(progress) {
  return Math.floor(progress * 20) + 1;
}
function renderPixelated(ctx, sourceCanvas, width, height) {
  const prevSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sourceCanvas, -width / 2, -height / 2, width, height);
  ctx.imageSmoothingEnabled = prevSmoothing;
}
function renderGlitchRGBSplit(ctx, sourceCanvas, width, height, rgbSplit) {
  const alpha = ctx.globalAlpha;
  ctx.save();
  ctx.globalAlpha = alpha * 0.4;
  ctx.drawImage(sourceCanvas, -width / 2 - rgbSplit, -height / 2, width, height);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = alpha * 0.4;
  ctx.drawImage(sourceCanvas, -width / 2 + rgbSplit, -height / 2, width, height);
  ctx.restore();
  ctx.globalAlpha = alpha;
  ctx.drawImage(sourceCanvas, -width / 2, -height / 2, width, height);
}

// ../../shared/animations/easingFunctions.ts
var easingFunctions = {
  linear: EASING.linear,
  easeInQuad: EASING.inQuad,
  easeOutQuad: EASING.outQuad,
  easeInOutQuad: EASING.inOutQuad,
  easeInBack: EASING.inBack,
  easeOutBack: EASING.outBack,
  easeInOutBack: EASING.inOutBack,
  easeOutElastic: EASING.outElastic,
  easeInElastic: EASING.inElastic,
  easeInOutElastic: EASING.inOutElastic,
  easeOutBounce: EASING.outBounce,
  easeInBounce: EASING.inBounce,
  easeInOutBounce: EASING.inOutBounce,
  spring: EASING.spring,
  springGentle: EASING.springGentle,
  springBouncy: EASING.springBouncy,
  springStiff: EASING.springStiff
};
function getEasingFunction(name) {
  return easingFunctions[name] || resolveEasing(name);
}

// ../../shared/animations/animationConfig.ts
var EMPHASIS_ANIMATIONS = {
  pulse: {
    name: "Pulse",
    defaultDuration: 2e3,
    easing: "easeInOutQuad",
    keyframes: [
      { progress: 0, scale: 1 },
      { progress: 0.5, scale: 1.1 },
      { progress: 1, scale: 1 }
    ],
    parameters: {
      scale: 1.1
    }
  },
  swing: {
    name: "Swing",
    defaultDuration: 2e3,
    easing: "easeInOutQuad",
    keyframes: [
      { progress: 0, angle: 0 },
      { progress: 0.25, angle: 15 },
      { progress: 0.75, angle: -15 },
      { progress: 1, angle: 0 }
    ],
    parameters: {
      angle: 15
    }
  },
  wobble: {
    name: "Wobble",
    defaultDuration: 2e3,
    easing: "easeInOutQuad",
    keyframes: [
      { progress: 0, angle: 0, offsetX: 0 },
      { progress: 0.2, angle: -5, offsetX: -10 },
      { progress: 0.4, angle: 5, offsetX: 10 },
      { progress: 0.6, angle: -5, offsetX: -10 },
      { progress: 0.8, angle: 0, offsetX: 0 },
      { progress: 1, angle: 0, offsetX: 0 }
    ],
    parameters: {
      angle: 5,
      offsetX: 10
    }
  },
  heartbeat: {
    name: "Heartbeat",
    defaultDuration: 2e3,
    easing: "easeInOutQuad",
    keyframes: [
      { progress: 0, scale: 1 },
      { progress: 0.2, scale: 1.15 },
      { progress: 0.3, scale: 1 },
      { progress: 0.5, scale: 1.15 },
      { progress: 0.6, scale: 1 },
      { progress: 1, scale: 1 }
    ],
    parameters: {
      beatScale: 1.15
    }
  },
  bounce: {
    name: "Bounce",
    defaultDuration: 2e3,
    easing: "easeOutBounce",
    keyframes: [
      { progress: 0, offsetY: -80 },
      { progress: 1, offsetY: 0 }
    ],
    parameters: {
      bounceHeight: 80
    }
  },
  typewriter: {
    name: "Typewriter",
    defaultDuration: 3e3,
    easing: "linear",
    keyframes: [
      { progress: 0, charProgress: 0 },
      { progress: 1, charProgress: 1 }
    ],
    parameters: {
      charDelay: 50
      // 每个字符之间的延迟（毫秒）
    }
  },
  rubberBand: {
    name: "Rubber Band",
    defaultDuration: 2e3,
    easing: "easeInOutQuad",
    keyframes: [
      { progress: 0, scaleX: 1, scaleY: 1 },
      { progress: 0.3, scaleX: 1.25, scaleY: 0.75 },
      { progress: 0.4, scaleX: 0.75, scaleY: 1.25 },
      { progress: 0.5, scaleX: 1.15, scaleY: 0.85 },
      { progress: 0.65, scaleX: 0.95, scaleY: 1.05 },
      { progress: 0.75, scaleX: 1.05, scaleY: 0.95 },
      { progress: 1, scaleX: 1, scaleY: 1 }
    ],
    parameters: {
      maxStretchX: 1.25,
      maxStretchY: 1.25
    }
  },
  jello: {
    name: "Jello",
    defaultDuration: 2e3,
    easing: "easeInOutQuad",
    keyframes: [
      { progress: 0, skewX: 0, skewY: 0 },
      { progress: 0.111, skewX: -12.5, skewY: -12.5 },
      { progress: 0.222, skewX: 6.25, skewY: 6.25 },
      { progress: 0.333, skewX: -3.125, skewY: -3.125 },
      { progress: 0.444, skewX: 1.5625, skewY: 1.5625 },
      { progress: 0.555, skewX: -0.78125, skewY: -0.78125 },
      { progress: 0.666, skewX: 0.390625, skewY: 0.390625 },
      { progress: 0.777, skewX: -0.1953125, skewY: -0.1953125 },
      { progress: 1, skewX: 0, skewY: 0 }
    ],
    parameters: {
      maxSkew: 12.5
    }
  },
  tada: {
    name: "Tada",
    defaultDuration: 2e3,
    easing: "easeInOutQuad",
    keyframes: [
      { progress: 0, scale: 1, angle: 0 },
      { progress: 0.1, scale: 0.9, angle: -3 },
      { progress: 0.2, scale: 0.9, angle: -3 },
      { progress: 0.3, scale: 1.1, angle: 3 },
      { progress: 0.4, scale: 1.1, angle: -3 },
      { progress: 0.5, scale: 1.1, angle: 3 },
      { progress: 0.6, scale: 1.1, angle: -3 },
      { progress: 0.7, scale: 1.1, angle: 3 },
      { progress: 0.8, scale: 1.1, angle: -3 },
      { progress: 0.9, scale: 1.1, angle: 3 },
      { progress: 1, scale: 1, angle: 0 }
    ],
    parameters: {
      celebrationScale: 1.1,
      celebrationAngle: 3
    }
  },
  glow: {
    name: "Glow",
    defaultDuration: 2e3,
    easing: "easeInOutQuad",
    keyframes: [
      { progress: 0, opacity: 1, scale: 1 },
      { progress: 0.5, opacity: 0.7, scale: 1.05 },
      { progress: 1, opacity: 1, scale: 1 }
    ],
    parameters: {
      glowIntensity: 0.3,
      glowScale: 1.05
    }
  }
};
function getAnimationConfig(type) {
  return EMPHASIS_ANIMATIONS[type];
}

// ../../shared/animations/animationCalculators.ts
var _resolvedCache = /* @__PURE__ */ new Map();
function getResolvedConfig(type) {
  let resolved = _resolvedCache.get(type);
  if (resolved !== void 0) return resolved;
  const config = getAnimationConfig(type);
  if (!config) {
    _resolvedCache.set(type, null);
    return null;
  }
  resolved = { config, easing: getEasingFunction(config.easing) };
  _resolvedCache.set(type, resolved);
  return resolved;
}
function interpolateKeyframes(keyframes, progress, property, easing) {
  const len = keyframes.length;
  if (len === 0) return 0;
  if (progress <= keyframes[0].progress) return keyframes[0][property] ?? 0;
  if (progress >= keyframes[len - 1].progress) return keyframes[len - 1][property] ?? 0;
  let lo = 0;
  let hi = len - 1;
  while (lo < hi) {
    const mid = lo + hi + 1 >>> 1;
    if (keyframes[mid].progress <= progress) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  const current = keyframes[lo];
  const next = keyframes[lo + 1];
  if (!next) return current[property] ?? 0;
  const localProgress = (progress - current.progress) / (next.progress - current.progress);
  const eased = easing(localProgress);
  const currentValue = current[property] ?? 0;
  const nextValue = next[property] ?? 0;
  return currentValue + (nextValue - currentValue) * eased;
}
function calculatePulseScale(progress, scale = 1.1) {
  const resolved = getResolvedConfig("pulse");
  if (!resolved) return 1;
  const interpolated = interpolateKeyframes(resolved.config.keyframes, progress % 1, "scale", resolved.easing);
  const defaultScale = resolved.config.parameters.scale;
  if (scale === defaultScale || defaultScale === 1) return interpolated;
  return 1 + (interpolated - 1) * (scale - 1) / (defaultScale - 1);
}
function calculateSwingAngle(progress, baseAngle = 0, swingAngle = 15) {
  const resolved = getResolvedConfig("swing");
  if (!resolved) return baseAngle;
  const interpolated = interpolateKeyframes(resolved.config.keyframes, progress % 1, "angle", resolved.easing);
  const defaultAngle = resolved.config.parameters.angle;
  if (swingAngle === defaultAngle || defaultAngle === 0) return baseAngle + interpolated;
  return baseAngle + interpolated * (swingAngle / defaultAngle);
}
function calculateWobbleState(progress, baseAngle = 0, baseX = 0) {
  const resolved = getResolvedConfig("wobble");
  if (!resolved) return { angle: baseAngle, x: baseX };
  const clamped = progress % 1;
  return {
    angle: baseAngle + interpolateKeyframes(resolved.config.keyframes, clamped, "angle", resolved.easing),
    x: baseX + interpolateKeyframes(resolved.config.keyframes, clamped, "offsetX", resolved.easing)
  };
}
function calculateHeartbeatScale(progress, beatScale = 1.15) {
  const resolved = getResolvedConfig("heartbeat");
  if (!resolved) return 1;
  const interpolated = interpolateKeyframes(resolved.config.keyframes, progress % 1, "scale", resolved.easing);
  const defaultBeatScale = resolved.config.parameters.beatScale;
  if (beatScale === defaultBeatScale || defaultBeatScale === 1) return interpolated;
  return 1 + (interpolated - 1) * (beatScale - 1) / (defaultBeatScale - 1);
}
function calculateBounceOffset(progress, bounceHeight = 80) {
  const resolved = getResolvedConfig("bounce");
  if (!resolved) return 0;
  const easedProgress = resolved.easing(progress % 1);
  return -bounceHeight * (1 - easedProgress);
}
function calculateTypewriterProgress(progress, totalChars) {
  const resolved = getResolvedConfig("typewriter");
  if (!resolved) return totalChars;
  return Math.floor(Math.max(0, Math.min(1, progress)) * totalChars);
}
function calculateRubberBandScale(progress) {
  const resolved = getResolvedConfig("rubberBand");
  if (!resolved) return { scaleX: 1, scaleY: 1 };
  const clamped = progress % 1;
  return {
    scaleX: interpolateKeyframes(resolved.config.keyframes, clamped, "scaleX", resolved.easing),
    scaleY: interpolateKeyframes(resolved.config.keyframes, clamped, "scaleY", resolved.easing)
  };
}
function calculateJelloSkew(progress) {
  const resolved = getResolvedConfig("jello");
  if (!resolved) return { skewX: 0, skewY: 0 };
  const clamped = progress % 1;
  return {
    skewX: interpolateKeyframes(resolved.config.keyframes, clamped, "skewX", resolved.easing),
    skewY: interpolateKeyframes(resolved.config.keyframes, clamped, "skewY", resolved.easing)
  };
}
function calculateTadaState(progress) {
  const resolved = getResolvedConfig("tada");
  if (!resolved) return { scale: 1, angle: 0 };
  const clamped = progress % 1;
  return {
    scale: interpolateKeyframes(resolved.config.keyframes, clamped, "scale", resolved.easing),
    angle: interpolateKeyframes(resolved.config.keyframes, clamped, "angle", resolved.easing)
  };
}
function calculateGlowState(progress) {
  const resolved = getResolvedConfig("glow");
  if (!resolved) return { opacity: 1, scale: 1 };
  const clamped = progress % 1;
  return {
    opacity: interpolateKeyframes(resolved.config.keyframes, clamped, "opacity", resolved.easing),
    scale: interpolateKeyframes(resolved.config.keyframes, clamped, "scale", resolved.easing)
  };
}

// ../../shared/animations/animationHandlers.ts
var easeOutQuad = easingFunctions.easeOutQuad;
var easeInQuad = easingFunctions.easeInQuad;
var easeInOutQuad = easingFunctions.easeInOutQuad;
var easeOutBack = easingFunctions.easeOutBack;
var easeInBack = easingFunctions.easeInBack;
var easeOutElastic = easingFunctions.easeOutElastic;
var linear = EASING.linear;
var handleSlideIn = (props, animation, clamped, _raw, ctx) => {
  const useClip = !!animation.properties?.useClipPath;
  const dir = animation.properties?.direction || "left";
  const targetX = props.x;
  const targetY = props.y;
  const startX = dir === "left" ? -props.width : dir === "right" ? ctx.canvasWidth : targetX;
  const startY = dir === "top" ? -props.height : dir === "bottom" ? ctx.canvasHeight : targetY;
  const eased = ctx.ease(clamped, easeOutQuad);
  if (!useClip) {
    props.x = startX + (targetX - startX) * eased;
    props.y = startY + (targetY - startY) * eased;
  } else {
    props[ANIM_PROPS.WIPE_DIR] = dir;
    props[ANIM_PROPS.WIPE_PROGRESS] = eased;
    props._wipeGroup = "in";
  }
  props.opacity = ctx.baseOpacity * eased;
  const scaleProgress = 0.95 + 0.05 * eased;
  props.scaleX = ctx.baseScaleX * scaleProgress;
  props.scaleY = ctx.baseScaleY * scaleProgress;
};
var handleSlideOut = (props, animation, clamped, _raw, ctx) => {
  const useClip = !!animation.properties?.useClipPath;
  const dir = animation.properties?.direction || "left";
  const eased = ctx.ease(clamped, easeInOutQuad);
  if (useClip) {
    props[ANIM_PROPS.WIPE_DIR] = dir;
    props[ANIM_PROPS.WIPE_PROGRESS] = 1 - eased;
    props._wipeGroup = "out";
    props.opacity = ctx.baseOpacity * (1 - eased);
  } else {
    const slideDistance = Math.max(ctx.canvasWidth, ctx.canvasHeight) + Math.max(props.width, props.height);
    const targetX = props.x;
    const targetY = props.y;
    let endOffsetX = 0, endOffsetY = 0;
    switch (dir) {
      case "left":
        endOffsetX = -slideDistance;
        break;
      case "right":
        endOffsetX = slideDistance;
        break;
      case "top":
        endOffsetY = -slideDistance;
        break;
      case "bottom":
        endOffsetY = slideDistance;
        break;
    }
    props.x = targetX + endOffsetX * eased;
    props.y = targetY + endOffsetY * eased;
    props.opacity = ctx.baseOpacity * (1 - eased);
  }
};
var handleRotateIn = (props, animation, clamped, _raw, ctx) => {
  const rotationDegrees = animation.properties?.rotationDegrees ?? 180;
  const direction = animation.properties?.direction ?? "clockwise";
  const baseRotation = props.rotation ?? 0;
  const startAngle = direction === "clockwise" ? baseRotation + rotationDegrees : baseRotation - rotationDegrees;
  const eased = ctx.ease(clamped, easeOutBack);
  props.rotation = startAngle + (baseRotation - startAngle) * eased;
  props.opacity = ctx.baseOpacity * eased;
  const scaleProgress = 0.3 + 0.7 * eased;
  props.scaleX = ctx.baseScaleX * scaleProgress;
  props.scaleY = ctx.baseScaleY * scaleProgress;
};
var handleRotateOut = (props, animation, clamped, _raw, ctx) => {
  const rotationDegrees = animation.properties?.rotationDegrees ?? 180;
  const direction = animation.properties?.direction ?? "clockwise";
  const baseRotation = props.rotation ?? 0;
  const endAngle = direction === "clockwise" ? baseRotation + rotationDegrees : baseRotation - rotationDegrees;
  const eased = ctx.ease(clamped, easeInBack);
  props.rotation = baseRotation + (endAngle - baseRotation) * eased;
  props.opacity = ctx.baseOpacity * (1 - eased);
  const scaleProgress = 1 - 0.7 * eased;
  props.scaleX = ctx.baseScaleX * scaleProgress;
  props.scaleY = ctx.baseScaleY * scaleProgress;
};
var handleFlipIn = (props, animation, clamped, _raw, ctx) => {
  const direction = animation.properties?.direction || "horizontal";
  const easedFlip = ctx.ease(clamped, easeOutBack);
  if (direction === "horizontal") {
    props[ANIM_PROPS.ROTATE_Y] = 90 * (1 - easedFlip);
  } else {
    props[ANIM_PROPS.ROTATE_X] = 90 * (1 - easedFlip);
  }
  props.opacity = ctx.baseOpacity * easedFlip;
};
var handleFlipOut = (props, animation, clamped, _raw, ctx) => {
  const direction = animation.properties?.direction || "horizontal";
  const easedFlip = ctx.ease(clamped, easeInBack);
  if (direction === "horizontal") {
    props[ANIM_PROPS.ROTATE_Y] = 90 * easedFlip;
  } else {
    props[ANIM_PROPS.ROTATE_X] = 90 * easedFlip;
  }
  props.opacity = ctx.baseOpacity * (1 - easedFlip);
};
var handleBounceIn = (props, _anim, clamped, _raw, ctx) => {
  const eased = ctx.ease(clamped, easeOutElastic);
  const scaleMultiplier = interpolate(clamped, [0, 0.25, 0.5, 0.75, 1], [0, 1.2, 0.9, 1.1, 1]);
  props.scaleX = ctx.baseScaleX * scaleMultiplier;
  props.scaleY = ctx.baseScaleY * scaleMultiplier;
  props.opacity = ctx.baseOpacity * eased;
};
var handleBounceOut = (props, _anim, clamped, _raw, ctx) => {
  const eased = ctx.ease(clamped, easeInQuad);
  const scaleMultiplier = Math.max(0, interpolate(clamped, [0, 0.25, 0.5, 0.75, 1], [1, 1.1, 0.9, 0.3, 0]));
  props.scaleX = ctx.baseScaleX * scaleMultiplier;
  props.scaleY = ctx.baseScaleY * scaleMultiplier;
  props.opacity = ctx.baseOpacity * (1 - eased);
};
var handleMorphIn = (props, _anim, clamped, _raw, ctx) => {
  const easedMorph = ctx.ease(clamped, easeInOutQuad);
  let scaleX, scaleY;
  if (clamped < 0.5) {
    const p = clamped * 2;
    scaleX = ctx.baseScaleX * p;
    scaleY = ctx.baseScaleY * p;
  } else {
    const p = (clamped - 0.5) * 2;
    scaleX = ctx.baseScaleX * (0.8 + 0.2 * p);
    scaleY = ctx.baseScaleY * (1.2 - 0.2 * p);
  }
  props.scaleX = scaleX;
  props.scaleY = scaleY;
  props.opacity = ctx.baseOpacity * easedMorph;
};
var handleGlitch = (props, animation, clamped, _raw, ctx) => {
  const easedGlitch = ctx.ease(clamped, easeInOutQuad);
  const glitchIntensity = animation.properties?.intensity ?? 10;
  const glitchPhase = Math.floor(clamped * 8) % 2;
  if (glitchPhase === 0) {
    const pseudoRandX = Math.abs(Math.sin(clamped * 12.9898 + 78.233) * 43758.5453 % 1) - 0.5;
    const pseudoRandY = Math.abs(Math.sin(clamped * 45.164 + 94.673) * 43758.5453 % 1) - 0.5;
    props[ANIM_PROPS.GLITCH_OFFSET_X] = pseudoRandX * glitchIntensity * (1 - easedGlitch);
    props[ANIM_PROPS.GLITCH_OFFSET_Y] = pseudoRandY * glitchIntensity * (1 - easedGlitch);
    props[ANIM_PROPS.RGB_SPLIT] = glitchIntensity * 0.5 * (1 - easedGlitch);
  } else {
    props[ANIM_PROPS.GLITCH_OFFSET_X] = 0;
    props[ANIM_PROPS.GLITCH_OFFSET_Y] = 0;
    props[ANIM_PROPS.RGB_SPLIT] = 0;
  }
  if (animation.group === "in") {
    props.opacity = ctx.baseOpacity * easedGlitch;
  } else if (animation.group === "out") {
    props.opacity = ctx.baseOpacity * (1 - easedGlitch);
  }
};
var handleDissolveOut = (props, _anim, clamped, _raw, ctx) => {
  const eased = ctx.ease(clamped, linear);
  props[ANIM_PROPS.DISSOLVE_PROGRESS] = eased;
  const pixelSize = calculateDissolvePixelSize(eased);
  if (pixelSize > 1) {
    props[ANIM_PROPS.PIXEL_SIZE] = pixelSize;
  }
  props.opacity = ctx.baseOpacity * (1 - eased);
};
var handlePulse = (props, animation, _clamped, progressRaw, { baseScaleX, baseScaleY }) => {
  const pulseScale = animation.properties?.scale ?? 1.1;
  const scale = calculatePulseScale(progressRaw, pulseScale);
  props.scaleX = baseScaleX * scale;
  props.scaleY = baseScaleY * scale;
};
var handleSwing = (props, animation, _clamped, progressRaw) => {
  const swingAngle = animation.properties?.angle ?? 15;
  const baseRotation = props.rotation ?? 0;
  props.rotation = calculateSwingAngle(progressRaw, baseRotation, swingAngle);
};
var handleWobble = (props, _anim, _clamped, progressRaw) => {
  const baseRotation = props.rotation ?? 0;
  const baseX = props.x;
  const state = calculateWobbleState(progressRaw, baseRotation, baseX);
  props.rotation = state.angle;
  props.x = state.x;
};
var handleHeartbeat = (props, animation, _clamped, progressRaw, { baseScaleX, baseScaleY }) => {
  const beatScale = animation.properties?.beatScale ?? 1.15;
  const scale = calculateHeartbeatScale(progressRaw, beatScale);
  props.scaleX = baseScaleX * scale;
  props.scaleY = baseScaleY * scale;
};
var handleBounce = (props, animation, _clamped, progressRaw) => {
  const bounceHeight = animation.properties?.bounceHeight ?? 80;
  const baseY = props.y;
  const offsetY = calculateBounceOffset(progressRaw, bounceHeight);
  props.y = baseY + offsetY;
};
var handleRubberBand = (props, _anim, _clamped, progressRaw, { baseScaleX, baseScaleY }) => {
  const { scaleX, scaleY } = calculateRubberBandScale(progressRaw);
  props.scaleX = baseScaleX * scaleX;
  props.scaleY = baseScaleY * scaleY;
};
var handleJello = (props, _anim, _clamped, progressRaw) => {
  const { skewX, skewY } = calculateJelloSkew(progressRaw);
  props.skewX = skewX;
  props.skewY = skewY;
};
var handleTada = (props, _anim, _clamped, progressRaw, { baseScaleX, baseScaleY }) => {
  const { scale, angle } = calculateTadaState(progressRaw);
  const baseRotation = props.rotation ?? 0;
  props.scaleX = baseScaleX * scale;
  props.scaleY = baseScaleY * scale;
  props.rotation = baseRotation + angle;
};
var handleGlow = (props, _anim, _clamped, progressRaw, { baseOpacity, baseScaleX, baseScaleY }) => {
  const { opacity, scale } = calculateGlowState(progressRaw);
  props.scaleX = baseScaleX * scale;
  props.scaleY = baseScaleY * scale;
  props.opacity = baseOpacity * opacity;
};
var handleTypewriter = (props, _anim, clamped) => {
  const fullText = props.text || "";
  const totalChars = fullText.length;
  if (totalChars > 0) {
    if (clamped >= 1) {
      props.text = fullText;
    } else {
      const visibleChars = calculateTypewriterProgress(clamped, totalChars);
      props.text = fullText.substring(0, visibleChars);
    }
  }
};
var handleShake = (props, animation, clamped) => {
  const shakeIntensity = animation.properties?.intensity ?? 30;
  const baseX = props.x;
  const factor = interpolate(clamped, [0, 0.2, 0.4, 0.6, 0.8, 1], [0, 0.8, -0.6, 0.4, -0.2, 0]);
  props.x = baseX + shakeIntensity * factor;
};
var ANIMATION_HANDLERS = {
  // 入场/出场 复杂动画
  slideIn: handleSlideIn,
  slideOut: handleSlideOut,
  rotateIn: handleRotateIn,
  rotateOut: handleRotateOut,
  flipIn: handleFlipIn,
  flipOut: handleFlipOut,
  bounceIn: handleBounceIn,
  bounceOut: handleBounceOut,
  morphIn: handleMorphIn,
  glitch: handleGlitch,
  dissolveOut: handleDissolveOut,
  // Emphasis 计算器动画
  pulse: handlePulse,
  swing: handleSwing,
  wobble: handleWobble,
  heartbeat: handleHeartbeat,
  bounce: handleBounce,
  rubberBand: handleRubberBand,
  jello: handleJello,
  tada: handleTada,
  glow: handleGlow,
  typewriter: handleTypewriter,
  // Loop 动画
  shake: handleShake
};

// ../../shared/keyframes/KeyframeInterpolator.ts
function findBracketingKeyframes(keyframes, time) {
  if (keyframes.length === 0) {
    return { from: null, to: null, localProgress: 0 };
  }
  if (keyframes.length === 1) {
    return { from: keyframes[0], to: null, localProgress: 0 };
  }
  if (time <= keyframes[0].time) {
    return { from: keyframes[0], to: null, localProgress: 0 };
  }
  if (time >= keyframes[keyframes.length - 1].time) {
    return { from: keyframes[keyframes.length - 1], to: null, localProgress: 0 };
  }
  let lo = 0;
  let hi = keyframes.length - 1;
  while (lo < hi) {
    const mid = lo + hi + 1 >>> 1;
    if (keyframes[mid].time <= time) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  const from = keyframes[lo];
  const to = keyframes[lo + 1];
  const duration = to.time - from.time;
  const localProgress = duration > 0 ? (time - from.time) / duration : 0;
  return { from, to, localProgress };
}
function interpolateValue(from, to, progress, easingName) {
  return interpolate(progress, [0, 1], [from, to], {
    easing: resolveEasing(easingName)
  });
}
function interpolatePropertiesObject(fromProps, toProps, progress, easingName) {
  const result = {};
  for (const k in fromProps) {
    const key = k;
    const fromValue = fromProps[key];
    if (fromValue === void 0) continue;
    const toValue = toProps[key];
    if (toValue !== void 0) {
      result[key] = interpolateValue(fromValue, toValue, progress, easingName);
    } else {
      result[key] = fromValue;
    }
  }
  for (const k in toProps) {
    const key = k;
    if (fromProps[key] !== void 0) continue;
    const toValue = toProps[key];
    if (toValue !== void 0) {
      result[key] = toValue;
    }
  }
  return result;
}
function interpolateKeyframeProperties(keyframes, time) {
  const bracket = findBracketingKeyframes(keyframes, time);
  if (!bracket.from) {
    return {};
  }
  if (!bracket.to) {
    return bracket.from.properties;
  }
  return interpolatePropertiesObject(
    bracket.from.properties,
    bracket.to.properties,
    bracket.localProgress,
    bracket.from.easing
  );
}

// ../../shared/animations/applyAnimation.ts
var SPECIAL_TEXT_CHAR_MAP = {
  highlight: { progressKey: "_popProgress", textKey: "_popText" },
  popIn: { progressKey: "_popProgress", textKey: "_popText" },
  popOut: { progressKey: "_popOutByCharacterProgress", textKey: "_popOutByCharacterText" }
};
function buildTextCharAnimationMap() {
  const map = {
    ...SPECIAL_TEXT_CHAR_MAP
  };
  for (const type of TEXT_ANIMATION_TYPES) {
    if (type === "typewriter" || map[type]) continue;
    map[type] = {
      progressKey: `_${type}Progress`,
      textKey: `_${type}Text`
    };
  }
  return map;
}
var _TEXT_CHAR_ANIMATION_MAP = buildTextCharAnimationMap();
var DEFAULT_EASE = (t, defaultFn) => defaultFn(t);
function convertSpeedToLoopDuration(storedDuration, baseDuration = 2e3) {
  const speedMultiplier = storedDuration / 1e3;
  return baseDuration / speedMultiplier;
}
function calculateAnimationProgress(localTime, start, animation, animDur, isEmphasisLoopAnimation) {
  if (isEmphasisLoopAnimation) {
    const singleCycleDuration = convertSpeedToLoopDuration(animation.duration);
    return singleCycleDuration > 0 ? (localTime - start) * 1e3 / singleCycleDuration : 0;
  }
  return animDur > 0 ? (localTime - start) / animDur : 0;
}
function applyAnimation(props, animation, localTime, canvasWidth, canvasHeight) {
  const totalDur = Math.max(0, props.duration ?? 0);
  const group = animation.group;
  const isEmphasisLoopAnimation = group === "emphasis";
  const animDur = isEmphasisLoopAnimation ? totalDur : Math.max(0, animation.duration ?? 0);
  const start = group === "out" ? Math.max(0, totalDur - animDur) : 0;
  if (localTime < start || animDur <= 0) {
    return props;
  }
  let progressRaw = calculateAnimationProgress(
    localTime,
    start,
    animation,
    animDur,
    isEmphasisLoopAnimation
  );
  if (group === "emphasis" && LOOP_ANIMATION_TYPES.has(animation.type)) {
    progressRaw = progressRaw % 1;
  }
  const clamped = Math.max(0, Math.min(1, progressRaw));
  const TEXT_CHAR_ANIM = _TEXT_CHAR_ANIMATION_MAP[animation.type];
  if (TEXT_CHAR_ANIM) {
    if (progressRaw >= 0 && progressRaw <= 1) {
      props[TEXT_CHAR_ANIM.progressKey] = clamped;
      props[TEXT_CHAR_ANIM.textKey] = props.text || "";
    }
    return props;
  }
  const customEasingFn = animation.easing ? resolveEasing(animation.easing) : void 0;
  const ctx = {
    canvasWidth,
    canvasHeight,
    baseOpacity: props.opacity ?? 1,
    baseScaleX: props.scaleX ?? 1,
    baseScaleY: props.scaleY ?? 1,
    ease: customEasingFn ? (t, _defaultFn) => customEasingFn(t) : DEFAULT_EASE
  };
  const spec = ANIMATION_REGISTRY[animation.type];
  if (spec) {
    applyAnimationSpec(props, spec, clamped, animation.properties, ctx);
    return props;
  }
  const handler = ANIMATION_HANDLERS[animation.type];
  if (handler) {
    handler(props, animation, clamped, progressRaw, ctx);
  }
  return props;
}
function applyKeyframeInterpolation(props, keyframeTracks, localTime, blockedProperties) {
  if (!keyframeTracks || keyframeTracks.length === 0) {
    return props;
  }
  const localTimeMs = localTime * 1e3;
  for (const track of keyframeTracks) {
    if (!track.enabled || track.keyframes.length === 0) {
      continue;
    }
    const interpolated = interpolateKeyframeProperties(track.keyframes, localTimeMs);
    applyInterpolatedProperties(props, interpolated, blockedProperties);
  }
  return props;
}
function applyInterpolatedProperties(props, interpolated, blockedProperties) {
  if (interpolated.scaleX !== void 0 && !blockedProperties?.has("scaleX")) {
    props.scaleX = interpolated.scaleX;
  }
  if (interpolated.scaleY !== void 0 && !blockedProperties?.has("scaleY")) {
    props.scaleY = interpolated.scaleY;
  }
  if (interpolated.x !== void 0 && !blockedProperties?.has("x")) {
    props.centerX = interpolated.x;
    if (props.width !== void 0) {
      const sx = props.scaleX ?? 1;
      props.x = interpolated.x - props.width * sx / 2;
    }
  }
  if (interpolated.y !== void 0 && !blockedProperties?.has("y")) {
    props.centerY = interpolated.y;
    if (props.height !== void 0) {
      const sy = props.scaleY ?? 1;
      props.y = interpolated.y - props.height * sy / 2;
    }
  }
  if (interpolated.rotation !== void 0 && !blockedProperties?.has("rotation")) {
    props.rotation = interpolated.rotation;
  }
  if (interpolated.opacity !== void 0 && !blockedProperties?.has("opacity")) {
    props.opacity = interpolated.opacity;
  }
  const filterKeys = ["brightness", "contrast", "saturation", "hue", "blur"];
  for (const key of filterKeys) {
    if (interpolated[key] !== void 0) {
      props[key] = interpolated[key];
    }
  }
}

// ../../server/src/renderer/animationUtils.ts
function applyAnimation2(props, animation, localTime, canvasWidth, canvasHeight) {
  return applyAnimation(props, animation, localTime, canvasWidth, canvasHeight);
}
function applyKeyframeInterpolation2(props, keyframeTracks, localTime, blockedProperties) {
  return applyKeyframeInterpolation(props, keyframeTracks, localTime, blockedProperties);
}

// ../../shared/transitions/transitionRegistry.ts
var TRANSITION_REGISTRY = {
  // ─── 基础 ───
  crossfade: {
    blendFn: blendCrossfade,
    defaultEasing: "inOutCubic",
    category: "basic",
    i18nKey: "transition_crossfade"
  },
  dissolve: {
    blendFn: blendDissolve,
    defaultEasing: "inOutCubic",
    category: "basic",
    i18nKey: "transition_dissolve"
  },
  blur: {
    blendFn: blendBlur,
    defaultEasing: "inOutCubic",
    category: "basic",
    i18nKey: "transition_blur"
  },
  fadeToBlack: {
    blendFn: blendFadeToColor,
    blendOptions: { color: "#000000" },
    defaultEasing: "inOutCubic",
    category: "basic",
    i18nKey: "transition_fade_to_black"
  },
  fadeToWhite: {
    blendFn: blendFadeToColor,
    blendOptions: { color: "#FFFFFF" },
    defaultEasing: "inOutCubic",
    category: "basic",
    i18nKey: "transition_fade_to_white"
  },
  pixelate: {
    blendFn: blendPixelate,
    defaultEasing: "inOutQuad",
    category: "basic",
    i18nKey: "transition_pixelate"
  },
  // ─── 擦除 ───
  wipeLeft: {
    blendFn: blendWipe,
    blendOptions: { direction: "left" },
    defaultEasing: "outCubic",
    category: "wipe",
    i18nKey: "transition_wipe_left"
  },
  wipeRight: {
    blendFn: blendWipe,
    blendOptions: { direction: "right" },
    defaultEasing: "outCubic",
    category: "wipe",
    i18nKey: "transition_wipe_right"
  },
  wipeUp: {
    blendFn: blendWipe,
    blendOptions: { direction: "up" },
    defaultEasing: "outCubic",
    category: "wipe",
    i18nKey: "transition_wipe_up"
  },
  wipeDown: {
    blendFn: blendWipe,
    blendOptions: { direction: "down" },
    defaultEasing: "outCubic",
    category: "wipe",
    i18nKey: "transition_wipe_down"
  },
  radialWipe: {
    blendFn: blendRadialWipe,
    defaultEasing: "outCubic",
    category: "wipe",
    i18nKey: "transition_radial_wipe"
  },
  // ─── 滑动 ───
  slideLeft: {
    blendFn: blendSlide,
    blendOptions: { direction: "left" },
    defaultEasing: "outCubic",
    category: "slide",
    i18nKey: "transition_slide_left"
  },
  slideRight: {
    blendFn: blendSlide,
    blendOptions: { direction: "right" },
    defaultEasing: "outCubic",
    category: "slide",
    i18nKey: "transition_slide_right"
  },
  slideUp: {
    blendFn: blendSlide,
    blendOptions: { direction: "up" },
    defaultEasing: "outCubic",
    category: "slide",
    i18nKey: "transition_slide_up"
  },
  slideDown: {
    blendFn: blendSlide,
    blendOptions: { direction: "down" },
    defaultEasing: "outCubic",
    category: "slide",
    i18nKey: "transition_slide_down"
  },
  // ─── 创意 ───
  irisOpen: {
    blendFn: blendIris,
    blendOptions: { mode: "open" },
    defaultEasing: "inOutCubic",
    category: "creative",
    i18nKey: "transition_iris_open"
  },
  irisClose: {
    blendFn: blendIris,
    blendOptions: { mode: "close" },
    defaultEasing: "inOutCubic",
    category: "creative",
    i18nKey: "transition_iris_close"
  },
  curtainOpen: {
    blendFn: blendCurtain,
    blendOptions: { mode: "open" },
    defaultEasing: "inOutCubic",
    category: "creative",
    i18nKey: "transition_curtain_open"
  },
  curtainClose: {
    blendFn: blendCurtain,
    blendOptions: { mode: "close" },
    defaultEasing: "inOutCubic",
    category: "creative",
    i18nKey: "transition_curtain_close"
  },
  zoomIn: {
    blendFn: blendZoom,
    blendOptions: { mode: "in" },
    defaultEasing: "inOutCubic",
    category: "creative",
    i18nKey: "transition_zoom_in"
  },
  zoomOut: {
    blendFn: blendZoom,
    blendOptions: { mode: "out" },
    defaultEasing: "inOutCubic",
    category: "creative",
    i18nKey: "transition_zoom_out"
  },
  glitch: {
    blendFn: blendGlitch,
    defaultEasing: "linear",
    category: "creative",
    i18nKey: "transition_glitch"
  }
};
var DERIVED_TRANSITION_TYPES = new Set(
  Object.keys(TRANSITION_REGISTRY)
);
var DERIVED_TRANSITION_CATEGORIES = (() => {
  const categories = {};
  for (const [type, desc] of Object.entries(TRANSITION_REGISTRY)) {
    (categories[desc.category] ??= []).push(type);
  }
  return categories;
})();
var DERIVED_TRANSITION_I18N_KEYS = (() => {
  const keys = {};
  for (const [type, desc] of Object.entries(TRANSITION_REGISTRY)) {
    keys[type] = desc.i18nKey;
  }
  return keys;
})();
var DERIVED_TRANSITION_DEFAULT_EASING = (() => {
  const easings = {};
  for (const [type, desc] of Object.entries(TRANSITION_REGISTRY)) {
    easings[type] = desc.defaultEasing;
  }
  return easings;
})();

// ../../shared/transitions/transitionEffects.ts
function blendCrossfade(ctx, sourceCanvas, targetCanvas, width, height, progress) {
  const p = Math.max(0, Math.min(1, progress));
  ctx.save();
  ctx.globalAlpha = 1 - p;
  ctx.drawImage(sourceCanvas, 0, 0, width, height);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = p;
  ctx.drawImage(targetCanvas, 0, 0, width, height);
  ctx.restore();
}
function blendWipe(ctx, sourceCanvas, targetCanvas, width, height, progress, options) {
  const p = Math.max(0, Math.min(1, progress));
  const direction = options?.direction || "left";
  ctx.drawImage(sourceCanvas, 0, 0, width, height);
  ctx.save();
  ctx.transform(1, 0, 0, 1, width / 2, height / 2);
  applyWipeClip(ctx, width, height, p, direction);
  ctx.transform(1, 0, 0, 1, -width / 2, -height / 2);
  ctx.drawImage(targetCanvas, 0, 0, width, height);
  ctx.restore();
}
var SLIDE_OFFSETS = {
  left: (w) => [-w, 0],
  right: (w) => [w, 0],
  up: (_w, h) => [0, -h],
  down: (_w, h) => [0, h]
};
function blendSlide(ctx, sourceCanvas, targetCanvas, width, height, progress, options) {
  const p = Math.max(0, Math.min(1, progress));
  const direction = options?.direction || "left";
  const getOffset = SLIDE_OFFSETS[direction] || SLIDE_OFFSETS.left;
  const [fullDx, fullDy] = getOffset(width, height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  const srcDx = fullDx * p;
  const srcDy = fullDy * p;
  ctx.drawImage(sourceCanvas, srcDx, srcDy, width, height);
  const tgtDx = -fullDx * (1 - p);
  const tgtDy = -fullDy * (1 - p);
  ctx.drawImage(targetCanvas, tgtDx, tgtDy, width, height);
  ctx.restore();
}
function blendIris(ctx, sourceCanvas, targetCanvas, width, height, progress, options) {
  const p = Math.max(0, Math.min(1, progress));
  const mode = options?.mode || "open";
  ctx.drawImage(mode === "open" ? sourceCanvas : targetCanvas, 0, 0, width, height);
  ctx.save();
  ctx.transform(1, 0, 0, 1, width / 2, height / 2);
  applyIrisClip(ctx, width, height, mode === "open" ? p : 1 - p);
  ctx.transform(1, 0, 0, 1, -width / 2, -height / 2);
  ctx.drawImage(mode === "open" ? targetCanvas : sourceCanvas, 0, 0, width, height);
  ctx.restore();
}
function blendCurtain(ctx, sourceCanvas, targetCanvas, width, height, progress, options) {
  const p = Math.max(0, Math.min(1, progress));
  const mode = options?.mode || "open";
  ctx.drawImage(mode === "open" ? sourceCanvas : targetCanvas, 0, 0, width, height);
  ctx.save();
  ctx.transform(1, 0, 0, 1, width / 2, height / 2);
  applyCurtainClip(ctx, width, height, mode === "open" ? p : 1 - p);
  ctx.transform(1, 0, 0, 1, -width / 2, -height / 2);
  ctx.drawImage(mode === "open" ? targetCanvas : sourceCanvas, 0, 0, width, height);
  ctx.restore();
}
function blendDissolve(ctx, sourceCanvas, targetCanvas, width, height, progress) {
  const p = Math.max(0, Math.min(1, progress));
  const pixelSize = calculateDissolvePixelSize(p);
  ctx.save();
  ctx.globalAlpha = 1 - p;
  ctx.drawImage(sourceCanvas, 0, 0, width, height);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = p;
  ctx.drawImage(targetCanvas, 0, 0, width, height);
  ctx.restore();
}
function blendPixelate(ctx, sourceCanvas, targetCanvas, width, height, progress) {
  blendCrossfade(ctx, sourceCanvas, targetCanvas, width, height, progress);
}
function blendBlur(ctx, sourceCanvas, targetCanvas, width, height, progress) {
  blendCrossfade(ctx, sourceCanvas, targetCanvas, width, height, progress);
}
function blendFadeToColor(ctx, sourceCanvas, targetCanvas, width, height, progress, options) {
  const p = Math.max(0, Math.min(1, progress));
  const color = options?.color || "#000000";
  if (ctx.fillRect && ctx.fillStyle !== void 0) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
  }
  if (p < 0.5) {
    const subP = p * 2;
    ctx.save();
    ctx.globalAlpha = 1 - subP;
    ctx.drawImage(sourceCanvas, 0, 0, width, height);
    ctx.restore();
  } else {
    const subP = (p - 0.5) * 2;
    ctx.save();
    ctx.globalAlpha = subP;
    ctx.drawImage(targetCanvas, 0, 0, width, height);
    ctx.restore();
  }
}
function blendRadialWipe(ctx, sourceCanvas, targetCanvas, width, height, progress) {
  const p = Math.max(0, Math.min(1, progress));
  ctx.drawImage(sourceCanvas, 0, 0, width, height);
  ctx.save();
  ctx.transform(1, 0, 0, 1, width / 2, height / 2);
  const maxRadius = Math.sqrt(width * width + height * height) / 2;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + Math.PI * 2 * p;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, maxRadius, startAngle, endAngle);
  ctx.closePath();
  ctx.clip();
  ctx.transform(1, 0, 0, 1, -width / 2, -height / 2);
  ctx.drawImage(targetCanvas, 0, 0, width, height);
  ctx.restore();
}
function blendGlitch(ctx, sourceCanvas, targetCanvas, width, height, progress) {
  const p = Math.max(0, Math.min(1, progress));
  const intensity = 1 - Math.abs(p * 2 - 1);
  const rgbOffset = Math.round(intensity * 12);
  const mainCanvas = p < 0.5 ? sourceCanvas : targetCanvas;
  const altCanvas = p < 0.5 ? targetCanvas : sourceCanvas;
  ctx.drawImage(mainCanvas, 0, 0, width, height);
  const sliceCount = Math.max(3, Math.round(intensity * 10));
  const sliceHeight = Math.max(1, Math.floor(height / sliceCount));
  for (let i = 0; i < sliceCount; i++) {
    const y = i * sliceHeight;
    const h = Math.min(sliceHeight, height - y);
    const displacement = Math.round(
      Math.sin(i * 7.3 + p * 23.7) * intensity * width * 0.06
    );
    if (Math.abs(displacement) < 1) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, width, h);
    ctx.clip();
    ctx.globalAlpha = intensity * 0.6;
    ctx.drawImage(altCanvas, displacement, 0, width, height);
    ctx.restore();
  }
  if (rgbOffset > 1) {
    ctx.save();
    ctx.globalAlpha = intensity * 0.25;
    ctx.drawImage(altCanvas, -rgbOffset, 0, width, height);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = intensity * 0.25;
    ctx.drawImage(altCanvas, rgbOffset, 0, width, height);
    ctx.restore();
  }
}
function blendZoom(ctx, sourceCanvas, targetCanvas, width, height, progress, options) {
  const p = Math.max(0, Math.min(1, progress));
  const mode = options?.mode || "in";
  if (mode === "in") {
    const sourceScale = 1 + p * 0.3;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    const sx = width * (1 - sourceScale) / 2;
    const sy = height * (1 - sourceScale) / 2;
    ctx.drawImage(sourceCanvas, sx, sy, width * sourceScale, height * sourceScale);
    ctx.restore();
    const targetScale = 0.7 + p * 0.3;
    ctx.save();
    ctx.globalAlpha = p;
    const tx = width * (1 - targetScale) / 2;
    const ty = height * (1 - targetScale) / 2;
    ctx.drawImage(targetCanvas, tx, ty, width * targetScale, height * targetScale);
    ctx.restore();
  } else {
    const sourceScale = 1 - p * 0.3;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    const sx = width * (1 - sourceScale) / 2;
    const sy = height * (1 - sourceScale) / 2;
    ctx.drawImage(sourceCanvas, sx, sy, width * sourceScale, height * sourceScale);
    ctx.restore();
    const targetScale = 1.3 - p * 0.3;
    ctx.save();
    ctx.globalAlpha = p;
    const tx = width * (1 - targetScale) / 2;
    const ty = height * (1 - targetScale) / 2;
    ctx.drawImage(targetCanvas, tx, ty, width * targetScale, height * targetScale);
    ctx.restore();
  }
}
function applyTransitionBlend(type, ctx, sourceCanvas, targetCanvas, width, height, progress) {
  const desc = TRANSITION_REGISTRY[type];
  if (desc) {
    desc.blendFn(ctx, sourceCanvas, targetCanvas, width, height, progress, desc.blendOptions);
  } else {
    blendCrossfade(ctx, sourceCanvas, targetCanvas, width, height, progress);
  }
}

// ../../shared/animations/effectApplicator.ts
function applyClipEffects(ctx, props, width, height) {
  const wipeDir = props[ANIM_PROPS.WIPE_DIR];
  const wipeProgress = props[ANIM_PROPS.WIPE_PROGRESS];
  if (wipeDir && wipeProgress !== void 0) {
    applyWipeClip(ctx, width, height, wipeProgress, wipeDir);
  }
  const irisProgress = props[ANIM_PROPS.IRIS_PROGRESS];
  if (irisProgress !== void 0 && props[ANIM_PROPS.IRIS_TYPE]) {
    applyIrisClip(ctx, width, height, irisProgress);
  }
  const curtainProgress = props[ANIM_PROPS.CURTAIN_PROGRESS];
  if (curtainProgress !== void 0 && props[ANIM_PROPS.CURTAIN_TYPE]) {
    applyCurtainClip(ctx, width, height, curtainProgress);
  }
}
function applyBlurFilter(ctx, blurAmount, scale = 1) {
  if (blurAmount > 0) {
    try {
      ctx.filter = `blur(${blurAmount * scale}px)`;
    } catch {
    }
  }
}
function detectActivePostEffects(props) {
  const dissolveProgress = props[ANIM_PROPS.DISSOLVE_PROGRESS] ?? 0;
  const pixelSize = props[ANIM_PROPS.PIXEL_SIZE] ?? 0;
  const rotateX = props[ANIM_PROPS.ROTATE_X] ?? 0;
  const rotateY = props[ANIM_PROPS.ROTATE_Y] ?? 0;
  const rgbSplit = props[ANIM_PROPS.RGB_SPLIT] ?? 0;
  const dissolve = dissolveProgress > 0;
  const pixelate = pixelSize > 0 && !dissolve;
  const flip3D = rotateX !== 0 || rotateY !== 0;
  const glitch = rgbSplit > 1;
  return {
    pixelate,
    pixelSize,
    dissolve,
    dissolveProgress,
    flip3D,
    rotateX,
    rotateY,
    glitch,
    rgbSplit,
    hasAny: pixelate || dissolve || flip3D || glitch
  };
}

// ../../shared/caption-animation/textSpacingUtils.ts
function charSpacingToPx(charSpacing, fontSize) {
  return charSpacing / 1e3 * fontSize;
}
function measureTextWithSpacing(ctx, text, spacingPx) {
  const graphemes = toGraphemes(text);
  if (graphemes.length <= 1) return ctx.measureText(text).width;
  let width = 0;
  for (const g of graphemes) {
    width += ctx.measureText(g).width;
  }
  width += (graphemes.length - 1) * spacingPx;
  return width;
}
function drawTextWithSpacing(ctx, text, x, y, textAlign, spacingPx, draw) {
  const graphemes = toGraphemes(text);
  if (graphemes.length === 0) return;
  const charWidths = new Array(graphemes.length);
  let totalWidth = 0;
  for (let i = 0; i < graphemes.length; i++) {
    charWidths[i] = ctx.measureText(graphemes[i]).width;
    totalWidth += charWidths[i];
  }
  totalWidth += (graphemes.length - 1) * spacingPx;
  let startX;
  if (textAlign === "center") {
    startX = x - totalWidth / 2;
  } else if (textAlign === "right") {
    startX = x - totalWidth;
  } else {
    startX = x;
  }
  const savedAlign = ctx.textAlign;
  ctx.textAlign = "left";
  let curX = startX;
  for (let i = 0; i < graphemes.length; i++) {
    draw(graphemes[i], curX, y);
    curX += charWidths[i] + spacingPx;
  }
  ctx.textAlign = savedAlign;
}
function fillTextWithSpacing(ctx, text, x, y, textAlign, spacingPx) {
  drawTextWithSpacing(
    ctx,
    text,
    x,
    y,
    textAlign,
    spacingPx,
    (g, gx, gy) => ctx.fillText(g, gx, gy)
  );
}
function strokeTextWithSpacing(ctx, text, x, y, textAlign, spacingPx) {
  drawTextWithSpacing(
    ctx,
    text,
    x,
    y,
    textAlign,
    spacingPx,
    (g, gx, gy) => ctx.strokeText(g, gx, gy)
  );
}
function createTextGradient(ctx, colors, width) {
  const gradient = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  return gradient;
}

// ../../shared/canvas/textDrawUtils.ts
function captureShadow(ctx) {
  return {
    shadowColor: ctx.shadowColor,
    shadowBlur: ctx.shadowBlur,
    shadowOffsetX: ctx.shadowOffsetX,
    shadowOffsetY: ctx.shadowOffsetY
  };
}
function restoreShadow(ctx, state) {
  ctx.shadowColor = state.shadowColor;
  ctx.shadowBlur = state.shadowBlur;
  ctx.shadowOffsetX = state.shadowOffsetX;
  ctx.shadowOffsetY = state.shadowOffsetY;
}
function disableShadow(ctx) {
  ctx.shadowColor = "rgba(0,0,0,0)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}
function setupStrokeLineProperties(ctx, strokeWidth, strokeColor) {
  ctx.lineWidth = strokeWidth;
  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";
  ctx.miterLimit = 4;
  ctx.strokeStyle = strokeColor;
}
function drawStrokeTextLines(ctx, lines, lineXs, lineYs, strokeColor, strokeWidth, textAlign, spacingPx = 0) {
  if (!(strokeWidth > 0 && strokeColor)) return;
  setupStrokeLineProperties(ctx, strokeWidth, strokeColor);
  if (spacingPx > 0) {
    for (let i = 0; i < lines.length; i++) {
      strokeTextWithSpacing(ctx, lines[i], lineXs[i], lineYs[i], textAlign || ctx.textAlign, spacingPx);
    }
  } else {
    for (let i = 0; i < lines.length; i++) {
      ctx.strokeText(lines[i], lineXs[i], lineYs[i]);
    }
  }
}
function drawTextDecorations(ctx, {
  underline,
  linethrough,
  textColor,
  textAlign,
  lineXs,
  lineYs,
  lineWs,
  fontSize
}) {
  if (!underline && !linethrough) return;
  const decorationLineWidth = Math.max(1, Math.round(fontSize / 15));
  setupStrokeLineProperties(ctx, decorationLineWidth, textColor);
  const crispY = (y, lw) => lw % 2 === 1 ? Math.round(y) + 0.5 : Math.round(y);
  for (let i = 0; i < lineWs.length; i++) {
    const lineW = lineWs[i];
    let startX = lineXs[i];
    if (textAlign === "center") startX = lineXs[i] - lineW / 2;
    else if (textAlign === "right") startX = lineXs[i] - lineW;
    if (underline) {
      const underlineY = crispY(
        lineYs[i] + fontSize * 0.1,
        decorationLineWidth
      );
      ctx.beginPath();
      ctx.moveTo(startX, underlineY);
      ctx.lineTo(startX + lineW, underlineY);
      ctx.stroke();
    }
    if (linethrough) {
      const throughY = crispY(lineYs[i] - fontSize * 0.315, decorationLineWidth);
      ctx.beginPath();
      ctx.moveTo(startX, throughY);
      ctx.lineTo(startX + lineW, throughY);
      ctx.stroke();
    }
  }
}

// ../../shared/canvas/textWrapUtils.ts
function wrapTextByGrapheme(text, maxWidth, ctx, spacingPx = 0) {
  if (!text || maxWidth <= 0) {
    return [text || ""];
  }
  const paragraphs = text.split("\n");
  const wrappedLines = [];
  for (const paragraph of paragraphs) {
    if (paragraph === "") {
      wrappedLines.push("");
      continue;
    }
    const paragraphWidth = spacingPx === 0 ? ctx.measureText(paragraph).width : measureTextWithSpacing(ctx, paragraph, spacingPx);
    if (paragraphWidth <= maxWidth) {
      wrappedLines.push(paragraph);
      continue;
    }
    const graphemes = toGraphemes(paragraph);
    let currentLine = "";
    for (let i = 0; i < graphemes.length; i++) {
      const char = graphemes[i];
      const testLine = currentLine + char;
      const testWidth = spacingPx === 0 ? ctx.measureText(testLine).width : measureTextWithSpacing(ctx, testLine, spacingPx);
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          wrappedLines.push(currentLine);
          currentLine = char;
        } else {
          wrappedLines.push(char);
          currentLine = "";
        }
      }
    }
    if (currentLine) {
      wrappedLines.push(currentLine);
    }
  }
  return wrappedLines;
}

// ../../shared/canvas/canvasDrawUtils.ts
var EFFECT_FILTER_MAP = {
  // Basic
  blackAndWhite: [{ fn: "grayscale", value: 100, neutral: 0 }],
  grayscale: [{ fn: "grayscale", value: 100, neutral: 0 }],
  sepia: [{ fn: "sepia", value: 100, neutral: 0 }],
  invert: [{ fn: "invert", value: 100, neutral: 0 }],
  saturate: [{ fn: "saturate", value: 200, neutral: 100 }],
  // Color styles
  vintage: [
    { fn: "sepia", value: 50, neutral: 0 },
    { fn: "contrast", value: 110, neutral: 100 }
  ],
  cinematic: [
    { fn: "contrast", value: 120, neutral: 100 },
    { fn: "saturate", value: 80, neutral: 100 },
    { fn: "brightness", value: 90, neutral: 100 }
  ],
  cyberpunk: [
    { fn: "saturate", value: 200, neutral: 100 },
    { fn: "contrast", value: 150, neutral: 100 },
    { fn: "hue-rotate", value: 270, neutral: 0, unit: "deg" }
  ],
  vibrant: [
    { fn: "saturate", value: 150, neutral: 100 },
    { fn: "contrast", value: 110, neutral: 100 }
  ],
  warm: [
    { fn: "sepia", value: 30, neutral: 0 },
    { fn: "saturate", value: 120, neutral: 100 }
  ],
  cool: [
    { fn: "hue-rotate", value: 180, neutral: 0, unit: "deg" },
    { fn: "saturate", value: 90, neutral: 100 }
  ],
  pastel: [
    { fn: "saturate", value: 70, neutral: 100 },
    { fn: "brightness", value: 110, neutral: 100 }
  ],
  muted: [
    { fn: "saturate", value: 50, neutral: 100 },
    { fn: "contrast", value: 90, neutral: 100 }
  ],
  autumn: [
    { fn: "sepia", value: 40, neutral: 0 },
    { fn: "saturate", value: 130, neutral: 100 },
    { fn: "hue-rotate", value: 10, neutral: 0, unit: "deg" }
  ],
  winter: [
    { fn: "hue-rotate", value: 180, neutral: 0, unit: "deg" },
    { fn: "saturate", value: 70, neutral: 100 },
    { fn: "brightness", value: 110, neutral: 100 }
  ],
  // Artistic
  sketch: [
    { fn: "grayscale", value: 100, neutral: 0 },
    { fn: "contrast", value: 200, neutral: 100 },
    { fn: "brightness", value: 120, neutral: 100 }
  ],
  cartoon: [
    { fn: "saturate", value: 150, neutral: 100 },
    { fn: "contrast", value: 130, neutral: 100 }
  ],
  oilPainting: [
    { fn: "saturate", value: 120, neutral: 100 },
    { fn: "contrast", value: 110, neutral: 100 },
    { fn: "blur", value: 0.5, neutral: 0, unit: "px" }
  ],
  watercolor: [
    { fn: "saturate", value: 110, neutral: 100 },
    { fn: "contrast", value: 90, neutral: 100 },
    { fn: "brightness", value: 105, neutral: 100 },
    { fn: "blur", value: 0.3, neutral: 0, unit: "px" }
  ],
  posterize: [
    { fn: "contrast", value: 200, neutral: 100 },
    { fn: "brightness", value: 110, neutral: 100 }
  ],
  pixelate: [{ fn: "contrast", value: 150, neutral: 100 }],
  mosaic: [
    { fn: "contrast", value: 120, neutral: 100 },
    { fn: "blur", value: 2, neutral: 0, unit: "px" }
  ],
  halftone: [
    { fn: "contrast", value: 150, neutral: 100 },
    { fn: "grayscale", value: 50, neutral: 0 }
  ],
  // Retro/Film
  vhs: [
    { fn: "sepia", value: 40, neutral: 0 },
    { fn: "saturate", value: 120, neutral: 100 },
    { fn: "contrast", value: 90, neutral: 100 }
  ],
  film8mm: [
    { fn: "sepia", value: 60, neutral: 0 },
    { fn: "contrast", value: 110, neutral: 100 },
    { fn: "brightness", value: 95, neutral: 100 },
    { fn: "blur", value: 0.5, neutral: 0, unit: "px" }
  ],
  film16mm: [
    { fn: "sepia", value: 40, neutral: 0 },
    { fn: "contrast", value: 115, neutral: 100 },
    { fn: "brightness", value: 98, neutral: 100 }
  ],
  polaroid: [
    { fn: "sepia", value: 20, neutral: 0 },
    { fn: "saturate", value: 110, neutral: 100 },
    { fn: "contrast", value: 105, neutral: 100 }
  ],
  lomography: [
    { fn: "saturate", value: 150, neutral: 100 },
    { fn: "contrast", value: 120, neutral: 100 }
  ],
  kodachrome: [
    { fn: "saturate", value: 140, neutral: 100 },
    { fn: "contrast", value: 115, neutral: 100 },
    { fn: "brightness", value: 105, neutral: 100 }
  ],
  technicolor: [
    { fn: "saturate", value: 180, neutral: 100 },
    { fn: "contrast", value: 125, neutral: 100 },
    { fn: "brightness", value: 105, neutral: 100 }
  ],
  // Color processing
  duotone: [
    { fn: "grayscale", value: 100, neutral: 0 },
    { fn: "sepia", value: 100, neutral: 0 }
  ],
  tritone: [
    { fn: "grayscale", value: 100, neutral: 0 },
    { fn: "sepia", value: 80, neutral: 0 },
    { fn: "hue-rotate", value: 30, neutral: 0, unit: "deg" }
  ],
  colorize: [
    { fn: "sepia", value: 100, neutral: 0 },
    { fn: "hue-rotate", value: 180, neutral: 0, unit: "deg" },
    { fn: "saturate", value: 150, neutral: 100 }
  ],
  tint: [
    { fn: "sepia", value: 50, neutral: 0 },
    { fn: "hue-rotate", value: 45, neutral: 0, unit: "deg" }
  ],
  solarize: [
    { fn: "invert", value: 50, neutral: 0 },
    { fn: "brightness", value: 150, neutral: 100 },
    { fn: "contrast", value: 150, neutral: 100 }
  ],
  // Special
  nightVision: [
    { fn: "hue-rotate", value: 90, neutral: 0, unit: "deg" },
    { fn: "saturate", value: 200, neutral: 100 },
    { fn: "brightness", value: 120, neutral: 100 }
  ],
  thermal: [
    { fn: "hue-rotate", value: 180, neutral: 0, unit: "deg" },
    { fn: "saturate", value: 200, neutral: 100 },
    { fn: "contrast", value: 150, neutral: 100 }
  ],
  xray: [
    { fn: "invert", value: 100, neutral: 0 },
    { fn: "grayscale", value: 100, neutral: 0 },
    { fn: "contrast", value: 150, neutral: 100 }
  ],
  negative: [{ fn: "invert", value: 100, neutral: 0 }],
  glitch: [
    { fn: "hue-rotate", value: 90, neutral: 0, unit: "deg" },
    { fn: "saturate", value: 150, neutral: 100 }
  ],
  chromatic: [
    { fn: "hue-rotate", value: 30, neutral: 0, unit: "deg" },
    { fn: "saturate", value: 120, neutral: 100 }
  ],
  vignette: [
    { fn: "brightness", value: 90, neutral: 100 },
    { fn: "contrast", value: 110, neutral: 100 }
  ],
  bloom: [
    { fn: "brightness", value: 120, neutral: 100 },
    { fn: "saturate", value: 120, neutral: 100 },
    { fn: "blur", value: 1, neutral: 0, unit: "px" }
  ]
};
var _effectFilterCache = /* @__PURE__ */ new Map();
function getFilterFromEffectType(effectType, intensity = 1) {
  if (!effectType || effectType === "none") return "none";
  const defs = EFFECT_FILTER_MAP[effectType];
  if (!defs) return "none";
  if (intensity === 1) {
    let cached = _effectFilterCache.get(effectType);
    if (cached === void 0) {
      cached = buildEffectFilter(defs, 1);
      _effectFilterCache.set(effectType, cached);
    }
    return cached;
  }
  return buildEffectFilter(defs, Math.max(0, Math.min(1, intensity)));
}
function buildEffectFilter(defs, t) {
  const parts = [];
  for (const { fn, value, neutral, unit } of defs) {
    const v = neutral + (value - neutral) * t;
    if (fn === "hue-rotate") parts.push(`hue-rotate(${v}deg)`);
    else if (fn === "blur") parts.push(`blur(${v}px)`);
    else parts.push(`${fn}(${v}${unit || "%"})`);
  }
  return parts.join(" ");
}
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function clampPct(v, min = 0, max = 500) {
  return Math.min(max, Math.max(min, v));
}
function getCompositeFilter(props) {
  const effect = getFilterFromEffectType(props.effectType, props.filterIntensity ?? 1);
  const b = clampPct(100 + toNum(props.brightness));
  const c = clampPct(100 + toNum(props.contrast));
  const s = clampPct(100 + toNum(props.saturation));
  const h = toNum(props.hue);
  const blurAmount = toNum(props._blurAmount ?? props.blur ?? 0);
  const bl = Math.max(0, blurAmount);
  const parts = [];
  if (effect && effect !== "none") parts.push(effect);
  if (b !== 100) parts.push(`brightness(${b}%)`);
  if (c !== 100) parts.push(`contrast(${c}%)`);
  if (s !== 100) parts.push(`saturate(${s}%)`);
  if (h) parts.push(`hue-rotate(${h}deg)`);
  if (bl) parts.push(`blur(${bl}px)`);
  return parts.length ? parts.join(" ") : "none";
}
function buildRoundedRectPath(ctx, w, h, r) {
  const x = -w / 2;
  const y = -h / 2;
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  if (rr > 0) {
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  } else {
    ctx.rect(x, y, w, h);
  }
}
function drawRoundedRect(ctx, x, y, width, height, rx, ry, fillColor) {
  ctx.save();
  ctx.fillStyle = fillColor;
  rx = Math.min(rx, width / 2);
  ry = Math.min(ry, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + rx, y);
  ctx.lineTo(x + width - rx, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + ry);
  ctx.lineTo(x + width, y + height - ry);
  ctx.quadraticCurveTo(x + width, y + height, x + width - rx, y + height);
  ctx.lineTo(x + rx, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - ry);
  ctx.lineTo(x, y + ry);
  ctx.quadraticCurveTo(x, y, x + rx, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawMediaBorder(ctx, props) {
  const bw = props.borderWidth ?? 0;
  const bc = props.borderColor;
  if (!bw || !bc) return;
  const w = props.width;
  const h = props.height;
  const r = Math.max(0, Math.min(props.borderRadius ?? 0, Math.min(w, h) / 2));
  const style = props.borderStyle || "solid";
  ctx.save();
  const prevDash = ctx.getLineDash ? ctx.getLineDash() : [];
  const prevCap = ctx.lineCap;
  ctx.lineWidth = bw;
  ctx.strokeStyle = bc;
  if (style === "dashed") {
    const dash = Math.max(4, bw * 4);
    const gap = Math.max(4, bw * 2);
    try {
      ctx.setLineDash([dash, gap]);
    } catch {
    }
    ctx.lineCap = "butt";
  } else if (style === "dotted") {
    const dot = Math.max(1, Math.round(bw));
    const gap = Math.max(2, bw * 1.5);
    try {
      ctx.setLineDash([dot, gap]);
    } catch {
    }
    ctx.lineCap = "round";
  } else {
    try {
      ctx.setLineDash([]);
    } catch {
    }
    ctx.lineCap = "butt";
  }
  const x = -w / 2;
  const y = -h / 2;
  const t = ctx.getTransform ? ctx.getTransform() : null;
  const axisAligned = t && Math.abs(t.b) < 1e-3 && Math.abs(t.c) < 1e-3 && Math.abs(t.a - 1) < 1e-3 && Math.abs(t.d - 1) < 1e-3;
  const odd = (ctx.lineWidth & 1) === 1;
  const offset = axisAligned && odd ? 0.5 : 0;
  ctx.beginPath();
  if (r > 0) {
    ctx.moveTo(x + r + offset, y + offset);
    ctx.lineTo(x + w - r - offset, y + offset);
    ctx.quadraticCurveTo(x + w - offset, y + offset, x + w - offset, y + r + offset);
    ctx.lineTo(x + w - offset, y + h - r - offset);
    ctx.quadraticCurveTo(x + w - offset, y + h - offset, x + w - r - offset, y + h - offset);
    ctx.lineTo(x + r + offset, y + h - offset);
    ctx.quadraticCurveTo(x + offset, y + h - offset, x + offset, y + h - r - offset);
    ctx.lineTo(x + offset, y + r + offset);
    ctx.quadraticCurveTo(x + offset, y + offset, x + r + offset, y + offset);
  } else {
    ctx.rect(x + offset, y + offset, w - offset * 2, h - offset * 2);
  }
  ctx.closePath();
  ctx.stroke();
  try {
    ctx.setLineDash(prevDash);
  } catch {
  }
  ctx.lineCap = prevCap;
  ctx.restore();
}
function computeCoverSourceRect(sourceW, sourceH, targetW, targetH) {
  if (sourceW <= 0 || sourceH <= 0 || targetW <= 0 || targetH <= 0) {
    return {
      sx: 0,
      sy: 0,
      sw: Math.max(1, sourceW),
      sh: Math.max(1, sourceH)
    };
  }
  const scale = Math.max(targetW / sourceW, targetH / sourceH);
  const cropW = Math.max(1, Math.min(sourceW, targetW / scale));
  const cropH = Math.max(1, Math.min(sourceH, targetH / scale));
  const sx = Math.max(0, Math.floor((sourceW - cropW) / 2));
  const sy = Math.max(0, Math.floor((sourceH - cropH) / 2));
  return { sx, sy, sw: Math.floor(cropW), sh: Math.floor(cropH) };
}
function drawMediaCore(ctx, img, imgW, imgH, params) {
  const { width, height, filter, borderRadius = 0 } = params;
  const hasRadius = borderRadius > 0;
  const hasFilter = !!filter && filter !== "none";
  if (hasFilter) {
    try {
      ctx.filter = filter;
    } catch {
    }
  }
  if (hasRadius) {
    ctx.save();
    buildRoundedRectPath(ctx, width, height, borderRadius);
    ctx.clip();
  }
  const hasCrop = (params.cropWidth ?? 0) > 0 && (params.cropHeight ?? 0) > 0;
  let sx, sy, sw, sh;
  if (hasCrop) {
    sx = Math.max(0, params.cropX || 0);
    sy = Math.max(0, params.cropY || 0);
    sw = Math.max(1, params.cropWidth || 1);
    sh = Math.max(1, params.cropHeight || 1);
  } else {
    const coverW = params.coverWidth ?? width;
    const coverH = params.coverHeight ?? height;
    const cover = computeCoverSourceRect(imgW, imgH, coverW, coverH);
    sx = cover.sx;
    sy = cover.sy;
    sw = cover.sw;
    sh = cover.sh;
  }
  ctx.drawImage(img, sx, sy, sw, sh, -width / 2, -height / 2, width, height);
  if (hasFilter) {
    try {
      ctx.filter = "none";
    } catch {
    }
  }
  if (hasRadius) {
    ctx.restore();
  }
}

// ../../shared/caption-animation/captionPageUtils.ts
var _pageCache = new LRUCache(32);
function pageCacheKey(wordTimings, wordsPerPage, combineWithinMs) {
  const len = wordTimings.length;
  if (len === 0) return "0";
  const first = wordTimings[0].startMs;
  const last = wordTimings[len - 1].endMs;
  return `${len}_${wordsPerPage}_${combineWithinMs}_${first}_${last}`;
}
function groupWordsIntoPages(wordTimings, wordsPerPage = 4, combineWithinMs = 1200) {
  if (wordTimings.length === 0) return [];
  if (wordsPerPage < 1) wordsPerPage = 1;
  if (combineWithinMs < 0) combineWithinMs = 0;
  const key = pageCacheKey(wordTimings, wordsPerPage, combineWithinMs);
  const cached = _pageCache.get(key);
  if (cached) return cached;
  const pages = [];
  let currentWords = [];
  for (let i = 0; i < wordTimings.length; i++) {
    const word = wordTimings[i];
    if (currentWords.length > 0) {
      const prevEnd = currentWords[currentWords.length - 1].endMs;
      const gap = word.startMs - prevEnd;
      if (currentWords.length >= wordsPerPage || gap > combineWithinMs) {
        pages.push(finalizePage(currentWords));
        currentWords = [];
      }
    }
    currentWords.push(word);
  }
  if (currentWords.length > 0) {
    pages.push(finalizePage(currentWords));
  }
  _pageCache.set(key, pages);
  return pages;
}
function finalizePage(words) {
  const text = words.map((w) => w.word).join("");
  return {
    words,
    startMs: words[0].startMs,
    endMs: words[words.length - 1].endMs,
    text
  };
}
function findActivePageAtTime(pages, timeMs) {
  if (pages.length === 0) return null;
  let lo = 0;
  let hi = pages.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = lo + hi >>> 1;
    if (pages[mid].startMs <= timeMs) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (result < 0) return null;
  const page = pages[result];
  return timeMs <= page.endMs ? page : null;
}
function getHighlightedWordIndex(page, timeMs) {
  for (let i = 0; i < page.words.length; i++) {
    const w = page.words[i];
    if (timeMs >= w.startMs && timeMs < w.endMs) return i;
  }
  if (page.words.length > 0 && timeMs >= page.words[page.words.length - 1].endMs) {
    return page.words.length - 1;
  }
  return -1;
}

// ../../shared/caption-animation/easingFunctions.ts
var linear2 = EASING.linear;
var easeInQuad2 = EASING.inQuad;
var easeOutQuad2 = EASING.outQuad;
var easeInOutQuad2 = EASING.inOutQuad;
var easeInCubic = EASING.inCubic;
var easeOutCubic = EASING.outCubic;
var easeInOutCubic = EASING.inOutCubic;
var easeInBack2 = EASING.inBack;
var easeOutBack2 = EASING.outBack;
var easeOutBounce = EASING.outBounce;
var easeInBounce = EASING.inBounce;
function easeOutElastic2(t, amplitude = 1, period = 0.5) {
  if (t === 0 || t === 1) return t;
  const a = Math.max(1, amplitude);
  const s = period / (2 * Math.PI) * Math.asin(1 / a);
  return a * Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / period) + 1;
}
function easeInElastic(t, amplitude = 1, period = 0.5) {
  if (t === 0 || t === 1) return t;
  return 1 - easeOutElastic2(1 - t, amplitude, period);
}
var entranceEasing = easeOutCubic;
var exitEasing = easeInCubic;
var bounceEntranceEasing = (t) => easeOutElastic2(t, 1, 0.5);
var zoomEntranceEasing = easeOutBack2;
var popEasing = easeOutCubic;

// ../../shared/caption-animation/captionAnimationSpecs.ts
var PRESET_SPECS = {
  "breathe": {
    type: "loop",
    oscillations: [
      { property: "scaleX", amplitude: ANIMATION_SIZES.BREATHE_AMPLITUDE, frequency: ANIMATION_SPEEDS.BREATHE_FREQUENCY }
    ],
    syncScale: true,
    entrance: true
  },
  "float": {
    type: "loop",
    oscillations: [
      { property: "translateY", amplitude: ANIMATION_SIZES.FLOAT_AMPLITUDE, frequency: ANIMATION_SPEEDS.FLOAT_FREQUENCY, additive: true }
    ],
    entrance: true
  },
  "wave": {
    type: "charLoop",
    charProperty: "offsetY",
    amplitude: ANIMATION_SIZES.WAVE_AMPLITUDE,
    frequency: ANIMATION_SPEEDS.WAVE_FREQUENCY,
    charPhase: ANIMATION_SPEEDS.WAVE_CHAR_PHASE,
    setFill: true,
    entrance: true
  },
  "charFadeIn": {
    type: "charStagger",
    overlap: ANIMATION_SPEEDS.CHAR_STAGGER_OVERLAP,
    opacity: { from: 0, to: 1 }
  },
  "charScaleIn": {
    type: "charStagger",
    overlap: ANIMATION_SPEEDS.CHAR_STAGGER_OVERLAP,
    opacity: { from: 0, to: 1 },
    scaleX: { from: 0, to: 1 },
    scaleY: { from: 0, to: 1 },
    scaleEasing: "outBack"
  },
  "char-blur-reveal": {
    type: "charStagger",
    overlap: ANIMATION_SPEEDS.CHAR_BLUR_REVEAL_OVERLAP,
    opacity: { from: 0, to: 1 },
    blur: { from: ANIMATION_SIZES.CHAR_BLUR_MAX, to: 0 }
  },
  "char-rotate-in": {
    type: "charStagger",
    overlap: ANIMATION_SPEEDS.CHAR_STAGGER_OVERLAP,
    opacity: { from: 0, to: 1 },
    scaleX: { from: 0, to: 1 },
    scaleY: { from: 0, to: 1 },
    rotation: { from: 90, to: 0, alternate: true },
    scaleEasing: "outBack"
  },
  "color-flow": {
    type: "charColorCycle",
    speed: ANIMATION_SPEEDS.COLOR_FLOW_SPEED,
    saturation: 90,
    lightness: 60,
    entrance: true
  },
  "word-stagger": {
    type: "wordStagger",
    overlap: ANIMATION_THRESHOLDS.WORD_STAGGER_OVERLAP,
    opacity: { from: 0, to: 1 }
  },
  "word-pop": {
    type: "wordStagger",
    overlap: ANIMATION_SPEEDS.WORD_POP_OVERLAP,
    opacity: { from: 0, to: 1 },
    scaleX: { from: 0, to: 1, overshoot: ANIMATION_SIZES.WORD_POP_OVERSHOOT },
    scaleY: { from: 0, to: 1, overshoot: ANIMATION_SIZES.WORD_POP_OVERSHOOT },
    scaleEasing: "outBack"
  },
  "glitch": {
    type: "glitch",
    triggerFrequency: ANIMATION_SPEEDS.GLITCH_FREQUENCY,
    triggerThreshold: 0.7,
    displacement: [
      { property: "translateX", amplitude: ANIMATION_SIZES.GLITCH_AMPLITUDE, frequency: 0.05, fn: "sin" },
      { property: "translateY", amplitude: ANIMATION_SIZES.GLITCH_AMPLITUDE, frequency: 0.07, fn: "cos", scale: 0.3 }
    ],
    colorShift: {
      charInterval: 3,
      frequency: 0.01,
      amplitude: 40
    },
    entrance: true
  },
  "elastic-char-in": {
    type: "charStagger",
    overlap: 0.45,
    opacity: { from: 0, to: 1 },
    scaleX: { from: 0, to: 1 },
    scaleY: { from: 0, to: 1 },
    scaleEasing: "springBouncy"
  },
  "shadow-glow-pulse": {
    type: "charShadowLoop",
    speed: 3e-3,
    charPhase: 0.4,
    minBlur: 0,
    maxBlur: 12,
    colorSpeed: 1e-3,
    saturation: 90,
    lightness: 60,
    entrance: true
  },
  "tracking-expand": {
    type: "charStagger",
    overlap: 0.8,
    opacity: { from: 0, to: 1 },
    tracking: { from: -8, to: 0 }
  },
  "drop-bounce": {
    type: "charStagger",
    overlap: 0.35,
    opacity: { from: 0, to: 1 },
    offsetY: { from: -40, to: 0 },
    scaleEasing: "outBounce"
  },
  "word-slide-up": {
    type: "wordStagger",
    overlap: 0.3,
    opacity: { from: 0, to: 1 },
    offsetY: { from: 20, to: 0 }
  },
  "skew-in": {
    type: "charStagger",
    overlap: 0.4,
    opacity: { from: 0, to: 1 },
    skewX: { from: 30, to: 0 }
  }
};
PRESET_SPECS["char-fade-in"] = PRESET_SPECS["charFadeIn"];
PRESET_SPECS["char-scale-in"] = PRESET_SPECS["charScaleIn"];
for (const spec of Object.values(PRESET_SPECS)) {
  if ((spec.type === "charStagger" || spec.type === "wordStagger") && spec.scaleEasing) {
    spec._scaleEasingFn = resolveEasing(spec.scaleEasing);
  }
}

// ../../shared/random/noise.ts
var PERM = new Uint8Array([
  151,
  160,
  137,
  91,
  90,
  15,
  131,
  13,
  201,
  95,
  96,
  53,
  194,
  233,
  7,
  225,
  140,
  36,
  103,
  30,
  69,
  142,
  8,
  99,
  37,
  240,
  21,
  10,
  23,
  190,
  6,
  148,
  247,
  120,
  234,
  75,
  0,
  26,
  197,
  62,
  94,
  252,
  219,
  203,
  117,
  35,
  11,
  32,
  57,
  177,
  33,
  88,
  237,
  149,
  56,
  87,
  174,
  20,
  125,
  136,
  171,
  168,
  68,
  175,
  74,
  165,
  71,
  134,
  139,
  48,
  27,
  166,
  77,
  146,
  158,
  231,
  83,
  111,
  229,
  122,
  60,
  211,
  133,
  230,
  220,
  105,
  92,
  41,
  55,
  46,
  245,
  40,
  244,
  102,
  143,
  54,
  65,
  25,
  63,
  161,
  1,
  216,
  80,
  73,
  209,
  76,
  132,
  187,
  208,
  89,
  18,
  169,
  200,
  196,
  135,
  130,
  116,
  188,
  159,
  86,
  164,
  100,
  109,
  198,
  173,
  186,
  3,
  64,
  52,
  217,
  226,
  250,
  124,
  123,
  5,
  202,
  38,
  147,
  118,
  126,
  255,
  82,
  85,
  212,
  207,
  206,
  59,
  227,
  47,
  16,
  58,
  17,
  182,
  189,
  28,
  42,
  223,
  183,
  170,
  213,
  119,
  248,
  152,
  2,
  44,
  154,
  163,
  70,
  221,
  153,
  101,
  155,
  167,
  43,
  172,
  9,
  129,
  22,
  39,
  253,
  19,
  98,
  108,
  110,
  79,
  113,
  224,
  232,
  178,
  185,
  112,
  104,
  218,
  246,
  97,
  228,
  251,
  34,
  242,
  193,
  238,
  210,
  144,
  12,
  191,
  179,
  162,
  241,
  81,
  51,
  145,
  235,
  249,
  14,
  239,
  107,
  49,
  192,
  214,
  31,
  181,
  199,
  106,
  157,
  184,
  84,
  204,
  176,
  115,
  121,
  50,
  45,
  127,
  4,
  150,
  254,
  138,
  236,
  205,
  93,
  222,
  114,
  67,
  29,
  24,
  72,
  243,
  141,
  128,
  195,
  78,
  66,
  215,
  61,
  156,
  180
]);
var P = new Uint8Array(512);
for (let i = 0; i < 512; i++) P[i] = PERM[i & 255];
var GRAD2 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];
var F2 = 0.5 * (Math.sqrt(3) - 1);
var G2 = (3 - Math.sqrt(3)) / 6;
function noise2D(x, y) {
  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const t = (i + j) * G2;
  const x0 = x - (i - t);
  const y0 = y - (j - t);
  const i1 = x0 > y0 ? 1 : 0;
  const j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;
  const ii = i & 255;
  const jj = j & 255;
  let n0 = 0, n1 = 0, n2 = 0;
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 > 0) {
    t0 *= t0;
    const gi = P[ii + P[jj]] % 12;
    n0 = t0 * t0 * (GRAD2[gi][0] * x0 + GRAD2[gi][1] * y0);
  }
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 > 0) {
    t1 *= t1;
    const gi = P[ii + i1 + P[jj + j1]] % 12;
    n1 = t1 * t1 * (GRAD2[gi][0] * x1 + GRAD2[gi][1] * y1);
  }
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 > 0) {
    t2 *= t2;
    const gi = P[ii + 1 + P[jj + 1]] % 12;
    n2 = t2 * t2 * (GRAD2[gi][0] * x2 + GRAD2[gi][1] * y2);
  }
  return 70 * (n0 + n1 + n2);
}
var F3 = 1 / 3;
var G3 = 1 / 6;
function fbm2D(x, y, options) {
  const octaves = options?.octaves ?? 4;
  const lacunarity = options?.lacunarity ?? 2;
  const gain = options?.gain ?? 0.5;
  let sum = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmplitude = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * noise2D(x * frequency, y * frequency);
    maxAmplitude += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return sum / maxAmplitude;
}

// ../../shared/random/random.ts
function hashString(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function createRandom(seed) {
  let state = typeof seed === "string" ? hashString(seed) : seed >>> 0;
  return () => {
    state |= 0;
    state = state + 1831565813 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ../../shared/caption-animation/captionAnimationUtils.ts
var _hexRgbCache = new LRUCache(256);
function parseHexToRgb(hex) {
  let v = _hexRgbCache.get(hex);
  if (v) return v;
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  v = { r: isNaN(r) ? 255 : r, g: isNaN(g) ? 255 : g, b: isNaN(b) ? 255 : b };
  _hexRgbCache.set(hex, v);
  return v;
}
var _rgbaCache = new LRUCache(2048);
function cachedRgba(r, g, b, a) {
  const ai = Math.round(a * 100);
  const key = ((r * 256 + g) * 256 + b) * 101 + ai;
  let v = _rgbaCache.get(key);
  if (v !== void 0) return v;
  v = `rgba(${r},${g},${b},${ai / 100})`;
  _rgbaCache.set(key, v);
  return v;
}
var _stylePool = [];
function resetCharStyle(s) {
  s.fill = void 0;
  s.stroke = void 0;
  s.strokeWidth = void 0;
  s.fontWeight = void 0;
  s.underline = void 0;
  s.offsetX = void 0;
  s.offsetY = void 0;
  s.charScaleX = void 0;
  s.charScaleY = void 0;
  s.charOpacity = void 0;
  s.charRotation = void 0;
  s.charBlur = void 0;
  s.charShadowBlur = void 0;
  s.charShadowColor = void 0;
  s.charTrackingOffset = void 0;
  s.charSkewX = void 0;
  s.sweepGradientProgress = void 0;
}
function acquireCharStyles(count) {
  for (let i = _stylePool.length; i < count; i++) {
    _stylePool.push({});
  }
  for (let i = 0; i < count; i++) {
    resetCharStyle(_stylePool[i]);
  }
  return _stylePool;
}
function computeWordTimingHighlight(currentTimeMs, wordTimings, textLength) {
  if (wordTimings.length === 0) return 0;
  if (currentTimeMs < wordTimings[0].startMs) return 0;
  if (currentTimeMs >= wordTimings[wordTimings.length - 1].endMs) return textLength;
  let lo = 0;
  let hi = wordTimings.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = lo + hi >>> 1;
    if (wordTimings[mid].startMs <= currentTimeMs) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result < 0 ? 0 : wordTimings[result].charEndIndex;
}
var STAGGER_DISTRIBUTIONS = {
  "ease-in": (t) => t * t,
  "ease-out": (t) => 1 - (1 - t) * (1 - t),
  "ease-in-out": (t) => t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t),
  "center-out": (t) => Math.abs(t - 0.5) * 2
};
var _randomOrderCache = new LRUCache(64);
function getRandomStaggerOrder(count) {
  let cached = _randomOrderCache.get(count);
  if (cached) return cached;
  const rng = createRandom(count * 1e3 + 42);
  const arr = Array.from({ length: count }, (_, i) => ({ i, r: rng() }));
  arr.sort((a, b) => a.r - b.r);
  cached = new Array(count);
  for (let rank = 0; rank < arr.length; rank++) {
    cached[arr[rank].i] = rank;
  }
  _randomOrderCache.set(count, cached);
  return cached;
}
function computeStaggerStart(index, count, overlap, windowSize, distribution, randomOrder) {
  if (count <= 1) return 0;
  if (randomOrder) {
    const rank = randomOrder[index];
    return rank * (1 - overlap) * windowSize;
  }
  const normalizedIndex = index / (count - 1);
  const mapFn = distribution ? STAGGER_DISTRIBUTIONS[distribution] : void 0;
  const mappedIndex = mapFn ? mapFn(normalizedIndex) : normalizedIndex;
  return mappedIndex * (count - 1) * (1 - overlap) * windowSize;
}
function handleTypewriter2(state, ctx) {
  state.isTypewriter = true;
  const typewriterProgress = Math.min(1, Math.max(0, ctx.elapsed / ctx.effectDuration));
  if (typewriterProgress >= ANIMATION_THRESHOLDS.TYPEWRITER_COMPLETE) {
    state.visibleCharCount = ctx.textLength;
    state.typewriterFractionalChar = void 0;
  } else {
    const rawCount = ctx.textLength * typewriterProgress;
    state.visibleCharCount = Math.floor(rawCount);
    state.typewriterFractionalChar = rawCount - state.visibleCharCount;
  }
  if (ctx.isEntering) {
    state.opacity = entranceEasing(ctx.elapsed / ctx.inDuration);
  }
}
function handleTypewriterWord(state, ctx) {
  state.isTypewriter = true;
  state.isTypewriterWord = true;
  const typewriterProgress = Math.min(1, Math.max(0, ctx.elapsed / ctx.effectDuration));
  const boundaries = getWordBoundaries(ctx.captionText);
  if (typewriterProgress >= ANIMATION_THRESHOLDS.TYPEWRITER_COMPLETE || boundaries.length === 0) {
    state.visibleCharCount = ctx.textLength;
  } else {
    const wordIndex = Math.floor(boundaries.length * typewriterProgress);
    state.visibleCharCount = wordIndex > 0 ? boundaries[wordIndex - 1] : 0;
  }
  if (ctx.isEntering) {
    state.opacity = entranceEasing(ctx.elapsed / ctx.inDuration);
  }
}
var KARAOKE_STYLE_APPLIERS = {
  classic(s, isHighlighted, _i, _hc2, _tl, hc, defaultColor) {
    s.fill = isHighlighted ? hc : defaultColor;
  },
  glow(s, isHighlighted, _i, _hc2, _tl, hc, defaultColor) {
    s.fill = isHighlighted ? hc : defaultColor;
    if (isHighlighted) {
      s.stroke = hc;
      s.strokeWidth = ANIMATION_SIZES.KARAOKE_GLOW_STROKE_WIDTH;
    }
  },
  underline(s, isHighlighted, _i, _hc2, _tl, hc, defaultColor) {
    s.fill = isHighlighted ? hc : defaultColor;
    s.underline = isHighlighted;
  },
  gradient(s, isHighlighted, i, highlightedChars, _tl, hc, defaultColor) {
    const distance = Math.abs(i - highlightedChars);
    const gradientRange = ANIMATION_SIZES.KARAOKE_GRADIENT_RANGE;
    if (distance <= gradientRange) {
      if (isHighlighted) {
        s.fill = hc;
      } else {
        const t = 1 - distance / (gradientRange + 1);
        s.fill = lerpHexColor(defaultColor, hc, t * 0.5);
      }
    } else {
      s.fill = defaultColor;
    }
  },
  bold(s, isHighlighted, _i, _hc2, _tl, hc, defaultColor) {
    s.fill = isHighlighted ? hc : defaultColor;
    s.fontWeight = isHighlighted ? "bold" : "normal";
  },
  rainbow(s, isHighlighted, i, _hc2, textLength, _hc, defaultColor) {
    s.fill = isHighlighted ? getRainbowColor(i, textLength) : defaultColor;
  }
};
function handleKaraoke(state, ctx) {
  const { animation, textLength, effectProgress, defaultColor, elapsed, inDuration, isEntering } = ctx;
  state.isKaraoke = true;
  state.karaokeProgress = effectProgress;
  state.karaokeHighlightColor = animation.karaokeHighlightColor || "#FFFF00";
  const preset = animation.preset;
  const mappedStyle = preset in KARAOKE_PRESET_STYLE_MAP ? KARAOKE_PRESET_STYLE_MAP[preset] : null;
  state.karaokeStyle = mappedStyle || animation.karaokeStyle || "classic";
  const highlightedChars = ctx.wordTimings && ctx.wordTimings.length > 0 ? computeWordTimingHighlight(ctx.currentTimeMs, ctx.wordTimings, textLength) : Math.floor(textLength * effectProgress);
  const charStyles = acquireCharStyles(textLength);
  const hc = state.karaokeHighlightColor;
  let fractionalHighlightIdx = highlightedChars;
  if (ctx.wordTimings && ctx.wordTimings.length > 0) {
    for (let wi = 0; wi < ctx.wordTimings.length; wi++) {
      const w = ctx.wordTimings[wi];
      if (ctx.currentTimeMs >= w.startMs && ctx.currentTimeMs < w.endMs) {
        const wordDuration = w.endMs - w.startMs;
        const wordProgress = Math.max(0, Math.min(1, (ctx.currentTimeMs - w.startMs) / Math.max(1, wordDuration)));
        const wordCharCount = w.charEndIndex - (wi > 0 ? ctx.wordTimings[wi - 1].charEndIndex : 0);
        const wordStartIdx = wi > 0 ? ctx.wordTimings[wi - 1].charEndIndex : 0;
        fractionalHighlightIdx = wordStartIdx + wordProgress * wordCharCount;
        break;
      }
    }
  }
  const applyStyle = KARAOKE_STYLE_APPLIERS[state.karaokeStyle];
  const boundaryCharIdx = Math.floor(fractionalHighlightIdx);
  const sweepProgress = fractionalHighlightIdx - boundaryCharIdx;
  for (let i = 0; i < textLength; i++) {
    applyStyle(charStyles[i], i < highlightedChars, i, highlightedChars, textLength, hc, defaultColor);
    if (i === boundaryCharIdx && sweepProgress > 0.01 && sweepProgress < 0.99) {
      charStyles[i].sweepGradientProgress = sweepProgress;
      charStyles[i].fill = hc;
    }
  }
  state.charStyles = charStyles;
  if (isEntering) {
    state.opacity = entranceEasing(elapsed / inDuration);
  }
}
function handleNeon(state, ctx) {
  const { textLength, currentTimeMs, isEntering, elapsed, inDuration } = ctx;
  state.isNeon = true;
  const colorIndex = Math.floor(currentTimeMs * ANIMATION_SPEEDS.NEON_COLOR_CYCLE % NEON_COLORS.length);
  state.neonColor = NEON_COLORS[colorIndex];
  const flicker = Math.sin(currentTimeMs * ANIMATION_SPEEDS.NEON_FLICKER);
  state.neonStrokeWidth = ANIMATION_SIZES.NEON_BASE_STROKE_WIDTH + flicker;
  const charStyles = acquireCharStyles(textLength);
  for (let i = 0; i < textLength; i++) {
    const charPhase = i * ANIMATION_SPEEDS.NEON_CHAR_PHASE;
    const charFlicker = Math.sin(currentTimeMs * ANIMATION_SPEEDS.NEON_FLICKER + charPhase);
    const charStrokeWidth = ANIMATION_SIZES.NEON_BASE_STROKE_WIDTH + charFlicker;
    charStyles[i].stroke = state.neonColor;
    charStyles[i].strokeWidth = Math.max(ANIMATION_SIZES.NEON_MIN_STROKE_WIDTH, charStrokeWidth);
  }
  state.charStyles = charStyles;
  if (isEntering) {
    state.opacity = entranceEasing(elapsed / inDuration);
  }
}
function applyLoopSpec(spec, state, ctx) {
  for (const osc of spec.oscillations) {
    const base = osc.base ?? (osc.property.startsWith("scale") ? 1 : 0);
    const value = osc.amplitude * Math.sin(ctx.currentTimeMs * osc.frequency);
    if (osc.additive) {
      state[osc.property] += value;
    } else {
      state[osc.property] = base + value;
    }
  }
  if (spec.syncScale) state.scaleY = state.scaleX;
  if (spec.entrance && ctx.isEntering) state.opacity = entranceEasing(ctx.elapsed / ctx.inDuration);
}
function applyCharLoopSpec(spec, state, ctx) {
  const { textLength, currentTimeMs, defaultColor } = ctx;
  const charStyles = acquireCharStyles(textLength);
  for (let i = 0; i < textLength; i++) {
    charStyles[i][spec.charProperty] = spec.amplitude * Math.sin(currentTimeMs * spec.frequency + i * spec.charPhase);
    if (spec.setFill) charStyles[i].fill = defaultColor;
  }
  state.charStyles = charStyles;
  if (spec.entrance && ctx.isEntering) state.opacity = entranceEasing(ctx.elapsed / ctx.inDuration);
}
function applyCharStaggerSpec(spec, state, ctx) {
  const { textLength, effectProgress, defaultColor, defaultColorRgb: { r, g, b } } = ctx;
  const charStyles = acquireCharStyles(textLength);
  const windowSize = 1 / (textLength * (1 - spec.overlap) + spec.overlap);
  const alphaEasingFn = ctx.customEasing || entranceEasing;
  const scaleEasingFn = spec._scaleEasingFn || ctx.customScaleEasing || easeOutBack2;
  const randomOrder = ctx.staggerDistribution === "random" ? getRandomStaggerOrder(textLength) : void 0;
  for (let i = 0; i < textLength; i++) {
    const charStart = computeStaggerStart(i, textLength, spec.overlap, windowSize, ctx.staggerDistribution, randomOrder);
    const raw = (effectProgress - charStart) / windowSize;
    const charProgress = Math.max(0, Math.min(1, raw));
    const alphaEased = alphaEasingFn(charProgress);
    const scaleEased = scaleEasingFn(charProgress);
    const s = charStyles[i];
    if (spec.opacity) {
      const alpha = spec.opacity.from + (spec.opacity.to - spec.opacity.from) * alphaEased;
      s.charOpacity = alpha;
      s.fill = alphaEased >= 0.99 ? defaultColor : cachedRgba(r, g, b, alpha);
    }
    if (spec.scaleX) s.charScaleX = spec.scaleX.from + (spec.scaleX.to - spec.scaleX.from) * scaleEased;
    if (spec.scaleY) s.charScaleY = spec.scaleY.from + (spec.scaleY.to - spec.scaleY.from) * scaleEased;
    if (spec.blur) s.charBlur = spec.blur.from + (spec.blur.to - spec.blur.from) * alphaEased;
    if (spec.rotation) {
      const direction = spec.rotation.alternate ? i % 2 === 0 ? 1 : -1 : 1;
      s.charRotation = (spec.rotation.from + (spec.rotation.to - spec.rotation.from) * scaleEased) * direction;
    }
    if (spec.shadowBlur) s.charShadowBlur = spec.shadowBlur.from + (spec.shadowBlur.to - spec.shadowBlur.from) * alphaEased;
    if (spec.tracking) s.charTrackingOffset = spec.tracking.from + (spec.tracking.to - spec.tracking.from) * alphaEased;
    if (spec.skewX) s.charSkewX = spec.skewX.from + (spec.skewX.to - spec.skewX.from) * scaleEased;
    if (spec.offsetY) s.offsetY = spec.offsetY.from + (spec.offsetY.to - spec.offsetY.from) * scaleEased;
  }
  state.charStyles = charStyles;
}
var _hslCache = new LRUCache(512);
function cachedHsl(hue, saturation, lightness) {
  const h = Math.round(hue) % 360;
  const s = Math.min(100, Math.max(0, saturation));
  const l = Math.min(100, Math.max(0, lightness));
  const key = h * 10201 + s * 101 + l;
  let v = _hslCache.get(key);
  if (v !== void 0) return v;
  v = `hsl(${h}, ${s}%, ${l}%)`;
  _hslCache.set(key, v);
  return v;
}
var HIGHLIGHT_TRANSITION_MS = 60;
var WORD_BOUNCE_DURATION_MS = 150;
var WORD_BOUNCE_AMPLITUDE = 0.08;
var PAGE_CROSSFADE_MS = 80;
var HIGHLIGHT_BOX_FADE_MS = 100;
function lerpHexColor(colorA, colorB, t) {
  if (t <= 0) return colorA;
  if (t >= 1) return colorB;
  const a = parseHexToRgb(colorA);
  const b = parseHexToRgb(colorB);
  return cachedRgba(
    Math.round(a.r + (b.r - a.r) * t),
    Math.round(a.g + (b.g - a.g) * t),
    Math.round(a.b + (b.b - a.b) * t),
    1
  );
}
function applyCharColorCycleSpec(spec, state, ctx) {
  const { textLength, currentTimeMs } = ctx;
  const charStyles = acquireCharStyles(textLength);
  const phase = currentTimeMs * spec.speed;
  for (let i = 0; i < textLength; i++) {
    const hue = (phase + i / Math.max(textLength, 1)) * 360 % 360;
    charStyles[i].fill = cachedHsl(hue, spec.saturation, spec.lightness);
  }
  state.charStyles = charStyles;
  if (spec.entrance && ctx.isEntering) state.opacity = entranceEasing(ctx.elapsed / ctx.inDuration);
}
function applyWordStaggerSpec(spec, state, ctx) {
  const { textLength, effectProgress, defaultColor, defaultColorRgb: { r, g, b } } = ctx;
  const charStyles = acquireCharStyles(textLength);
  const boundaries = getWordBoundaries(ctx.captionText);
  const wordCount = boundaries.length;
  if (wordCount === 0) {
    for (let i = 0; i < textLength; i++) charStyles[i].fill = defaultColor;
    state.charStyles = charStyles;
    return;
  }
  const windowSize = 1 / (wordCount * (1 - spec.overlap) + spec.overlap);
  const alphaEasingFn = ctx.customEasing || entranceEasing;
  const scaleEasingFn = spec._scaleEasingFn || ctx.customScaleEasing || easeOutBack2;
  const randomOrder = ctx.staggerDistribution === "random" ? getRandomStaggerOrder(wordCount) : void 0;
  let wordIdx = 0;
  for (let i = 0; i < textLength; i++) {
    while (wordIdx < boundaries.length - 1 && i >= boundaries[wordIdx]) wordIdx++;
    const wordStart = computeStaggerStart(wordIdx, wordCount, spec.overlap, windowSize, ctx.staggerDistribution, randomOrder);
    const rawProgress = (effectProgress - wordStart) / windowSize;
    const wordProgress = Math.max(0, Math.min(1, rawProgress));
    const scaleEased = scaleEasingFn(wordProgress);
    const alphaEased = alphaEasingFn(wordProgress);
    const s = charStyles[i];
    if (spec.opacity) {
      s.charOpacity = spec.opacity.from + (spec.opacity.to - spec.opacity.from) * alphaEased;
      s.fill = alphaEased >= 0.99 ? defaultColor : cachedRgba(r, g, b, s.charOpacity);
    }
    if (spec.scaleX) {
      const raw = spec.scaleX.from + (spec.scaleX.to - spec.scaleX.from) * scaleEased;
      const overshoot = spec.scaleX.overshoot ?? 1;
      const scaled = raw * overshoot;
      s.charScaleX = wordProgress >= 0.99 ? 1 : Math.min(scaled, overshoot);
    }
    if (spec.scaleY) {
      const raw = spec.scaleY.from + (spec.scaleY.to - spec.scaleY.from) * scaleEased;
      const overshoot = spec.scaleY.overshoot ?? 1;
      const scaled = raw * overshoot;
      s.charScaleY = wordProgress >= 0.99 ? 1 : Math.min(scaled, overshoot);
    }
    if (spec.offsetY) s.offsetY = spec.offsetY.from + (spec.offsetY.to - spec.offsetY.from) * scaleEased;
  }
  state.charStyles = charStyles;
}
function applyGlitchSpec(spec, state, ctx) {
  const { textLength, currentTimeMs, defaultColor, defaultColorRgb: { r, g, b } } = ctx;
  const noiseTrigger = noise2D(currentTimeMs * spec.triggerFrequency, 0.5);
  const absTrigger = Math.abs(noiseTrigger);
  const isActive = absTrigger > spec.triggerThreshold;
  if (isActive) {
    const intensity = (absTrigger - spec.triggerThreshold) / (1 - spec.triggerThreshold);
    for (let di = 0; di < spec.displacement.length; di++) {
      const d = spec.displacement[di];
      const value = d.amplitude * (d.scale ?? 1) * noise2D(currentTimeMs * d.frequency, di * 3.7) * intensity;
      state[d.property] += value;
    }
  }
  const charStyles = acquireCharStyles(textLength);
  const cs = spec.colorShift;
  for (let i = 0; i < textLength; i++) {
    if (isActive && i % cs.charInterval === 0) {
      const shift = Math.floor(noise2D(currentTimeMs * cs.frequency, i * 0.3) * cs.amplitude);
      charStyles[i].fill = cachedRgba(Math.max(0, Math.min(255, r + shift)), g, Math.max(0, Math.min(255, b - shift)), 1);
    } else {
      charStyles[i].fill = defaultColor;
    }
  }
  state.charStyles = charStyles;
  if (spec.entrance && ctx.isEntering) state.opacity = entranceEasing(ctx.elapsed / ctx.inDuration);
}
function applyCharShadowLoopSpec(spec, state, ctx) {
  const { textLength, currentTimeMs } = ctx;
  const charStyles = acquireCharStyles(textLength);
  const phase = currentTimeMs * spec.speed;
  for (let i = 0; i < textLength; i++) {
    const charPhase = phase + i * spec.charPhase;
    const t = (Math.sin(charPhase) + 1) * 0.5;
    charStyles[i].charShadowBlur = spec.minBlur + (spec.maxBlur - spec.minBlur) * t;
    const hue = (currentTimeMs * spec.colorSpeed + i / Math.max(textLength, 1)) * 360 % 360;
    charStyles[i].charShadowColor = cachedHsl(hue, spec.saturation, spec.lightness);
    charStyles[i].fill = ctx.defaultColor;
  }
  state.charStyles = charStyles;
  if (spec.entrance && ctx.isEntering) state.opacity = entranceEasing(ctx.elapsed / ctx.inDuration);
}
function applyPresetSpec(spec, state, ctx) {
  switch (spec.type) {
    case "loop":
      applyLoopSpec(spec, state, ctx);
      break;
    case "charLoop":
      applyCharLoopSpec(spec, state, ctx);
      break;
    case "charStagger":
      applyCharStaggerSpec(spec, state, ctx);
      break;
    case "wordStagger":
      applyWordStaggerSpec(spec, state, ctx);
      break;
    case "glitch":
      applyGlitchSpec(spec, state, ctx);
      break;
    case "charColorCycle":
      applyCharColorCycleSpec(spec, state, ctx);
      break;
    case "charShadowLoop":
      applyCharShadowLoopSpec(spec, state, ctx);
      break;
  }
}
var DEFAULT_STATE = {
  opacity: 1,
  scaleX: 1,
  scaleY: 1,
  translateX: 0,
  translateY: 0,
  rotation: 0,
  blurAmount: 0,
  visibleCharCount: -1,
  isTypewriter: false,
  isTypewriterWord: false,
  isKaraoke: false,
  karaokeProgress: 0,
  karaokeStyle: "classic",
  karaokeHighlightColor: "#FFFF00",
  isNeon: false,
  neonColor: NEON_COLORS[0],
  neonStrokeWidth: 2
};
var ENTRANCE_HANDLERS = {
  fadeIn(state, t) {
    state.opacity = entranceEasing(t);
  },
  slideIn(state, t, _elapsed, _inDuration, canvasHeight, animation) {
    const inProgress = entranceEasing(t);
    const direction = animation.inDirection || "bottom";
    const dist = canvasHeight * ANIMATION_SIZES.SLIDE_DISTANCE_RATIO;
    if (direction === "bottom") state.translateY = dist * (1 - inProgress);
    else if (direction === "top") state.translateY = -dist * (1 - inProgress);
    else if (direction === "left") state.translateX = -dist * (1 - inProgress);
    else if (direction === "right") state.translateX = dist * (1 - inProgress);
    state.opacity = inProgress;
  },
  zoomIn(state, t) {
    const zoomProgress = zoomEntranceEasing(t);
    state.scaleX = 0.3 + 0.7 * zoomProgress;
    state.scaleY = 0.3 + 0.7 * zoomProgress;
    state.opacity = entranceEasing(t);
  },
  bounceIn(state, _t, elapsed, inDuration) {
    const bounceProgress = bounceEntranceEasing(elapsed / inDuration);
    state.scaleX = bounceProgress;
    state.scaleY = bounceProgress;
    state.opacity = Math.min(1, elapsed / (inDuration * ANIMATION_THRESHOLDS.BOUNCE_OPACITY_RATIO));
  },
  popIn(state, t) {
    const popProgress = popEasing(t);
    state.scaleX = 1.2 - 0.2 * popProgress;
    state.scaleY = 1.2 - 0.2 * popProgress;
    state.opacity = popProgress;
  }
};
var EXIT_HANDLERS = {
  fadeOut(state, p) {
    state.opacity = 1 - p;
  },
  slideOut(state, p, canvasHeight, animation) {
    const direction = animation.outDirection || "bottom";
    const dist = canvasHeight * ANIMATION_SIZES.SLIDE_DISTANCE_RATIO;
    if (direction === "bottom") state.translateY = dist * p;
    else if (direction === "top") state.translateY = -dist * p;
    else if (direction === "left") state.translateX = -dist * p;
    else if (direction === "right") state.translateX = dist * p;
    state.opacity = 1 - p;
  },
  zoomOut(state, p) {
    state.scaleX = 1 - 0.5 * p;
    state.scaleY = 1 - 0.5 * p;
    state.opacity = 1 - p;
  },
  popOut(state, p) {
    state.scaleX = 1 + 0.2 * p;
    state.scaleY = 1 + 0.2 * p;
    state.opacity = 1 - p;
  },
  bounceOut(state, p) {
    const bounceOut = easeInElastic(p, 1, 0.5);
    state.scaleX = 1 - bounceOut;
    state.scaleY = 1 - bounceOut;
    state.opacity = Math.max(0, 1 - p * 3);
  },
  blurOut(state, p) {
    state.blurAmount = ANIMATION_SIZES.BLUR_MAX * p;
    state.opacity = 1 - p;
    state.scaleX = 1 + 0.05 * p;
    state.scaleY = 1 + 0.05 * p;
  },
  rotateOut(state, p) {
    state.rotation = ANIMATION_SIZES.ROTATE_END_ANGLE * p;
    state.opacity = 1 - p;
  }
};
function handleBlurShimmer(state, ctx) {
  const { textLength, effectProgress, defaultColor, defaultColorRgb: { r, g, b } } = ctx;
  const charStyles = acquireCharStyles(textLength);
  const overlap = ANIMATION_THRESHOLDS.BLUR_SHIMMER_OVERLAP;
  const windowSize = 1 / (textLength * (1 - overlap) + overlap);
  const alphaEasingFn = ctx.customEasing || entranceEasing;
  const warmR = ANIMATION_SIZES.BLUR_SHIMMER_WARM_R;
  const warmG = ANIMATION_SIZES.BLUR_SHIMMER_WARM_G;
  const warmB = ANIMATION_SIZES.BLUR_SHIMMER_WARM_B;
  const randomOrder = ctx.staggerDistribution === "random" ? getRandomStaggerOrder(textLength) : void 0;
  for (let i = 0; i < textLength; i++) {
    const charStart = computeStaggerStart(i, textLength, overlap, windowSize, ctx.staggerDistribution, randomOrder);
    const raw = (effectProgress - charStart) / windowSize;
    const charProgress = Math.max(0, Math.min(1, raw));
    const eased = alphaEasingFn(charProgress);
    const s = charStyles[i];
    s.charBlur = (1 - eased) * ANIMATION_SIZES.CHAR_BLUR_MAX;
    s.charOpacity = eased;
    const blendR = Math.round(warmR + (r - warmR) * eased);
    const blendG = Math.round(warmG + (g - warmG) * eased);
    const blendB = Math.round(warmB + (b - warmB) * eased);
    s.fill = eased >= 0.99 ? defaultColor : cachedRgba(blendR, blendG, blendB, eased);
  }
  state.charStyles = charStyles;
}
function handleTikTokPage(state, ctx) {
  const pageConfig = ctx.animation.pageConfig ?? {};
  if (!ctx.wordTimings?.length) {
    handleKaraoke(state, ctx);
    return;
  }
  const pages = groupWordsIntoPages(
    ctx.wordTimings,
    pageConfig.wordsPerPage ?? 4,
    pageConfig.combineWithinMs ?? 1200
  );
  const activePage = findActivePageAtTime(pages, ctx.currentTimeMs);
  if (!activePage) {
    let prevPage = null;
    for (let i = 0; i < pages.length; i++) {
      if (ctx.currentTimeMs > pages[i].endMs && (i + 1 >= pages.length || ctx.currentTimeMs < pages[i + 1].startMs)) {
        prevPage = pages[i];
        break;
      }
    }
    if (prevPage) {
      const elapsed = ctx.currentTimeMs - prevPage.endMs;
      if (elapsed < PAGE_CROSSFADE_MS) {
        state.pageText = prevPage.text;
        state.opacity *= 1 - elapsed / PAGE_CROSSFADE_MS;
        const pg = toGraphemes(prevPage.text);
        const cs = acquireCharStyles(pg.length);
        for (let i = 0; i < pg.length; i++) cs[i].fill = ctx.defaultColor;
        state.charStyles = cs;
        return;
      }
    }
    state.opacity = 0;
    return;
  }
  state.pageText = activePage.text;
  const pageElapsed = ctx.currentTimeMs - activePage.startMs;
  const entranceDuration = pageConfig.pageEntranceDuration ?? 200;
  const entrance = pageConfig.pageEntrance ?? "spring";
  if (pageElapsed >= 0 && pageElapsed < entranceDuration && entrance !== "none") {
    const t = Math.min(1, pageElapsed / entranceDuration);
    let p;
    if (entrance === "pop") {
      p = popEasing(t);
      state.scaleX *= 0.7 + 0.3 * p;
      state.scaleY *= 0.7 + 0.3 * p;
    } else if (entrance === "slideUp") {
      p = entranceEasing(t);
      state.translateY += (1 - p) * 20;
      state.opacity *= p;
    } else {
      const springFn = resolveEasing("spring:200,20,1") ?? entranceEasing;
      p = springFn(t);
      state.scaleX *= 0.85 + 0.15 * p;
      state.scaleY *= 0.85 + 0.15 * p;
      state.translateY += (1 - p) * 12;
    }
  }
  const pageRemaining = activePage.endMs - ctx.currentTimeMs;
  if (pageRemaining >= 0 && pageRemaining < PAGE_CROSSFADE_MS) {
    state.opacity *= pageRemaining / PAGE_CROSSFADE_MS;
  }
  const highlightColor = pageConfig.highlightColor ?? "#FFFF00";
  const pageGraphemes = toGraphemes(activePage.text);
  const charStyles = acquireCharStyles(pageGraphemes.length);
  const highlightedWordIdx = getHighlightedWordIndex(activePage, ctx.currentTimeMs);
  let charIdx = 0;
  let activeWordStartCharIdx = -1;
  let activeWordEndCharIdx = -1;
  for (let wi = 0; wi < activePage.words.length; wi++) {
    const word = activePage.words[wi];
    const isActive = wi === highlightedWordIdx;
    const wordGraphemes = toGraphemes(word.word);
    const wordStartCharIdx = charIdx;
    let fillColor;
    if (isActive) {
      const elapsed = ctx.currentTimeMs - word.startMs;
      fillColor = elapsed < HIGHLIGHT_TRANSITION_MS ? lerpHexColor(ctx.defaultColor, highlightColor, elapsed / HIGHLIGHT_TRANSITION_MS) : highlightColor;
    } else if (wi === highlightedWordIdx - 1) {
      const elapsed = ctx.currentTimeMs - word.endMs;
      fillColor = elapsed >= 0 && elapsed < HIGHLIGHT_TRANSITION_MS ? lerpHexColor(highlightColor, ctx.defaultColor, elapsed / HIGHLIGHT_TRANSITION_MS) : ctx.defaultColor;
    } else {
      fillColor = ctx.defaultColor;
    }
    for (let j = 0; j < wordGraphemes.length && charIdx < pageGraphemes.length; j++, charIdx++) {
      const isSpace = wordGraphemes[j].trim() === "";
      charStyles[charIdx].fill = isSpace ? ctx.defaultColor : fillColor;
    }
    if (isActive) {
      activeWordStartCharIdx = wordStartCharIdx;
      activeWordEndCharIdx = charIdx;
    }
  }
  while (charIdx < pageGraphemes.length) {
    charStyles[charIdx].fill = ctx.defaultColor;
    charIdx++;
  }
  if (highlightedWordIdx >= 0 && highlightedWordIdx < activePage.words.length) {
    const activeWord = activePage.words[highlightedWordIdx];
    const wordElapsed = ctx.currentTimeMs - activeWord.startMs;
    if (wordElapsed >= 0 && wordElapsed < WORD_BOUNCE_DURATION_MS) {
      const t = wordElapsed / WORD_BOUNCE_DURATION_MS;
      const scale = 1 + WORD_BOUNCE_AMPLITUDE * (1 - easeOutElastic2(t, 1, 0.5));
      for (let i = activeWordStartCharIdx; i < activeWordEndCharIdx && i < pageGraphemes.length; i++) {
        if (pageGraphemes[i].trim() !== "") {
          charStyles[i].charScaleX = scale;
          charStyles[i].charScaleY = scale;
        }
      }
    }
  }
  if (highlightedWordIdx >= 0 && activeWordStartCharIdx >= 0) {
    const activeWord = activePage.words[highlightedWordIdx];
    const wordElapsed = ctx.currentTimeMs - activeWord.startMs;
    const hlRgb = parseHexToRgb(highlightColor);
    const boxColor = cachedRgba(hlRgb.r, hlRgb.g, hlRgb.b, 0.2);
    const boxOpacity = wordElapsed < HIGHLIGHT_BOX_FADE_MS ? Math.min(1, wordElapsed / HIGHLIGHT_BOX_FADE_MS) : 1;
    let boxStart = activeWordStartCharIdx;
    let boxEnd = activeWordEndCharIdx;
    while (boxStart < boxEnd && pageGraphemes[boxStart].trim() === "") boxStart++;
    while (boxEnd > boxStart && pageGraphemes[boxEnd - 1].trim() === "") boxEnd--;
    if (boxEnd > boxStart) {
      state.wordHighlightBoxes = [{
        startCharIdx: boxStart,
        endCharIdx: boxEnd,
        color: boxColor,
        opacity: boxOpacity
      }];
    }
  }
  state.charStyles = charStyles;
}
var PRE_OUT_HANDLERS = {
  "typewriter": handleTypewriter2,
  "typewriter-word": handleTypewriterWord,
  "neon": handleNeon,
  "blur-shimmer": handleBlurShimmer,
  "tiktok": handleTikTokPage
};
function calculateCaptionAnimationState(currentTimeMs, captionStartMs, captionEndMs, captionText, animation, defaultColor = "#FFFFFF", canvasHeight = 1080, wordTimings) {
  if (!animation || animation.preset === "none") {
    return { ...DEFAULT_STATE };
  }
  const cleanText = captionText.replace(/\n/g, "");
  const textLength = toGraphemes(cleanText).length;
  const captionDuration = captionEndMs - captionStartMs;
  const inDuration = animation.inDuration || 500;
  const outDuration = animation.outDuration || 500;
  const inType = animation.inType || "none";
  const outType = animation.outType || "none";
  const preset = animation.preset;
  const elapsed = currentTimeMs - captionStartMs;
  const remaining = captionEndMs - currentTimeMs;
  const isEntering = elapsed < inDuration && elapsed >= 0;
  const isExiting = remaining < outDuration && remaining >= 0;
  const effectDuration = Math.max(1, captionDuration - outDuration);
  const effectProgress = Math.min(1, Math.max(0, elapsed / effectDuration));
  const state = { ...DEFAULT_STATE };
  if (isEntering && inType !== "none") {
    const handler = ENTRANCE_HANDLERS[inType];
    if (handler) handler(state, elapsed / inDuration, elapsed, inDuration, canvasHeight, animation);
  }
  const customEasing = animation.easing ? resolveEasing(animation.easing) : void 0;
  const ctx = {
    textLength,
    effectProgress,
    elapsed,
    effectDuration,
    currentTimeMs,
    captionText: cleanText,
    defaultColor,
    animation,
    inDuration,
    isEntering,
    defaultColorRgb: parseHexToRgb(defaultColor),
    wordTimings,
    customEasing,
    customScaleEasing: customEasing,
    staggerDistribution: animation.staggerDistribution
  };
  {
    let ph;
    let ih;
    if (preset && preset !== "none") {
      ph = preset.startsWith("karaoke") ? handleKaraoke : preset.startsWith("tiktok") ? handleTikTokPage : PRE_OUT_HANDLERS[preset];
    }
    if (inType !== "none") {
      const h = PRE_OUT_HANDLERS[inType];
      if (h && h !== ph) ih = h;
    }
    if (ph) ph(state, ctx);
    if (ih) ih(state, ctx);
  }
  if (isExiting && outType !== "none") {
    const handler = EXIT_HANDLERS[outType];
    if (handler) handler(state, exitEasing(1 - remaining / outDuration), canvasHeight, animation);
  }
  {
    const keys = [preset, inType !== "none" ? inType : void 0];
    let prevKey;
    for (const key of keys) {
      if (!key || key === "none" || key === prevKey) continue;
      prevKey = key;
      const spec = PRESET_SPECS[key];
      if (spec) applyPresetSpec(spec, state, ctx);
    }
  }
  return state;
}

// ../../shared/caption-animation/charBatchRenderer.ts
function styleHasTransform(s) {
  return !!(s.offsetX || s.offsetY || s.charScaleX !== void 0 && s.charScaleX !== 1 || s.charScaleY !== void 0 && s.charScaleY !== 1 || s.charOpacity !== void 0 && s.charOpacity !== 1 || s.charRotation !== void 0 && s.charRotation !== 0 || s.charBlur !== void 0 && s.charBlur !== 0 || s.charShadowBlur !== void 0 && s.charShadowBlur !== 0 || s.charSkewX !== void 0 && s.charSkewX !== 0 || s.sweepGradientProgress !== void 0 && s.sweepGradientProgress > 0);
}
function canMerge(a, aHidden, b, bHidden) {
  if (aHidden !== bHidden) return false;
  if (aHidden) return true;
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (a.fill || "") === (b.fill || "") && (a.stroke || "") === (b.stroke || "") && (a.strokeWidth || 0) === (b.strokeWidth || 0) && (a.fontWeight || "") === (b.fontWeight || "") && (a.underline || false) === (b.underline || false) && (a.offsetX || 0) === (b.offsetX || 0) && (a.offsetY || 0) === (b.offsetY || 0) && (a.charScaleX ?? 1) === (b.charScaleX ?? 1) && (a.charScaleY ?? 1) === (b.charScaleY ?? 1) && (a.charOpacity ?? 1) === (b.charOpacity ?? 1) && (a.charRotation ?? 0) === (b.charRotation ?? 0) && (a.charBlur ?? 0) === (b.charBlur ?? 0) && (a.charShadowBlur ?? 0) === (b.charShadowBlur ?? 0) && (a.charShadowColor || "") === (b.charShadowColor || "") && (a.charTrackingOffset ?? 0) === (b.charTrackingOffset ?? 0) && (a.charSkewX ?? 0) === (b.charSkewX ?? 0) && (a.sweepGradientProgress ?? 0) === (b.sweepGradientProgress ?? 0);
}
function batchCharactersByStyle(line, lineStartX, charStyles, globalCharIndexStart, visibleCharCount, isTypewriter, getCharWidth, charSpacingPx = 0, typewriterFractionalChar) {
  const chars = toGraphemes(line);
  if (chars.length === 0) return [];
  const batches = [];
  let currentBatch = null;
  let prevStyle;
  let prevHidden = false;
  let x = lineStartX;
  for (let j = 0; j < chars.length; j++) {
    const char = chars[j];
    const globalIndex = globalCharIndexStart + j;
    const charWidth = getCharWidth(char);
    const trackingOffset = charStyles?.[globalIndex]?.charTrackingOffset ?? 0;
    const isHidden = isTypewriter && globalIndex > visibleCharCount;
    const isFractional = isTypewriter && globalIndex === visibleCharCount && typewriterFractionalChar !== void 0 && typewriterFractionalChar > 0;
    let charStyle = charStyles?.[globalIndex] || {};
    if (isFractional) {
      charStyle = { ...charStyle, charOpacity: typewriterFractionalChar };
    }
    if (currentBatch && !isFractional && canMerge(prevStyle, prevHidden, charStyle, isHidden)) {
      currentBatch.text += char;
      currentBatch.width += charWidth + charSpacingPx + trackingOffset;
    } else {
      if (currentBatch) {
        batches.push(currentBatch);
      }
      currentBatch = {
        text: char,
        startX: x,
        width: charWidth,
        style: charStyle,
        hidden: isHidden,
        hasTransform: !isHidden && (styleHasTransform(charStyle) || isFractional)
      };
    }
    prevStyle = charStyle;
    prevHidden = isHidden;
    x += charWidth + charSpacingPx + trackingOffset;
  }
  if (currentBatch) {
    batches.push(currentBatch);
  }
  return batches;
}
function renderCharBatches(ctx, batches, y, defaultColor, baseFontSpec, fontSize, fontStyleStr, fontFamily, charSpacingPx = 0) {
  let lastFillStyle = "";
  let lastStrokeStyle = "";
  let lastLineWidth = -1;
  let lastFont = baseFontSpec;
  ctx.textAlign = "left";
  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";
  ctx.miterLimit = 4;
  function applyStroke(stroke, strokeWidth, text, x, ty) {
    if (stroke !== lastStrokeStyle) {
      ctx.strokeStyle = stroke;
      lastStrokeStyle = stroke;
    }
    if (strokeWidth !== lastLineWidth) {
      ctx.lineWidth = strokeWidth;
      lastLineWidth = strokeWidth;
    }
    ctx.strokeText(text, x, ty);
  }
  for (const batch of batches) {
    if (batch.hidden) continue;
    const { text, startX, style } = batch;
    const fillColor = style.fill || defaultColor;
    if (fillColor !== lastFillStyle) {
      ctx.fillStyle = fillColor;
      lastFillStyle = fillColor;
    }
    const needBoldFont = style.fontWeight && style.fontWeight !== "normal";
    if (needBoldFont) {
      const boldFont = `${fontStyleStr} ${style.fontWeight} ${fontSize}px "${fontFamily}"`;
      if (boldFont !== lastFont) {
        ctx.font = boldFont;
        lastFont = boldFont;
      }
    } else if (lastFont !== baseFontSpec) {
      ctx.font = baseFontSpec;
      lastFont = baseFontSpec;
    }
    if (batch.hasTransform) {
      ctx.save();
      const cx = startX + batch.width / 2;
      ctx.translate(cx + (style.offsetX || 0), y + (style.offsetY || 0));
      if (style.charOpacity !== void 0 && style.charOpacity !== 1) ctx.globalAlpha *= style.charOpacity;
      if (style.charRotation !== void 0 && style.charRotation !== 0) ctx.rotate(style.charRotation * Math.PI / 180);
      if (style.charSkewX !== void 0 && style.charSkewX !== 0) ctx.transform(1, 0, Math.tan(style.charSkewX * Math.PI / 180), 1, 0, 0);
      if (style.charBlur !== void 0 && style.charBlur > 0) ctx.filter = `blur(${style.charBlur}px)`;
      if (style.charShadowBlur !== void 0 && style.charShadowBlur > 0) {
        ctx.shadowBlur = style.charShadowBlur;
        ctx.shadowColor = style.charShadowColor || fillColor;
      }
      if (style.charScaleX !== void 0 || style.charScaleY !== void 0) ctx.scale(style.charScaleX ?? 1, style.charScaleY ?? 1);
      if (style.sweepGradientProgress != null && style.sweepGradientProgress > 0 && style.sweepGradientProgress < 1) {
        const hw = batch.width / 2;
        const grad = ctx.createLinearGradient(-hw, 0, hw, 0);
        const p = style.sweepGradientProgress;
        grad.addColorStop(0, fillColor);
        grad.addColorStop(Math.min(1, p), fillColor);
        grad.addColorStop(Math.min(1, p + 0.02), defaultColor);
        grad.addColorStop(1, defaultColor);
        ctx.fillStyle = grad;
      }
      if (style.stroke && style.strokeWidth) applyStroke(style.stroke, style.strokeWidth, text, -batch.width / 2, 0);
      ctx.fillText(text, -batch.width / 2, 0);
      ctx.restore();
      continue;
    }
    if (charSpacingPx > 0 && text.length > 1) {
      let cx = startX;
      for (const ch of toGraphemes(text)) {
        if (style.stroke && style.strokeWidth) applyStroke(style.stroke, style.strokeWidth, ch, cx, y);
        ctx.fillText(ch, cx, y);
        cx += ctx.measureText(ch).width + charSpacingPx;
      }
    } else {
      if (style.stroke && style.strokeWidth) applyStroke(style.stroke, style.strokeWidth, text, startX, y);
      ctx.fillText(text, startX, y);
    }
    if (style.underline) {
      const underlineY = Math.round(y + Math.max(1, fontSize * 0.1));
      const underlineColor = style.fill || defaultColor;
      const underlineWidth = Math.max(1, Math.round(fontSize / 16));
      if (underlineColor !== lastStrokeStyle) {
        ctx.strokeStyle = underlineColor;
        lastStrokeStyle = underlineColor;
      }
      if (underlineWidth !== lastLineWidth) {
        ctx.lineWidth = underlineWidth;
        lastLineWidth = underlineWidth;
      }
      ctx.beginPath();
      ctx.moveTo(startX, underlineY);
      ctx.lineTo(startX + batch.width, underlineY);
      ctx.stroke();
    }
  }
  if (lastFont !== baseFontSpec) {
    ctx.font = baseFontSpec;
  }
}

// ../../shared/caption-animation/captionRenderer.ts
function renderCaptionText(ctx, text, canvasWidth, canvasHeight, style, animState, deps, scaleX = 1, scaleY = 1) {
  if (animState.opacity <= 0) return;
  const renderText = animState.pageText ?? text;
  const fontSizeBase = style?.fontSize ?? 35;
  const styleScaleY = style?.scaleY ?? 1;
  const styleScaleX = style?.scaleX ?? 1;
  const animScaleX = animState.scaleX;
  const animScaleY = animState.scaleY;
  const fontFamily = style?.fontFamily ?? "Arial";
  const lineHeightMul = style?.lineHeight ?? 1.2;
  const textAlign = style?.textAlign ?? "center";
  const defaultColor = style?.fontColor ?? "#FFFFFF";
  const stylesArr = style?.styles || [];
  const isBold = stylesArr.includes("bold");
  const isItalic = stylesArr.includes("italic");
  const underline = stylesArr.includes("underline");
  const linethrough = stylesArr.includes("linethrough") || stylesArr.includes("strike") || stylesArr.includes("strikethrough");
  const fontWeightStr = isBold ? "bold" : (style?.fontWeight ?? 700).toString();
  const fontStyleStr = isItalic ? "italic" : "normal";
  ctx.save();
  ctx.globalAlpha = animState.opacity;
  ctx.globalCompositeOperation = "source-over";
  try {
    ctx.fontKerning = "normal";
    ctx.textRendering = "optimizeLegibility";
  } catch {
  }
  const padding = (style?.padding ?? 5) * scaleX;
  let targetWidth;
  if (typeof style?.width === "number") {
    targetWidth = Math.max(
      1,
      Math.min(canvasWidth, Math.round(style.width * styleScaleX * animScaleX * scaleX))
    );
  } else {
    targetWidth = Math.max(200 * scaleX, Math.min(canvasWidth * 0.8, canvasWidth));
  }
  const availableTextWidth = Math.max(10, targetWidth - padding * 2);
  let fontSize = fontSizeBase * styleScaleY * animScaleY * scaleY;
  if (animState.pageText !== void 0) {
    const maxFontSize = fontSize;
    const minFontSize = maxFontSize * 0.5;
    let lo = minFontSize;
    let hi = maxFontSize;
    while (hi - lo > 1) {
      const mid = (lo + hi) / 2;
      ctx.font = `${fontStyleStr} ${fontWeightStr} ${mid}px "${fontFamily}"`;
      const w = deps.measureLineWidth(renderText);
      if (w <= availableTextWidth) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    fontSize = Math.floor(lo);
  }
  const baseFontSpec = `${fontStyleStr} ${fontWeightStr} ${fontSize}px "${fontFamily}"`;
  ctx.font = baseFontSpec;
  const captionCharSpacingPx = charSpacingToPx(style?.charSpacing ?? 0, fontSize);
  const lines = deps.wrapText(renderText, availableTextWidth);
  const lineWidths = lines.map(deps.measureLineWidth);
  const lineHeightPx = fontSize * lineHeightMul;
  const bgHeight = Math.max(lineHeightPx * lines.length + padding * 2, fontSize + padding * 2);
  let left;
  const originX = style?.originX ?? "center";
  const posX = style?.positionX != null ? style.positionX * scaleX : null;
  if (originX === "left") {
    left = posX != null ? posX : 0;
  } else if (originX === "right") {
    left = (posX != null ? posX : canvasWidth) - targetWidth;
  } else {
    left = (posX != null ? posX : canvasWidth / 2) - targetWidth / 2;
  }
  let top;
  const originY = style?.originY ?? "bottom";
  const posY = style?.positionY != null ? style.positionY * scaleY : null;
  if (originY === "top") {
    top = posY != null ? posY : 0;
  } else if (originY === "center") {
    top = (posY != null ? posY : canvasHeight / 2) - bgHeight / 2;
  } else {
    if (posY != null) {
      if (posY < 0) {
        top = canvasHeight - Math.abs(posY) - bgHeight;
      } else {
        top = Math.max(0, posY - bgHeight);
      }
    } else {
      const bottomMargin = Math.round(canvasHeight * 0.02);
      top = canvasHeight - bottomMargin - bgHeight;
    }
  }
  left += animState.translateX;
  top += animState.translateY;
  if (animState.blurAmount > 0) {
    ctx.filter = `blur(${animState.blurAmount}px)`;
  }
  if (animState.rotation !== 0) {
    const cx = left + targetWidth / 2;
    const cy = top + bgHeight / 2;
    ctx.translate(cx, cy);
    ctx.rotate(animState.rotation * Math.PI / 180);
    ctx.translate(-cx, -cy);
  }
  if (style?.backgroundColor && style.backgroundColor !== "transparent") {
    ctx.save();
    ctx.fillStyle = style.backgroundColor;
    const radius = Math.max(0, (style?.borderRadius ?? 10) * scaleX);
    deps.drawRoundedRect(ctx, left, top, targetWidth, bgHeight, radius, radius, style.backgroundColor);
    ctx.restore();
  }
  const hasLegacyShadow = !style?.shadowLayers?.length && (!!style?.shadowColor || style?.shadowBlur !== void 0 || style?.shadowOffsetX !== void 0 || style?.shadowOffsetY !== void 0);
  if (hasLegacyShadow) {
    ctx.shadowColor = style.shadowColor || "#000000";
    ctx.shadowBlur = (style.shadowBlur ?? 0) * scaleX;
    ctx.shadowOffsetX = (style.shadowOffsetX ?? 0) * scaleX;
    ctx.shadowOffsetY = (style.shadowOffsetY ?? 0) * scaleY;
  } else {
    ctx.shadowColor = "rgba(0,0,0,0)";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  ctx.textBaseline = "alphabetic";
  if (style?.useGradient && style.gradientColors && style.gradientColors.length >= 2) {
    const maxLineW = Math.max(...lineWidths, 1);
    ctx.fillStyle = createTextGradient(ctx, style.gradientColors, maxLineW);
  } else {
    ctx.fillStyle = defaultColor;
  }
  ctx.textAlign = textAlign;
  const textX = textAlign === "left" ? left + padding : textAlign === "right" ? left + targetWidth - padding : left + targetWidth / 2;
  const baseStrokeWidth = (style?.strokeWidth ?? 0) * scaleX;
  const baseStrokeColor = style?.strokeColor;
  const doStroke = baseStrokeWidth > 0 && baseStrokeColor;
  if (doStroke) {
    ctx.lineWidth = baseStrokeWidth;
    ctx.strokeStyle = baseStrokeColor;
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";
    ctx.miterLimit = 4;
  }
  const metrics = deps.measureTextMetrics();
  const textHeight = metrics.ascent + metrics.descent;
  const verticalOffsetInLine = Math.max(0, (lineHeightPx - textHeight) / 2);
  const baseY = top + padding + verticalOffsetInLine + metrics.ascent;
  if (animState.wordHighlightBoxes && animState.wordHighlightBoxes.length > 0) {
    ctx.save();
    disableShadow(ctx);
    for (const box of animState.wordHighlightBoxes) {
      if (box.opacity <= 0) continue;
      let currentCharIdx = 0;
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const lineGraphemes = toGraphemes(lines[lineIdx]);
        const lineEndIdx = currentCharIdx + lineGraphemes.length;
        if (box.startCharIdx < lineEndIdx && box.endCharIdx > currentCharIdx) {
          const lw = lineWidths[lineIdx];
          let lineStartX;
          if (textAlign === "left") lineStartX = left + padding;
          else if (textAlign === "right") lineStartX = left + targetWidth - padding - lw;
          else lineStartX = left + targetWidth / 2 - lw / 2;
          const boxStartInLine = Math.max(0, box.startCharIdx - currentCharIdx);
          const boxEndInLine = Math.min(lineGraphemes.length, box.endCharIdx - currentCharIdx);
          let bx = lineStartX;
          for (let ci = 0; ci < boxStartInLine; ci++) bx += deps.getCharWidth(lineGraphemes[ci]) + captionCharSpacingPx;
          let bw = 0;
          for (let ci = boxStartInLine; ci < boxEndInLine; ci++) bw += deps.getCharWidth(lineGraphemes[ci]) + captionCharSpacingPx;
          const boxPadX = padding * 0.4;
          const boxPadY = fontSize * 0.1;
          const boxY = baseY + lineIdx * lineHeightPx - metrics.ascent - boxPadY;
          const boxH = fontSize + boxPadY * 2;
          const radius = Math.min(fontSize * 0.2, 8 * scaleX);
          ctx.globalAlpha = animState.opacity * box.opacity;
          deps.drawRoundedRect(ctx, bx - boxPadX, boxY, bw + boxPadX * 2, boxH, radius, radius, box.color);
        }
        currentCharIdx = lineEndIdx;
      }
    }
    ctx.restore();
    ctx.globalAlpha = animState.opacity;
  }
  const needCharByChar = animState.isTypewriter || animState.charStyles !== void 0;
  const shadowLayers = style?.shadowLayers;
  const hasMultiLayerShadow = shadowLayers && shadowLayers.length > 0;
  const drawAllLinesStrokeFill = () => {
    let ys = baseY;
    for (let i = 0; i < lines.length; i++) {
      const fx = textAlign === "center" ? textX : Math.round(textX);
      ctx.textAlign = textAlign;
      if (doStroke) {
        if (captionCharSpacingPx > 0) strokeTextWithSpacing(ctx, lines[i], fx, Math.round(ys), textAlign, captionCharSpacingPx);
        else ctx.strokeText(lines[i], fx, Math.round(ys));
      }
      if (captionCharSpacingPx > 0) fillTextWithSpacing(ctx, lines[i], fx, ys, textAlign, captionCharSpacingPx);
      else ctx.fillText(lines[i], fx, ys);
      ys += lineHeightPx;
    }
  };
  if (hasMultiLayerShadow) {
    for (const layer of shadowLayers) {
      ctx.shadowColor = layer.color;
      ctx.shadowBlur = layer.blur * scaleX;
      ctx.shadowOffsetX = layer.offsetX * scaleX;
      ctx.shadowOffsetY = layer.offsetY * scaleY;
      drawAllLinesStrokeFill();
    }
    disableShadow(ctx);
  }
  if (needCharByChar) {
    const charRenderShadowState = captureShadow(ctx);
    disableShadow(ctx);
    let y = baseY;
    let globalCharIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineWidth = lineWidths[i];
      let lineStartX;
      if (textAlign === "left") lineStartX = left + padding;
      else if (textAlign === "right") lineStartX = left + targetWidth - padding - lineWidth;
      else lineStartX = left + targetWidth / 2 - lineWidth / 2;
      const lineGraphemeCount = toGraphemes(line).length;
      const batches = batchCharactersByStyle(
        line,
        lineStartX,
        animState.charStyles,
        globalCharIndex,
        animState.visibleCharCount,
        animState.isTypewriter,
        deps.getCharWidth,
        captionCharSpacingPx,
        animState.typewriterFractionalChar
      );
      renderCharBatches(
        ctx,
        batches,
        y,
        defaultColor,
        baseFontSpec,
        fontSize,
        fontStyleStr,
        fontFamily,
        captionCharSpacingPx
      );
      globalCharIndex += lineGraphemeCount;
      y += lineHeightPx;
    }
    restoreShadow(ctx, charRenderShadowState);
  } else if (!hasMultiLayerShadow) {
    if (doStroke && !animState.isNeon && !animState.isKaraoke) {
      ctx.textAlign = textAlign;
      let yStroke = baseY;
      for (let i = 0; i < lines.length; i++) {
        const fy = Math.round(yStroke);
        const fx = textAlign === "center" ? textX : Math.round(textX);
        if (captionCharSpacingPx > 0) strokeTextWithSpacing(ctx, lines[i], fx, fy, textAlign, captionCharSpacingPx);
        else ctx.strokeText(lines[i], fx, fy);
        yStroke += lineHeightPx;
      }
    }
    if (hasLegacyShadow) {
      disableShadow(ctx);
    }
    let y = baseY;
    for (let i = 0; i < lines.length; i++) {
      const fx = textAlign === "center" ? textX : Math.round(textX);
      ctx.textAlign = textAlign;
      if (captionCharSpacingPx > 0) fillTextWithSpacing(ctx, lines[i], fx, y, textAlign, captionCharSpacingPx);
      else ctx.fillText(lines[i], fx, y);
      y += lineHeightPx;
    }
  } else {
    drawAllLinesStrokeFill();
  }
  const hadShadow = hasLegacyShadow || (style?.shadowLayers?.length ?? 0) > 0;
  let savedShadowState;
  if (hadShadow) {
    savedShadowState = captureShadow(ctx);
    disableShadow(ctx);
  }
  let yDecor = baseY;
  for (let i = 0; i < lines.length; i++) {
    const w = lineWidths[i];
    let startX;
    if (textAlign === "left") {
      startX = left + padding;
    } else if (textAlign === "right") {
      startX = left + targetWidth - padding - w;
    } else {
      startX = left + targetWidth / 2 - w / 2;
    }
    const lineW = Math.max(1, Math.round(fontSize / 16));
    ctx.lineWidth = lineW;
    ctx.strokeStyle = defaultColor;
    if (underline && !animState.isKaraoke) {
      const underlineY = Math.round(yDecor + Math.max(1, fontSize * 0.1));
      ctx.beginPath();
      ctx.moveTo(startX, underlineY);
      ctx.lineTo(startX + w, underlineY);
      ctx.stroke();
    }
    if (linethrough) {
      const throughY = Math.round(yDecor - Math.max(1, fontSize * 0.3));
      ctx.beginPath();
      ctx.moveTo(startX, throughY);
      ctx.lineTo(startX + w, throughY);
      ctx.stroke();
    }
    yDecor += lineHeightPx;
  }
  if (hadShadow && savedShadowState) {
    restoreShadow(ctx, savedShadowState);
  }
  ctx.restore();
}

// ../../server/src/renderer/captionTextRenderer.ts
function renderCaptionTextServer(ctx, text, canvasWidth, canvasHeight, style, animState, fns, scaleX = 1, scaleY = 1) {
  const fontSizeBase = style?.fontSize ?? 35;
  const styleScaleY = style?.scaleY ?? 1;
  const fontSize = fontSizeBase * styleScaleY * animState.scaleY * scaleY;
  const captionCharSpacingPx = charSpacingToPx(style?.charSpacing ?? 0, fontSize);
  const stylesArr = style?.styles || [];
  const isBold = stylesArr.includes("bold");
  const isItalic = stylesArr.includes("italic");
  const fontWeightStr = isBold ? "bold" : (style?.fontWeight ?? 700).toString();
  const fontStyleStr = isItalic ? "italic" : "normal";
  const baseFontSpec = `${fontStyleStr} ${fontWeightStr} ${fontSize}px "${style?.fontFamily ?? "Arial"}"`;
  const deps = {
    wrapText: (t, maxWidth) => fns.wrapText(ctx, t, maxWidth, captionCharSpacingPx),
    measureLineWidth: (line) => fns.measureLineWidth(ctx, line, captionCharSpacingPx),
    getCharWidth: (char) => fns.getCharWidth(ctx, baseFontSpec, char),
    measureTextMetrics: () => fns.measureTextMetrics(ctx, fontSize),
    drawRoundedRect
  };
  renderCaptionText(
    ctx,
    text,
    canvasWidth,
    canvasHeight,
    style,
    animState,
    deps,
    scaleX,
    scaleY
  );
}

// ../../shared/animations/charTransforms.ts
function createSimpleCharTransform(cfg) {
  const pe = EASING[cfg.primary];
  const ae = EASING[cfg.alpha];
  const easingOf = (r) => r?.[2] ? EASING[r[2]] : pe;
  const eOffX = easingOf(cfg.offsetX);
  const eOffY = easingOf(cfg.offsetY);
  const eScale = easingOf(cfg.scale);
  const eRot = easingOf(cfg.rotation);
  const eBlur = easingOf(cfg.blur);
  return (p) => {
    const ap = cfg.alphaRamp ? Math.min(1, p * cfg.alphaRamp) : p;
    const alphaEased = ae(ap);
    const alpha = cfg.isOut ? 1 - alphaEased : cfg.alphaMultiplier ? Math.min(1, alphaEased * cfg.alphaMultiplier) : alphaEased;
    const interp = (range, def, e) => range ? range[0] + (range[1] - range[0]) * e(p) : def;
    let s = interp(cfg.scale, 1, eScale);
    if (cfg.scaleMin !== void 0) s = Math.max(cfg.scaleMin, s);
    const blurVal = interp(cfg.blur, 0, eBlur);
    return {
      offsetX: interp(cfg.offsetX, 0, eOffX),
      offsetY: interp(cfg.offsetY, 0, eOffY),
      scaleX: s,
      scaleY: s,
      rotation: interp(cfg.rotation, 0, eRot),
      alpha,
      blur: blurVal > 0.1 ? blurVal : void 0
    };
  };
}
var highlightTransform = createSimpleCharTransform({
  primary: "outElastic",
  alpha: "outCubic",
  isOut: false,
  scale: [0, 1],
  rotation: [0.15, 0, "outQuad"]
});
var slideInByCharacterTransform = createSimpleCharTransform({
  primary: "outBack",
  alpha: "outQuad",
  isOut: false,
  offsetX: [-50, 0],
  offsetY: [15, 0],
  scale: [0.7, 1]
});
var fadeInByCharacterTransform = createSimpleCharTransform({
  primary: "outQuad",
  alpha: "outCubic",
  isOut: false,
  offsetY: [20, 0],
  scale: [0.95, 1, "outCubic"]
});
var blurInByCharacterTransform = createSimpleCharTransform({
  primary: "outCubic",
  alpha: "outQuad",
  isOut: false,
  offsetX: [-10, 0],
  scale: [1.3, 1],
  blur: [12, 0]
});
var bounceInByCharacterTransform = (p) => {
  const bounceEased = EASING.outBounce(p);
  const alphaEased = EASING.outQuad(p);
  const offsetY = (1 - bounceEased) * 80;
  const offsetX = Math.sin(p * Math.PI * 3) * (1 - p) * 8;
  const scale = 0.1 + bounceEased * 0.95;
  const rotation = Math.sin(p * Math.PI * 2) * (1 - p) * 0.2;
  return { offsetX, offsetY, scaleX: scale, scaleY: scale, rotation, alpha: Math.min(1, alphaEased * 1.5) };
};
var zoomInByCharacterTransform = (p) => {
  const scaleEased = EASING.outElastic(p);
  const alphaEased = EASING.outCubic(p);
  const scale = Math.max(0, scaleEased);
  const rotateY = (1 - EASING.outQuad(p)) * 0.3;
  const zOffset = (1 - alphaEased) * -20;
  return {
    offsetX: zOffset,
    offsetY: 0,
    scaleX: scale * (1 - rotateY * 0.3),
    scaleY: scale,
    rotation: 0,
    alpha: Math.min(1, alphaEased)
  };
};
var rotateInByCharacterTransform = createSimpleCharTransform({
  primary: "outCubic",
  alpha: "outCubic",
  isOut: false,
  offsetX: [-30, 0],
  offsetY: [15, 0],
  scale: [0, 1, "outElastic"],
  scaleMin: 0.1,
  rotation: [Math.PI * 1.5, 0, "outBack"],
  alphaMultiplier: 1.2
});
var waveInTransform = (p) => {
  const alpha = EASING.outCubic(p);
  const waveAmplitude = 30 * (1 - p);
  const waveOffset = Math.sin(p * Math.PI * 3) * waveAmplitude;
  const scalePulse = 1 + Math.sin(p * Math.PI * 2) * 0.1 * (1 - p);
  const rotation = Math.sin(p * Math.PI * 2) * 0.1 * (1 - p);
  return { offsetX: 0, offsetY: waveOffset, scaleX: scalePulse, scaleY: scalePulse, rotation, alpha };
};
var dropInTransform = (p) => {
  const dropEased = EASING.outBounce(p);
  const alpha = EASING.outQuad(p);
  const dropDistance = (1 - dropEased) * -120;
  const horizontalShake = Math.sin(p * Math.PI * 4) * (1 - p) * 5;
  const squashProgress = Math.max(0, p - 0.7) / 0.3;
  const squashY = squashProgress > 0 ? 1 - Math.sin(squashProgress * Math.PI) * 0.2 : 1;
  const squashX = squashProgress > 0 ? 1 + Math.sin(squashProgress * Math.PI) * 0.15 : 1;
  return { offsetX: horizontalShake, offsetY: dropDistance, scaleX: squashX, scaleY: squashY, rotation: 0, alpha };
};
var flipInByCharacterTransform = (p) => {
  const flipEased = EASING.outBack(p);
  const alpha = EASING.outQuad(p);
  const flipAngle = (1 - flipEased) * Math.PI;
  const scaleX = Math.abs(Math.cos(flipAngle));
  const offsetY = Math.sin(flipAngle) * -10;
  return { offsetX: 0, offsetY, scaleX, scaleY: 1, rotation: 0, alpha };
};
var scatterInTransform = (p, charIndex, lineIndex) => {
  const eased = EASING.outCubic(p);
  const alpha = EASING.outQuad(p);
  const seed = (lineIndex * 100 + charIndex) * 1.618;
  const angle = seed % 1 * Math.PI * 2;
  const distance = 150 * (1 - eased);
  const offsetX = Math.cos(angle) * distance;
  const offsetY = Math.sin(angle) * distance;
  const rotation = (1 - eased) * (seed * 10 % 1 - 0.5) * Math.PI;
  const scale = 0.3 + eased * 0.7;
  return { offsetX, offsetY, scaleX: scale, scaleY: scale, rotation, alpha };
};
var elasticInByCharacterTransform = createSimpleCharTransform({
  primary: "outElastic",
  alpha: "outQuad",
  isOut: false,
  offsetY: [-20, 0],
  scale: [0, 1],
  alphaRamp: 2
});
var shakeInByCharacterTransform = (p) => {
  const eased = EASING.outCubic(p);
  const alpha = EASING.outQuad(p);
  const shakeIntensity = (1 - eased) * 15;
  const shakeX = Math.sin(p * Math.PI * 8) * shakeIntensity;
  const shakeY = Math.cos(p * Math.PI * 6) * shakeIntensity * 0.5;
  const scale = 1.3 - eased * 0.3;
  return { offsetX: shakeX, offsetY: shakeY, scaleX: scale, scaleY: scale, rotation: 0, alpha };
};
var popOutTransform = (p) => {
  const scaleEased = EASING.inBack(p);
  const alphaEased = EASING.inQuad(p);
  const scale = Math.max(0, 1 - scaleEased * 1.2);
  const floatY = -scaleEased * 25;
  const rotation = scaleEased * 0.3;
  const driftX = Math.sin(p * Math.PI) * 10;
  return { offsetX: driftX, offsetY: floatY, scaleX: scale, scaleY: scale, rotation, alpha: 1 - alphaEased };
};
var slideOutByCharacterTransform = createSimpleCharTransform({
  primary: "inBack",
  alpha: "inQuad",
  isOut: true,
  offsetX: [0, 60],
  offsetY: [0, 20],
  scale: [1, 0.6],
  rotation: [0, 0.15]
});
var fadeOutByCharacterTransform = createSimpleCharTransform({
  primary: "inCubic",
  alpha: "inCubic",
  isOut: true,
  offsetY: [0, 25, "inQuad"],
  scale: [1, 0.85],
  rotation: [0, 0.1]
});
var blurOutByCharacterTransform = createSimpleCharTransform({
  primary: "inCubic",
  alpha: "inQuad",
  isOut: true,
  offsetX: [0, 15],
  scale: [1, 1.4],
  blur: [0, 15]
});
var bounceOutByCharacterTransform = (p) => {
  const bounceEased = EASING.inBounce(p);
  const alphaEased = EASING.inQuad(p);
  const offsetY = bounceEased * -100;
  const offsetX = Math.sin(p * Math.PI * 2.5) * p * 15;
  const scale = Math.max(0.1, 1 - bounceEased * 0.9);
  const rotation = Math.sin(p * Math.PI * 2) * bounceEased * 0.4;
  return { offsetX, offsetY, scaleX: scale, scaleY: scale, rotation, alpha: 1 - alphaEased * 0.8 };
};
var zoomOutByCharacterTransform = createSimpleCharTransform({
  primary: "inBack",
  alpha: "inQuad",
  isOut: true,
  offsetX: [0, 20],
  scale: [1, 2.5],
  rotation: [0, 0.2]
});
var rotateOutByCharacterTransform = createSimpleCharTransform({
  primary: "inBack",
  alpha: "inCubic",
  isOut: true,
  offsetX: [0, 40],
  offsetY: [0, -12],
  scale: [1, 0.2, "inQuad"],
  scaleMin: 0.1,
  rotation: [0, Math.PI * 1.5]
});
var flipOutByCharacterTransform = (p) => {
  const flipEased = EASING.inBack(p);
  const alphaEased = EASING.inQuad(p);
  const flipAngle = flipEased * Math.PI;
  const scaleX = Math.abs(Math.cos(flipAngle));
  const offsetY = Math.sin(flipAngle) * -10;
  return { offsetX: 0, offsetY, scaleX, scaleY: 1, rotation: 0, alpha: 1 - alphaEased };
};
var scatterOutTransform = (p, charIndex, lineIndex) => {
  const eased = EASING.inCubic(p);
  const alphaEased = EASING.inQuad(p);
  const seed = (lineIndex * 100 + charIndex) * 1.618;
  const angle = seed % 1 * Math.PI * 2;
  const distance = 150 * eased;
  const offsetX = Math.cos(angle) * distance;
  const offsetY = Math.sin(angle) * distance;
  const rotation = eased * (seed * 10 % 1 - 0.5) * Math.PI;
  const scale = 1 - eased * 0.7;
  return { offsetX, offsetY, scaleX: scale, scaleY: scale, rotation, alpha: 1 - alphaEased };
};
var elasticOutByCharacterTransform = createSimpleCharTransform({
  primary: "inElastic",
  alpha: "inQuad",
  isOut: true,
  offsetY: [0, -20],
  scale: [1, 0],
  scaleMin: 0
});
var waveOutTransform = (p) => {
  const eased = EASING.inCubic(p);
  const alphaEased = EASING.inQuad(p);
  const waveAmplitude = 25 * eased;
  const waveOffset = Math.sin(p * Math.PI * 3) * waveAmplitude;
  const swayOffset = Math.cos(p * Math.PI * 2) * 8 * eased;
  return { offsetX: swayOffset, offsetY: waveOffset, scaleX: 1, scaleY: 1, rotation: 0, alpha: 1 - alphaEased };
};
var dropOutTransform = (p) => {
  const dropEased = EASING.inQuad(p);
  const alphaEased = EASING.inCubic(p);
  const dropDistance = dropEased * 120;
  const horizontalShake = Math.sin(p * Math.PI * 4) * p * 5;
  const stretchY = 1 + dropEased * 0.3;
  const stretchX = 1 - dropEased * 0.15;
  return { offsetX: horizontalShake, offsetY: dropDistance, scaleX: stretchX, scaleY: stretchY, rotation: 0, alpha: 1 - alphaEased };
};
var shakeOutByCharacterTransform = (p) => {
  const eased = EASING.inCubic(p);
  const alphaEased = EASING.inQuad(p);
  const shakeIntensity = eased * 20;
  const shakeX = Math.sin(p * Math.PI * 10) * shakeIntensity;
  const shakeY = Math.cos(p * Math.PI * 8) * shakeIntensity * 0.5;
  const scale = 1 + eased * 0.4;
  return { offsetX: shakeX, offsetY: shakeY, scaleX: scale, scaleY: scale, rotation: 0, alpha: 1 - alphaEased };
};
var CHAR_TRANSFORMS = {
  // Entrance
  highlight: { isOut: false, transform: highlightTransform },
  slideInByCharacter: { isOut: false, transform: slideInByCharacterTransform },
  fadeInByCharacter: { isOut: false, transform: fadeInByCharacterTransform },
  blurInByCharacter: { isOut: false, transform: blurInByCharacterTransform },
  bounceInByCharacter: { isOut: false, transform: bounceInByCharacterTransform },
  zoomInByCharacter: { isOut: false, transform: zoomInByCharacterTransform },
  rotateInByCharacter: { isOut: false, transform: rotateInByCharacterTransform },
  waveIn: { isOut: false, transform: waveInTransform },
  dropIn: { isOut: false, transform: dropInTransform },
  flipInByCharacter: { isOut: false, transform: flipInByCharacterTransform },
  scatterIn: { isOut: false, transform: scatterInTransform },
  elasticInByCharacter: { isOut: false, transform: elasticInByCharacterTransform },
  shakeInByCharacter: { isOut: false, transform: shakeInByCharacterTransform },
  // Exit
  popOut: { isOut: true, transform: popOutTransform },
  slideOutByCharacter: { isOut: true, transform: slideOutByCharacterTransform },
  fadeOutByCharacter: { isOut: true, transform: fadeOutByCharacterTransform },
  blurOutByCharacter: { isOut: true, transform: blurOutByCharacterTransform },
  bounceOutByCharacter: { isOut: true, transform: bounceOutByCharacterTransform },
  zoomOutByCharacter: { isOut: true, transform: zoomOutByCharacterTransform },
  rotateOutByCharacter: { isOut: true, transform: rotateOutByCharacterTransform },
  flipOutByCharacter: { isOut: true, transform: flipOutByCharacterTransform },
  scatterOut: { isOut: true, transform: scatterOutTransform },
  elasticOutByCharacter: { isOut: true, transform: elasticOutByCharacterTransform },
  waveOut: { isOut: true, transform: waveOutTransform },
  dropOut: { isOut: true, transform: dropOutTransform },
  shakeOutByCharacter: { isOut: true, transform: shakeOutByCharacterTransform }
};

// ../../shared/render/textRenderer.ts
function isIdentityTransform(t) {
  return Math.abs(t.offsetX) < 1e-6 && Math.abs(t.offsetY) < 1e-6 && Math.abs(t.rotation) < 1e-6 && Math.abs(t.scaleX - 1) < 1e-6 && Math.abs(t.scaleY - 1) < 1e-6 && Math.abs(t.alpha - 1) < 1e-6 && (!t.blur || t.blur < 0.1);
}
function strokeTextNoShadow(ctx, text, x, y, strokeColor, strokeWidth) {
  if (!(strokeWidth > 0 && strokeColor)) return;
  ctx.lineWidth = strokeWidth;
  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";
  ctx.miterLimit = 4;
  ctx.strokeStyle = strokeColor;
  ctx.strokeText(text, x, y);
}
function renderCharAnimation(ctx, wrappedLines, lineXs, lineYs, lineWs, textAlign, animationProgress, isOut, getTransform, fontSpec, textColor, strokeColor, strokeWidth, spacingPx, charWidthCache, hasShadow = false) {
  const lineGraphemes = wrappedLines.map((l) => toGraphemes(l));
  const totalChars = lineGraphemes.reduce((sum, g) => sum + g.length, 0);
  if (totalChars === 0) return;
  ctx.save();
  ctx.font = fontSpec;
  const savedAlpha = ctx.globalAlpha;
  let charCount = 0;
  for (let i = 0; i < wrappedLines.length; i++) {
    const graphemes = lineGraphemes[i];
    const lineY = lineYs[i];
    const charWidths = new Array(graphemes.length);
    const prefixX = new Array(graphemes.length);
    let accX = 0;
    for (let j2 = 0; j2 < graphemes.length; j2++) {
      prefixX[j2] = accX;
      const cwKey = charWidthCache ? `${fontSpec}|${graphemes[j2]}` : "";
      const cwCached = charWidthCache?.get(cwKey);
      if (cwCached !== void 0) {
        charWidths[j2] = cwCached;
      } else {
        charWidths[j2] = ctx.measureText(graphemes[j2]).width;
        charWidthCache?.set(cwKey, charWidths[j2]);
      }
      accX += charWidths[j2] + spacingPx;
    }
    let lineBaseX;
    if (textAlign === "center") {
      lineBaseX = lineXs[i] - lineWs[i] / 2;
    } else if (textAlign === "left") {
      lineBaseX = lineXs[i];
    } else {
      lineBaseX = lineXs[i] - lineWs[i];
    }
    let j = 0;
    while (j < graphemes.length) {
      const charStartProgress = (charCount + j) / totalChars;
      const charEndProgress = (charCount + j + 1) / totalChars;
      let charProgress = 0;
      if (animationProgress >= charEndProgress) {
        charProgress = 1;
      } else if (animationProgress > charStartProgress) {
        charProgress = (animationProgress - charStartProgress) / (charEndProgress - charStartProgress);
      }
      const shouldRender = isOut ? charProgress < 1 : charProgress > 0;
      if (shouldRender) {
        const transform = getTransform(charProgress, j, i);
        if (isIdentityTransform(transform)) {
          let batchEnd = j + 1;
          while (batchEnd < graphemes.length) {
            const bStartP = (charCount + batchEnd) / totalChars;
            const bEndP = (charCount + batchEnd + 1) / totalChars;
            let bProgress = 0;
            if (animationProgress >= bEndP) {
              bProgress = 1;
            } else if (animationProgress > bStartP) {
              bProgress = (animationProgress - bStartP) / (bEndP - bStartP);
            }
            const bShouldRender = isOut ? bProgress < 1 : bProgress > 0;
            if (!bShouldRender) break;
            const bTransform = getTransform(bProgress, batchEnd, i);
            if (!isIdentityTransform(bTransform)) break;
            batchEnd++;
          }
          renderBatchChars(
            ctx,
            graphemes,
            j,
            batchEnd,
            lineBaseX,
            lineY,
            prefixX,
            charWidths,
            savedAlpha,
            fontSpec,
            textColor,
            strokeColor,
            strokeWidth,
            spacingPx,
            hasShadow
          );
          j = batchEnd;
          continue;
        }
        renderSingleChar(
          ctx,
          graphemes[j],
          lineBaseX + prefixX[j],
          charWidths[j],
          lineY,
          transform,
          savedAlpha,
          fontSpec,
          textColor,
          strokeColor,
          strokeWidth,
          hasShadow
        );
      }
      j++;
    }
    charCount += graphemes.length;
  }
  ctx.globalAlpha = savedAlpha;
  ctx.restore();
}
function renderTextCharAnimations(ctx, wrappedLines, lineXs, lineYs, lineWs, textAlign, fontSpec, textColor, strokeColor, strokeWidth, charSpacingPx, animations, hasShadow, charWidthCache) {
  for (const anim of animations) {
    renderCharAnimation(
      ctx,
      wrappedLines,
      lineXs,
      lineYs,
      lineWs,
      textAlign,
      anim.progress,
      anim.isOut,
      anim.transform,
      fontSpec,
      textColor,
      strokeColor,
      strokeWidth,
      charSpacingPx,
      charWidthCache,
      hasShadow
    );
  }
}
function renderBatchChars(ctx, graphemes, start, end, lineBaseX, lineY, prefixX, charWidths, savedAlpha, fontSpec, textColor, strokeColor, strokeWidth, spacingPx, hasShadow) {
  const batchLen = end - start;
  ctx.save();
  ctx.globalAlpha = savedAlpha;
  ctx.font = fontSpec;
  ctx.textBaseline = "alphabetic";
  const hasStroke = strokeWidth > 0 && !!strokeColor;
  if (spacingPx > 0 || batchLen === 1) {
    ctx.textAlign = "center";
    if (hasShadow && hasStroke) {
      for (let k = start; k < end; k++) {
        const cx = lineBaseX + prefixX[k] + charWidths[k] / 2;
        strokeTextNoShadow(ctx, graphemes[k], cx, lineY, strokeColor, strokeWidth);
      }
      disableShadow(ctx);
      ctx.fillStyle = textColor;
      for (let k = start; k < end; k++) {
        const cx = lineBaseX + prefixX[k] + charWidths[k] / 2;
        ctx.fillText(graphemes[k], cx, lineY);
      }
      for (let k = start; k < end; k++) {
        const cx = lineBaseX + prefixX[k] + charWidths[k] / 2;
        strokeTextNoShadow(ctx, graphemes[k], cx, lineY, strokeColor, strokeWidth);
      }
    } else {
      ctx.fillStyle = textColor;
      for (let k = start; k < end; k++) {
        const cx = lineBaseX + prefixX[k] + charWidths[k] / 2;
        ctx.fillText(graphemes[k], cx, lineY);
      }
      disableShadow(ctx);
      if (hasStroke) {
        for (let k = start; k < end; k++) {
          const cx = lineBaseX + prefixX[k] + charWidths[k] / 2;
          strokeTextNoShadow(ctx, graphemes[k], cx, lineY, strokeColor, strokeWidth);
        }
      }
    }
  } else {
    const batchText = graphemes.slice(start, end).join("");
    const batchX = lineBaseX + prefixX[start];
    ctx.textAlign = "left";
    if (hasShadow && hasStroke) {
      strokeTextNoShadow(ctx, batchText, batchX, lineY, strokeColor, strokeWidth);
      disableShadow(ctx);
      ctx.fillStyle = textColor;
      ctx.fillText(batchText, batchX, lineY);
      strokeTextNoShadow(ctx, batchText, batchX, lineY, strokeColor, strokeWidth);
    } else {
      ctx.fillStyle = textColor;
      ctx.fillText(batchText, batchX, lineY);
      disableShadow(ctx);
      if (hasStroke) {
        strokeTextNoShadow(ctx, batchText, batchX, lineY, strokeColor, strokeWidth);
      }
    }
  }
  ctx.restore();
}
function renderSingleChar(ctx, char, charX, charWidth, lineY, transform, savedAlpha, fontSpec, textColor, strokeColor, strokeWidth, hasShadow) {
  const charCenterX = charX + charWidth / 2;
  ctx.save();
  if (transform.blur && transform.blur > 0.1) {
    try {
      ctx.filter = `blur(${transform.blur}px)`;
    } catch {
    }
  }
  ctx.translate(charCenterX + transform.offsetX, lineY + transform.offsetY);
  if (transform.rotation !== 0) ctx.rotate(transform.rotation);
  if (transform.scaleX !== 1 || transform.scaleY !== 1) {
    ctx.scale(transform.scaleX, transform.scaleY);
  }
  ctx.globalAlpha = savedAlpha * Math.max(0, Math.min(1, transform.alpha));
  ctx.font = fontSpec;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const hasStroke = strokeWidth > 0 && !!strokeColor;
  if (hasShadow && hasStroke) {
    strokeTextNoShadow(ctx, char, 0, 0, strokeColor, strokeWidth);
    disableShadow(ctx);
    ctx.fillStyle = textColor;
    ctx.fillText(char, 0, 0);
    strokeTextNoShadow(ctx, char, 0, 0, strokeColor, strokeWidth);
  } else {
    ctx.fillStyle = textColor;
    ctx.fillText(char, 0, 0);
    disableShadow(ctx);
    if (hasStroke) {
      strokeTextNoShadow(ctx, char, 0, 0, strokeColor, strokeWidth);
    }
  }
  ctx.restore();
}

// ../../server/src/renderer/textCharAnimations.ts
var CHAR_ANIMATION_REGISTRY = [
  // Entry animations
  { progressKey: "_popProgress", textKey: "_popText", isOut: false, getTransform: CHAR_TRANSFORMS.highlight.transform },
  { progressKey: "_slideInByCharacterProgress", textKey: "_slideInByCharacterText", isOut: false, getTransform: CHAR_TRANSFORMS.slideInByCharacter.transform },
  { progressKey: "_fadeInByCharacterProgress", textKey: "_fadeInByCharacterText", isOut: false, getTransform: CHAR_TRANSFORMS.fadeInByCharacter.transform },
  { progressKey: "_blurInByCharacterProgress", textKey: "_blurInByCharacterText", isOut: false, getTransform: CHAR_TRANSFORMS.blurInByCharacter.transform },
  { progressKey: "_bounceInByCharacterProgress", textKey: "_bounceInByCharacterText", isOut: false, getTransform: CHAR_TRANSFORMS.bounceInByCharacter.transform },
  { progressKey: "_zoomInByCharacterProgress", textKey: "_zoomInByCharacterText", isOut: false, getTransform: CHAR_TRANSFORMS.zoomInByCharacter.transform },
  { progressKey: "_waveInProgress", textKey: "_waveInText", isOut: false, getTransform: CHAR_TRANSFORMS.waveIn.transform },
  { progressKey: "_dropInProgress", textKey: "_dropInText", isOut: false, getTransform: CHAR_TRANSFORMS.dropIn.transform },
  { progressKey: "_rotateInByCharacterProgress", textKey: "_rotateInByCharacterText", isOut: false, getTransform: CHAR_TRANSFORMS.rotateInByCharacter.transform },
  { progressKey: "_flipInByCharacterProgress", textKey: "_flipInByCharacterText", isOut: false, getTransform: CHAR_TRANSFORMS.flipInByCharacter.transform },
  { progressKey: "_scatterInProgress", textKey: "_scatterInText", isOut: false, getTransform: CHAR_TRANSFORMS.scatterIn.transform },
  { progressKey: "_elasticInByCharacterProgress", textKey: "_elasticInByCharacterText", isOut: false, getTransform: CHAR_TRANSFORMS.elasticInByCharacter.transform },
  { progressKey: "_shakeInByCharacterProgress", textKey: "_shakeInByCharacterText", isOut: false, getTransform: CHAR_TRANSFORMS.shakeInByCharacter.transform },
  // Exit animations
  { progressKey: "_popOutByCharacterProgress", textKey: "_popOutByCharacterText", isOut: true, getTransform: CHAR_TRANSFORMS.popOut.transform },
  { progressKey: "_slideOutByCharacterProgress", textKey: "_slideOutByCharacterText", isOut: true, getTransform: CHAR_TRANSFORMS.slideOutByCharacter.transform },
  { progressKey: "_fadeOutByCharacterProgress", textKey: "_fadeOutByCharacterText", isOut: true, getTransform: CHAR_TRANSFORMS.fadeOutByCharacter.transform },
  { progressKey: "_blurOutByCharacterProgress", textKey: "_blurOutByCharacterText", isOut: true, getTransform: CHAR_TRANSFORMS.blurOutByCharacter.transform },
  { progressKey: "_bounceOutByCharacterProgress", textKey: "_bounceOutByCharacterText", isOut: true, getTransform: CHAR_TRANSFORMS.bounceOutByCharacter.transform },
  { progressKey: "_zoomOutByCharacterProgress", textKey: "_zoomOutByCharacterText", isOut: true, getTransform: CHAR_TRANSFORMS.zoomOutByCharacter.transform },
  { progressKey: "_rotateOutByCharacterProgress", textKey: "_rotateOutByCharacterText", isOut: true, getTransform: CHAR_TRANSFORMS.rotateOutByCharacter.transform },
  { progressKey: "_flipOutByCharacterProgress", textKey: "_flipOutByCharacterText", isOut: true, getTransform: CHAR_TRANSFORMS.flipOutByCharacter.transform },
  { progressKey: "_scatterOutProgress", textKey: "_scatterOutText", isOut: true, getTransform: CHAR_TRANSFORMS.scatterOut.transform },
  { progressKey: "_elasticOutByCharacterProgress", textKey: "_elasticOutByCharacterText", isOut: true, getTransform: CHAR_TRANSFORMS.elasticOutByCharacter.transform },
  { progressKey: "_shakeOutByCharacterProgress", textKey: "_shakeOutByCharacterText", isOut: true, getTransform: CHAR_TRANSFORMS.shakeOutByCharacter.transform },
  { progressKey: "_waveOutProgress", textKey: "_waveOutText", isOut: true, getTransform: CHAR_TRANSFORMS.waveOut.transform },
  { progressKey: "_dropOutProgress", textKey: "_dropOutText", isOut: true, getTransform: CHAR_TRANSFORMS.dropOut.transform }
];
function renderTextCharAnimations2(ctx, props, wrappedLines, lineXs, lineYs, lineWs, textAlign, textColor, fontSpec, strokeColor, strokeWidth, scaleX, scaleY, charSpacingPx = 0, charWidthCache, skipShadow = false) {
  const animations = [];
  for (const def of CHAR_ANIMATION_REGISTRY) {
    const progress = props[def.progressKey];
    const hasText = !!props[def.textKey];
    if (progress !== void 0 && progress >= 0 && hasText) {
      animations.push({ progress, isOut: def.isOut, transform: def.getTransform });
    }
  }
  if (animations.length === 0) return false;
  const hasShadow = !skipShadow && !!(props.shadowColor || props.shadowBlur || props.shadowOffsetX || props.shadowOffsetY);
  if (hasShadow) {
    const elemSx = props.scaleX ?? 1;
    const elemSy = props.scaleY ?? 1;
    ctx.shadowColor = props.shadowColor || "#000000";
    ctx.shadowBlur = (props.shadowBlur ?? 0) * (scaleX + scaleY) * (elemSx + elemSy) / 4;
    ctx.shadowOffsetX = (props.shadowOffsetX ?? 0) * scaleX * elemSx;
    ctx.shadowOffsetY = (props.shadowOffsetY ?? 0) * scaleY * elemSy;
  }
  renderTextCharAnimations(
    ctx,
    wrappedLines,
    lineXs,
    lineYs,
    lineWs,
    textAlign,
    fontSpec,
    textColor,
    strokeColor,
    strokeWidth,
    charSpacingPx,
    animations,
    hasShadow,
    charWidthCache
  );
  disableShadow(ctx);
  return true;
}

// ../../server/src/renderer/FontRegistry.ts
import { FontLibrary } from "skia-canvas";
import * as path3 from "path";
import * as fs3 from "fs";
import * as os3 from "os";
import * as crypto3 from "crypto";
import https2 from "https";
import http2 from "http";
var FONTS_DIR = path3.resolve(import.meta.dirname, "../../data/fonts");
var SYSTEM_FONTS = /* @__PURE__ */ new Set([
  "Arial",
  "Arial Black",
  "Verdana",
  "Tahoma",
  "Impact",
  "Times New Roman",
  "Georgia",
  "Courier New"
]);
var FONT_FALLBACK_MAP = {
  "Helvetica": "Roboto",
  "Helvetica Neue": "Roboto",
  "Segoe UI": "Roboto",
  "San Francisco": "Roboto",
  "Garamond": "EB Garamond",
  "Cambria": "Caladea",
  "Consolas": "Roboto Mono",
  "Futura": "Jost",
  "Microsoft YaHei": "Noto Sans SC",
  "PingFang SC": "Noto Sans SC",
  "SimHei": "Noto Sans SC",
  "SimSun": "Noto Sans SC"
};
var BUNDLED_GOOGLE_FONTS = {
  "Roboto": ["Roboto-Variable.ttf", "Roboto-Italic-Variable.ttf"],
  "Open Sans": ["OpenSans-Variable.ttf"],
  "Lato": ["Lato-Regular.ttf", "Lato-Bold.ttf"],
  "Montserrat": ["Montserrat-Variable.ttf"],
  "Poppins": ["Poppins-Regular.ttf", "Poppins-Bold.ttf"],
  "Nunito": ["Nunito-Variable.ttf"],
  "Noto Sans": ["NotoSans-Variable.ttf"],
  "Fira Code": ["FiraCode-Variable.ttf"],
  "Dancing Script": ["DancingScript-Variable.ttf"],
  "Pacifico": ["Pacifico-Regular.ttf"],
  "Oswald": ["Oswald-Variable.ttf"],
  "Bebas Neue": ["BebasNeue-Regular.ttf"],
  "Playfair Display": ["PlayfairDisplay-Variable.ttf", "PlayfairDisplay-Italic-Variable.ttf"],
  "EB Garamond": ["EBGaramond-Variable.ttf", "EBGaramond-Italic-Variable.ttf"],
  "Caladea": ["Caladea-Regular.ttf", "Caladea-Bold.ttf", "Caladea-Italic.ttf", "Caladea-BoldItalic.ttf"],
  "Roboto Mono": ["RobotoMono-Variable.ttf"],
  "Jost": ["Jost-Variable.ttf", "Jost-Italic-Variable.ttf"],
  "Noto Sans SC": ["NotoSansSC-Variable.ttf"]
};
var registeredFamilies = /* @__PURE__ */ new Set();
var googleFontsRegistered = false;
var canonicalFontNames = /* @__PURE__ */ new Map();
function initCanonicalNames() {
  for (const name of Object.keys(BUNDLED_GOOGLE_FONTS)) {
    canonicalFontNames.set(name.toLowerCase(), name);
  }
  for (const name of SYSTEM_FONTS) {
    canonicalFontNames.set(name.toLowerCase(), name);
  }
  for (const name of Object.keys(FONT_FALLBACK_MAP)) {
    canonicalFontNames.set(name.toLowerCase(), name);
  }
}
initCanonicalNames();
function resolveFontPaths(files) {
  return files.map((f) => path3.join(FONTS_DIR, f)).filter((p) => fs3.existsSync(p));
}
var FontRegistry = class _FontRegistry {
  /**
   * Register all bundled Google Fonts (idempotent — only executes once).
   * Call at server startup for best performance.
   */
  static registerGoogleFonts() {
    if (googleFontsRegistered) return;
    googleFontsRegistered = true;
    if (!fs3.existsSync(FONTS_DIR)) {
      console.warn(`[FontRegistry] Fonts directory not found: ${FONTS_DIR}. Run scripts/download-google-fonts.sh first.`);
      return;
    }
    let registered = 0;
    let skipped = 0;
    for (const [family, files] of Object.entries(BUNDLED_GOOGLE_FONTS)) {
      const fontPaths = resolveFontPaths(files);
      if (fontPaths.length === 0) {
        console.warn(`[FontRegistry] No font files found for "${family}"`);
        skipped += files.length;
        continue;
      }
      try {
        FontLibrary.use(family, fontPaths);
        registered += fontPaths.length;
        registeredFamilies.add(family);
      } catch (err) {
        console.warn(`[FontRegistry] Failed to register "${family}":`, err);
        skipped += files.length;
      }
    }
    let fallbackRegistered = 0;
    for (const [originalFont, substituteFont] of Object.entries(FONT_FALLBACK_MAP)) {
      const files = BUNDLED_GOOGLE_FONTS[substituteFont];
      if (!files) continue;
      const fontPaths = resolveFontPaths(files);
      if (fontPaths.length === 0) continue;
      try {
        FontLibrary.use(originalFont, fontPaths);
        fallbackRegistered++;
        registeredFamilies.add(originalFont);
      } catch {
      }
    }
    console.log(`[FontRegistry] Google Fonts registered: ${registered} files (${skipped} skipped), fallback aliases: ${fallbackRegistered}`);
  }
  /**
   * Download and register brand/custom fonts from URLs.
   * Returns temporary file paths for cleanup after export.
   *
   * skia-canvas supports TTF, OTF, WOFF, and WOFF2 formats.
   */
  static async registerBrandFonts(fonts) {
    const tempDir = path3.join(os3.tmpdir(), "video-export-fonts");
    fs3.mkdirSync(tempDir, { recursive: true });
    const tempFiles = [];
    for (const font of fonts) {
      if (registeredFamilies.has(font.fontFamily)) {
        continue;
      }
      const ext = font.fileType.toLowerCase();
      try {
        const hash = crypto3.createHash("md5").update(font.url).digest("hex");
        const tempPath = path3.join(tempDir, `${hash}.${ext}`);
        tempFiles.push(tempPath);
        if (!fs3.existsSync(tempPath)) {
          await _FontRegistry.downloadFile(font.url, tempPath);
        }
        if (!registeredFamilies.has(font.fontFamily)) {
          FontLibrary.use(font.fontFamily, [tempPath]);
          registeredFamilies.add(font.fontFamily);
          console.log(`[FontRegistry] Brand font registered: ${font.fontFamily}`);
        }
      } catch (err) {
        console.warn(`[FontRegistry] Failed to download/register brand font "${font.fontFamily}":`, err);
      }
    }
    return tempFiles;
  }
  /**
   * Extract required fonts from canvasState.
   * Scans all text elements and captions for font families.
   */
  static extractRequiredFonts(canvasState) {
    const usedFamilies = /* @__PURE__ */ new Set();
    const elements = canvasState.elements || [];
    for (const el of elements) {
      if (el.properties?.fontFamily) {
        usedFamilies.add(el.properties.fontFamily);
      }
      if (el.fabricObject?.fontFamily) {
        usedFamilies.add(el.fabricObject.fontFamily);
      }
    }
    const captions = canvasState.captions || [];
    for (const caption of captions) {
      if (caption.fontFamily) {
        usedFamilies.add(caption.fontFamily);
      }
    }
    const captionStyle = canvasState.globalCaptionStyle || canvasState.captionStyle;
    if (captionStyle?.fontFamily) {
      usedFamilies.add(captionStyle.fontFamily);
    }
    const googleFonts = [];
    const brandFonts = [];
    const fontAssets = canvasState.fontAssets || {};
    const fontAssetsLower = /* @__PURE__ */ new Map();
    for (const key of Object.keys(fontAssets)) {
      fontAssetsLower.set(key.toLowerCase(), key);
    }
    for (const family of usedFamilies) {
      const canonical = canonicalFontNames.get(family.toLowerCase());
      if (canonical) {
        if (SYSTEM_FONTS.has(canonical)) continue;
        if (FONT_FALLBACK_MAP[canonical]) {
          if (family !== canonical) {
            _FontRegistry.ensureAlias(family, canonical);
          }
          continue;
        }
        if (BUNDLED_GOOGLE_FONTS[canonical]) {
          googleFonts.push(canonical);
          if (family !== canonical) {
            _FontRegistry.ensureAlias(family, canonical);
          }
          continue;
        }
      }
      const assetKey = fontAssetsLower.get(family.toLowerCase());
      if (assetKey) {
        brandFonts.push({
          fontFamily: family,
          url: fontAssets[assetKey].url,
          fileType: fontAssets[assetKey].fileType
        });
      }
    }
    return { googleFonts, brandFonts };
  }
  /**
   * Register an alias name pointing to the same font files as the canonical name.
   * Used when the user-provided font name differs only in casing (e.g. "roboto" → "Roboto").
   */
  static ensureAlias(alias, canonical) {
    if (registeredFamilies.has(alias)) return;
    let files = BUNDLED_GOOGLE_FONTS[canonical];
    if (!files) {
      const substitute = FONT_FALLBACK_MAP[canonical];
      if (substitute) files = BUNDLED_GOOGLE_FONTS[substitute];
    }
    if (!files) return;
    const fontPaths = resolveFontPaths(files);
    if (fontPaths.length === 0) return;
    try {
      FontLibrary.use(alias, fontPaths);
      registeredFamilies.add(alias);
    } catch {
    }
  }
  /**
   * Clean up temporary font files downloaded for brand fonts.
   */
  static cleanupTempFonts(tempFiles) {
    for (const filePath of tempFiles) {
      try {
        if (fs3.existsSync(filePath)) {
          fs3.unlinkSync(filePath);
        }
      } catch {
      }
    }
  }
  /**
   * Download a file from URL to local path, following redirects.
   */
  static downloadFile(url, destPath) {
    return new Promise((resolve3, reject) => {
      const protocol = url.startsWith("https") ? https2 : http2;
      const request = protocol.get(url, { timeout: 3e4 }, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          _FontRegistry.downloadFile(response.headers.location, destPath).then(resolve3, reject);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
          return;
        }
        const fileStream = fs3.createWriteStream(destPath);
        response.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close();
          resolve3();
        });
        fileStream.on("error", (err) => {
          fs3.unlink(destPath, () => {
          });
          reject(err);
        });
      });
      request.on("error", (err) => {
        fs3.unlink(destPath, () => {
        });
        reject(err);
      });
      request.on("timeout", () => {
        request.destroy();
        fs3.unlink(destPath, () => {
        });
        reject(new Error(`Download timeout for ${url}`));
      });
    });
  }
};

// ../../shared/effects/constants.ts
var RENDER_ORDER = {
  FILTER: 100,
  TEMPORAL: 150,
  BLUR: 200,
  DISTORTION: 300,
  LIGHT: 400,
  GLITCH: 500,
  POSTPROCESS: 600,
  OVERLAY: 700
};

// ../../shared/effects/registry.ts
function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
var EFFECT_REGISTRY = {
  // ─── Blur 类 ──────────────────────────────────
  gaussianBlur: {
    type: "gaussianBlur",
    category: "blur",
    label: "effect_gaussian_blur",
    thumbnail: "gaussianBlur",
    params: [
      {
        key: "radius",
        type: "number",
        label: "effect_param_radius",
        default: 4,
        min: 0,
        max: 20,
        step: 0.5,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 0.5,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "GAUSSIAN_BLUR_FRAG",
    canvas2dFallback: "applyGaussianBlur",
    renderOrder: RENDER_ORDER.BLUR,
    animate: (params, t) => {
      const speed = num(params.speed, 0.5);
      const base = num(params.radius, 4);
      return { radius: base * (0.6 + 0.4 * noise2D(t / 1e3 * speed, 0)) };
    }
  },
  radialBlur: {
    type: "radialBlur",
    category: "blur",
    label: "effect_radial_blur",
    thumbnail: "radialBlur",
    params: [
      {
        key: "intensity",
        type: "number",
        label: "effect_param_intensity",
        default: 0.3,
        min: 0,
        max: 1,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "centerX",
        type: "number",
        label: "effect_param_center_x",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
        keyframeable: true
      },
      {
        key: "centerY",
        type: "number",
        label: "effect_param_center_y",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 0.5,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "RADIAL_BLUR_FRAG",
    canvas2dFallback: "applyRadialBlur",
    renderOrder: RENDER_ORDER.BLUR,
    animate: (params, t) => {
      const speed = num(params.speed, 0.5);
      const ts = t / 1e3 * speed;
      return {
        centerX: 0.5 + 0.15 * noise2D(ts, 260),
        centerY: 0.5 + 0.15 * noise2D(ts, 270)
      };
    }
  },
  // ─── Distortion 类 ────────────────────────────
  wave: {
    type: "wave",
    category: "distortion",
    label: "effect_wave",
    thumbnail: "wave",
    params: [
      {
        key: "amplitude",
        type: "number",
        label: "effect_param_amplitude",
        default: 10,
        min: 0,
        max: 50,
        step: 1,
        keyframeable: true
      },
      {
        key: "frequency",
        type: "number",
        label: "effect_param_frequency",
        default: 4,
        min: 0.5,
        max: 20,
        step: 0.5,
        keyframeable: true
      },
      {
        key: "phase",
        type: "number",
        label: "effect_param_phase",
        default: 0,
        min: 0,
        max: 6.28,
        step: 0.1,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 1,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "WAVE_FRAG",
    canvas2dFallback: "applyWave",
    renderOrder: RENDER_ORDER.DISTORTION,
    animate: (params, t) => {
      const speed = num(params.speed, 1);
      const phase = num(params.phase, 0);
      return { phase: phase + t / 1e3 * speed * Math.PI * 2 };
    }
  },
  ripple: {
    type: "ripple",
    category: "distortion",
    label: "effect_ripple",
    thumbnail: "ripple",
    params: [
      {
        key: "amplitude",
        type: "number",
        label: "effect_param_amplitude",
        default: 8,
        min: 0,
        max: 30,
        step: 1,
        keyframeable: true
      },
      {
        key: "frequency",
        type: "number",
        label: "effect_param_frequency",
        default: 6,
        min: 1,
        max: 20,
        step: 0.5,
        keyframeable: true
      },
      {
        key: "centerX",
        type: "number",
        label: "effect_param_center_x",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
        keyframeable: true
      },
      {
        key: "centerY",
        type: "number",
        label: "effect_param_center_y",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
        keyframeable: true
      },
      {
        key: "phase",
        type: "number",
        label: "effect_param_phase",
        default: 0,
        min: 0,
        max: 6.28,
        step: 0.1,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 1,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "RIPPLE_FRAG",
    canvas2dFallback: "applyRipple",
    renderOrder: RENDER_ORDER.DISTORTION,
    animate: (params, t) => {
      const speed = num(params.speed, 1);
      const phase = num(params.phase, 0);
      return { phase: phase + t / 1e3 * speed * Math.PI * 2 };
    }
  },
  // ─── Glitch 类 ─────────────────────────────────
  rgbSplit: {
    type: "rgbSplit",
    category: "glitch",
    label: "effect_rgb_split",
    thumbnail: "rgbSplit",
    params: [
      {
        key: "amount",
        type: "number",
        label: "effect_param_amount",
        default: 5,
        min: 0,
        max: 30,
        step: 1,
        keyframeable: true
      },
      {
        key: "angle",
        type: "number",
        label: "effect_param_angle",
        default: 0,
        min: 0,
        max: 360,
        step: 1,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 1,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "RGB_SPLIT_FRAG",
    canvas2dFallback: "applyRgbSplit",
    renderOrder: RENDER_ORDER.GLITCH,
    animate: (params, t) => {
      const speed = num(params.speed, 1);
      const angle = num(params.angle, 0);
      return { angle: (angle + t / 1e3 * speed * 90) % 360 };
    }
  },
  // ─── Light 类 ──────────────────────────────────
  vignette: {
    type: "vignette",
    category: "light",
    label: "effect_vignette",
    thumbnail: "vignette",
    params: [
      {
        key: "intensity",
        type: "number",
        label: "effect_param_intensity",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "radius",
        type: "number",
        label: "effect_param_radius",
        default: 0.8,
        min: 0.1,
        max: 1.5,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "softness",
        type: "number",
        label: "effect_param_softness",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 0.5,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "VIGNETTE_FRAG",
    canvas2dFallback: "applyVignette",
    renderOrder: RENDER_ORDER.LIGHT,
    animate: (params, t) => {
      const speed = num(params.speed, 0.5);
      const base = num(params.intensity, 0.5);
      return { intensity: base * (0.6 + 0.4 * noise2D(t / 1e3 * speed, 10)) };
    }
  },
  glow: {
    type: "glow",
    category: "light",
    label: "effect_glow",
    thumbnail: "glow",
    params: [
      {
        key: "intensity",
        type: "number",
        label: "effect_param_intensity",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "radius",
        type: "number",
        label: "effect_param_radius",
        default: 5,
        min: 1,
        max: 20,
        step: 1,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 1.5,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "GLOW_FRAG",
    canvas2dFallback: "applyGlow",
    renderOrder: RENDER_ORDER.LIGHT,
    animate: (params, t) => {
      const speed = num(params.speed, 1.5);
      const intensity = num(params.intensity, 0.5);
      return { intensity: intensity * (0.7 + 0.3 * noise2D(t / 1e3 * speed, 20)) };
    }
  },
  // ─── Basic/Stylize 类 ─────────────────────────
  sharpen: {
    type: "sharpen",
    category: "basic",
    label: "effect_sharpen",
    thumbnail: "sharpen",
    params: [
      {
        key: "amount",
        type: "number",
        label: "effect_param_amount",
        default: 0.5,
        min: 0,
        max: 2,
        step: 0.1,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 0.5,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "SHARPEN_FRAG",
    canvas2dFallback: "applySharpen",
    renderOrder: RENDER_ORDER.FILTER,
    animate: (params, t) => {
      const speed = num(params.speed, 0.5);
      const base = num(params.amount, 0.5);
      return { amount: base * (0.5 + 0.5 * noise2D(t / 1e3 * speed, 30)) };
    }
  },
  colorGrading: {
    type: "colorGrading",
    category: "basic",
    label: "effect_color_grading",
    thumbnail: "colorGrading",
    params: [
      {
        key: "liftR",
        type: "number",
        label: "effect_param_lift_r",
        default: 0,
        min: -1,
        max: 1,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "liftG",
        type: "number",
        label: "effect_param_lift_g",
        default: 0,
        min: -1,
        max: 1,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "liftB",
        type: "number",
        label: "effect_param_lift_b",
        default: 0,
        min: -1,
        max: 1,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "gamma",
        type: "number",
        label: "effect_param_gamma",
        default: 1,
        min: 0.2,
        max: 3,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "gain",
        type: "number",
        label: "effect_param_gain",
        default: 1,
        min: 0,
        max: 2,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "saturation",
        type: "number",
        label: "effect_param_saturation",
        default: 1,
        min: 0,
        max: 2,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 0.3,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "COLOR_GRADING_FRAG",
    canvas2dFallback: "applyColorGrading",
    renderOrder: RENDER_ORDER.FILTER,
    animate: (params, t) => {
      const speed = num(params.speed, 0.3);
      const ts = t / 1e3 * speed;
      const baseSat = num(params.saturation, 1);
      const baseGain = num(params.gain, 1);
      return {
        saturation: baseSat * (0.7 + 0.3 * noise2D(ts, 280)),
        gain: baseGain * (0.85 + 0.15 * noise2D(ts, 290))
      };
    }
  },
  // ─── Stylize 类 (新增) ─────────────────────────
  vhs: {
    type: "vhs",
    category: "stylize",
    label: "effect_vhs",
    thumbnail: "vhs",
    params: [
      {
        key: "intensity",
        type: "number",
        label: "effect_param_intensity",
        default: 0.6,
        min: 0,
        max: 1,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "scanlineOpacity",
        type: "number",
        label: "effect_param_scanline_opacity",
        default: 0.3,
        min: 0,
        max: 1,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "colorBleed",
        type: "number",
        label: "effect_param_color_bleed",
        default: 3,
        min: 0,
        max: 10,
        step: 0.5,
        keyframeable: true
      },
      {
        key: "noiseAmount",
        type: "number",
        label: "effect_param_noise_amount",
        default: 0.15,
        min: 0,
        max: 0.5,
        step: 0.01,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 1,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "VHS_FRAG",
    canvas2dFallback: "applyVhs",
    renderOrder: RENDER_ORDER.POSTPROCESS,
    animate: (params, t) => {
      const speed = num(params.speed, 1);
      return { _seed: Math.floor(t / 1e3 * speed * 12) };
    }
  },
  filmGrain: {
    type: "filmGrain",
    category: "stylize",
    label: "effect_film_grain",
    thumbnail: "filmGrain",
    params: [
      {
        key: "amount",
        type: "number",
        label: "effect_param_amount",
        default: 0.3,
        min: 0,
        max: 1,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "size",
        type: "number",
        label: "effect_param_size",
        default: 1,
        min: 1,
        max: 4,
        step: 1,
        keyframeable: false
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 3,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "FILM_GRAIN_FRAG",
    canvas2dFallback: "applyFilmGrain",
    renderOrder: RENDER_ORDER.POSTPROCESS,
    animate: (params, t) => {
      const speed = num(params.speed, 3);
      return { _seed: Math.floor(t / 1e3 * speed * 24) };
    }
  },
  // ─── Glitch 类 (新增) ──────────────────────────
  glitchBlock: {
    type: "glitchBlock",
    category: "glitch",
    label: "effect_glitch_block",
    thumbnail: "glitchBlock",
    params: [
      {
        key: "intensity",
        type: "number",
        label: "effect_param_intensity",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "blockSize",
        type: "number",
        label: "effect_param_block_size",
        default: 16,
        min: 4,
        max: 64,
        step: 4,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 2,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "GLITCH_BLOCK_FRAG",
    canvas2dFallback: "applyGlitchBlock",
    renderOrder: RENDER_ORDER.GLITCH,
    animate: (params, t) => {
      const speed = num(params.speed, 2);
      return { _seed: Math.floor(t / 1e3 * speed * 8) };
    }
  },
  // ─── Distortion 类 (新增) ──────────────────────
  shake: {
    type: "shake",
    category: "distortion",
    label: "effect_shake",
    thumbnail: "shake",
    params: [
      {
        key: "intensity",
        type: "number",
        label: "effect_param_intensity",
        default: 8,
        min: 0,
        max: 30,
        step: 1,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 3,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "SHAKE_FRAG",
    canvas2dFallback: "applyShake",
    renderOrder: RENDER_ORDER.DISTORTION,
    animate: (params, t) => {
      const intensity = num(params.intensity, 8);
      const speed = num(params.speed, 3);
      const ts = t / 1e3;
      return {
        _offsetX: intensity * noise2D(ts * speed * 5, 250),
        _offsetY: intensity * noise2D(ts * speed * 5, 350)
      };
    }
  },
  // ─── Tier 1: Distortion 类 (新增) ─────────────
  fisheye: {
    type: "fisheye",
    category: "distortion",
    label: "effect_fisheye",
    thumbnail: "fisheye",
    params: [
      {
        key: "amount",
        type: "number",
        label: "effect_param_amount",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 0.8,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "FISHEYE_FRAG",
    canvas2dFallback: "applyFisheye",
    renderOrder: RENDER_ORDER.DISTORTION,
    animate: (params, t) => {
      const speed = num(params.speed, 0.8);
      const base = num(params.amount, 0.5);
      return { amount: base * (0.6 + 0.4 * noise2D(t / 1e3 * speed, 40)) };
    }
  },
  swirl: {
    type: "swirl",
    category: "distortion",
    label: "effect_swirl",
    thumbnail: "swirl",
    params: [
      {
        key: "angle",
        type: "number",
        label: "effect_param_angle",
        default: 90,
        min: -360,
        max: 360,
        step: 5,
        keyframeable: true
      },
      {
        key: "radius",
        type: "number",
        label: "effect_param_radius",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "centerX",
        type: "number",
        label: "effect_param_center_x",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
        keyframeable: true
      },
      {
        key: "centerY",
        type: "number",
        label: "effect_param_center_y",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 0.8,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "SWIRL_FRAG",
    canvas2dFallback: "applySwirl",
    renderOrder: RENDER_ORDER.DISTORTION,
    animate: (params, t) => {
      const speed = num(params.speed, 0.8);
      const base = num(params.angle, 90);
      return { angle: base + 180 * noise2D(t / 1e3 * speed, 50) };
    }
  },
  kaleidoscope: {
    type: "kaleidoscope",
    category: "distortion",
    label: "effect_kaleidoscope",
    thumbnail: "kaleidoscope",
    params: [
      {
        key: "segments",
        type: "number",
        label: "effect_param_segments",
        default: 6,
        min: 2,
        max: 12,
        step: 1,
        keyframeable: true
      },
      {
        key: "rotation",
        type: "number",
        label: "effect_param_rotation",
        default: 0,
        min: 0,
        max: 360,
        step: 5,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 0.5,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "KALEIDOSCOPE_FRAG",
    canvas2dFallback: "applyKaleidoscope",
    renderOrder: RENDER_ORDER.DISTORTION,
    animate: (params, t) => {
      const speed = num(params.speed, 0.5);
      return { rotation: t / 1e3 * speed * 30 % 360 };
    }
  },
  spherize: {
    type: "spherize",
    category: "distortion",
    label: "effect_spherize",
    thumbnail: "spherize",
    params: [
      {
        key: "amount",
        type: "number",
        label: "effect_param_amount",
        default: 0.5,
        min: -1,
        max: 1,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "centerX",
        type: "number",
        label: "effect_param_center_x",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
        keyframeable: true
      },
      {
        key: "centerY",
        type: "number",
        label: "effect_param_center_y",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 0.8,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "SPHERIZE_FRAG",
    canvas2dFallback: "applySpherize",
    renderOrder: RENDER_ORDER.DISTORTION,
    animate: (params, t) => {
      const speed = num(params.speed, 0.8);
      const base = num(params.amount, 0.5);
      return { amount: base * (0.5 + 0.5 * noise2D(t / 1e3 * speed, 60)) };
    }
  },
  // ─── Tier 1: Basic 类 (新增) ────────────────
  invert: {
    type: "invert",
    category: "basic",
    label: "effect_invert",
    thumbnail: "invert",
    params: [
      {
        key: "amount",
        type: "number",
        label: "effect_param_amount",
        default: 1,
        min: 0,
        max: 1,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 0.5,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "INVERT_FRAG",
    canvas2dFallback: "applyInvert",
    renderOrder: RENDER_ORDER.FILTER,
    animate: (params, t) => {
      const speed = num(params.speed, 0.5);
      return { amount: 0.5 + 0.5 * noise2D(t / 1e3 * speed, 70) };
    }
  },
  duotone: {
    type: "duotone",
    category: "basic",
    label: "effect_duotone",
    thumbnail: "duotone",
    params: [
      {
        key: "shadowR",
        type: "number",
        label: "effect_param_shadow_r",
        default: 0,
        min: 0,
        max: 1,
        step: 0.05,
        keyframeable: true,
        colorGroup: "shadow",
        colorComponent: "R"
      },
      {
        key: "shadowG",
        type: "number",
        label: "effect_param_shadow_g",
        default: 0,
        min: 0,
        max: 1,
        step: 0.05,
        keyframeable: true,
        colorGroup: "shadow",
        colorComponent: "G"
      },
      {
        key: "shadowB",
        type: "number",
        label: "effect_param_shadow_b",
        default: 0.3,
        min: 0,
        max: 1,
        step: 0.05,
        keyframeable: true,
        colorGroup: "shadow",
        colorComponent: "B"
      },
      {
        key: "highlightR",
        type: "number",
        label: "effect_param_highlight_r",
        default: 1,
        min: 0,
        max: 1,
        step: 0.05,
        keyframeable: true,
        colorGroup: "highlight",
        colorComponent: "R"
      },
      {
        key: "highlightG",
        type: "number",
        label: "effect_param_highlight_g",
        default: 0.9,
        min: 0,
        max: 1,
        step: 0.05,
        keyframeable: true,
        colorGroup: "highlight",
        colorComponent: "G"
      },
      {
        key: "highlightB",
        type: "number",
        label: "effect_param_highlight_b",
        default: 0.6,
        min: 0,
        max: 1,
        step: 0.05,
        keyframeable: true,
        colorGroup: "highlight",
        colorComponent: "B"
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 0.5,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "DUOTONE_FRAG",
    canvas2dFallback: "applyDuotone",
    renderOrder: RENDER_ORDER.FILTER,
    animate: (params, t) => {
      const speed = num(params.speed, 0.5);
      const ts = t / 1e3 * speed;
      const shift = 0.15 * noise2D(ts, 300);
      return {
        shadowR: Math.max(0, Math.min(1, num(params.shadowR, 0) + shift)),
        highlightR: Math.max(0, Math.min(1, num(params.highlightR, 1) - shift * 0.5))
      };
    }
  },
  // ─── Tier 1: Stylize 类 (新增) ──────────────
  pixelate: {
    type: "pixelate",
    category: "stylize",
    label: "effect_pixelate",
    thumbnail: "pixelate",
    params: [
      {
        key: "blockSize",
        type: "number",
        label: "effect_param_block_size",
        default: 8,
        min: 2,
        max: 64,
        step: 1,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 0.5,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "PIXELATE_EFFECT_FRAG",
    canvas2dFallback: "applyPixelate",
    renderOrder: RENDER_ORDER.POSTPROCESS,
    animate: (params, t) => {
      const speed = num(params.speed, 0.5);
      const base = num(params.blockSize, 8);
      return { blockSize: Math.round(base * (0.5 + 0.5 * noise2D(t / 1e3 * speed, 80))) };
    }
  },
  posterize: {
    type: "posterize",
    category: "stylize",
    label: "effect_posterize",
    thumbnail: "posterize",
    params: [
      {
        key: "levels",
        type: "number",
        label: "effect_param_levels",
        default: 4,
        min: 2,
        max: 16,
        step: 1,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 0.5,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "POSTERIZE_FRAG",
    canvas2dFallback: "applyPosterize",
    renderOrder: RENDER_ORDER.POSTPROCESS,
    animate: (params, t) => {
      const speed = num(params.speed, 0.5);
      const base = num(params.levels, 4);
      return { levels: Math.max(2, Math.round(base + 3 * noise2D(t / 1e3 * speed, 90))) };
    }
  },
  halftone: {
    type: "halftone",
    category: "stylize",
    label: "effect_halftone",
    thumbnail: "halftone",
    params: [
      {
        key: "dotSize",
        type: "number",
        label: "effect_param_dot_size",
        default: 6,
        min: 2,
        max: 20,
        step: 1,
        keyframeable: true
      },
      {
        key: "angle",
        type: "number",
        label: "effect_param_angle",
        default: 45,
        min: 0,
        max: 180,
        step: 5,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 0.5,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "HALFTONE_FRAG",
    canvas2dFallback: "applyHalftone",
    renderOrder: RENDER_ORDER.POSTPROCESS,
    animate: (params, t) => {
      const speed = num(params.speed, 0.5);
      return { angle: (45 + t / 1e3 * speed * 20) % 180 };
    }
  },
  emboss: {
    type: "emboss",
    category: "stylize",
    label: "effect_emboss",
    thumbnail: "emboss",
    params: [
      {
        key: "amount",
        type: "number",
        label: "effect_param_amount",
        default: 1,
        min: 0,
        max: 2,
        step: 0.1,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 0.5,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "EMBOSS_FRAG",
    canvas2dFallback: "applyEmboss",
    renderOrder: RENDER_ORDER.POSTPROCESS,
    animate: (params, t) => {
      const speed = num(params.speed, 0.5);
      const base = num(params.amount, 1);
      return { amount: base * (0.5 + 0.5 * noise2D(t / 1e3 * speed, 110)) };
    }
  },
  thermal: {
    type: "thermal",
    category: "stylize",
    label: "effect_thermal",
    thumbnail: "thermal",
    params: [
      {
        key: "intensity",
        type: "number",
        label: "effect_param_intensity",
        default: 0.8,
        min: 0,
        max: 1,
        step: 0.05,
        keyframeable: true
      },
      {
        key: "speed",
        type: "number",
        label: "effect_param_speed",
        default: 0.5,
        min: 0,
        max: 5,
        step: 0.1,
        keyframeable: true
      }
    ],
    fragmentShader: "THERMAL_FRAG",
    canvas2dFallback: "applyThermal",
    renderOrder: RENDER_ORDER.POSTPROCESS,
    animate: (params, t) => {
      const speed = num(params.speed, 0.5);
      const ts = t / 1e3 * speed;
      return { _thermalShift: 0.5 * (1 + noise2D(ts, 120)) };
    }
  },
  // ─── Tier 2: Temporal + Multi-pass ──────────────
  motionBlur: {
    type: "motionBlur",
    category: "blur",
    label: "effect_motion_blur",
    thumbnail: "motionBlur",
    params: [
      { key: "intensity", type: "number", label: "effect_param_intensity", default: 0.5, min: 0, max: 1, step: 0.05, keyframeable: true },
      { key: "samples", type: "number", label: "effect_param_samples", default: 8, min: 2, max: 16, step: 1, keyframeable: false }
    ],
    fragmentShader: "MOTION_BLUR_FRAG",
    canvas2dFallback: "applyMotionBlur",
    requiresPreviousFrame: true,
    renderOrder: RENDER_ORDER.TEMPORAL
  },
  echo: {
    type: "echo",
    category: "stylize",
    label: "effect_echo",
    thumbnail: "echo",
    params: [
      { key: "decay", type: "number", label: "effect_param_decay", default: 0.6, min: 0, max: 1, step: 0.05, keyframeable: true },
      { key: "count", type: "number", label: "effect_param_count", default: 4, min: 2, max: 8, step: 1, keyframeable: false }
    ],
    fragmentShader: "ECHO_FRAG",
    canvas2dFallback: "applyEcho",
    requiresPreviousFrame: true,
    renderOrder: RENDER_ORDER.TEMPORAL
  },
  tiltShift: {
    type: "tiltShift",
    category: "blur",
    label: "effect_tilt_shift",
    thumbnail: "tiltShift",
    params: [
      { key: "blurAmount", type: "number", label: "effect_param_blur_amount", default: 8, min: 0, max: 20, step: 0.5, keyframeable: true },
      { key: "focusPosition", type: "number", label: "effect_param_focus_position", default: 0.5, min: 0, max: 1, step: 0.01, keyframeable: true },
      { key: "focusWidth", type: "number", label: "effect_param_focus_width", default: 0.15, min: 0, max: 0.5, step: 0.01, keyframeable: true },
      { key: "speed", type: "number", label: "effect_param_speed", default: 0.5, min: 0, max: 5, step: 0.1, keyframeable: true }
    ],
    fragmentShader: "TILT_SHIFT_FRAG",
    canvas2dFallback: "applyTiltShift",
    renderOrder: RENDER_ORDER.BLUR,
    animate: (params, t) => {
      const speed = num(params.speed, 0.5);
      return { focusPosition: 0.5 + 0.25 * noise2D(t / 1e3 * speed, 130) };
    }
  },
  bokeh: {
    type: "bokeh",
    category: "blur",
    label: "effect_bokeh",
    thumbnail: "bokeh",
    params: [
      { key: "radius", type: "number", label: "effect_param_radius", default: 6, min: 1, max: 20, step: 0.5, keyframeable: true },
      { key: "threshold", type: "number", label: "effect_param_threshold", default: 0.5, min: 0, max: 1, step: 0.05, keyframeable: true },
      { key: "intensity", type: "number", label: "effect_param_intensity", default: 1, min: 0, max: 2, step: 0.1, keyframeable: true },
      { key: "speed", type: "number", label: "effect_param_speed", default: 0.5, min: 0, max: 5, step: 0.1, keyframeable: true }
    ],
    fragmentShader: "BOKEH_FRAG",
    canvas2dFallback: "applyBokeh",
    renderOrder: RENDER_ORDER.BLUR,
    animate: (params, t) => {
      const speed = num(params.speed, 0.5);
      const base = num(params.radius, 6);
      return { radius: base * (0.7 + 0.3 * noise2D(t / 1e3 * speed, 140)) };
    }
  },
  // ─── Tier 3: Procedural Overlay Effects ───────
  lensFlare: {
    type: "lensFlare",
    category: "light",
    label: "effect_lens_flare",
    thumbnail: "lensFlare",
    params: [
      { key: "intensity", type: "number", label: "effect_param_intensity", default: 0.6, min: 0, max: 1, step: 0.05, keyframeable: true },
      { key: "posX", type: "number", label: "effect_param_pos_x", default: 0.5, min: 0, max: 1, step: 0.01, keyframeable: true },
      { key: "posY", type: "number", label: "effect_param_pos_y", default: 0.3, min: 0, max: 1, step: 0.01, keyframeable: true },
      { key: "rays", type: "number", label: "effect_param_rays", default: 6, min: 4, max: 12, step: 1, keyframeable: false },
      { key: "speed", type: "number", label: "effect_param_speed", default: 0.5, min: 0, max: 5, step: 0.1, keyframeable: true }
    ],
    fragmentShader: "LENS_FLARE_FRAG",
    canvas2dFallback: "applyLensFlare",
    renderOrder: RENDER_ORDER.OVERLAY,
    animate: (params, t) => {
      const speed = num(params.speed, 0.5);
      return { _seed: t / 1e3 * speed };
    }
  },
  lightLeak: {
    type: "lightLeak",
    category: "light",
    label: "effect_light_leak",
    thumbnail: "lightLeak",
    params: [
      { key: "intensity", type: "number", label: "effect_param_intensity", default: 0.5, min: 0, max: 1, step: 0.05, keyframeable: true },
      { key: "colorR", type: "number", label: "effect_param_color_r", default: 1, min: 0, max: 1, step: 0.05, keyframeable: true, colorGroup: "color", colorComponent: "R" },
      { key: "colorG", type: "number", label: "effect_param_color_g", default: 0.5, min: 0, max: 1, step: 0.05, keyframeable: true, colorGroup: "color", colorComponent: "G" },
      { key: "colorB", type: "number", label: "effect_param_color_b", default: 0.2, min: 0, max: 1, step: 0.05, keyframeable: true, colorGroup: "color", colorComponent: "B" },
      { key: "speed", type: "number", label: "effect_param_speed", default: 0.3, min: 0, max: 5, step: 0.1, keyframeable: true }
    ],
    fragmentShader: "LIGHT_LEAK_FRAG",
    canvas2dFallback: "applyLightLeak",
    renderOrder: RENDER_ORDER.OVERLAY,
    animate: (params, t) => {
      const speed = num(params.speed, 0.3);
      return { _seed: t / 1e3 * speed };
    }
  },
  rain: {
    type: "rain",
    category: "stylize",
    label: "effect_rain",
    thumbnail: "rain",
    params: [
      { key: "intensity", type: "number", label: "effect_param_intensity", default: 0.5, min: 0, max: 1, step: 0.05, keyframeable: true },
      { key: "speed", type: "number", label: "effect_param_speed", default: 1, min: 0, max: 5, step: 0.1, keyframeable: true },
      { key: "angle", type: "number", label: "effect_param_angle", default: 10, min: -45, max: 45, step: 1, keyframeable: true },
      { key: "dropLength", type: "number", label: "effect_param_drop_length", default: 15, min: 5, max: 30, step: 1, keyframeable: true }
    ],
    fragmentShader: "RAIN_FRAG",
    canvas2dFallback: "applyRain",
    renderOrder: RENDER_ORDER.OVERLAY,
    animate: (params, t) => {
      const speed = num(params.speed, 1);
      return { _seed: t / 1e3 * speed };
    }
  },
  snow: {
    type: "snow",
    category: "stylize",
    label: "effect_snow",
    thumbnail: "snow",
    params: [
      { key: "intensity", type: "number", label: "effect_param_intensity", default: 0.5, min: 0, max: 1, step: 0.05, keyframeable: true },
      { key: "speed", type: "number", label: "effect_param_speed", default: 0.5, min: 0, max: 5, step: 0.1, keyframeable: true },
      { key: "flakeSize", type: "number", label: "effect_param_flake_size", default: 2, min: 1, max: 5, step: 0.5, keyframeable: true }
    ],
    fragmentShader: "SNOW_FRAG",
    canvas2dFallback: "applySnow",
    renderOrder: RENDER_ORDER.OVERLAY,
    animate: (params, t) => {
      const speed = num(params.speed, 0.5);
      return { _seed: t / 1e3 * speed };
    }
  },
  sparkle: {
    type: "sparkle",
    category: "light",
    label: "effect_sparkle",
    thumbnail: "sparkle",
    params: [
      { key: "intensity", type: "number", label: "effect_param_intensity", default: 0.5, min: 0, max: 1, step: 0.05, keyframeable: true },
      { key: "density", type: "number", label: "effect_param_density", default: 0.3, min: 0.1, max: 1, step: 0.05, keyframeable: true },
      { key: "speed", type: "number", label: "effect_param_speed", default: 1, min: 0, max: 5, step: 0.1, keyframeable: true },
      { key: "size", type: "number", label: "effect_param_size", default: 3, min: 1, max: 10, step: 0.5, keyframeable: true }
    ],
    fragmentShader: "SPARKLE_FRAG",
    canvas2dFallback: "applySparkle",
    renderOrder: RENDER_ORDER.OVERLAY,
    animate: (params, t) => {
      const speed = num(params.speed, 1);
      return { _seed: t / 1e3 * speed };
    }
  },
  // ─── CapCut 风格动态效果 ──────────────────────
  flash: {
    type: "flash",
    category: "light",
    label: "effect_flash",
    thumbnail: "flash",
    params: [
      { key: "intensity", type: "number", label: "effect_param_intensity", default: 0.8, min: 0, max: 1, step: 0.05, keyframeable: true },
      { key: "speed", type: "number", label: "effect_param_speed", default: 2, min: 0.1, max: 10, step: 0.1, keyframeable: true },
      { key: "decay", type: "number", label: "effect_param_decay", default: 0.5, min: 0.1, max: 1, step: 0.05, keyframeable: true }
    ],
    fragmentShader: "FLASH_FRAG",
    canvas2dFallback: "applyFlash",
    renderOrder: RENDER_ORDER.OVERLAY,
    animate: (params, t) => {
      const speed = num(params.speed, 2);
      const decay = num(params.decay, 0.5);
      const phase = t / 1e3 * speed * Math.PI * 2;
      const raw = Math.max(0, Math.sin(phase));
      return { _flash: Math.pow(raw, 1 / decay) };
    }
  },
  zoomPulse: {
    type: "zoomPulse",
    category: "distortion",
    label: "effect_zoom_pulse",
    thumbnail: "zoomPulse",
    params: [
      { key: "amount", type: "number", label: "effect_param_amount", default: 0.15, min: 0, max: 0.5, step: 0.01, keyframeable: true },
      { key: "speed", type: "number", label: "effect_param_speed", default: 2, min: 0.1, max: 10, step: 0.1, keyframeable: true }
    ],
    fragmentShader: "ZOOM_PULSE_FRAG",
    canvas2dFallback: "applyZoomPulse",
    renderOrder: RENDER_ORDER.DISTORTION,
    animate: (params, t) => {
      const speed = num(params.speed, 2);
      const amount = num(params.amount, 0.15);
      const zoom = 1 + amount * 0.5 * (1 + noise2D(t / 1e3 * speed, 150));
      return { _zoom: zoom };
    }
  },
  mirror: {
    type: "mirror",
    category: "distortion",
    label: "effect_mirror",
    thumbnail: "mirror",
    params: [
      { key: "mode", type: "number", label: "effect_param_mode", default: 0, min: 0, max: 3, step: 1, keyframeable: false },
      { key: "offset", type: "number", label: "effect_param_offset", default: 0, min: -0.5, max: 0.5, step: 0.01, keyframeable: true },
      { key: "speed", type: "number", label: "effect_param_speed", default: 0.8, min: 0, max: 5, step: 0.1, keyframeable: true }
    ],
    fragmentShader: "MIRROR_FRAG",
    canvas2dFallback: "applyMirror",
    renderOrder: RENDER_ORDER.DISTORTION,
    animate: (params, t) => {
      const speed = num(params.speed, 0.8);
      return { offset: 0.2 * noise2D(t / 1e3 * speed, 160) };
    }
  },
  colorShift: {
    type: "colorShift",
    category: "stylize",
    label: "effect_color_shift",
    thumbnail: "colorShift",
    params: [
      { key: "amount", type: "number", label: "effect_param_amount", default: 0.5, min: 0, max: 1, step: 0.05, keyframeable: true },
      { key: "speed", type: "number", label: "effect_param_speed", default: 1, min: 0, max: 5, step: 0.1, keyframeable: true }
    ],
    fragmentShader: "COLOR_SHIFT_FRAG",
    canvas2dFallback: "applyColorShift",
    renderOrder: RENDER_ORDER.FILTER,
    animate: (params, t) => {
      const speed = num(params.speed, 1);
      return { _hueOffset: t / 1e3 * speed * 60 % 360 };
    }
  },
  neonEdge: {
    type: "neonEdge",
    category: "stylize",
    label: "effect_neon_edge",
    thumbnail: "neonEdge",
    params: [
      { key: "intensity", type: "number", label: "effect_param_intensity", default: 0.7, min: 0, max: 1, step: 0.05, keyframeable: true },
      { key: "colorSpeed", type: "number", label: "effect_param_color_speed", default: 1, min: 0, max: 5, step: 0.1, keyframeable: true },
      { key: "edgeWidth", type: "number", label: "effect_param_edge_width", default: 1, min: 0.5, max: 3, step: 0.5, keyframeable: true },
      { key: "bgDarken", type: "number", label: "effect_param_bg_darken", default: 0.7, min: 0, max: 1, step: 0.05, keyframeable: true }
    ],
    fragmentShader: "NEON_EDGE_FRAG",
    canvas2dFallback: "applyNeonEdge",
    renderOrder: RENDER_ORDER.POSTPROCESS,
    animate: (params, t) => {
      const speed = num(params.colorSpeed, 1);
      return { _hueOffset: t / 1e3 * speed * 60 % 360 };
    }
  },
  split: {
    type: "split",
    category: "distortion",
    label: "effect_split",
    thumbnail: "split",
    params: [
      { key: "layout", type: "number", label: "effect_param_layout", default: 0, min: 0, max: 3, step: 1, keyframeable: false },
      { key: "zoom", type: "number", label: "effect_param_zoom", default: 1, min: 0.5, max: 2, step: 0.05, keyframeable: true },
      { key: "speed", type: "number", label: "effect_param_speed", default: 0.8, min: 0, max: 5, step: 0.1, keyframeable: true }
    ],
    fragmentShader: "SPLIT_FRAG",
    canvas2dFallback: "applySplit",
    renderOrder: RENDER_ORDER.DISTORTION,
    animate: (params, t) => {
      const speed = num(params.speed, 0.8);
      return { zoom: 1 + 0.15 * noise2D(t / 1e3 * speed, 170) };
    }
  },
  // ─── PixiJS-inspired effects ─────────────────────────
  kawaseBlur: {
    type: "kawaseBlur",
    category: "blur",
    label: "effect_kawase_blur",
    thumbnail: "kawaseBlur",
    params: [
      { key: "radius", type: "number", label: "effect_param_radius", default: 4, min: 1, max: 20, step: 0.5, keyframeable: true },
      { key: "quality", type: "number", label: "effect_param_quality", default: 3, min: 1, max: 10, step: 1, keyframeable: false },
      { key: "speed", type: "number", label: "effect_param_speed", default: 0.5, min: 0, max: 5, step: 0.1, keyframeable: true }
    ],
    fragmentShader: "KAWASE_BLUR_FRAG",
    canvas2dFallback: "applyKawaseBlur",
    renderOrder: RENDER_ORDER.BLUR,
    animate: (params, t) => {
      const speed = num(params.speed, 0.5);
      const base = num(params.radius, 4);
      return { radius: base + base * 0.3 * noise2D(t / 1e3 * speed, 180) };
    }
  },
  ascii: {
    type: "ascii",
    category: "stylize",
    label: "effect_ascii",
    thumbnail: "ascii",
    params: [
      { key: "charSize", type: "number", label: "effect_param_char_size", default: 8, min: 4, max: 32, step: 1, keyframeable: true },
      { key: "speed", type: "number", label: "effect_param_speed", default: 0.5, min: 0, max: 5, step: 0.1, keyframeable: true }
    ],
    fragmentShader: "ASCII_FRAG",
    canvas2dFallback: "applyAscii",
    renderOrder: RENDER_ORDER.POSTPROCESS,
    animate: (params, t) => {
      const speed = num(params.speed, 0.5);
      const base = num(params.charSize, 8);
      return { charSize: base + base * 0.3 * noise2D(t / 1e3 * speed, 190) };
    }
  },
  crossHatch: {
    type: "crossHatch",
    category: "stylize",
    label: "effect_crosshatch",
    thumbnail: "crossHatch",
    params: [
      { key: "spacing", type: "number", label: "effect_param_spacing", default: 10, min: 3, max: 30, step: 1, keyframeable: true },
      { key: "lineWidth", type: "number", label: "effect_param_line_width", default: 1, min: 0.5, max: 5, step: 0.5, keyframeable: true },
      { key: "speed", type: "number", label: "effect_param_speed", default: 0.4, min: 0, max: 5, step: 0.1, keyframeable: true }
    ],
    fragmentShader: "CROSSHATCH_FRAG",
    canvas2dFallback: "applyCrossHatch",
    renderOrder: RENDER_ORDER.POSTPROCESS,
    animate: (params, t) => {
      const speed = num(params.speed, 0.4);
      const base = num(params.spacing, 10);
      return { spacing: base + base * 0.25 * noise2D(t / 1e3 * speed, 200) };
    }
  },
  godray: {
    type: "godray",
    category: "light",
    label: "effect_godray",
    thumbnail: "godray",
    params: [
      { key: "intensity", type: "number", label: "effect_param_intensity", default: 0.5, min: 0, max: 2, step: 0.05, keyframeable: true },
      { key: "angle", type: "number", label: "effect_param_angle", default: 30, min: -180, max: 180, step: 1, keyframeable: true },
      { key: "lacunarity", type: "number", label: "effect_param_lacunarity", default: 2.5, min: 1, max: 5, step: 0.1, keyframeable: true },
      { key: "gain", type: "number", label: "effect_param_gain", default: 0.5, min: 0, max: 1, step: 0.05, keyframeable: true },
      { key: "speed", type: "number", label: "effect_param_speed", default: 0.5, min: 0, max: 5, step: 0.1, keyframeable: true }
    ],
    fragmentShader: "GODRAY_FRAG",
    canvas2dFallback: "applyGodray",
    renderOrder: RENDER_ORDER.OVERLAY,
    animate: (_params, t) => {
      const speed = Number(_params.speed) || 0.5;
      return { _seed: t / 1e3 * speed };
    }
  },
  spotlight: {
    type: "spotlight",
    category: "light",
    label: "effect_spotlight",
    thumbnail: "spotlight",
    params: [
      { key: "posX", type: "number", label: "effect_param_pos_x", default: 0.5, min: 0, max: 1, step: 0.01, keyframeable: true },
      { key: "posY", type: "number", label: "effect_param_pos_y", default: 0.5, min: 0, max: 1, step: 0.01, keyframeable: true },
      { key: "radius", type: "number", label: "effect_param_radius", default: 0.5, min: 0.05, max: 2, step: 0.05, keyframeable: true },
      { key: "softness", type: "number", label: "effect_param_softness", default: 0.5, min: 0, max: 2, step: 0.05, keyframeable: true },
      { key: "intensity", type: "number", label: "effect_param_intensity", default: 1.5, min: 0, max: 5, step: 0.1, keyframeable: true },
      { key: "spotColorR", type: "number", label: "effect_param_spot_color_r", default: 1, min: 0, max: 1, step: 0.01, keyframeable: true, colorGroup: "spotColor", colorComponent: "R" },
      { key: "spotColorG", type: "number", label: "effect_param_spot_color_g", default: 1, min: 0, max: 1, step: 0.01, keyframeable: true, colorGroup: "spotColor", colorComponent: "G" },
      { key: "spotColorB", type: "number", label: "effect_param_spot_color_b", default: 1, min: 0, max: 1, step: 0.01, keyframeable: true, colorGroup: "spotColor", colorComponent: "B" },
      { key: "ambient", type: "number", label: "effect_param_ambient", default: 0.3, min: 0, max: 1, step: 0.05, keyframeable: true },
      { key: "speed", type: "number", label: "effect_param_speed", default: 0.3, min: 0, max: 5, step: 0.1, keyframeable: true }
    ],
    fragmentShader: "SPOTLIGHT_FRAG",
    canvas2dFallback: "applySpotlight",
    renderOrder: RENDER_ORDER.LIGHT,
    animate: (params, t) => {
      const speed = num(params.speed, 0.3);
      const ts = t / 1e3 * speed;
      return {
        posX: 0.5 + 0.2 * noise2D(ts, 310),
        posY: 0.5 + 0.15 * noise2D(ts, 320)
      };
    }
  },
  fire: {
    type: "fire",
    category: "stylize",
    label: "effect_fire",
    thumbnail: "fire",
    params: [
      { key: "intensity", type: "number", label: "effect_param_intensity", default: 0.7, min: 0, max: 2, step: 0.05, keyframeable: true },
      { key: "scale", type: "number", label: "effect_param_scale", default: 4, min: 1, max: 10, step: 0.5, keyframeable: true },
      { key: "speed", type: "number", label: "effect_param_speed", default: 1, min: 0, max: 5, step: 0.1, keyframeable: true }
    ],
    fragmentShader: "FIRE_FRAG",
    canvas2dFallback: "applyFire",
    renderOrder: RENDER_ORDER.OVERLAY,
    animate: (_params, t) => {
      const speed = Number(_params.speed) || 1;
      return { _seed: t / 1e3 * speed };
    }
  },
  fireworks: {
    type: "fireworks",
    category: "stylize",
    label: "effect_fireworks",
    thumbnail: "fireworks",
    params: [
      { key: "intensity", type: "number", label: "effect_param_intensity", default: 0.8, min: 0, max: 2, step: 0.05, keyframeable: true },
      { key: "density", type: "number", label: "effect_param_density", default: 4, min: 1, max: 8, step: 1, keyframeable: true },
      { key: "trailLength", type: "number", label: "effect_param_trail_length", default: 3, min: 0.5, max: 10, step: 0.5, keyframeable: true },
      { key: "speed", type: "number", label: "effect_param_speed", default: 1, min: 0, max: 5, step: 0.1, keyframeable: true }
    ],
    fragmentShader: "FIREWORKS_FRAG",
    canvas2dFallback: "applyFireworks",
    renderOrder: RENDER_ORDER.OVERLAY,
    animate: (_params, t) => {
      const speed = Number(_params.speed) || 1;
      return { _seed: t / 1e3 * speed };
    }
  },
  // ─── Camera Motion Blur (multi-frame accumulation) ───
  cameraMotionBlur: {
    type: "cameraMotionBlur",
    category: "blur",
    label: "effect_camera_motion_blur",
    thumbnail: "cameraMotionBlur",
    params: [
      { key: "samples", type: "number", label: "effect_param_samples", default: 8, min: 2, max: 32, step: 1, keyframeable: false },
      { key: "shutterAngle", type: "number", label: "effect_param_shutter_angle", default: 180, min: 0, max: 360, step: 1, keyframeable: true },
      { key: "decayFactor", type: "number", label: "effect_param_decay_factor", default: 0.5, min: 0.1, max: 1, step: 0.05, keyframeable: true }
    ],
    fragmentShader: null,
    canvas2dFallback: "applyCameraMotionBlur",
    renderOrder: RENDER_ORDER.TEMPORAL
  }
};
function getEffectDescriptor(effectType) {
  return EFFECT_REGISTRY[effectType];
}

// ../../shared/keyframes/interpolateColors.ts
var HEX3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
var HEX6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})(?:[0-9a-f]{2})?$/i;
var RGB_FN = /^rgb\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)\s*\)$/i;
var HSL_FN = /^hsl\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%\s*\)$/i;
function parseColor(str) {
  let m;
  m = str.match(HEX3);
  if (m) return [parseInt(m[1] + m[1], 16), parseInt(m[2] + m[2], 16), parseInt(m[3] + m[3], 16)];
  m = str.match(HEX6);
  if (m) return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  m = str.match(RGB_FN);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  m = str.match(HSL_FN);
  if (m) {
    const [r, g, b] = hslToRgb(Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100);
    return [r, g, b];
  }
  throw new Error(`interpolateColors: unsupported color format "${str}"`);
}
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}
function hslToRgb(hDeg, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const h = (hDeg % 360 + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(h + 1 / 3) * 255),
    Math.round(hue2rgb(h) * 255),
    Math.round(hue2rgb(h - 1 / 3) * 255)
  ];
}
function linearize(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function delinearize(c) {
  const s = c <= 31308e-7 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(clamp255(s * 255));
}
function rgbToOklab(r, g, b) {
  const lr = linearize(r), lg = linearize(g), lb = linearize(b);
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  ];
}
function oklabToRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  return [
    delinearize(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    delinearize(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    delinearize(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  ];
}
function rgbToOklch(r, g, b) {
  const [L, a, b_] = rgbToOklab(r, g, b);
  const C = Math.sqrt(a * a + b_ * b_);
  const H = C < 1e-8 ? 0 : (Math.atan2(b_, a) * 180 / Math.PI + 360) % 360;
  return [L, C, H];
}
function oklchToRgb(L, C, H) {
  const hRad = H * Math.PI / 180;
  return oklabToRgb(L, C * Math.cos(hRad), C * Math.sin(hRad));
}
function clamp255(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}
function shortestHueArc(h1, h2) {
  let diff = h2 - h1;
  if (diff > 180) diff -= 360;
  else if (diff < -180) diff += 360;
  return [h1, h1 + diff];
}
function toHex(n) {
  const h = Math.round(clamp255(n)).toString(16);
  return h.length === 1 ? "0" + h : h;
}
function rgbToHexString(r, g, b) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function rgbToSpace(r, g, b, space) {
  switch (space) {
    case "rgb":
      return [r, g, b];
    case "hsl":
      return rgbToHsl(r, g, b);
    case "oklch":
      return rgbToOklch(r, g, b);
  }
}
function spaceToRgb(c, space) {
  switch (space) {
    case "rgb":
      return [Math.round(clamp255(c[0])), Math.round(clamp255(c[1])), Math.round(clamp255(c[2]))];
    case "hsl":
      return hslToRgb(c[0], c[1], c[2]);
    case "oklch":
      return oklchToRgb(c[0], c[1], c[2]);
  }
}
function hasHue(space) {
  return space === "hsl" || space === "oklch";
}
function hueIndex(space) {
  return space === "hsl" ? 0 : 2;
}
function interpolateColors(value, inputRange, outputRange, options) {
  const len = inputRange.length;
  if (len < 2 || outputRange.length < 2) {
    throw new Error("interpolateColors: inputRange and outputRange must have at least 2 elements");
  }
  if (len !== outputRange.length) {
    throw new Error("interpolateColors: inputRange and outputRange must have the same length");
  }
  const space = options?.colorSpace ?? "oklch";
  const interpOpts = {
    easing: options?.easing,
    extrapolateLeft: options?.extrapolateLeft,
    extrapolateRight: options?.extrapolateRight
  };
  const parsed = outputRange.map((c) => {
    const rgb = parseColor(c);
    return rgbToSpace(rgb[0], rgb[1], rgb[2], space);
  });
  if (hasHue(space)) {
    const hi = hueIndex(space);
    for (let i = 0; i < parsed.length - 1; i++) {
      const [adj1, adj2] = shortestHueArc(parsed[i][hi], parsed[i + 1][hi]);
      parsed[i][hi] = adj1;
      parsed[i + 1][hi] = adj2;
    }
  }
  const result = [0, 0, 0];
  for (let ci = 0; ci < 3; ci++) {
    const outRange = parsed.map((p) => p[ci]);
    result[ci] = interpolate(value, inputRange, outRange, interpOpts);
  }
  const [r, g, b] = spaceToRgb(result, space);
  return rgbToHexString(r, g, b);
}

// ../../shared/effects/colorGroupInterpolation.ts
function extractColorGroups(params) {
  const map = /* @__PURE__ */ new Map();
  for (const p of params) {
    if (!p.colorGroup || !p.colorComponent) continue;
    let entry = map.get(p.colorGroup);
    if (!entry) {
      entry = { group: p.colorGroup };
      map.set(p.colorGroup, entry);
    }
    if (p.colorComponent === "R") entry.keyR = p.key;
    else if (p.colorComponent === "G") entry.keyG = p.key;
    else if (p.colorComponent === "B") entry.keyB = p.key;
  }
  const result = [];
  for (const entry of map.values()) {
    if (entry.group && entry.keyR && entry.keyG && entry.keyB) {
      result.push(entry);
    }
  }
  return result;
}
function rgbNormToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
  const toHex2 = (n) => {
    const h = n.toString(16);
    return h.length === 1 ? "0" + h : h;
  };
  return `#${toHex2(clamp(r))}${toHex2(clamp(g))}${toHex2(clamp(b))}`;
}
function hexToRgbNorm(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}
function reinterpolateColorGroups(fromParams, toParams, progress, colorGroups, result) {
  for (const cg of colorGroups) {
    const fromR = fromParams[cg.keyR] ?? 0;
    const fromG = fromParams[cg.keyG] ?? 0;
    const fromB = fromParams[cg.keyB] ?? 0;
    const toR = toParams[cg.keyR] ?? 0;
    const toG = toParams[cg.keyG] ?? 0;
    const toB = toParams[cg.keyB] ?? 0;
    const fromHex = rgbNormToHex(fromR, fromG, fromB);
    const toHex2 = rgbNormToHex(toR, toG, toB);
    const interpolated = interpolateColors(progress, [0, 1], [fromHex, toHex2], {
      colorSpace: "oklch"
    });
    const [r, g, b] = hexToRgbNorm(interpolated);
    result[cg.keyR] = r;
    result[cg.keyG] = g;
    result[cg.keyB] = b;
  }
}

// ../../shared/keyframes/types.ts
var BUILTIN_KEYFRAME_KEYS = /* @__PURE__ */ new Set([
  "x",
  "y",
  "rotation",
  "scaleX",
  "scaleY",
  "opacity",
  "speed",
  "brightness",
  "contrast",
  "saturation",
  "hue",
  "blur"
]);

// ../../shared/effects/resolveEffects.ts
function resolveEffectLayers(layers, localTimeMs) {
  const resolved = [];
  for (const layer of layers) {
    if (layer.enabled === false) continue;
    const descriptor = getEffectDescriptor(layer.effectType);
    if (!descriptor) continue;
    const params = descriptor.animate ? { ...layer.effectParams, ...descriptor.animate(layer.effectParams, localTimeMs) } : { ...layer.effectParams };
    resolved.push({ effectType: layer.effectType, descriptor, params });
  }
  return resolved;
}
function sortResolvedEffects(effects) {
  let sorted = true;
  for (let i = 1; i < effects.length; i++) {
    if (effects[i - 1].descriptor.renderOrder > effects[i].descriptor.renderOrder) {
      sorted = false;
      break;
    }
  }
  if (!sorted) {
    effects.sort((a, b) => a.descriptor.renderOrder - b.descriptor.renderOrder);
  }
  return effects;
}
function buildEffectParamIndex(keyframeTracks) {
  const index = /* @__PURE__ */ new Map();
  for (const t of keyframeTracks) {
    if (t.propertyType === "effectParam" && t.layerIndex !== void 0 && t.enabled && t.keyframes.length > 0) {
      index.set(t.layerIndex, t);
    }
  }
  return index;
}
function interpolateEffectKeyframes(track, effectLayer, localTimeMs) {
  const interpolated = interpolateKeyframeProperties(track.keyframes, localTimeMs);
  const result = {};
  let hasValues = false;
  for (const [key, value] of Object.entries(interpolated)) {
    if (!BUILTIN_KEYFRAME_KEYS.has(key) && typeof value === "number") {
      result[key] = value;
      hasValues = true;
    }
  }
  if (!hasValues) return null;
  const descriptor = getEffectDescriptor(effectLayer.effectType);
  if (descriptor) {
    const colorGroups = extractColorGroups(descriptor.params);
    if (colorGroups.length > 0) {
      const bracket = findBracketingKeyframes(track.keyframes, localTimeMs);
      if (bracket.from && bracket.to) {
        const easingFn = resolveEasing(bracket.from.easing);
        const easedProgress = easingFn(bracket.localProgress);
        reinterpolateColorGroups(
          bracket.from.properties,
          bracket.to.properties,
          easedProgress,
          colorGroups,
          result
        );
      }
    }
  }
  return result;
}

// ../../shared/effects/canvas2dFallbacks.ts
function num2(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
var clamp2552 = (v) => v < 0 ? 0 : v > 255 ? 255 : v;
function copyPixel(dst, dstIdx, src, srcIdx) {
  dst[dstIdx] = src[srcIdx];
  dst[dstIdx + 1] = src[srcIdx + 1];
  dst[dstIdx + 2] = src[srcIdx + 2];
  dst[dstIdx + 3] = src[srcIdx + 3];
}
function deterministicHash(seed, x, y) {
  let h = seed * 374761393 + x * 668265263 + y * 2654435761 >>> 0;
  h ^= h >> 13;
  h = h * 2246822507 >>> 0;
  h ^= h >> 16;
  return (h & 32767) / 32767;
}
var applyGaussianBlur = (ctx, width, height, params) => {
  const radius = Math.max(0, num2(params.radius, 4));
  if (radius === 0) return;
  applyBoxBlur(ctx, width, height, Math.ceil(radius));
};
function applyBoxBlur(ctx, width, height, radius) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const w = width;
  const h = height;
  const temp = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w - 1, x + radius);
      for (let ix = x0; ix <= x1; ix++) {
        const idx2 = (y * w + ix) * 4;
        r += data[idx2];
        g += data[idx2 + 1];
        b += data[idx2 + 2];
        a += data[idx2 + 3];
        count++;
      }
      const idx = (y * w + x) * 4;
      temp[idx] = r / count;
      temp[idx + 1] = g / count;
      temp[idx + 2] = b / count;
      temp[idx + 3] = a / count;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      const y0 = Math.max(0, y - radius);
      const y1 = Math.min(h - 1, y + radius);
      for (let iy = y0; iy <= y1; iy++) {
        const idx2 = (iy * w + x) * 4;
        r += temp[idx2];
        g += temp[idx2 + 1];
        b += temp[idx2 + 2];
        a += temp[idx2 + 3];
        count++;
      }
      const idx = (y * w + x) * 4;
      data[idx] = r / count;
      data[idx + 1] = g / count;
      data[idx + 2] = b / count;
      data[idx + 3] = a / count;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}
var applyRadialBlur = (ctx, width, height, params) => {
  const intensity = Math.max(0, Math.min(1, num2(params.intensity, 0.3)));
  const cx = num2(params.centerX, 0.5) * width;
  const cy = num2(params.centerY, 0.5) * height;
  if (intensity === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const samples = Math.max(3, Math.floor(intensity * 12));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      let r = 0, g = 0, b = 0, a = 0;
      for (let s = 0; s < samples; s++) {
        const t = s / samples * intensity * 0.1;
        const sx = Math.round(cx + dx * (1 - t));
        const sy = Math.round(cy + dy * (1 - t));
        const csx = Math.max(0, Math.min(width - 1, sx));
        const csy = Math.max(0, Math.min(height - 1, sy));
        const idx = (csy * width + csx) * 4;
        r += src[idx];
        g += src[idx + 1];
        b += src[idx + 2];
        a += src[idx + 3];
      }
      const dstIdx = (y * width + x) * 4;
      dst[dstIdx] = r / samples;
      dst[dstIdx + 1] = g / samples;
      dst[dstIdx + 2] = b / samples;
      dst[dstIdx + 3] = a / samples;
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyWave = (ctx, width, height, params) => {
  const amplitude = num2(params.amplitude, 10);
  const frequency = num2(params.frequency, 4);
  const phase = num2(params.phase, 0);
  if (amplitude === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  dst.fill(0);
  for (let y = 0; y < height; y++) {
    const offset = Math.round(amplitude * Math.sin(y / height * frequency * Math.PI * 2 + phase));
    for (let x = 0; x < width; x++) {
      const srcX = x - offset;
      if (srcX >= 0 && srcX < width) {
        const srcIdx = (y * width + srcX) * 4;
        const dstIdx = (y * width + x) * 4;
        copyPixel(dst, dstIdx, src, srcIdx);
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyRipple = (ctx, width, height, params) => {
  const amplitude = num2(params.amplitude, 8);
  const frequency = num2(params.frequency, 6);
  const phase = num2(params.phase, 0);
  const cx = num2(params.centerX, 0.5) * width;
  const cy = num2(params.centerY, 0.5) * height;
  if (amplitude === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  dst.fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const offset = amplitude * Math.sin(dist / width * frequency * Math.PI * 2 + phase);
      const angle = Math.atan2(dy, dx);
      const srcX = Math.round(x + Math.cos(angle) * offset);
      const srcY = Math.round(y + Math.sin(angle) * offset);
      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const srcIdx = (srcY * width + srcX) * 4;
        const dstIdx = (y * width + x) * 4;
        copyPixel(dst, dstIdx, src, srcIdx);
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyRgbSplit = (ctx, width, height, params) => {
  const amount = num2(params.amount, 5);
  const angleDeg = num2(params.angle, 0);
  if (amount === 0) return;
  const angleRad = angleDeg * Math.PI / 180;
  const offsetX = Math.round(amount * Math.cos(angleRad));
  const offsetY = Math.round(amount * Math.sin(angleRad));
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dstIdx = (y * width + x) * 4;
      const rx = Math.max(0, Math.min(width - 1, x - offsetX));
      const ry = Math.max(0, Math.min(height - 1, y - offsetY));
      dst[dstIdx] = src[(ry * width + rx) * 4];
      dst[dstIdx + 1] = src[dstIdx + 1];
      const bx = Math.max(0, Math.min(width - 1, x + offsetX));
      const by = Math.max(0, Math.min(height - 1, y + offsetY));
      dst[dstIdx + 2] = src[(by * width + bx) * 4 + 2];
      dst[dstIdx + 3] = src[dstIdx + 3];
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyVignette = (ctx, width, height, params) => {
  const intensity = Math.max(0, Math.min(1, num2(params.intensity, 0.5)));
  const radius = num2(params.radius, 0.8);
  const softness = Math.max(0.01, num2(params.softness, 0.5));
  if (intensity === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / cx;
      const dy = (y - cy) / cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const vignette = 1 - Math.max(0, Math.min(1, (dist - radius) / softness)) * intensity;
      const idx = (y * width + x) * 4;
      data[idx] = data[idx] * vignette;
      data[idx + 1] = data[idx + 1] * vignette;
      data[idx + 2] = data[idx + 2] * vignette;
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyGlow = (ctx, width, height, params) => {
  const intensity = Math.max(0, Math.min(1, num2(params.intensity, 0.5)));
  const radius = Math.max(1, num2(params.radius, 5));
  if (intensity === 0) return;
  const original = ctx.getImageData(0, 0, width, height);
  const origData = new Uint8ClampedArray(original.data);
  applyBoxBlur(ctx, width, height, Math.ceil(radius));
  const blurred = ctx.getImageData(0, 0, width, height);
  const blurData = blurred.data;
  for (let i = 0; i < origData.length; i += 4) {
    const r = origData[i] / 255;
    const g = origData[i + 1] / 255;
    const b = origData[i + 2] / 255;
    const br = blurData[i] / 255;
    const bg = blurData[i + 1] / 255;
    const bb = blurData[i + 2] / 255;
    blurData[i] = (r + (1 - (1 - r) * (1 - br) - r) * intensity) * 255;
    blurData[i + 1] = (g + (1 - (1 - g) * (1 - bg) - g) * intensity) * 255;
    blurData[i + 2] = (b + (1 - (1 - b) * (1 - bb) - b) * intensity) * 255;
    blurData[i + 3] = origData[i + 3];
  }
  ctx.putImageData(blurred, 0, 0);
};
var applySharpen = (ctx, width, height, params) => {
  const amount = Math.max(0, num2(params.amount, 0.5));
  if (amount === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const k = amount;
  const center = 1 + 4 * k;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const val = src[idx + c] * center - src[((y - 1) * width + x) * 4 + c] * k - src[((y + 1) * width + x) * 4 + c] * k - src[(y * width + (x - 1)) * 4 + c] * k - src[(y * width + (x + 1)) * 4 + c] * k;
        dst[idx + c] = clamp2552(val);
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyColorGrading = (ctx, width, height, params) => {
  const liftR = num2(params.liftR, 0);
  const liftG = num2(params.liftG, 0);
  const liftB = num2(params.liftB, 0);
  const gamma = Math.max(0.2, num2(params.gamma, 1));
  const gain = Math.max(0, num2(params.gain, 1));
  const saturation = num2(params.saturation, 1);
  if (liftR === 0 && liftG === 0 && liftB === 0 && gamma === 1 && gain === 1 && saturation === 1) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const invGamma = 1 / gamma;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;
    r = r + liftR * (1 - r);
    g = g + liftG * (1 - g);
    b = b + liftB * (1 - b);
    r = Math.pow(Math.max(0, r), invGamma);
    g = Math.pow(Math.max(0, g), invGamma);
    b = Math.pow(Math.max(0, b), invGamma);
    r = r * gain;
    g = g * gain;
    b = b * gain;
    if (saturation !== 1) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = lum + (r - lum) * saturation;
      g = lum + (g - lum) * saturation;
      b = lum + (b - lum) * saturation;
    }
    data[i] = clamp2552(r * 255);
    data[i + 1] = clamp2552(g * 255);
    data[i + 2] = clamp2552(b * 255);
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyVhs = (ctx, width, height, params) => {
  const intensity = Math.max(0, Math.min(1, num2(params.intensity, 0.6)));
  const scanlineOpacity = Math.max(0, Math.min(1, num2(params.scanlineOpacity, 0.3)));
  const colorBleed = Math.max(0, num2(params.colorBleed, 3));
  const noiseAmount = Math.max(0, Math.min(0.5, num2(params.noiseAmount, 0.15)));
  const seed = Math.floor(num2(params._seed, 0));
  if (intensity === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const bleedPx = Math.round(colorBleed * intensity);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const rx = Math.min(width - 1, x + bleedPx);
      const bx = Math.max(0, x - bleedPx);
      dst[idx] = src[(y * width + rx) * 4];
      dst[idx + 1] = src[idx + 1];
      dst[idx + 2] = src[(y * width + bx) * 4 + 2];
      dst[idx + 3] = src[idx + 3];
      if (y % 2 === 0) {
        const dim = 1 - scanlineOpacity * intensity;
        dst[idx] = dst[idx] * dim;
        dst[idx + 1] = dst[idx + 1] * dim;
        dst[idx + 2] = dst[idx + 2] * dim;
      }
      const n = deterministicHash(seed, x, y);
      const noiseDelta = (n - 0.5) * 2 * noiseAmount * intensity * 255;
      dst[idx] = clamp2552(dst[idx] + noiseDelta);
      dst[idx + 1] = clamp2552(dst[idx + 1] + noiseDelta);
      dst[idx + 2] = clamp2552(dst[idx + 2] + noiseDelta);
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyGlitchBlock = (ctx, width, height, params) => {
  const intensity = Math.max(0, Math.min(1, num2(params.intensity, 0.5)));
  const blockSize = Math.max(4, Math.min(64, Math.round(num2(params.blockSize, 16))));
  const seed = Math.floor(num2(params._seed, 0));
  if (intensity === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const maxShift = Math.round(width * 0.15 * intensity);
  for (let by = 0; by < height; by += blockSize) {
    const h = deterministicHash(seed, 0, by);
    if (h > intensity) continue;
    const shift = Math.round((deterministicHash(seed, 1, by) - 0.5) * 2 * maxShift);
    const rgbShift = Math.round(deterministicHash(seed, 2, by) * 3 * intensity);
    const blockEnd = Math.min(by + blockSize, height);
    for (let y = by; y < blockEnd; y++) {
      for (let x = 0; x < width; x++) {
        const dstIdx = (y * width + x) * 4;
        const rx = Math.max(0, Math.min(width - 1, x - shift - rgbShift));
        dst[dstIdx] = src[(y * width + rx) * 4];
        const gx = Math.max(0, Math.min(width - 1, x - shift));
        dst[dstIdx + 1] = src[(y * width + gx) * 4 + 1];
        const bx = Math.max(0, Math.min(width - 1, x - shift + rgbShift));
        dst[dstIdx + 2] = src[(y * width + bx) * 4 + 2];
        dst[dstIdx + 3] = src[(y * width + Math.max(0, Math.min(width - 1, x - shift))) * 4 + 3];
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyFilmGrain = (ctx, width, height, params) => {
  const amount = Math.max(0, Math.min(1, num2(params.amount, 0.3)));
  const size = Math.max(1, Math.min(4, Math.round(num2(params.size, 1))));
  const seed = Math.floor(num2(params._seed, 0));
  if (amount === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let y = 0; y < height; y++) {
    const gy = Math.floor(y / size);
    for (let x = 0; x < width; x++) {
      const gx = Math.floor(x / size);
      const n = (noise2D(gx + seed * 13.7, gy) + 1) * 0.5;
      const noiseDelta = (n - 0.5) * 2 * amount * 255;
      const idx = (y * width + x) * 4;
      data[idx] = clamp2552(data[idx] + noiseDelta);
      data[idx + 1] = clamp2552(data[idx + 1] + noiseDelta);
      data[idx + 2] = clamp2552(data[idx + 2] + noiseDelta);
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyShake = (ctx, width, height, params) => {
  const offsetX = Math.round(num2(params._offsetX, 0));
  const offsetY = Math.round(num2(params._offsetY, 0));
  if (offsetX === 0 && offsetY === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  ctx.clearRect(0, 0, width, height);
  ctx.putImageData(imageData, offsetX, offsetY);
};
var applyFisheye = (ctx, width, height, params) => {
  const amount = Math.max(0, Math.min(1, num2(params.amount, 0.5)));
  if (amount === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const cx = width / 2;
  const cy = height / 2;
  const bind = Math.min(cx, cy);
  const power = 1 + amount;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dstIdx = (y * width + x) * 4;
      if (dist < bind) {
        const factor = Math.pow(dist / bind, power) * bind / Math.max(dist, 1e-3);
        const srcX = Math.round(cx + dx * factor);
        const srcY = Math.round(cy + dy * factor);
        if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
          const srcIdx = (srcY * width + srcX) * 4;
          copyPixel(dst, dstIdx, src, srcIdx);
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applySwirl = (ctx, width, height, params) => {
  const angle = num2(params.angle, 90) * Math.PI / 180;
  const radius = num2(params.radius, 0.5) * Math.min(width, height);
  const cx = num2(params.centerX, 0.5) * width;
  const cy = num2(params.centerY, 0.5) * height;
  if (angle === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dstIdx = (y * width + x) * 4;
      if (dist < radius) {
        const t = 1 - dist / radius;
        const a = angle * t * t;
        const s = Math.sin(a);
        const c = Math.cos(a);
        const srcX = Math.round(cx + c * dx - s * dy);
        const srcY = Math.round(cy + s * dx + c * dy);
        const csx = Math.max(0, Math.min(width - 1, srcX));
        const csy = Math.max(0, Math.min(height - 1, srcY));
        const srcIdx = (csy * width + csx) * 4;
        copyPixel(dst, dstIdx, src, srcIdx);
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyKaleidoscope = (ctx, width, height, params) => {
  const segments = Math.max(2, Math.min(12, Math.round(num2(params.segments, 6))));
  const rotation = num2(params.rotation, 0) * Math.PI / 180;
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const cx = width / 2;
  const cy = height / 2;
  const segAngle = Math.PI * 2 / segments;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      let angle = Math.atan2(dy, dx) + rotation;
      const r = Math.sqrt(dx * dx + dy * dy);
      angle = (angle % segAngle + segAngle) % segAngle;
      if (angle > segAngle * 0.5) angle = segAngle - angle;
      const srcX = Math.round(cx + Math.cos(angle) * r);
      const srcY = Math.round(cy + Math.sin(angle) * r);
      const csx = Math.max(0, Math.min(width - 1, srcX));
      const csy = Math.max(0, Math.min(height - 1, srcY));
      const dstIdx = (y * width + x) * 4;
      const srcIdx = (csy * width + csx) * 4;
      copyPixel(dst, dstIdx, src, srcIdx);
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyPixelate = (ctx, width, height, params) => {
  const blockSize = Math.max(2, Math.min(64, Math.round(num2(params.blockSize, 8))));
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      const sx = Math.min(bx + Math.floor(blockSize / 2), width - 1);
      const sy = Math.min(by + Math.floor(blockSize / 2), height - 1);
      const srcIdx = (sy * width + sx) * 4;
      const r = src[srcIdx];
      const g = src[srcIdx + 1];
      const b = src[srcIdx + 2];
      const a = src[srcIdx + 3];
      const endY = Math.min(by + blockSize, height);
      const endX = Math.min(bx + blockSize, width);
      for (let y = by; y < endY; y++) {
        for (let x = bx; x < endX; x++) {
          const dstIdx = (y * width + x) * 4;
          dst[dstIdx] = r;
          dst[dstIdx + 1] = g;
          dst[dstIdx + 2] = b;
          dst[dstIdx + 3] = a;
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyPosterize = (ctx, width, height, params) => {
  const levels = Math.max(2, Math.min(16, Math.round(num2(params.levels, 4))));
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] / 255 * levels) / levels * 255;
    data[i + 1] = Math.round(data[i + 1] / 255 * levels) / levels * 255;
    data[i + 2] = Math.round(data[i + 2] / 255 * levels) / levels * 255;
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyInvert = (ctx, width, height, params) => {
  const amount = Math.max(0, Math.min(1, num2(params.amount, 1)));
  if (amount === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i] + (255 - 2 * data[i]) * amount;
    data[i + 1] = data[i + 1] + (255 - 2 * data[i + 1]) * amount;
    data[i + 2] = data[i + 2] + (255 - 2 * data[i + 2]) * amount;
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyDuotone = (ctx, width, height, params) => {
  const shadowR = num2(params.shadowR, 0);
  const shadowG = num2(params.shadowG, 0);
  const shadowB = num2(params.shadowB, 0.3);
  const highlightR = num2(params.highlightR, 1);
  const highlightG = num2(params.highlightG, 0.9);
  const highlightB = num2(params.highlightB, 0.6);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    data[i] = (shadowR + (highlightR - shadowR) * lum) * 255;
    data[i + 1] = (shadowG + (highlightG - shadowG) * lum) * 255;
    data[i + 2] = (shadowB + (highlightB - shadowB) * lum) * 255;
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyHalftone = (ctx, width, height, params) => {
  const dotSize = Math.max(2, Math.min(20, num2(params.dotSize, 6)));
  const angleDeg = num2(params.angle, 45);
  const angleRad = angleDeg * Math.PI / 180;
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const s = Math.sin(angleRad);
  const c = Math.cos(angleRad);
  const halfDot = dotSize * 0.5;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rx = c * x - s * y;
      const ry = s * x + c * y;
      const cellX = (rx % dotSize + dotSize) % dotSize - halfDot;
      const cellY = (ry % dotSize + dotSize) % dotSize - halfDot;
      const dist = Math.sqrt(cellX * cellX + cellY * cellY) / halfDot;
      const srcIdx = (y * width + x) * 4;
      const lum = (src[srcIdx] * 0.299 + src[srcIdx + 1] * 0.587 + src[srcIdx + 2] * 0.114) / 255;
      const r = 1 - lum;
      const mask = dist <= r ? 255 : 0;
      const dstIdx = srcIdx;
      dst[dstIdx] = mask;
      dst[dstIdx + 1] = mask;
      dst[dstIdx + 2] = mask;
      dst[dstIdx + 3] = src[srcIdx + 3];
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyEmboss = (ctx, width, height, params) => {
  const amount = Math.max(0, Math.min(2, num2(params.amount, 1)));
  if (amount === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const tlIdx = ((y - 1) * width + (x - 1)) * 4;
      const brIdx = ((y + 1) * width + (x + 1)) * 4;
      const dstIdx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        dst[dstIdx + c] = clamp2552(128 + (src[brIdx + c] - src[tlIdx + c]) * amount);
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applySpherize = (ctx, width, height, params) => {
  const amount = Math.max(-1, Math.min(1, num2(params.amount, 0.5)));
  const cx = num2(params.centerX, 0.5) * width;
  const cy = num2(params.centerY, 0.5) * height;
  if (amount === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const radius = Math.min(width, height) / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dstIdx = (y * width + x) * 4;
      if (dist < radius) {
        const t = dist / radius;
        const factor = amount >= 0 ? Math.pow(t, 1 + amount * 2) : Math.pow(t, 1 / (1 - amount * 2));
        const angle = Math.atan2(dy, dx);
        const srcX = Math.round(cx + Math.cos(angle) * factor * radius);
        const srcY = Math.round(cy + Math.sin(angle) * factor * radius);
        const csx = Math.max(0, Math.min(width - 1, srcX));
        const csy = Math.max(0, Math.min(height - 1, srcY));
        const srcIdx = (csy * width + csx) * 4;
        copyPixel(dst, dstIdx, src, srcIdx);
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyThermal = (ctx, width, height, params) => {
  const intensity = Math.max(0, Math.min(1, num2(params.intensity, 0.8)));
  if (intensity === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    let tr, tg, tb;
    if (lum < 0.2) {
      const t = lum / 0.2;
      tr = 0;
      tg = 0;
      tb = t;
    } else if (lum < 0.4) {
      const t = (lum - 0.2) / 0.2;
      tr = t;
      tg = 0;
      tb = 1;
    } else if (lum < 0.6) {
      const t = (lum - 0.4) / 0.2;
      tr = 1;
      tg = 0;
      tb = 1 - t;
    } else if (lum < 0.8) {
      const t = (lum - 0.6) / 0.2;
      tr = 1;
      tg = t;
      tb = 0;
    } else {
      const t = (lum - 0.8) / 0.2;
      tr = 1;
      tg = 1;
      tb = t;
    }
    data[i] = (data[i] / 255 + (tr - data[i] / 255) * intensity) * 255;
    data[i + 1] = (data[i + 1] / 255 + (tg - data[i + 1] / 255) * intensity) * 255;
    data[i + 2] = (data[i + 2] / 255 + (tb - data[i + 2] / 255) * intensity) * 255;
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyMotionBlur = (ctx, width, height, params) => {
  const intensity = Math.max(0, Math.min(1, num2(params.intensity, 0.5)));
  if (intensity === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const samples = Math.max(2, Math.min(16, Math.round(num2(params.samples, 8))));
  const offset = Math.round(intensity * 4);
  if (offset === 0) return;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let s = 0; s < Math.min(samples, 8); s++) {
        const sx = Math.max(0, Math.min(width - 1, x - Math.round(offset * s / samples)));
        const idx = (y * width + sx) * 4;
        r += src[idx];
        g += src[idx + 1];
        b += src[idx + 2];
        a += src[idx + 3];
        count++;
      }
      const dstIdx = (y * width + x) * 4;
      dst[dstIdx] = r / count;
      dst[dstIdx + 1] = g / count;
      dst[dstIdx + 2] = b / count;
      dst[dstIdx + 3] = a / count;
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyEcho = (ctx, width, height, params) => {
  const decay = Math.max(0, Math.min(1, num2(params.decay, 0.6)));
  if (decay === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const factor = 1 + decay * 0.15;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp2552(data[i] * factor);
    data[i + 1] = clamp2552(data[i + 1] * factor);
    data[i + 2] = clamp2552(data[i + 2] * factor);
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyColorLut = (ctx, width, height, params) => {
  const intensity = Math.max(0, Math.min(1, num2(params.intensity, 1)));
  const lutIndex = Math.max(0, Math.min(7, Math.round(num2(params.lutIndex, 0))));
  if (intensity === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;
    let gr, gg, gb;
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    switch (lutIndex) {
      case 0:
        gr = Math.pow(r, 0.95) * 1.1 + 0.02;
        gg = Math.pow(g, 1);
        gb = Math.pow(b, 1.1) * 0.9 - 0.02;
        break;
      case 1:
        gr = Math.pow(r, 1.05) * 0.9;
        gg = Math.pow(g, 1);
        gb = Math.pow(b, 0.9) * 1.15 + 0.03;
        break;
      case 2:
        {
          const m = r * 0.8 + lum * 0.2;
          const mg = g * 0.8 + lum * 0.2;
          const mb = b * 0.8 + lum * 0.2;
          gr = Math.pow(m * 0.85 + 0.08, 0.95);
          gg = Math.pow(mg * 0.85 + 0.06, 1);
          gb = Math.pow(mb * 0.85 + 0.04, 1.05);
        }
        break;
      case 3:
        {
          const sh = [0, 0.5, 0.5];
          const hi = [1, 0.6, 0.3];
          gr = r * 0.5 + (sh[0] + (hi[0] - sh[0]) * lum) * 0.5;
          gg = g * 0.5 + (sh[1] + (hi[1] - sh[1]) * lum) * 0.5;
          gb = b * 0.5 + (sh[2] + (hi[2] - sh[2]) * lum) * 0.5;
        }
        break;
      case 4:
        {
          const dl = r * 0.5 + lum * 0.5;
          const dlg = g * 0.5 + lum * 0.5;
          const dlb = b * 0.5 + lum * 0.5;
          gr = (dl - 0.5) * 1.4 + 0.5;
          gg = (dlg - 0.5) * 1.4 + 0.5;
          gb = (dlb - 0.5) * 1.4 + 0.5;
        }
        break;
      case 5:
        gr = Math.pow(r, 0.8) * 1.1;
        gg = Math.pow(g, 1.2) * 0.9;
        gb = Math.pow(b, 0.7) * 1.2;
        break;
      case 6:
        {
          const nl = (lum - 0.5) * 1.5 + 0.5;
          gr = nl;
          gg = nl;
          gb = nl;
        }
        break;
      default:
        gr = Math.pow(r, 0.85) * 1.15 + 0.05;
        gg = Math.pow(g, 1) * 1.05;
        gb = Math.pow(b, 1.2) * 0.8;
        break;
    }
    data[i] = clamp2552((r + (gr - r) * intensity) * 255);
    data[i + 1] = clamp2552((g + (gg - g) * intensity) * 255);
    data[i + 2] = clamp2552((b + (gb - b) * intensity) * 255);
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyTiltShift = (ctx, width, height, params) => {
  const blurAmount = Math.max(0, Math.min(20, num2(params.blurAmount, 8)));
  const focusPos = Math.max(0, Math.min(1, num2(params.focusPosition, 0.5)));
  const focusWidth = Math.max(0, Math.min(0.5, num2(params.focusWidth, 0.15)));
  if (blurAmount === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const focusY = focusPos * height;
  const halfBand = focusWidth * height;
  for (let y = 0; y < height; y++) {
    const dist = Math.abs(y - focusY) - halfBand;
    const blur = dist > 0 ? Math.min(1, dist / (height * 0.3)) * blurAmount : 0;
    const radius = Math.round(blur);
    if (radius === 0) continue;
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      for (let ix = x0; ix <= x1; ix++) {
        const idx = (y * width + ix) * 4;
        r += src[idx];
        g += src[idx + 1];
        b += src[idx + 2];
        a += src[idx + 3];
        count++;
      }
      const dstIdx = (y * width + x) * 4;
      dst[dstIdx] = r / count;
      dst[dstIdx + 1] = g / count;
      dst[dstIdx + 2] = b / count;
      dst[dstIdx + 3] = a / count;
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyBokeh = (ctx, width, height, params) => {
  const radius = Math.max(1, Math.min(20, num2(params.radius, 6)));
  const threshold = Math.max(0, Math.min(1, num2(params.threshold, 0.5)));
  const intensity = Math.max(0, Math.min(2, num2(params.intensity, 1)));
  if (radius <= 1) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const r2 = Math.round(radius);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sr = 0, sg = 0, sb = 0, total = 0;
      const y0 = Math.max(0, y - r2);
      const y1 = Math.min(height - 1, y + r2);
      const x0 = Math.max(0, x - r2);
      const x1 = Math.min(width - 1, x + r2);
      for (let iy = y0; iy <= y1; iy++) {
        for (let ix = x0; ix <= x1; ix++) {
          const dx = ix - x;
          const dy = iy - y;
          if (dx * dx + dy * dy > r2 * r2) continue;
          const idx = (iy * width + ix) * 4;
          const lum = (src[idx] * 0.299 + src[idx + 1] * 0.587 + src[idx + 2] * 0.114) / 255;
          const weight = 1 + Math.max(lum - threshold, 0) * intensity * 4;
          sr += src[idx] * weight;
          sg += src[idx + 1] * weight;
          sb += src[idx + 2] * weight;
          total += weight;
        }
      }
      const dstIdx = (y * width + x) * 4;
      dst[dstIdx] = clamp2552(sr / total);
      dst[dstIdx + 1] = clamp2552(sg / total);
      dst[dstIdx + 2] = clamp2552(sb / total);
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyLensFlare = (ctx, width, height, params) => {
  const intensity = Math.max(0, Math.min(1, num2(params.intensity, 0.6)));
  const posX = num2(params.posX, 0.5) * width;
  const posY = num2(params.posY, 0.3) * height;
  if (intensity === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = intensity * 0.6;
  ctx.fillStyle = "rgba(255, 240, 200, 1)";
  ctx.beginPath();
  ctx.arc(posX, posY, 30, 0, Math.PI * 2);
  ctx.fill();
  const ghostX = width - posX;
  const ghostY = height - posY;
  ctx.globalAlpha = intensity * 0.2;
  ctx.fillStyle = "rgba(100, 150, 255, 1)";
  ctx.beginPath();
  ctx.arc(ghostX, ghostY, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};
var applyLightLeak = (ctx, width, height, params) => {
  const intensity = Math.max(0, Math.min(1, num2(params.intensity, 0.5)));
  const colorR = Math.max(0, Math.min(1, num2(params.colorR, 1)));
  const colorG = Math.max(0, Math.min(1, num2(params.colorG, 0.5)));
  const colorB = Math.max(0, Math.min(1, num2(params.colorB, 0.2)));
  const seed = num2(params._seed, 0);
  if (intensity === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = intensity * 0.5;
  const cx = width * (0.5 + Math.sin(seed * 0.7) * 0.3);
  const cy = height * (0.5 + Math.cos(seed * 0.5) * 0.3);
  const r = Math.round(colorR * 255);
  const g = Math.round(colorG * 255);
  const b = Math.round(colorB * 255);
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(width, height) * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};
var applyRain = (ctx, width, height, params) => {
  const intensity = Math.max(0, Math.min(1, num2(params.intensity, 0.5)));
  const seed = Math.floor(num2(params._seed, 0));
  const angle = num2(params.angle, 10) * Math.PI / 180;
  const dropLength = num2(params.dropLength, 15);
  if (intensity === 0) return;
  ctx.save();
  ctx.globalAlpha = intensity * 0.6;
  ctx.strokeStyle = "rgba(200, 210, 230, 0.6)";
  ctx.lineWidth = 1;
  const count = Math.round(intensity * 200);
  for (let i = 0; i < count; i++) {
    const h = deterministicHash(seed, i, 0);
    const h2 = deterministicHash(seed, i, 1);
    const x = h * width;
    const y = h2 * height;
    const dx = Math.sin(angle) * dropLength;
    const dy = Math.cos(angle) * dropLength;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();
  }
  ctx.restore();
};
var applySnow = (ctx, width, height, params) => {
  const intensity = Math.max(0, Math.min(1, num2(params.intensity, 0.5)));
  const seed = Math.floor(num2(params._seed, 0));
  const flakeSize = Math.max(1, Math.min(5, num2(params.flakeSize, 2)));
  if (intensity === 0) return;
  ctx.save();
  ctx.globalAlpha = intensity * 0.8;
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  const count = Math.round(intensity * 150);
  for (let i = 0; i < count; i++) {
    const x = deterministicHash(seed, i, 0) * width;
    const y = deterministicHash(seed, i, 1) * height;
    const size = (deterministicHash(seed, i, 2) * 0.5 + 0.5) * flakeSize;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};
var applySparkle = (ctx, width, height, params) => {
  const intensity = Math.max(0, Math.min(1, num2(params.intensity, 0.5)));
  const density = Math.max(0.1, Math.min(1, num2(params.density, 0.3)));
  const seed = Math.floor(num2(params._seed, 0));
  const size = Math.max(1, Math.min(10, num2(params.size, 3)));
  if (intensity === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const count = Math.round(density * 40);
  for (let i = 0; i < count; i++) {
    const h = deterministicHash(seed, i, 30);
    if (h > density) continue;
    const x = deterministicHash(seed, i, 31) * width;
    const y = deterministicHash(seed, i, 32) * height;
    const twinkle = 0.5 + 0.5 * Math.sin(seed * 6.28 * deterministicHash(seed, i, 33));
    const s = size * (0.5 + deterministicHash(seed, i, 34) * 0.5);
    ctx.globalAlpha = intensity * twinkle * 0.8;
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = intensity * twinkle * 0.4;
    ctx.fillRect(x - s * 2, y - 0.5, s * 4, 1);
    ctx.fillRect(x - 0.5, y - s * 2, 1, s * 4);
  }
  ctx.restore();
};
var applyFlash = (ctx, width, height, params) => {
  const intensity = Math.max(0, Math.min(1, num2(params.intensity, 0.8)));
  const flash = Math.max(0, Math.min(1, num2(params._flash, 0)));
  if (flash * intensity === 0) return;
  ctx.save();
  ctx.globalAlpha = flash * intensity;
  ctx.fillStyle = "rgba(255, 255, 255, 1)";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
};
var applyZoomPulse = (ctx, width, height, params) => {
  const zoom = Math.max(1, num2(params._zoom, 1));
  if (zoom <= 1.001) return;
  const srcData = ctx.getImageData(0, 0, width, height);
  const src = srcData.data;
  const dstData = ctx.createImageData(width, height);
  const dst = dstData.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = Math.round(width / 2 + (x - width / 2) / zoom);
      const srcY = Math.round(height / 2 + (y - height / 2) / zoom);
      const dstIdx = (y * width + x) * 4;
      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const srcIdx = (srcY * width + srcX) * 4;
        copyPixel(dst, dstIdx, src, srcIdx);
      }
    }
  }
  ctx.putImageData(dstData, 0, 0);
};
var applyMirror = (ctx, width, height, params) => {
  const mode = Math.round(num2(params.mode, 0));
  const offset = num2(params.offset, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const result = new Uint8ClampedArray(data.length);
  result.set(data);
  const mx = 0.5 + offset;
  const my = 0.5 + offset;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sx = x, sy = y;
      const nx = x / width;
      const ny = y / height;
      if (mode === 0) {
        if (nx > mx) sx = Math.floor((2 * mx - nx) * width);
      } else if (mode === 1) {
        if (ny > my) sy = Math.floor((2 * my - ny) * height);
      } else if (mode === 2) {
        if (nx > mx) sx = Math.floor((2 * mx - nx) * width);
        if (ny > my) sy = Math.floor((2 * my - ny) * height);
      } else {
        if (nx > ny) {
          sx = Math.floor(ny * width);
          sy = Math.floor(nx * height);
        }
      }
      sx = Math.max(0, Math.min(width - 1, sx));
      sy = Math.max(0, Math.min(height - 1, sy));
      const dstIdx = (y * width + x) * 4;
      const srcIdx = (sy * width + sx) * 4;
      result[dstIdx] = data[srcIdx];
      result[dstIdx + 1] = data[srcIdx + 1];
      result[dstIdx + 2] = data[srcIdx + 2];
      result[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  imageData.data.set(result);
  ctx.putImageData(imageData, 0, 0);
};
var applyColorShift = (ctx, width, height, params) => {
  const amount = Math.max(0, Math.min(1, num2(params.amount, 0.5)));
  const hueOffset = num2(params._hueOffset, 0) * amount;
  if (Math.abs(hueOffset) < 0.1) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const l = (mx + mn) / 2;
    if (mx === mn) continue;
    const d = mx - mn;
    const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h;
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (mx === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    h = ((h + hueOffset / 360) % 1 + 1) % 1;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    data[i] = Math.round(hue2rgb(h + 1 / 3) * 255);
    data[i + 1] = Math.round(hue2rgb(h) * 255);
    data[i + 2] = Math.round(hue2rgb(h - 1 / 3) * 255);
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyNeonEdge = (ctx, width, height, params) => {
  const intensity = Math.max(0, Math.min(1, num2(params.intensity, 0.7)));
  const bgDarken = Math.max(0, Math.min(1, num2(params.bgDarken, 0.7)));
  const hueOffset = num2(params._hueOffset, 0);
  if (intensity === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const result = new Uint8ClampedArray(data.length);
  const lum = (idx) => data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
  const getIdx = (x, y) => (Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))) * 4;
  const hsv2rgb = (h, s, v) => {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0:
        return [v, t, p];
      case 1:
        return [q, v, p];
      case 2:
        return [p, v, t];
      case 3:
        return [p, q, v];
      case 4:
        return [t, p, v];
      default:
        return [v, p, q];
    }
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tl = lum(getIdx(x - 1, y - 1));
      const tc = lum(getIdx(x, y - 1));
      const tr = lum(getIdx(x + 1, y - 1));
      const ml = lum(getIdx(x - 1, y));
      const mr = lum(getIdx(x + 1, y));
      const bl = lum(getIdx(x - 1, y + 1));
      const bc = lum(getIdx(x, y + 1));
      const br = lum(getIdx(x + 1, y + 1));
      const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      let edge = Math.sqrt(gx * gx + gy * gy) / 255;
      edge = Math.min(1, Math.max(0, (edge - 0.05) / 0.25));
      const hue = ((hueOffset / 360 + edge * 0.2) % 1 + 1) % 1;
      const [nr, ng, nb] = hsv2rgb(hue, 1, 1);
      const idx = (y * width + x) * 4;
      const darken = 1 - bgDarken * intensity;
      result[idx] = clamp2552(Math.round(data[idx] * darken + nr * 255 * edge * intensity));
      result[idx + 1] = clamp2552(Math.round(data[idx + 1] * darken + ng * 255 * edge * intensity));
      result[idx + 2] = clamp2552(Math.round(data[idx + 2] * darken + nb * 255 * edge * intensity));
      result[idx + 3] = data[idx + 3];
    }
  }
  imageData.data.set(result);
  ctx.putImageData(imageData, 0, 0);
};
var applySplit = (ctx, width, height, params) => {
  const layout = Math.round(num2(params.layout, 0));
  const zoom = Math.max(0.01, num2(params.zoom, 1));
  let cols, rows;
  if (layout === 0) {
    cols = 2;
    rows = 2;
  } else if (layout === 1) {
    cols = 3;
    rows = 3;
  } else if (layout === 2) {
    cols = 2;
    rows = 1;
  } else {
    cols = 1;
    rows = 2;
  }
  const srcData = ctx.getImageData(0, 0, width, height);
  const src = srcData.data;
  const dstData = ctx.createImageData(width, height);
  const dst = dstData.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let u = x / width * cols % 1;
      let v = y / height * rows % 1;
      u = 0.5 + (u - 0.5) / zoom;
      v = 0.5 + (v - 0.5) / zoom;
      u = Math.max(0, Math.min(1, u));
      v = Math.max(0, Math.min(1, v));
      const srcX = Math.min(width - 1, Math.max(0, Math.floor(u * width)));
      const srcY = Math.min(height - 1, Math.max(0, Math.floor(v * height)));
      const dstIdx = (y * width + x) * 4;
      const srcIdx = (srcY * width + srcX) * 4;
      copyPixel(dst, dstIdx, src, srcIdx);
    }
  }
  ctx.putImageData(dstData, 0, 0);
};
var applyKawaseBlur = (ctx, width, height, params) => {
  const radius = Math.max(0, num2(params.radius, 4));
  if (radius === 0) return;
  applyBoxBlur(ctx, width, height, Math.ceil(radius));
};
var applyAscii = (ctx, width, height, params) => {
  const charSize = Math.max(4, Math.round(num2(params.charSize, 8)));
  const src = ctx.getImageData(0, 0, width, height);
  const srcData = src.data;
  const dst = ctx.createImageData(width, height);
  const dstData = dst.data;
  const bitmaps = [0, 65600, 332772, 15255086, 23385164, 15252014, 13199452, 11512810];
  for (let cy = 0; cy < height; cy += charSize) {
    for (let cx = 0; cx < width; cx += charSize) {
      const sx = Math.min(cx + (charSize >> 1), width - 1);
      const sy = Math.min(cy + (charSize >> 1), height - 1);
      const si = (sy * width + sx) * 4;
      const r = srcData[si], g = srcData[si + 1], b = srcData[si + 2], a = srcData[si + 3];
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      const level = Math.min(7, Math.max(0, Math.floor(lum * 8)));
      const bitmap = bitmaps[level];
      for (let py = 0; py < charSize && cy + py < height; py++) {
        for (let px = 0; px < charSize && cx + px < width; px++) {
          const di = ((cy + py) * width + (cx + px)) * 4;
          const gx = Math.floor(px / charSize * 5);
          const gy = Math.floor(py / charSize * 5);
          const bit = bitmap >> gx + gy * 5 & 1;
          if (bit) {
            dstData[di] = r;
            dstData[di + 1] = g;
            dstData[di + 2] = b;
            dstData[di + 3] = a;
          } else {
            dstData[di + 3] = 0;
          }
        }
      }
    }
  }
  ctx.putImageData(dst, 0, 0);
};
var applyCrossHatch = (ctx, width, height, params) => {
  const spacing = Math.max(3, num2(params.spacing, 10));
  const lineWidth = Math.max(0.5, num2(params.lineWidth, 1));
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
      let c = 255;
      if (lum < 0.9 && (x + y) % spacing < lineWidth) c = 0;
      if (lum < 0.7 && ((x - y) % spacing + spacing) % spacing < lineWidth) c = 0;
      if (lum < 0.5 && (x + y + spacing * 0.5) % spacing < lineWidth) c = 0;
      if (lum < 0.3 && ((x - y + spacing * 0.5) % spacing + spacing) % spacing < lineWidth) c = 0;
      data[i] = c;
      data[i + 1] = c;
      data[i + 2] = c;
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyGodray = (ctx, width, height, params) => {
  const intensity = num2(params.intensity, 0.5);
  const angle = num2(params.angle, 30) * Math.PI / 180;
  const lac = num2(params.lacunarity, 2.5);
  const gn = num2(params.gain, 0.5);
  const seed = num2(params._seed, 0);
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let y = 0; y < height; y++) {
    const ny = y / height;
    const fade = Math.min(ny / 0.6, 1) * Math.min((1 - ny) / 0.6, 1);
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const rx = nx * ca - ny * sa;
      const ry = nx * sa + ny * ca;
      const t = fbm2D(rx * 4 + seed * 7.31, ry * 4, { octaves: 4, lacunarity: lac, gain: gn });
      const ray = Math.max(0, Math.min(1, t * fade * intensity));
      const i = (y * width + x) * 4;
      data[i] = clamp2552(data[i] + ray * 255);
      data[i + 1] = clamp2552(data[i + 1] + ray * 255);
      data[i + 2] = clamp2552(data[i + 2] + ray * 255);
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applySpotlight = (ctx, width, height, params) => {
  const posX = num2(params.posX, 0.5);
  const posY = num2(params.posY, 0.5);
  const radius = num2(params.radius, 0.5);
  const softness = num2(params.softness, 0.5);
  const intensity = num2(params.intensity, 1.5);
  const scR = num2(params.spotColorR, 1);
  const scG = num2(params.spotColorG, 1);
  const scB = num2(params.spotColorB, 1);
  const ambient = num2(params.ambient, 0.3);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const dx = nx - posX, dy = ny - posY;
      const dist = Math.sqrt(dx * dx + dy * dy) * 2;
      const edge0 = radius, edge1 = radius + softness;
      const t = Math.max(0, Math.min(1, (dist - edge0) / (edge1 - edge0 || 1e-3)));
      const spot = 1 - t * t * (3 - 2 * t);
      const i = (y * width + x) * 4;
      data[i] = clamp2552(data[i] * (ambient + scR * spot * intensity));
      data[i + 1] = clamp2552(data[i + 1] * (ambient + scG * spot * intensity));
      data[i + 2] = clamp2552(data[i + 2] * (ambient + scB * spot * intensity));
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyFire = (ctx, width, height, params) => {
  const intensity = num2(params.intensity, 0.7);
  const scale = num2(params.scale, 4);
  const speed = num2(params.speed, 1);
  const seed = num2(params._seed, 0);
  const time = seed * speed;
  function fireNoise(px, py, s) {
    return (noise2D(px + s * 7.31, py) + 1) * 0.5;
  }
  function fireFbm(px, py, s, oct) {
    return (fbm2D(px + s * 7.31, py, { octaves: oct }) + 1) * 0.5;
  }
  function fireColor(t) {
    t = Math.max(0, Math.min(1, t));
    if (t < 0.25) return [0.02 + t * 4 * 0.48, t * 4 * 0.05, 0];
    if (t < 0.5) {
      const f2 = (t - 0.25) * 4;
      return [0.5 + f2 * 0.5, 0.05 + f2 * 0.3, f2 * 0];
    }
    if (t < 0.75) {
      const f2 = (t - 0.5) * 4;
      return [1, 0.35 + f2 * 0.4, 0 + f2 * 0.2];
    }
    const f = (t - 0.75) * 4;
    return [1, 0.75 + f * 0.2, 0.2 + f * 0.5];
  }
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const qx = fireFbm(nx * scale, ny * scale + time * 0.6, 0, 6);
      const qy = fireFbm(nx * scale + 5.2, ny * scale + 1.3 + time * 0.4, 1, 6);
      const rx = fireFbm(nx * scale + qx * 3 + 1.7, ny * scale + qy * 3 + 9.2 + time * 0.7, 2, 5);
      const ry = fireFbm(nx * scale + qx * 2.5 + 8.3, ny * scale + qy * 2.5 + 2.8 + time * 0.5, 3, 5);
      const n = fireFbm(nx * scale + rx * 2, ny * scale + ry * 2 + time * 0.9, 4, 6);
      const baseMask = Math.max(0, Math.min(1, (ny - 0.25) / 0.75));
      const tipMask = Math.max(0, Math.min(1, (1 - ny) / 0.08));
      const hTaper = Math.max(0, Math.min(1, nx / 0.3)) * Math.max(0, Math.min(1, (1 - nx) / 0.3));
      const hMixed = hTaper + (1 - hTaper) * Math.max(0, Math.min(1, (ny - 0.3) / 0.6));
      let fire = n * baseMask * tipMask * hMixed;
      fire = Math.pow(Math.max(fire, 0), 1.3);
      const ember = Math.max(0, 1 - (1 - ny) / 0.2) * (0.3 + 0.2 * fireNoise(nx * 8 + time, ny * 8 + time, 5));
      fire = Math.min(1, fire + ember * 0.4);
      const [fr, fg, fb] = fireColor(fire);
      const spark = fireNoise(nx * 30, ny * 30 - time * 3, 6);
      const sparkVal = spark > 0.92 ? (spark - 0.92) / 0.06 * baseMask * 0.7 : 0;
      const i = (y * width + x) * 4;
      const addR = (fr * fire + sparkVal) * intensity;
      const addG = (fg * fire + sparkVal * 0.8) * intensity;
      const addB = (fb * fire + sparkVal * 0.3) * intensity;
      data[i] = clamp2552(data[i] + addR * 255);
      data[i + 1] = clamp2552(data[i + 1] + addG * 255);
      data[i + 2] = clamp2552(data[i + 2] + addB * 255);
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var applyFireworks = (ctx, width, height, params) => {
  const intensity = num2(params.intensity, 0.8);
  const seed = num2(params._seed, 0);
  const density = Math.max(1, Math.min(8, num2(params.density, 4)));
  const trailLen = num2(params.trailLength, 3);
  const aspect = width / height;
  const dragK = 1.8;
  const grav = 0.12;
  const riseDur = 1;
  const cycle = 4;
  const trailR = trailLen * 4e-3 + 5e-3;
  function hash(n) {
    return (Math.sin(n) * 43758.5453 % 1 + 1) % 1;
  }
  function particlePos(cx, cy, vx, vy, t, g, k) {
    const dt = 1 - Math.exp(-k * t);
    const px = cx + vx * dt / k;
    const py = cy + vy * dt / k + g * (t / k - dt / (k * k));
    return [px, py];
  }
  function gaussianSplat(data2, px, py, cr, cg, cb, bright, radius) {
    if (bright < 5e-3) return;
    const rSq = radius * radius + 5e-5;
    const pxX = Math.round(px / aspect * width);
    const pxY = Math.round(py * height);
    const r = Math.ceil(radius * Math.max(width, height) * 1.2);
    const x0 = Math.max(0, pxX - r), x1 = Math.min(width - 1, pxX + r);
    const y0 = Math.max(0, pxY - r), y1 = Math.min(height - 1, pxY + r);
    for (let sy = y0; sy <= y1; sy++) {
      const ny = sy / height;
      for (let sx = x0; sx <= x1; sx++) {
        const nx = sx / width * aspect;
        const dSq = (nx - px) ** 2 + (ny - py) ** 2;
        const g = Math.exp(-dSq / rSq) * bright;
        if (g < 8e-3) continue;
        const i = (sy * width + sx) * 4;
        data2[i] = clamp2552(data2[i] + cr * g * 255);
        data2[i + 1] = clamp2552(data2[i + 1] + cg * g * 255);
        data2[i + 2] = clamp2552(data2[i + 2] + cb * g * 255);
      }
    }
  }
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let b = 0; b < density; b++) {
    const phase = hash(b * 7.13) * 5;
    const lt = ((seed + phase) % cycle + cycle) % cycle;
    const cIdx = Math.floor((seed + phase) / cycle);
    const cx = (hash(b * 3.71 + cIdx) * 0.6 + 0.2) * aspect;
    const cy = hash(b * 5.43 + cIdx) * 0.3 + 0.2;
    const launchX = cx + (hash(b * 2.17 + cIdx) - 0.5) * 0.1 * aspect;
    const launchY = 0.95;
    if (lt < riseDur) {
      const rT = lt / riseDur;
      const easeT = rT * rT * (3 - 2 * rT);
      const rocketX = launchX + (cx - launchX) * easeT;
      const rocketY = launchY + (cy - launchY) * easeT;
      gaussianSplat(data, rocketX, rocketY, 1, 0.85, 0.5, 2, 0.017);
      for (let tr = 1; tr <= 10; tr++) {
        const tt = rT - tr * 0.015;
        if (tt < 0) break;
        const eBack = tt * tt * (3 - 2 * tt);
        const tpx = launchX + (cx - launchX) * eBack + (hash(b * 50 + tr + cIdx) - 0.5) * 8e-3;
        const tpy = launchY + (cy - launchY) * eBack;
        const trFade = Math.pow(1 - tr / 11, 2);
        gaussianSplat(data, tpx, tpy, 1, 0.5, 0.15, 0.5 * trFade, 0.012);
      }
      continue;
    }
    const explTime = lt - riseDur;
    const explDur = cycle - riseDur;
    const explT = explTime / explDur;
    const fade = Math.exp(-explTime * 1.2);
    const onset = Math.min(explT / 0.03, 1);
    const hue = hash(b + cIdx * 13) * Math.PI * 2;
    const cR = Math.min(1, (0.55 + 0.45 * Math.cos(hue)) ** 2 * 1.3);
    const cG = Math.min(1, (0.55 + 0.45 * Math.cos(hue + 2.094)) ** 2 * 1.3);
    const cB = Math.min(1, (0.55 + 0.45 * Math.cos(hue + 4.189)) ** 2 * 1.3);
    const burstType = hash(b * 11 + cIdx * 3);
    const numParticles = burstType < 0.4 ? 48 : 32;
    const speedMul = burstType < 0.4 ? 0.45 : 0.55;
    const flashFade = Math.exp(-explTime * 8);
    if (flashFade > 0.01) {
      gaussianSplat(data, cx, cy, 1, 0.97, 0.85, 3 * flashFade, 0.015 + explTime * 0.04);
    }
    for (let p = 0; p < numParticles; p++) {
      const angle = p * 6.2832 / numParticles + hash(b * 100 + p) * 0.3;
      const spd = (0.5 + hash(p * 13 + b) * 0.5) * speedMul;
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd;
      const [px, py] = particlePos(cx, cy, vx, vy, explTime, grav, dragK);
      const twinkle = 0.6 + 0.4 * Math.sin(explTime * 15 + p * 4.3);
      const bright = fade * onset * twinkle * intensity;
      gaussianSplat(data, px, py, cR, cG, cB, bright, trailR);
      gaussianSplat(data, px, py, cR, cG, cB, bright * 0.5, trailR * 0.4);
      const trailSteps = Math.round(trailLen * 1.5 + 2);
      for (let ts = 1; ts <= trailSteps; ts++) {
        const tBack = explTime - ts * 0.04;
        if (tBack < 0) break;
        const [tpx, tpy] = particlePos(cx, cy, vx, vy, tBack, grav, dragK);
        const trailFade = Math.pow(1 - ts / (trailSteps + 1), 1.5);
        gaussianSplat(data, tpx, tpy, cR, cG, cB, fade * trailFade * 0.35, trailR * 0.77);
      }
    }
    if (explT > 0.3) {
      for (let e = 0; e < 16; e++) {
        const ea = e * 0.393 + hash(b * 200 + e) * 0.8;
        const espd = 0.15 + hash(e * 7 + b * 3) * 0.15;
        const evx = Math.cos(ea) * espd;
        const evy = Math.sin(ea) * espd;
        const etime = explTime - 0.3 * explDur;
        if (etime < 0) continue;
        const [epx, epy] = particlePos(cx, cy, evx, evy, etime * 1.5, grav * 2.5, dragK * 0.7);
        const etwinkle = Math.sin(etime * 8 + e * 1.7) > 0 ? 1 : 0.3;
        const eg = (1 - (explT - 0.3) / 0.7) * etwinkle * 0.3;
        gaussianSplat(data, epx, epy, cR * 0.6, cG * 0.6, cB * 0.6, eg, trailR * 0.6);
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
};
var CANVAS2D_EFFECT_HANDLERS = {
  applyGaussianBlur,
  applyRadialBlur,
  applyWave,
  applyRipple,
  applyRgbSplit,
  applyVignette,
  applyGlow,
  applySharpen,
  applyColorGrading,
  applyVhs,
  applyGlitchBlock,
  applyFilmGrain,
  applyShake,
  applyFisheye,
  applySwirl,
  applyKaleidoscope,
  applyPixelate,
  applyPosterize,
  applyInvert,
  applyDuotone,
  applyHalftone,
  applyEmboss,
  applySpherize,
  applyThermal,
  applyMotionBlur,
  applyEcho,
  applyColorLut,
  applyTiltShift,
  applyBokeh,
  applyLensFlare,
  applyLightLeak,
  applyRain,
  applySnow,
  applySparkle,
  applyFlash,
  applyZoomPulse,
  applyMirror,
  applyColorShift,
  applyNeonEdge,
  applySplit,
  applyKawaseBlur,
  applyAscii,
  applyCrossHatch,
  applyGodray,
  applySpotlight,
  applyFire,
  applyFireworks
};
function applyCanvas2DEffect(ctx, width, height, fallbackName, params) {
  const handler = CANVAS2D_EFFECT_HANDLERS[fallbackName];
  if (handler) {
    handler(ctx, width, height, params);
  }
}

// ../../shared/keyframes/SpeedRampCalculator.ts
var MIN_SPEED = 0.1;
var MAX_SPEED = 8;
var MAX_LUT_ENTRIES = 1e4;
function clampSpeed(speed) {
  return Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
}
var SpeedRampCalculator = class {
  constructor(speedKeyframes, elementDurationMs, sampleIntervalMs = 16) {
    this.lut = [];
    this.totalMediaDurationSec = 0;
    this.buildLUT(speedKeyframes, elementDurationMs, sampleIntervalMs);
  }
  buildLUT(keyframes, durationMs, sampleIntervalMs) {
    if (keyframes.length === 0 || durationMs <= 0) {
      this.lut = [{ timeMs: 0, cumulativeMediaSec: 0, speedAtTime: 1 }];
      this.totalMediaDurationSec = 0;
      return;
    }
    const entries = [];
    let cumulative = 0;
    const firstSpeed = clampSpeed(interpolateKeyframeProperties(keyframes, 0).speed ?? 1);
    entries.push({ timeMs: 0, cumulativeMediaSec: 0, speedAtTime: firstSpeed });
    let prevSpeed = firstSpeed;
    let steps = Math.ceil(durationMs / sampleIntervalMs);
    if (steps > MAX_LUT_ENTRIES) {
      sampleIntervalMs = Math.ceil(durationMs / MAX_LUT_ENTRIES);
      steps = Math.ceil(durationMs / sampleIntervalMs);
    }
    let compensation = 0;
    for (let i = 1; i <= steps; i++) {
      const t = Math.min(i * sampleIntervalMs, durationMs);
      const dt = t - entries[entries.length - 1].timeMs;
      if (dt <= 0) continue;
      const currentSpeed = clampSpeed(interpolateKeyframeProperties(keyframes, t).speed ?? 1);
      const increment = (prevSpeed + currentSpeed) / 2 * (dt / 1e3);
      const y = increment - compensation;
      const newSum = cumulative + y;
      compensation = newSum - cumulative - y;
      cumulative = newSum;
      entries.push({
        timeMs: t,
        cumulativeMediaSec: cumulative,
        speedAtTime: currentSpeed
      });
      prevSpeed = currentSpeed;
    }
    const lastEntry = entries[entries.length - 1];
    if (lastEntry.timeMs < durationMs) {
      const dt = durationMs - lastEntry.timeMs;
      const finalSpeed = clampSpeed(
        interpolateKeyframeProperties(keyframes, durationMs).speed ?? 1
      );
      const increment = (prevSpeed + finalSpeed) / 2 * (dt / 1e3);
      const y = increment - compensation;
      const newSum = cumulative + y;
      compensation = newSum - cumulative - y;
      cumulative = newSum;
      entries.push({
        timeMs: durationMs,
        cumulativeMediaSec: cumulative,
        speedAtTime: finalSpeed
      });
    }
    this.lut = entries;
    this.totalMediaDurationSec = cumulative;
  }
  /** 二分查找 LUT 中 timeMs <= localTimeMs 的最后一个索引，返回该索引及线性插值分数 */
  findLUTSegment(localTimeMs) {
    const lut = this.lut;
    let lo = 0;
    let hi = lut.length - 1;
    while (lo < hi) {
      const mid = lo + hi + 1 >>> 1;
      if (lut[mid].timeMs <= localTimeMs) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    if (lo + 1 >= lut.length) return null;
    const segmentDt = lut[lo + 1].timeMs - lut[lo].timeMs;
    if (segmentDt <= 0) return null;
    return { index: lo, fraction: (localTimeMs - lut[lo].timeMs) / segmentDt };
  }
  getMediaTimeAtLocalTime(localTimeMs) {
    if (!isFinite(localTimeMs) || localTimeMs <= 0) return 0;
    const lut = this.lut;
    if (lut.length === 0) return 0;
    const lastEntry = lut[lut.length - 1];
    if (localTimeMs >= lastEntry.timeMs) return lastEntry.cumulativeMediaSec;
    const seg = this.findLUTSegment(localTimeMs);
    if (!seg) return lut[lut.length - 1].cumulativeMediaSec;
    const entry = lut[seg.index];
    const nextEntry = lut[seg.index + 1];
    const result = entry.cumulativeMediaSec + seg.fraction * (nextEntry.cumulativeMediaSec - entry.cumulativeMediaSec);
    return isFinite(result) ? result : entry.cumulativeMediaSec;
  }
  getSpeedAtLocalTime(localTimeMs) {
    if (this.lut.length === 0) return 1;
    if (!isFinite(localTimeMs) || localTimeMs <= 0) return this.lut[0].speedAtTime;
    const lastEntry = this.lut[this.lut.length - 1];
    if (localTimeMs >= lastEntry.timeMs) return lastEntry.speedAtTime;
    const seg = this.findLUTSegment(localTimeMs);
    if (!seg) return this.lut[this.lut.length - 1].speedAtTime;
    const entry = this.lut[seg.index];
    const nextEntry = this.lut[seg.index + 1];
    const result = entry.speedAtTime + seg.fraction * (nextEntry.speedAtTime - entry.speedAtTime);
    return isFinite(result) ? result : entry.speedAtTime;
  }
  getTotalMediaDuration() {
    return this.totalMediaDurationSec;
  }
};

// ../../shared/render/shapeRenderer.ts
function renderShapeElement(ctx, params, options) {
  const { shapeType, fill } = params;
  const w = params.width;
  const h = params.height;
  const strokeScl = options?.strokeScale ?? 1;
  const brScl = options?.borderRadiusScale ?? 1;
  const stroke = params.stroke;
  const strokeWidth = (params.strokeWidth || 0) * strokeScl;
  if (options?.pixelSnap) {
    applyPixelSnap(ctx);
  }
  ctx.fillStyle = fill;
  if (stroke && strokeWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.miterLimit = 2;
  }
  const doStroke = () => {
    if (stroke && strokeWidth > 0) ctx.stroke();
  };
  switch (shapeType) {
    // ─── 矩形 ──────────────────────────────────────────────
    case "rect": {
      const r = (params.shapeBorderRadius || 0) * brScl;
      if (r > 0) {
        drawRoundedRect2(ctx, w, h, r);
        ctx.fill();
        strokeRoundedRect(ctx, stroke, strokeWidth);
      } else {
        ctx.fillRect(-w / 2, -h / 2, w, h);
        if (stroke && strokeWidth > 0) {
          strokeAlignedRect(ctx, w, h, strokeWidth);
        }
      }
      break;
    }
    case "roundedRect": {
      const rawR = (params.shapeBorderRadius || 0) * brScl;
      const r = rawR > 0 ? rawR : Math.min(w, h) * 0.1;
      drawRoundedRect2(ctx, w, h, r);
      ctx.fill();
      strokeRoundedRect(ctx, stroke, strokeWidth);
      break;
    }
    // ─── 圆/椭圆 ───────────────────────────────────────────
    case "circle":
    case "ellipse": {
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      doStroke();
      break;
    }
    // ─── 三角形 ─────────────────────────────────────────────
    case "triangle": {
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      ctx.fill();
      doStroke();
      break;
    }
    case "rightTriangle": {
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      ctx.fill();
      doStroke();
      break;
    }
    // ─── 线条 ───────────────────────────────────────────────
    case "line": {
      ctx.beginPath();
      ctx.lineCap = "round";
      const odd = (strokeWidth & 1) === 1;
      const yOff = isAxisAligned(ctx) && odd ? 0.5 : 0;
      ctx.moveTo(-w / 2, yOff);
      ctx.lineTo(w / 2, yOff);
      if (stroke && strokeWidth > 0) ctx.stroke();
      break;
    }
    // ─── 多边形 ─────────────────────────────────────────────
    case "polygon": {
      if (params.shapePoints && params.shapePoints.length) {
        drawPolygonPoints(ctx, params.shapePoints, w, h);
      } else {
        drawRegularPolygon(ctx, w, h, 5);
      }
      ctx.fill();
      doStroke();
      break;
    }
    case "diamond": {
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, 0);
      ctx.lineTo(0, h / 2);
      ctx.lineTo(-w / 2, 0);
      ctx.closePath();
      ctx.fill();
      doStroke();
      break;
    }
    case "pentagon": {
      drawRegularPolygon(ctx, w, h, 5);
      ctx.fill();
      doStroke();
      break;
    }
    case "hexagon": {
      drawRegularPolygon(ctx, w, h, 6);
      ctx.fill();
      doStroke();
      break;
    }
    case "octagon": {
      drawRegularPolygon(ctx, w, h, 8);
      ctx.fill();
      doStroke();
      break;
    }
    case "parallelogram": {
      ctx.beginPath();
      ctx.moveTo(-w / 2 + w * 0.25, -h / 2);
      ctx.lineTo(w / 2, -h / 2);
      ctx.lineTo(w / 2 - w * 0.25, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      ctx.fill();
      doStroke();
      break;
    }
    // ─── 环形 ───────────────────────────────────────────────
    case "ring": {
      const R = Math.min(w, h) * 0.45;
      const r = R * 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.moveTo(r, 0);
      ctx.arc(0, 0, r, 0, Math.PI * 2, true);
      fillEvenOdd(ctx);
      doStroke();
      break;
    }
    case "halfRing": {
      const outerR = w / 2;
      const innerR = outerR * 0.6;
      ctx.beginPath();
      ctx.arc(0, h / 2, outerR, Math.PI, 0, false);
      ctx.lineTo(w / 2 - (outerR - innerR), h / 2);
      ctx.arc(0, h / 2, innerR, 0, Math.PI, true);
      ctx.lineTo(-w / 2 + (outerR - innerR), h / 2);
      ctx.closePath();
      fillEvenOdd(ctx);
      doStroke();
      break;
    }
    // ─── 弧形 ───────────────────────────────────────────────
    case "semicircle": {
      const R = Math.min(w, h) / 2;
      ctx.beginPath();
      ctx.arc(0, 0, R, Math.PI, 0);
      ctx.lineTo(-R, 0);
      ctx.closePath();
      ctx.fill();
      doStroke();
      break;
    }
    case "quarterCircle": {
      const R = Math.min(w, h);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-w / 2, h / 2 - R);
      ctx.lineTo(-w / 2, h / 2);
      ctx.arc(-w / 2, h / 2, R, Math.PI / 2, Math.PI);
      ctx.closePath();
      ctx.fill();
      doStroke();
      ctx.restore();
      break;
    }
    case "arch": {
      const R = w / 2;
      ctx.beginPath();
      ctx.moveTo(-w / 2, h / 2);
      ctx.lineTo(-w / 2, 0);
      ctx.arc(0, 0, R, Math.PI, 0, false);
      ctx.lineTo(w / 2, h / 2);
      ctx.closePath();
      ctx.fill();
      doStroke();
      break;
    }
    // ─── 箭头 ───────────────────────────────────────────────
    case "rightArrow": {
      ctx.beginPath();
      const y1 = -h / 2 + h / 3;
      const y2 = -h / 2 + 2 * h / 3;
      ctx.moveTo(-w / 2, y1);
      ctx.lineTo(-w / 2 + 0.6 * w, y1);
      ctx.lineTo(-w / 2 + 0.6 * w, -h / 2);
      ctx.lineTo(w / 2, 0);
      ctx.lineTo(-w / 2 + 0.6 * w, h / 2);
      ctx.lineTo(-w / 2 + 0.6 * w, y2);
      ctx.lineTo(-w / 2, y2);
      ctx.closePath();
      ctx.fill();
      doStroke();
      break;
    }
    case "upArrow": {
      ctx.beginPath();
      const yMid = -h / 2 + 0.4 * h;
      ctx.moveTo(-w / 2 + w / 3, h / 2);
      ctx.lineTo(-w / 2 + w / 3, yMid);
      ctx.lineTo(-w / 2, yMid);
      ctx.lineTo(0, -h / 2);
      ctx.lineTo(w / 2, yMid);
      ctx.lineTo(-w / 2 + 2 * w / 3, yMid);
      ctx.lineTo(-w / 2 + 2 * w / 3, h / 2);
      ctx.closePath();
      ctx.fill();
      doStroke();
      break;
    }
    case "downArrow": {
      ctx.beginPath();
      const yMid = -h / 2 + 0.6 * h;
      ctx.moveTo(-w / 2 + w / 3, -h / 2);
      ctx.lineTo(-w / 2 + w / 3, yMid);
      ctx.lineTo(-w / 2, yMid);
      ctx.lineTo(0, h / 2);
      ctx.lineTo(w / 2, yMid);
      ctx.lineTo(-w / 2 + 2 * w / 3, yMid);
      ctx.lineTo(-w / 2 + 2 * w / 3, -h / 2);
      ctx.closePath();
      ctx.fill();
      doStroke();
      break;
    }
    // ─── 十字/线条图形 ──────────────────────────────────────
    case "cross": {
      ctx.save();
      ctx.strokeStyle = fill;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(strokeWidth || 1, 6);
      const s = Math.min(w, h) * 0.6;
      ctx.beginPath();
      ctx.moveTo(-s / 2, -s / 2);
      ctx.lineTo(s / 2, s / 2);
      ctx.moveTo(s / 2, -s / 2);
      ctx.lineTo(-s / 2, s / 2);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "wave": {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = fill;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(strokeWidth || 1, 6);
      ctx.moveTo(-w / 2, 0);
      ctx.quadraticCurveTo(-w / 4, -h * 0.3, 0, 0);
      ctx.quadraticCurveTo(w / 4, h * 0.3, w / 2, 0);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "plus": {
      const t = Math.min(w, h) / 6;
      ctx.beginPath();
      ctx.rect(-w * 0.4, -t / 2, w * 0.8, t);
      ctx.rect(-t / 2, -h * 0.4, t, h * 0.8);
      ctx.fill();
      doStroke();
      break;
    }
    // ─── 星形 ───────────────────────────────────────────────
    case "star": {
      drawStar(ctx, w, h, 5, 0.9, 0.4, -Math.PI / 2);
      ctx.fill();
      doStroke();
      break;
    }
    case "fourPointStar": {
      drawStar(ctx, w, h, 4, 0.9, 0.3, 0);
      ctx.fill();
      doStroke();
      break;
    }
    case "sixPointStar": {
      drawStar(ctx, w, h, 6, 0.9, 0.4, -Math.PI / 2);
      ctx.fill();
      doStroke();
      break;
    }
    case "eightPointStar": {
      drawStar(ctx, w, h, 8, 0.9, 0.4, -Math.PI / 2);
      ctx.fill();
      doStroke();
      break;
    }
    case "sunBurst": {
      const innerR = Math.min(w, h) / 4;
      const outerR = Math.min(w, h) / 2 * 0.9;
      ctx.beginPath();
      ctx.arc(0, 0, innerR, 0, Math.PI * 2);
      ctx.fill();
      doStroke();
      ctx.save();
      ctx.strokeStyle = fill;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(strokeWidth || 1, 3);
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const ang = i * Math.PI / 8;
        const x1 = Math.cos(ang) * innerR;
        const y1 = Math.sin(ang) * innerR;
        const x2 = Math.cos(ang) * outerR;
        const y2 = Math.sin(ang) * outerR;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      ctx.restore();
      break;
    }
    // ─── 默认 ───────────────────────────────────────────────
    default: {
      if (params.shapePoints && params.shapePoints.length) {
        drawPolygonPoints(ctx, params.shapePoints, w, h);
        ctx.fill();
        doStroke();
      } else {
        ctx.fillRect(-w / 2, -h / 2, w, h);
        if (stroke && strokeWidth > 0) ctx.strokeRect(-w / 2, -h / 2, w, h);
      }
      break;
    }
  }
}
function isAxisAligned(ctx) {
  try {
    const t = ctx.getTransform();
    return Math.abs(t.b) < 1e-3 && Math.abs(t.c) < 1e-3 && Math.abs(t.a - 1) < 1e-3 && Math.abs(t.d - 1) < 1e-3;
  } catch {
    return false;
  }
}
function applyPixelSnap(ctx) {
  try {
    const t = ctx.getTransform();
    if (Math.abs(t.b) < 1e-3 && Math.abs(t.c) < 1e-3 && Math.abs(t.a - 1) < 1e-3 && Math.abs(t.d - 1) < 1e-3) {
      const dx = Math.round(t.e) - t.e;
      const dy = Math.round(t.f) - t.f;
      if (Math.abs(dx) > 1e-3 || Math.abs(dy) > 1e-3) {
        ctx.translate(dx, dy);
      }
    }
  } catch {
  }
}
function drawRoundedRect2(ctx, w, h, r) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  const x = -w / 2;
  const y = -h / 2;
  ctx.beginPath();
  if (rr > 0) {
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
  } else {
    ctx.rect(x, y, w, h);
  }
}
function strokeRoundedRect(ctx, stroke, strokeWidth) {
  if (!stroke || strokeWidth <= 0) return;
  const odd = (strokeWidth & 1) === 1;
  if (isAxisAligned(ctx) && odd) {
    ctx.save();
    ctx.translate(0.5, 0.5);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.stroke();
  }
}
function strokeAlignedRect(ctx, w, h, strokeWidth) {
  const odd = (strokeWidth & 1) === 1;
  if (isAxisAligned(ctx) && odd) {
    ctx.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
  } else {
    ctx.strokeRect(-w / 2, -h / 2, w, h);
  }
}
function drawRegularPolygon(ctx, w, h, sides) {
  const R = Math.min(w, h) / 2;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const ang = -Math.PI / 2 + i * 2 * Math.PI / sides;
    const x = Math.cos(ang) * R;
    const y = Math.sin(ang) * R;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
function drawPolygonPoints(ctx, points, w, h) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x - w / 2, points[0].y - h / 2);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x - w / 2, points[i].y - h / 2);
  }
  ctx.closePath();
}
function drawStar(ctx, w, h, numPoints, outerRatio, innerRatio, startAngle) {
  const outerR = Math.min(w, h) / 2 * outerRatio;
  const innerR = outerR * innerRatio;
  const totalPoints = numPoints * 2;
  ctx.beginPath();
  for (let i = 0; i < totalPoints; i++) {
    const ang = startAngle + i * Math.PI / numPoints;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = Math.cos(ang) * r;
    const y = Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
function fillEvenOdd(ctx) {
  try {
    ctx.fill("evenodd");
  } catch {
    ctx.fill();
  }
}

// ../../server/src/renderer/ServerRenderExporter.ts
async function parallelLimit(tasks, limit) {
  const results = new Array(tasks.length);
  let nextIndex = 0;
  async function runNext() {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++;
      try {
        results[idx] = { status: "fulfilled", value: await tasks[idx]() };
      } catch (reason) {
        results[idx] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => runNext()));
  return results;
}
var QUALITY_MAP = {
  low: { jpegQuality: 0.6, videoBitrate: "1M" },
  medium: { jpegQuality: 0.8, videoBitrate: "2.5M" },
  high: { jpegQuality: 0.9, videoBitrate: "5M" },
  very_high: { jpegQuality: 0.95, videoBitrate: "10M" }
};
var HW_ENCODER_CANDIDATES = [
  // macOS VideoToolbox：使用码率模式（-q:v 与 -b:v 冲突，选一种）
  { name: "h264_videotoolbox", codec: "h264_videotoolbox", extraArgs: ["-allow_sw", "1"], useBitrate: true },
  // NVIDIA NVENC
  { name: "h264_nvenc", codec: "h264_nvenc", extraArgs: ["-preset", "p4", "-tune", "hq", "-rc", "vbr"], useBitrate: true },
  // Intel Quick Sync Video
  { name: "h264_qsv", codec: "h264_qsv", extraArgs: ["-preset", "medium"], useBitrate: true },
  // AMD AMF (Windows/Linux)
  { name: "h264_amf", codec: "h264_amf", extraArgs: ["-quality", "balanced"], useBitrate: true }
];
var _detectedHwEncoder;
function detectHwEncoder() {
  if (_detectedHwEncoder !== void 0) return _detectedHwEncoder;
  try {
    const output = execSync("ffmpeg -hide_banner -encoders", {
      encoding: "utf8",
      timeout: 5e3,
      stdio: ["pipe", "pipe", "pipe"]
    });
    for (const candidate of HW_ENCODER_CANDIDATES) {
      if (output.includes(candidate.name)) {
        console.log(`[ServerRenderExporter] Detected hardware encoder: ${candidate.name}`);
        _detectedHwEncoder = { codec: candidate.codec, extraArgs: candidate.extraArgs, useBitrate: candidate.useBitrate };
        return _detectedHwEncoder;
      }
    }
  } catch {
  }
  console.log("[ServerRenderExporter] No hardware encoder detected, using libx264");
  _detectedHwEncoder = null;
  return null;
}
var BT709_FLAGS = [
  "-colorspace",
  "bt709",
  "-color_primaries",
  "bt709",
  "-color_trc",
  "bt709",
  "-color_range",
  "tv"
];
function getAvcLevel(width, height, fps) {
  const macroblocks = Math.ceil(width / 16) * Math.ceil(height / 16);
  const mbPerSec = macroblocks * fps;
  if (macroblocks > 8704 || mbPerSec > 522240) return "5.1";
  if (macroblocks > 8192 || mbPerSec > 245760) return "4.2";
  if (macroblocks > 3600 || mbPerSec > 108e3) return "4.1";
  return "3.1";
}
function buildEncoderArgs(bitrate, fps, width, height) {
  const gopSize = String(fps * 2);
  const hw = detectHwEncoder();
  if (hw) {
    return [
      "-c:v",
      hw.codec,
      ...hw.extraArgs,
      ...hw.useBitrate ? ["-b:v", bitrate] : [],
      "-g",
      gopSize,
      "-pix_fmt",
      "yuv420p",
      ...BT709_FLAGS
    ];
  }
  return [
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-profile:v",
    "high",
    "-level",
    getAvcLevel(width, height, fps),
    "-b:v",
    bitrate,
    "-g",
    gopSize,
    "-pix_fmt",
    "yuv420p",
    ...BT709_FLAGS
  ];
}
var ServerRenderExporter = class {
  constructor() {
    this._textWrapCache = null;
    this._charWidthCache = null;
    this.captionIndex = null;
    this.captionIndexSource = null;
    this._propsPool = null;
    this._lineWidthCache = null;
    this._metricsCache = null;
    this._filterCache = null;
    // Canvas 池：复用离屏 canvas 减少 GC 压力（像素化效果等）
    this._canvasPool = [];
    // 静态元素渲染缓存：无动画/关键帧的文字、图片、形状首帧缓存
    this._staticCache = null;
    // 变速曲线计算器缓存：elementId → SpeedRampCalculator
    this._speedCalcCache = /* @__PURE__ */ new Map();
    /**
     * 查找当前时间的活跃转场
     */
    this._transitionZoneCache = /* @__PURE__ */ new Map();
    // GIF 帧缓存: src → { frames: Image[], delays: number[] }
    this.gifCache = /* @__PURE__ */ new Map();
  }
  async export(canvasState, outputFormat, resolution, onProgress) {
    const fps = outputFormat.fps || 30;
    const quality = QUALITY_MAP[outputFormat.quality] || QUALITY_MAP.medium;
    const format = outputFormat.format || "mp4";
    onProgress?.(0, "\u89E3\u6790\u9879\u76EE\u6570\u636E");
    const {
      elements = [],
      tracks = [],
      animations = [],
      captions = [],
      globalCaptionStyle: captionStyle,
      captionAnimation,
      keyframeTracks = [],
      transitions: rawTransitions = [],
      width: canvasWidth = 1920,
      height: canvasHeight = 1080,
      backgroundColor = "#000000",
      backgroundType,
      blurIntensity = 8,
      maxTime = 0
    } = canvasState;
    const transitions = rawTransitions;
    const outWidth = resolution?.width || canvasWidth;
    const outHeight = resolution?.height || canvasHeight;
    FontRegistry.registerGoogleFonts();
    let tempFontFiles = [];
    const { brandFonts } = FontRegistry.extractRequiredFonts(canvasState);
    if (brandFonts.length > 0) {
      onProgress?.(1, "\u4E0B\u8F7D\u81EA\u5B9A\u4E49\u5B57\u4F53");
      tempFontFiles = await FontRegistry.registerBrandFonts(brandFonts);
    }
    const renderTracks = DataConverter.convertTracks(tracks, elements, animations, keyframeTracks);
    const totalDuration = maxTime > 0 ? maxTime / 1e3 : DataConverter.calculateTotalDuration(renderTracks);
    const totalFrames = Math.ceil(totalDuration * fps);
    if (totalFrames <= 0) {
      throw new Error("No frames to render (duration = 0)");
    }
    console.log(`[ServerRenderExporter] Rendering ${totalFrames} frames at ${fps}fps, ${outWidth}x${outHeight}, duration=${totalDuration.toFixed(2)}s`);
    onProgress?.(2, "\u4E0B\u8F7D\u5A92\u4F53\u8D44\u6E90");
    const mediaResolver = new MediaResolver();
    const imageLoader = new ServerImageLoader();
    const videoExtractor = new ServerVideoFrameExtractor();
    const mediaSrcs = /* @__PURE__ */ new Set();
    const videoSrcs = /* @__PURE__ */ new Set();
    for (const track of renderTracks) {
      for (const el of track.elements) {
        if (el.src) {
          if (el.type === "video") {
            videoSrcs.add(el.src);
          } else if (el.type === "image" || el.type === "gif" || el.type === "svg") {
            mediaSrcs.add(el.src);
          }
        }
      }
    }
    const resolvedPaths = /* @__PURE__ */ new Map();
    const allSrcs = [...mediaSrcs, ...videoSrcs];
    const DOWNLOAD_CONCURRENCY = 6;
    for (let i = 0; i < allSrcs.length; i += DOWNLOAD_CONCURRENCY) {
      const batch = allSrcs.slice(i, i + DOWNLOAD_CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (src) => {
          const localPath = await mediaResolver.resolve(src);
          return { src, localPath };
        })
      );
      for (const result of results) {
        if (result.status === "fulfilled") {
          resolvedPaths.set(result.value.src, result.value.localPath);
          if (mediaSrcs.has(result.value.src)) {
            try {
              await imageLoader.load(result.value.localPath);
            } catch (err) {
              console.warn(`[ServerRenderExporter] Failed to load image: ${result.value.src}`, err);
            }
          }
        } else {
          console.warn(`[ServerRenderExporter] Failed to resolve media: ${batch[results.indexOf(result)]}`, result.reason);
        }
      }
    }
    onProgress?.(5, "\u5F00\u59CB\u6E32\u67D3\u5E27");
    const canvas = new Canvas(outWidth, outHeight);
    const ctx = canvas.getContext("2d");
    const workDir = path4.join(os4.tmpdir(), `video-export-${crypto.randomUUID()}`);
    fs4.mkdirSync(workDir, { recursive: true });
    const scaleX = outWidth / canvasWidth;
    const scaleY = outHeight / canvasHeight;
    const blurOffCanvas = backgroundType === "blur" ? new Canvas(outWidth, outHeight) : null;
    const blurOffCtx = blurOffCanvas?.getContext("2d") ?? null;
    this._textWrapCache = /* @__PURE__ */ new Map();
    this._charWidthCache = /* @__PURE__ */ new Map();
    this._propsPool = /* @__PURE__ */ new Map();
    this._lineWidthCache = /* @__PURE__ */ new Map();
    this._metricsCache = /* @__PURE__ */ new Map();
    this._filterCache = /* @__PURE__ */ new Map();
    this._staticCache = /* @__PURE__ */ new Map();
    const extendBefore = /* @__PURE__ */ new Map();
    const extendAfter = /* @__PURE__ */ new Map();
    if (transitions.length > 0) {
      for (const t of transitions) {
        const halfDur = t.duration / 2;
        const prevAfter = extendAfter.get(t.sourceElementId) ?? 0;
        extendAfter.set(t.sourceElementId, Math.max(prevAfter, halfDur));
        const prevBefore = extendBefore.get(t.targetElementId) ?? 0;
        extendBefore.set(t.targetElementId, Math.max(prevBefore, halfDur));
      }
    }
    const activeElementsByFrame = [];
    for (let i = 0; i < totalFrames; i++) {
      const time = i / fps;
      const active = [];
      for (let ti = renderTracks.length - 1; ti >= 0; ti--) {
        const track = renderTracks[ti];
        if (!track.isVisible) continue;
        for (const element of track.elements) {
          if (element.hidden) continue;
          const start = element.startTime + element.trimStart;
          const end = element.startTime + element.duration - element.trimEnd;
          const extB = (extendBefore.get(element.id) ?? 0) / 1e3;
          const extA = (extendAfter.get(element.id) ?? 0) / 1e3;
          if (time >= start - extB && time <= end + extA) {
            active.push({ track, element });
          }
        }
      }
      activeElementsByFrame.push(active);
    }
    if (videoSrcs.size > 0) {
      onProgress?.(5, "\u9884\u63D0\u53D6\u89C6\u9891\u5E27");
      videoExtractor.setCacheLimit(Math.max(300, Math.min(5e3, totalFrames + 100)));
      const videoFrameMap = /* @__PURE__ */ new Map();
      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        const time = frameIndex / fps;
        for (const { element } of activeElementsByFrame[frameIndex]) {
          if (element.type !== "video" || !element.src) continue;
          const localPath = resolvedPaths.get(element.src);
          if (!localPath) continue;
          const localTimeRaw = time - element.startTime + element.trimStart;
          const visibleDuration = Math.max(0, element.duration - element.trimStart - element.trimEnd);
          const clampedLocalTime = Math.min(Math.max(0, localTimeRaw), Math.max(0, visibleDuration - 1e-3));
          const targetMediaTime = Math.max(0, this.getTargetMediaTime(element, clampedLocalTime));
          const cacheKey = `${localPath}@${targetMediaTime.toFixed(3)}`;
          if (!videoFrameMap.has(localPath)) {
            videoFrameMap.set(localPath, { cacheKeys: [], mediaTimes: [], seen: /* @__PURE__ */ new Set() });
          }
          const entry = videoFrameMap.get(localPath);
          if (!entry.seen.has(cacheKey)) {
            entry.seen.add(cacheKey);
            entry.cacheKeys.push(cacheKey);
            entry.mediaTimes.push(targetMediaTime);
          }
        }
      }
      const extractionTasks = Array.from(videoFrameMap.entries()).map(
        ([videoPath, { cacheKeys, mediaTimes }]) => {
          const indices = mediaTimes.map((_, i) => i).sort((a, b) => mediaTimes[a] - mediaTimes[b]);
          return () => videoExtractor.batchPreExtract(
            videoPath,
            indices.map((i) => cacheKeys[i]),
            indices.map((i) => mediaTimes[i]),
            (done, total) => {
              if (done % 50 === 0) {
                onProgress?.(5 + done / total * 2, `\u9884\u63D0\u53D6\u89C6\u9891\u5E27 ${done}/${total}`);
              }
            }
          );
        }
      );
      const extractResults = await parallelLimit(extractionTasks, 3);
      for (const r of extractResults) {
        if (r.status === "rejected") {
          console.warn("[ServerRenderExporter] Batch pre-extract failed:", r.reason);
        }
      }
    }
    const audioExtractor = new ServerAudioExtractor();
    const audioTracks = [];
    for (const track of renderTracks) {
      for (const el of track.elements) {
        if ((el.type === "video" || el.type === "audio") && el.src && !el.muted) {
          const resolvedSrc = resolvedPaths.get(el.src) || el.src;
          let effectiveSpeed = el.playbackSpeed ?? 1;
          const speedCalc = this.getSpeedCalc(el);
          if (speedCalc) {
            const visDur = Math.max(0, el.duration - el.trimStart - el.trimEnd);
            const totalMedia = speedCalc.getTotalMediaDuration();
            effectiveSpeed = visDur > 0 ? totalMedia / visDur : 1;
          }
          audioTracks.push({
            src: resolvedSrc,
            startTime: el.startTime,
            endTime: el.startTime + el.duration,
            mediaStartTime: el.mediaStartTime || 0,
            volume: el.volume ?? 1,
            playbackSpeed: effectiveSpeed
          });
        }
      }
    }
    let audioPath = null;
    let audioPromise = Promise.resolve(null);
    if (audioTracks.length > 0) {
      const audioTarget = path4.join(workDir, "audio.wav");
      audioPromise = audioExtractor.mixAudioTracks(audioTracks, totalDuration, audioTarget).catch((err) => {
        console.warn("[ServerRenderExporter] Audio extraction failed:", err);
        return null;
      });
    }
    onProgress?.(8, "\u5F00\u59CB\u6E32\u67D3\u5E27");
    const outputFilename = `output_${crypto.randomUUID()}.${format}`;
    let outputPath = path4.join(workDir, outputFilename);
    const encoderArgs = buildEncoderArgs(quality.videoBitrate, fps, outWidth, outHeight);
    const ffmpegArgs = [
      "-f",
      "rawvideo",
      "-pixel_format",
      "rgba",
      "-video_size",
      `${outWidth}x${outHeight}`,
      "-framerate",
      String(fps),
      "-i",
      "pipe:0",
      ...encoderArgs,
      "-movflags",
      "+faststart",
      "-y",
      outputPath
    ];
    const encoder = spawnProcess("ffmpeg", ffmpegArgs, { stdio: ["pipe", "pipe", "pipe"] });
    let encoderError = null;
    encoder.stderr.on("data", () => {
    });
    encoder.on("error", (err) => {
      encoderError = new Error(`FFmpeg pipe encoder spawn error: ${err.message}`);
    });
    try {
      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        const time = frameIndex / fps;
        ctx.clearRect(0, 0, outWidth, outHeight);
        if (backgroundType !== "blur") {
          const bg = backgroundColor || "#000000";
          if (bg.includes("gradient")) {
            this.drawGradientBackground(ctx, outWidth, outHeight, bg);
          } else {
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, outWidth, outHeight);
          }
        }
        const activeElements = activeElementsByFrame[frameIndex];
        if (backgroundType === "blur") {
          try {
            await this.renderBlurBackground(
              ctx,
              outWidth,
              outHeight,
              activeElements,
              time,
              blurIntensity * scaleX,
              resolvedPaths,
              imageLoader,
              videoExtractor,
              blurOffCanvas,
              blurOffCtx
            );
          } catch (err) {
            console.warn(`[ServerRenderExporter] Failed to render blur background:`, err);
          }
        }
        const activeTransition = this._findActiveTransition(transitions, activeElements, time);
        const transitionElementIds = /* @__PURE__ */ new Set();
        if (activeTransition) {
          transitionElementIds.add(activeTransition.zone.sourceElementId);
          transitionElementIds.add(activeTransition.zone.targetElementId);
        }
        for (const { element } of activeElements) {
          if (transitionElementIds.has(element.id)) continue;
          try {
            await this.renderElement(ctx, element, time, resolvedPaths, imageLoader, videoExtractor, scaleX, scaleY, canvasWidth, canvasHeight);
          } catch (err) {
            console.warn(`[ServerRenderExporter] Failed to render element ${element.id}:`, err);
          }
        }
        if (activeTransition) {
          try {
            await this._renderTransitionFrame(
              ctx,
              activeTransition,
              activeElements,
              time,
              resolvedPaths,
              imageLoader,
              videoExtractor,
              scaleX,
              scaleY,
              canvasWidth,
              canvasHeight,
              outWidth,
              outHeight
            );
          } catch (err) {
            console.warn(`[ServerRenderExporter] Failed to render transition:`, err);
          }
        }
        if (captions && captions.length > 0) {
          try {
            this.renderCaptionsOverlay(
              ctx,
              outWidth,
              outHeight,
              time,
              captions,
              captionStyle,
              captionAnimation,
              scaleX,
              scaleY
            );
          } catch (err) {
            console.warn(`[ServerRenderExporter] Failed to render captions:`, err);
          }
        }
        const activeEffects = DataConverter.getActiveEffectElements(renderTracks, time);
        if (activeEffects.length > 0) {
          try {
            const resolvedEffects = this.resolveEffectElements(activeEffects, time);
            if (resolvedEffects.length > 0) {
              this.applyGlobalEffects(ctx, outWidth, outHeight, resolvedEffects);
            }
          } catch (err) {
            console.warn(`[ServerRenderExporter] Failed to apply global effects:`, err);
          }
        }
        if (encoderError) {
          throw encoderError;
        }
        const frameBuffer = canvas.toBufferSync("raw");
        const canWrite = encoder.stdin.write(frameBuffer);
        if (!canWrite) {
          await new Promise((resolve3) => encoder.stdin.once("drain", resolve3));
        }
        const renderProgress = 8 + frameIndex / totalFrames * 82;
        if (frameIndex % 10 === 0) {
          onProgress?.(renderProgress, `\u6E32\u67D3\u5E27 ${frameIndex + 1}/${totalFrames}`);
        }
      }
      encoder.stdin.end();
      await new Promise((resolve3, reject) => {
        encoder.on("close", (code) => {
          if (code === 0) {
            resolve3();
          } else {
            reject(encoderError || new Error(`FFmpeg pipe encoding failed (code ${code})`));
          }
        });
      });
      audioPath = await audioPromise;
      if (audioPath) {
        onProgress?.(92, "\u5408\u5E76\u97F3\u9891");
        const muxedPath = path4.join(workDir, `muxed_${crypto.randomUUID()}.${format}`);
        await this.muxVideoAudio(outputPath, audioPath, muxedPath);
        try {
          fs4.unlinkSync(outputPath);
        } catch {
        }
        outputPath = muxedPath;
      }
    } catch (err) {
      try {
        encoder.stdin.destroy();
      } catch {
      }
      try {
        encoder.kill("SIGKILL");
      } catch {
      }
      try {
        fs4.rmSync(workDir, { recursive: true, force: true });
      } catch {
      }
      throw err;
    } finally {
      this._textWrapCache = null;
      this._charWidthCache = null;
      this.captionIndex = null;
      this.captionIndexSource = null;
      this._propsPool = null;
      this._lineWidthCache = null;
      this._metricsCache = null;
      this._filterCache = null;
      this._canvasPool.length = 0;
      this._staticCache = null;
      this._transitionZoneCache.clear();
      this._speedCalcCache.clear();
      try {
        if (audioPath && fs4.existsSync(audioPath)) {
          fs4.unlinkSync(audioPath);
        }
      } catch {
      }
      imageLoader.clear();
      videoExtractor.clear();
      mediaResolver.cleanup();
      this.gifCache.clear();
      FontRegistry.cleanupTempFonts(tempFontFiles);
    }
    onProgress?.(95, "\u5B8C\u6210");
    onProgress?.(100, "\u5BFC\u51FA\u5B8C\u6210");
    return outputPath;
  }
  /**
   * 合并视频和音频轨道（FFmpeg mux）
   */
  muxVideoAudio(videoPath, audioPath, outputPath) {
    return new Promise((resolve3, reject) => {
      const proc = spawnProcess("ffmpeg", [
        "-i",
        videoPath,
        "-i",
        audioPath,
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "+faststart",
        "-y",
        outputPath
      ], { stdio: ["pipe", "pipe", "pipe"] });
      const stderrChunks = [];
      proc.stderr.on("data", (chunk) => stderrChunks.push(chunk));
      proc.on("error", (err) => reject(new Error(`FFmpeg mux error: ${err.message}`)));
      proc.on("close", (code) => {
        if (code === 0) resolve3();
        else reject(new Error(`FFmpeg mux failed (code ${code}): ${Buffer.concat(stderrChunks).toString().slice(-500)}`));
      });
    });
  }
  _findActiveTransition(transitions, activeElements, timeSec) {
    if (transitions.length === 0) return null;
    const timeMs = timeSec * 1e3;
    for (const t of transitions) {
      let zone = this._transitionZoneCache.get(t.id);
      if (!zone) {
        const sourceEl = activeElements.find((e) => e.element.id === t.sourceElementId)?.element;
        const targetEl = activeElements.find((e) => e.element.id === t.targetElementId)?.element;
        if (!sourceEl || !targetEl) continue;
        const sourceEndMs = (sourceEl.startTime + sourceEl.duration - sourceEl.trimStart - sourceEl.trimEnd) * 1e3;
        const halfDur = t.duration / 2;
        zone = {
          transitionId: t.id,
          sourceElementId: t.sourceElementId,
          targetElementId: t.targetElementId,
          type: t.type,
          zoneStart: sourceEndMs - halfDur,
          zoneEnd: sourceEndMs + halfDur,
          junction: sourceEndMs,
          duration: t.duration,
          easing: t.easing
        };
        this._transitionZoneCache.set(t.id, zone);
      }
      if (timeMs >= zone.zoneStart && timeMs <= zone.zoneEnd) {
        return { zone, transition: t };
      }
    }
    return null;
  }
  /**
   * 渲染转场合成帧（双离屏画布）
   */
  async _renderTransitionFrame(ctx, active, activeElements, time, resolvedPaths, imageLoader, videoExtractor, scaleX, scaleY, canvasWidth, canvasHeight, outWidth, outHeight) {
    const { zone } = active;
    const timeMs = time * 1e3;
    const sourceEntry = activeElements.find((e) => e.element.id === zone.sourceElementId);
    const targetEntry = activeElements.find((e) => e.element.id === zone.targetElementId);
    if (!sourceEntry || !targetEntry) {
      if (sourceEntry) {
        await this.renderElement(ctx, sourceEntry.element, time, resolvedPaths, imageLoader, videoExtractor, scaleX, scaleY, canvasWidth, canvasHeight);
      }
      if (targetEntry) {
        await this.renderElement(ctx, targetEntry.element, time, resolvedPaths, imageLoader, videoExtractor, scaleX, scaleY, canvasWidth, canvasHeight);
      }
      return;
    }
    const canvasA = new Canvas(outWidth, outHeight);
    const ctxA = canvasA.getContext("2d");
    const canvasB = new Canvas(outWidth, outHeight);
    const ctxB = canvasB.getContext("2d");
    ctxA.clearRect(0, 0, outWidth, outHeight);
    await this.renderElement(ctxA, sourceEntry.element, time, resolvedPaths, imageLoader, videoExtractor, scaleX, scaleY, canvasWidth, canvasHeight);
    ctxB.clearRect(0, 0, outWidth, outHeight);
    await this.renderElement(ctxB, targetEntry.element, time, resolvedPaths, imageLoader, videoExtractor, scaleX, scaleY, canvasWidth, canvasHeight);
    const progress = Math.max(0, Math.min(1, (timeMs - zone.zoneStart) / (zone.zoneEnd - zone.zoneStart)));
    applyTransitionBlend(zone.type, ctx, canvasA, canvasB, outWidth, outHeight, progress);
  }
  calculateElementProperties(element, currentTime, canvasWidth, canvasHeight) {
    const localTime = currentTime - element.startTime;
    let props;
    if (this._propsPool) {
      const pooled = this._propsPool.get(element.id);
      if (pooled) {
        this.cleanAnimationProperties(pooled, element);
        Object.assign(pooled, element);
        props = pooled;
      } else {
        props = { ...element };
        this._propsPool.set(element.id, props);
      }
    } else {
      props = { ...element };
    }
    const preAnimX = props.x;
    const preAnimY = props.y;
    if (element.animations) {
      for (const animation of element.animations) {
        props = applyAnimation2(props, animation, localTime, canvasWidth, canvasHeight);
      }
    }
    const dx = (props.x ?? preAnimX) - preAnimX;
    const dy = (props.y ?? preAnimY) - preAnimY;
    if (dx !== 0) props.centerX = (props.centerX ?? preAnimX + element.width / 2) + dx;
    if (dy !== 0) props.centerY = (props.centerY ?? preAnimY + element.height / 2) + dy;
    if (element.keyframeTracks && element.keyframeTracks.length > 0) {
      let blockedProperties;
      if (element.animations) {
        const blocked = /* @__PURE__ */ new Set();
        for (const anim of element.animations) {
          let isActive = false;
          if (ENTRANCE_ANIMATION_TYPES.has(anim.type)) {
            isActive = localTime >= 0 && localTime < anim.duration;
          } else if (EXIT_ANIMATION_TYPES.has(anim.type)) {
            const animStart = element.duration - anim.duration;
            isActive = localTime >= animStart && localTime <= element.duration;
          }
          if (isActive) {
            for (const prop of getAnimationAffectedProperties(anim.type)) {
              blocked.add(prop);
            }
          }
        }
        if (blocked.size > 0) {
          blockedProperties = blocked;
        }
      }
      props = applyKeyframeInterpolation2(props, element.keyframeTracks, localTime, blockedProperties);
    }
    return props;
  }
  cleanAnimationProperties(pooled, element) {
    const pooledAny = pooled;
    for (const key of Object.keys(pooledAny)) {
      if (key[0] === "_" && !(key in element)) {
        delete pooledAny[key];
      }
    }
    if (!("skewX" in element)) delete pooledAny.skewX;
    if (!("skewY" in element)) delete pooledAny.skewY;
  }
  /**
   * 从 canvas 池获取尺寸匹配的离屏 canvas（容差 ±10%），无匹配则新建
   */
  acquireCanvas(w, h) {
    for (let i = 0; i < this._canvasPool.length; i++) {
      const item = this._canvasPool[i];
      if (item.w >= w && item.h >= h && item.w <= w * 1.1 && item.h <= h * 1.1) {
        this._canvasPool.splice(i, 1);
        item.ctx.clearRect(0, 0, item.w, item.h);
        return item;
      }
    }
    const canvas = new Canvas(w, h);
    return { canvas, ctx: canvas.getContext("2d"), w, h };
  }
  /**
   * 归还离屏 canvas 到池中（上限 8 个）
   */
  releaseCanvas(item) {
    if (this._canvasPool.length < 8) {
      this._canvasPool.push(item);
    }
  }
  /**
   * 判断元素是否为静态（无动画、无关键帧、非视频/GIF）
   */
  isStaticElement(element) {
    if (element.animations && element.animations.length > 0) return false;
    if (element.keyframeTracks && element.keyframeTracks.length > 0) return false;
    if (element.type === "video" || element.type === "gif") return false;
    return true;
  }
  /**
   * 半静态元素：仅有 opacity 关键帧（无动画、非视频/GIF）
   * 可缓存渲染内容，运行时通过 ctx.globalAlpha 调制透明度
   */
  isSemiStaticElement(element) {
    if (!element.keyframeTracks || element.keyframeTracks.length === 0) return false;
    if (element.animations && element.animations.length > 0) return false;
    if (element.type === "video" || element.type === "gif") return false;
    return element.keyframeTracks.every(
      (t) => !t.enabled || t.propertyType === "opacity"
    );
  }
  cachedMeasureWidth(ctx, text, spacingPx = 0) {
    if (spacingPx === 0) {
      if (!this._lineWidthCache) return ctx.measureText(text).width;
      const key2 = `${ctx.font}|${text}`;
      const cached2 = this._lineWidthCache.get(key2);
      if (cached2 !== void 0) return cached2;
      const width2 = ctx.measureText(text).width;
      this._lineWidthCache.set(key2, width2);
      this.evictOldEntries(this._lineWidthCache, 5e3);
      return width2;
    }
    if (!this._lineWidthCache) return measureTextWithSpacing(ctx, text, spacingPx);
    const key = `${ctx.font}|${text}|s${spacingPx}`;
    const cached = this._lineWidthCache.get(key);
    if (cached !== void 0) return cached;
    const width = measureTextWithSpacing(ctx, text, spacingPx);
    this._lineWidthCache.set(key, width);
    this.evictOldEntries(this._lineWidthCache, 5e3);
    return width;
  }
  cachedTextMetrics(ctx, fontSize) {
    if (!this._metricsCache) {
      const m2 = ctx.measureText("Mg");
      return {
        ascent: m2.actualBoundingBoxAscent ?? fontSize * 0.8,
        descent: m2.actualBoundingBoxDescent ?? fontSize * 0.2
      };
    }
    const cached = this._metricsCache.get(ctx.font);
    if (cached) return cached;
    const m = ctx.measureText("Mg");
    const metrics = {
      ascent: m.actualBoundingBoxAscent ?? fontSize * 0.8,
      descent: m.actualBoundingBoxDescent ?? fontSize * 0.2
    };
    this._metricsCache.set(ctx.font, metrics);
    this.evictOldEntries(this._metricsCache, 500);
    return metrics;
  }
  cachedGetFilter(props) {
    if (!this._filterCache) return getCompositeFilter(props);
    const key = `${props.brightness ?? 0}|${props.contrast ?? 0}|${props.saturation ?? 0}|${props.hue ?? 0}|${props._blurAmount ?? props.blur ?? 0}|${props.effectType ?? ""}`;
    const cached = this._filterCache.get(key);
    if (cached !== void 0) return cached;
    const filter = getCompositeFilter(props);
    this._filterCache.set(key, filter);
    this.evictOldEntries(this._filterCache, 1e3);
    return filter;
  }
  /** 获取或创建元素的 SpeedRampCalculator（缓存），无速度关键帧时返回 null */
  getSpeedCalc(element) {
    if (this._speedCalcCache.has(element.id)) {
      return this._speedCalcCache.get(element.id);
    }
    const speedTrack = element.keyframeTracks?.find(
      (t) => t.propertyType === "speed" && t.enabled && t.keyframes.length >= 2
    );
    if (!speedTrack) return null;
    const visDur = Math.max(0, element.duration - element.trimStart - element.trimEnd);
    const calc = new SpeedRampCalculator(speedTrack.keyframes, visDur * 1e3);
    this._speedCalcCache.set(element.id, calc);
    return calc;
  }
  /**
   * 计算变速曲线下的目标媒体时间（秒）
   * 有 speed 关键帧时使用 SpeedRampCalculator 积分，否则使用静态 playbackSpeed
   */
  getTargetMediaTime(element, clampedLocalTime) {
    const mediaStart = element.mediaStartTime || 0;
    const calc = this.getSpeedCalc(element);
    if (!calc) {
      return mediaStart + clampedLocalTime * (element.playbackSpeed ?? 1);
    }
    return mediaStart + calc.getMediaTimeAtLocalTime(clampedLocalTime * 1e3);
  }
  measureCharWidth(ctx, baseFontSpec, char, charWidthCache) {
    if (!charWidthCache) return ctx.measureText(char).width;
    const cacheKey = `${baseFontSpec}|${char}`;
    const cached = charWidthCache.get(cacheKey);
    if (cached !== void 0) return cached;
    const width = ctx.measureText(char).width;
    charWidthCache.set(cacheKey, width);
    this.evictOldEntries(charWidthCache, 5e3);
    return width;
  }
  evictOldEntries(cache, maxSize) {
    if (cache.size <= maxSize) return;
    const evictCount = Math.ceil(maxSize / 2);
    let count = 0;
    for (const key of cache.keys()) {
      if (count >= evictCount) break;
      cache.delete(key);
      count++;
    }
  }
  getWrappedText(ctx, text, availableWidth, spacingPx = 0) {
    if (!this._textWrapCache) return wrapTextByGrapheme(text, availableWidth, ctx, spacingPx);
    const key = `${text}|${ctx.font}|${availableWidth}|${spacingPx}`;
    const cached = this._textWrapCache.get(key);
    if (cached) return cached;
    const wrapped = wrapTextByGrapheme(text, availableWidth, ctx, spacingPx);
    this._textWrapCache.set(key, wrapped);
    this.evictOldEntries(this._textWrapCache, 2e3);
    return wrapped;
  }
  applyTransforms(ctx, element, scaleX, scaleY) {
    const centerX = (element.centerX ?? element.x + element.width / 2) * scaleX;
    const centerY = (element.centerY ?? element.y + element.height / 2) * scaleY;
    const glitchOffsetX = (element._glitchOffsetX ?? 0) * scaleX;
    const glitchOffsetY = (element._glitchOffsetY ?? 0) * scaleY;
    ctx.translate(centerX + glitchOffsetX, centerY + glitchOffsetY);
    const rotateX = element._rotateX ?? 0;
    const rotateY = element._rotateY ?? 0;
    if (rotateX !== 0 || rotateY !== 0) {
      apply3DRotation(ctx, rotateX, rotateY, element.width * scaleX, element.height * scaleY);
    }
    if (element.rotation) {
      ctx.rotate(element.rotation * Math.PI / 180);
    }
    const skewX = element.skewX ?? 0;
    const skewY = element.skewY ?? 0;
    if (skewX !== 0 || skewY !== 0) {
      const skewXRad = skewX * Math.PI / 180;
      const skewYRad = skewY * Math.PI / 180;
      ctx.transform(1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0);
    }
    const sx = element.scaleX ?? 1;
    const sy = element.scaleY ?? 1;
    const fx = element.flipX ? -1 : 1;
    const fy = element.flipY ? -1 : 1;
    ctx.scale(sx * fx, sy * fy);
    if (element.opacity !== void 0) {
      ctx.globalAlpha = Math.max(0, Math.min(1, element.opacity));
    }
  }
  /**
   * 渲染单个元素到 Canvas
   */
  async renderElement(ctx, element, time, resolvedPaths, imageLoader, videoExtractor, scaleX, scaleY, canvasWidth, canvasHeight) {
    const localTime = time - element.startTime;
    const props = this.calculateElementProperties(element, time, canvasWidth, canvasHeight);
    if ((props.opacity ?? 1) <= 0) return;
    const cachedStatic = this._staticCache?.get(element.id);
    if (cachedStatic) {
      ctx.save();
      this.applyTransforms(ctx, props, scaleX, scaleY);
      ctx.drawImage(cachedStatic.canvas, -cachedStatic.drawWidth / 2, -cachedStatic.drawHeight / 2);
      ctx.restore();
      return;
    }
    ctx.save();
    try {
      this.applyTransforms(ctx, props, scaleX, scaleY);
      if (props.blendMode && props.blendMode !== "normal") {
        ctx.globalCompositeOperation = props.blendMode;
      }
      const drawWidth = props.width * scaleX;
      const drawHeight = props.height * scaleY;
      applyClipEffects(ctx, props, drawWidth, drawHeight);
      applyBlurFilter(ctx, props._blurAmount ?? 0, scaleX);
      const renderCtx = ctx;
      const postFx = detectActivePostEffects(props);
      if (postFx.dissolve) {
        renderCtx.globalAlpha = renderCtx.globalAlpha * (1 - postFx.dissolveProgress);
        const dissolvePixelSize = calculateDissolvePixelSize(postFx.dissolveProgress);
        if (dissolvePixelSize > 1) {
          const { pixelWidth: dpw, pixelHeight: dph } = calculatePixelateDownsample(drawWidth, drawHeight, dissolvePixelSize);
          const poolItem = this.acquireCanvas(dpw, dph);
          const offCtx = poolItem.ctx;
          offCtx.save();
          offCtx.translate(dpw / 2, dph / 2);
          offCtx.scale(dpw / drawWidth, dph / drawHeight);
          await this.dispatchElementRender(offCtx, props, element, time, resolvedPaths, imageLoader, videoExtractor, drawWidth, drawHeight, scaleX, scaleY);
          offCtx.restore();
          renderPixelated(renderCtx, poolItem.canvas, drawWidth, drawHeight);
          this.releaseCanvas(poolItem);
        } else {
          await this.dispatchElementRender(renderCtx, props, element, time, resolvedPaths, imageLoader, videoExtractor, drawWidth, drawHeight, scaleX, scaleY);
        }
      } else if (postFx.pixelate) {
        const { pixelWidth, pixelHeight } = calculatePixelateDownsample(drawWidth, drawHeight, postFx.pixelSize);
        const poolItem = this.acquireCanvas(pixelWidth, pixelHeight);
        const offCtx = poolItem.ctx;
        offCtx.save();
        offCtx.translate(pixelWidth / 2, pixelHeight / 2);
        offCtx.scale(pixelWidth / drawWidth, pixelHeight / drawHeight);
        const tempProps = { ...props, _pixelSize: void 0 };
        await this.dispatchElementRender(offCtx, tempProps, element, time, resolvedPaths, imageLoader, videoExtractor, drawWidth, drawHeight, scaleX, scaleY);
        offCtx.restore();
        renderPixelated(renderCtx, poolItem.canvas, drawWidth, drawHeight);
        this.releaseCanvas(poolItem);
      } else if (postFx.glitch) {
        const poolItem = this.acquireCanvas(Math.ceil(drawWidth), Math.ceil(drawHeight));
        const offCtx = poolItem.ctx;
        offCtx.save();
        offCtx.translate(drawWidth / 2, drawHeight / 2);
        await this.dispatchElementRender(offCtx, props, element, time, resolvedPaths, imageLoader, videoExtractor, drawWidth, drawHeight, scaleX, scaleY);
        offCtx.restore();
        const splitPx = postFx.rgbSplit * scaleX;
        renderGlitchRGBSplit(renderCtx, poolItem.canvas, drawWidth, drawHeight, splitPx);
        this.releaseCanvas(poolItem);
      } else {
        const isFullStatic = this.isStaticElement(element);
        const isSemiStatic = !isFullStatic && this.isSemiStaticElement(element);
        if (this._staticCache && (isFullStatic || isSemiStatic) && !this._staticCache.has(element.id)) {
          const offCanvas = new Canvas(drawWidth, drawHeight);
          const offCtx = offCanvas.getContext("2d");
          offCtx.translate(drawWidth / 2, drawHeight / 2);
          const renderProps = isSemiStatic ? { ...props, opacity: 1 } : props;
          await this.dispatchElementRender(offCtx, renderProps, element, time, resolvedPaths, imageLoader, videoExtractor, drawWidth, drawHeight, scaleX, scaleY);
          this._staticCache.set(element.id, { canvas: offCanvas, drawWidth, drawHeight });
          renderCtx.drawImage(offCanvas, -drawWidth / 2, -drawHeight / 2);
        } else {
          await this.dispatchElementRender(renderCtx, props, element, time, resolvedPaths, imageLoader, videoExtractor, drawWidth, drawHeight, scaleX, scaleY);
        }
      }
    } finally {
      ctx.restore();
      try {
        ctx.filter = "none";
      } catch {
      }
    }
  }
  /**
   * 将 effect RenderElement 列表解析为 ResolvedEffect[] (按 renderOrder 排序)
   * 镜像前端 TimelineRenderer.resolveEffectElements 逻辑，含效果参数关键帧插值
   */
  resolveEffectElements(effectElements, timeSec) {
    const resolved = [];
    for (const el of effectElements) {
      const layers = el.globalEffectLayers;
      if (!layers || layers.length === 0) continue;
      const localTimeMs = (timeSec - el.startTime) * 1e3;
      const layerEffects = resolveEffectLayers(layers, localTimeMs);
      if (el.keyframeTracks && el.keyframeTracks.length > 0) {
        const trackIndex = buildEffectParamIndex(el.keyframeTracks);
        for (let i = 0; i < layerEffects.length; i++) {
          const track = trackIndex.get(i);
          if (track) {
            const interpolated = interpolateEffectKeyframes(track, layers[i], localTimeMs);
            if (interpolated) {
              Object.assign(layerEffects[i].params, interpolated);
            }
          }
        }
      }
      resolved.push(...layerEffects);
    }
    return sortResolvedEffects(resolved);
  }
  applyGlobalEffects(ctx, width, height, effects) {
    for (const effect of effects) {
      const fallbackName = effect.descriptor.canvas2dFallback;
      if (fallbackName) {
        try {
          applyCanvas2DEffect(ctx, width, height, fallbackName, effect.params);
        } catch {
        }
      }
    }
  }
  /**
   * 分发元素渲染到具体类型处理器
   */
  async dispatchElementRender(ctx, props, element, time, resolvedPaths, imageLoader, videoExtractor, drawWidth, drawHeight, scaleX, scaleY) {
    switch (props.type) {
      case "image":
      case "svg": {
        if (!element.src) break;
        const localPath = resolvedPaths.get(element.src);
        if (!localPath) break;
        try {
          const img = await imageLoader.load(localPath);
          this.drawImageElement(ctx, img, props, drawWidth, drawHeight, scaleX, scaleY);
        } catch {
        }
        break;
      }
      case "gif": {
        if (!element.src) break;
        const localPath = resolvedPaths.get(element.src);
        if (!localPath) break;
        try {
          const gifLocalTime = time - element.startTime;
          const gifFrame = await this.getGifFrame(localPath, gifLocalTime);
          this.drawImageElement(ctx, gifFrame, props, drawWidth, drawHeight, scaleX, scaleY);
        } catch {
          try {
            const img = await imageLoader.load(localPath);
            this.drawImageElement(ctx, img, props, drawWidth, drawHeight, scaleX, scaleY);
          } catch {
          }
        }
        break;
      }
      case "video": {
        if (!element.src) break;
        const localPath = resolvedPaths.get(element.src);
        if (!localPath) break;
        const localTimeRaw = time - element.startTime + element.trimStart;
        const visibleDuration = Math.max(0, element.duration - element.trimStart - element.trimEnd);
        const clampedLocalTime = Math.min(Math.max(0, localTimeRaw), Math.max(0, visibleDuration - 1e-3));
        const targetMediaTime = this.getTargetMediaTime(element, clampedLocalTime);
        try {
          const frame = await videoExtractor.extractFrame(localPath, Math.max(0, targetMediaTime));
          this.drawImageElement(ctx, frame, props, drawWidth, drawHeight, scaleX, scaleY);
        } catch {
        }
        break;
      }
      case "text": {
        this.renderTextElement(ctx, props, element, scaleX, scaleY);
        break;
      }
      case "shape": {
        this.renderShapeElement(ctx, props, element, drawWidth, drawHeight, scaleX, scaleY);
        break;
      }
      default:
        break;
    }
  }
  async getGifFrame(localPath, localTimeSec) {
    let cached = this.gifCache.get(localPath);
    if (!cached) {
      const metadata = await sharp(localPath, { animated: true }).metadata();
      const pageCount = metadata.pages || 1;
      const delays = metadata.delay || [];
      while (delays.length < pageCount) {
        delays.push(delays.length > 0 ? delays[delays.length - 1] : 100);
      }
      const frames = await this.loadGifFrames(localPath, pageCount);
      const totalDuration = delays.reduce((a, b) => a + b, 0);
      cached = { frames, delays, totalDuration };
      this.gifCache.set(localPath, cached);
    }
    if (cached.frames.length <= 1) {
      return cached.frames[0];
    }
    const timeMs = localTimeSec * 1e3;
    const cycleTime = cached.totalDuration;
    const timeInCycle = (timeMs % cycleTime + cycleTime) % cycleTime;
    let accumulated = 0;
    for (let i = 0; i < cached.delays.length; i++) {
      accumulated += cached.delays[i];
      if (timeInCycle < accumulated) {
        return cached.frames[i];
      }
    }
    return cached.frames[cached.frames.length - 1];
  }
  async loadGifFrames(localPath, pageCount) {
    const frames = [];
    const batchSize = 10;
    for (let start = 0; start < pageCount; start += batchSize) {
      const end = Math.min(start + batchSize, pageCount);
      const batch = await Promise.all(
        Array.from({ length: end - start }, async (_, j) => {
          const buf = await sharp(localPath, { page: start + j }).png().toBuffer();
          return loadImage3(buf);
        })
      );
      frames.push(...batch);
    }
    return frames;
  }
  renderShapeElement(ctx, props, element, drawWidth, drawHeight, scaleX, scaleY = scaleX) {
    const shapeType = props.shapeType || element.shapeType;
    renderShapeElement(ctx, {
      shapeType: shapeType || "rect",
      width: drawWidth,
      height: drawHeight,
      fill: props.fill || element.fill || "#000000",
      stroke: props.stroke || element.stroke,
      strokeWidth: (props.strokeWidth ?? element.strokeWidth) || 0,
      shapeBorderRadius: props.shapeBorderRadius || element.shapeBorderRadius || 0,
      shapePoints: props.shapePoints || element.shapePoints
    }, {
      strokeScale: scaleX,
      borderRadiusScale: Math.min(scaleX, scaleY)
    });
  }
  /**
   * 渲染图片/视频元素（含 crop、cover、border radius、border、filter）
   * 核心绘制委托给共享 drawMediaCore
   */
  drawImageElement(ctx, img, props, drawWidth, drawHeight, scaleX = 1, scaleY = 1) {
    const minScale = Math.min(scaleX, scaleY);
    const filter = this.cachedGetFilter(props);
    const esx = props.scaleX ?? 1;
    const esy = props.scaleY ?? 1;
    drawMediaCore(ctx, img, img.naturalWidth ?? img.width, img.naturalHeight ?? img.height, {
      width: drawWidth,
      height: drawHeight,
      coverWidth: esx !== 1 || esy !== 1 ? drawWidth * esx : void 0,
      coverHeight: esx !== 1 || esy !== 1 ? drawHeight * esy : void 0,
      filter: filter && filter !== "none" ? filter : void 0,
      borderRadius: (props.borderRadius ?? 0) * minScale,
      cropX: props.cropX,
      cropY: props.cropY,
      cropWidth: props.cropWidth,
      cropHeight: props.cropHeight
    });
    const borderWidth = props.borderWidth ?? 0;
    if (borderWidth > 0) {
      drawMediaBorder(ctx, {
        ...props,
        width: drawWidth,
        height: drawHeight,
        borderWidth: borderWidth * minScale,
        borderRadius: (props.borderRadius ?? 0) * minScale
      });
    }
  }
  /**
   * 渲染文本元素（含阴影、描边、下划线/删除线、换行、背景色）
   * 与前端 TextRenderer 保持一致的渲染管线：
   *   Pass 1: 填充文字（带阴影）
   *   Pass 2: 禁用阴影 → 描边（无阴影）→ 装饰线（无阴影）→ 恢复阴影
   */
  renderTextElement(ctx, props, element, scaleX, scaleY) {
    const text = props.text ?? element.text;
    if (!text) return;
    const fontSize = (props.fontSize || element.fontSize || 24) * scaleX;
    const fontWeight = props.fontWeight || element.fontWeight || "normal";
    const fontStyle = props.fontStyle || element.fontStyle || "normal";
    const fontFamily = props.fontFamily || element.fontFamily || "Arial";
    const textColor = props.color || element.color || "#000000";
    const textAlign = props.textAlign || element.textAlign || "center";
    const lineHeightFactor = element.lineHeight ?? 1.16;
    const FONT_SIZE_MULT = 1.13;
    const FONT_SIZE_FRACTION = 0.222;
    const lineHeight = fontSize * lineHeightFactor * FONT_SIZE_MULT;
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}"`;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = textAlign;
    try {
      ctx.fontKerning = "normal";
      ctx.textRendering = "optimizeLegibility";
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    } catch {
    }
    const transform = ctx.getTransform ? ctx.getTransform() : null;
    const noRotation = transform && Math.abs(transform.b) < 1e-3 && Math.abs(transform.c) < 1e-3 && Math.abs(transform.a) > 1e-3 && Math.abs(transform.d) > 1e-3;
    if (noRotation) {
      const dx = Math.round(transform.e) - transform.e;
      const dy = Math.round(transform.f) - transform.f;
      if (Math.abs(dx) > 1e-3 || Math.abs(dy) > 1e-3) {
        ctx.translate(dx / transform.a, dy / transform.d);
      }
    }
    const charSpacingPx = charSpacingToPx(props.charSpacing ?? element.charSpacing ?? 0, fontSize);
    const elementWidth = props.width * scaleX;
    const elementHeight = props.height * scaleY;
    const padding = (element.padding || 5) * scaleX;
    const textboxWidth = (element.textboxWidth || props.width) * scaleX;
    const availableTextWidth = Math.max(0, textboxWidth - padding * 2);
    const wrappedLines = this.getWrappedText(ctx, text, availableTextWidth, charSpacingPx);
    const baselineInLine = fontSize * FONT_SIZE_MULT * (1 - FONT_SIZE_FRACTION);
    const totalTextHeight = wrappedLines.length * lineHeight;
    const backgroundWidth = elementWidth + padding * 2;
    const backgroundHeight = elementHeight + padding * 2;
    const bgColor = props.backgroundColor || element.backgroundColor;
    if (bgColor) {
      const prevShadow = captureShadow(ctx);
      disableShadow(ctx);
      drawRoundedRect(ctx, -backgroundWidth / 2, -backgroundHeight / 2, backgroundWidth, backgroundHeight, 10 * scaleX, 10 * scaleY, bgColor);
      restoreShadow(ctx, prevShadow);
    }
    const textBlockCenterOffset = Math.max(0, (elementHeight - totalTextHeight) / 2);
    const textStartY = -backgroundHeight / 2 + padding + textBlockCenterOffset + baselineInLine;
    const lineXs = [];
    const lineYs = [];
    const lineWs = [];
    let baseX = 0;
    switch (textAlign) {
      case "left":
        baseX = -backgroundWidth / 2 + padding;
        break;
      case "right":
        baseX = backgroundWidth / 2 - padding;
        break;
      case "center":
      default:
        baseX = 0;
        break;
    }
    for (let i = 0; i < wrappedLines.length; i++) {
      lineXs[i] = baseX;
      lineYs[i] = textStartY + i * lineHeight;
      lineWs[i] = this.cachedMeasureWidth(ctx, wrappedLines[i], charSpacingPx);
    }
    if (noRotation) {
      for (let i = 0; i < wrappedLines.length; i++) {
        lineYs[i] = Math.round(lineYs[i] * transform.d) / transform.d;
        if (textAlign !== "center") {
          lineXs[i] = Math.round(lineXs[i] * transform.a) / transform.a;
        }
      }
    }
    const strokeColor = props.strokeColor || element.strokeColor;
    const strokeWidth = (props.strokeWidth ?? element.strokeWidth ?? 0) * scaleX;
    const fontSpec = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}"`;
    const hadShadow = !!props.shadowColor || props.shadowBlur !== void 0 || props.shadowOffsetX !== void 0 || props.shadowOffsetY !== void 0;
    const elemSx = props.scaleX ?? 1;
    const elemSy = props.scaleY ?? 1;
    const elemSxAbs = Math.abs(elemSx) || 1;
    const elemSyAbs = Math.abs(elemSy) || 1;
    let renderCtx = ctx;
    let tmpCanvas = null;
    const applyShadow = (target) => {
      target.shadowColor = props.shadowColor || "#000000";
      target.shadowBlur = (props.shadowBlur ?? 0) * (scaleX + scaleY) * (elemSxAbs + elemSyAbs) / 4;
      target.shadowOffsetX = (props.shadowOffsetX ?? 0) * scaleX * elemSxAbs;
      target.shadowOffsetY = (props.shadowOffsetY ?? 0) * scaleY * elemSyAbs;
    };
    if (hadShadow) {
      const tw = Math.round(backgroundWidth * elemSxAbs) || 1;
      const th = Math.round(backgroundHeight * elemSyAbs) || 1;
      if (tw > 0 && th > 0) {
        tmpCanvas = new Canvas(tw, th);
        renderCtx = tmpCanvas.getContext("2d");
        renderCtx.scale(elemSxAbs, elemSyAbs);
        renderCtx.translate(backgroundWidth / 2, backgroundHeight / 2);
        renderCtx.font = ctx.font;
        renderCtx.textAlign = ctx.textAlign;
        renderCtx.textBaseline = ctx.textBaseline;
        try {
          renderCtx.fontKerning = "normal";
          renderCtx.textRendering = "optimizeLegibility";
          renderCtx.imageSmoothingEnabled = true;
          renderCtx.imageSmoothingQuality = "high";
        } catch {
        }
      }
    }
    const hasCharAnimation = renderTextCharAnimations2(
      renderCtx,
      props,
      wrappedLines,
      lineXs,
      lineYs,
      lineWs,
      textAlign,
      textColor,
      fontSpec,
      strokeColor || "",
      strokeWidth,
      scaleX,
      scaleY,
      charSpacingPx,
      this._charWidthCache,
      hadShadow
      // skipShadow: shadow managed by per-call or composite
    );
    if (!hasCharAnimation) {
      const applyFillStyle = () => {
        if (props.useGradient && props.gradientColors && props.gradientColors.length >= 2) {
          const drawWidth = Math.max(...lineWs, 1);
          renderCtx.fillStyle = createTextGradient(renderCtx, props.gradientColors, drawWidth);
        } else {
          renderCtx.fillStyle = textColor;
        }
      };
      const fillAllLines = () => {
        applyFillStyle();
        if (charSpacingPx > 0) {
          for (let i = 0; i < wrappedLines.length; i++) {
            fillTextWithSpacing(renderCtx, wrappedLines[i], lineXs[i], lineYs[i], textAlign, charSpacingPx);
          }
        } else {
          for (let i = 0; i < wrappedLines.length; i++) {
            renderCtx.fillText(wrappedLines[i], lineXs[i], lineYs[i]);
          }
        }
      };
      const hasStroke = strokeWidth > 0 && !!strokeColor;
      fillAllLines();
      if (hasStroke) {
        drawStrokeTextLines(renderCtx, wrappedLines, lineXs, lineYs, strokeColor, strokeWidth, textAlign, charSpacingPx);
      }
      drawTextDecorations(renderCtx, {
        underline: !!(props.underline ?? element.underline),
        linethrough: !!(props.linethrough ?? element.linethrough),
        textColor,
        textAlign,
        lineXs,
        lineYs,
        lineWs,
        fontSize
      });
    }
    if (hadShadow && tmpCanvas) {
      const dw = tmpCanvas.width / elemSxAbs;
      const dh = tmpCanvas.height / elemSyAbs;
      const halfPxW = Math.round(tmpCanvas.width / 2) / elemSxAbs;
      const halfPxH = Math.round(tmpCanvas.height / 2) / elemSyAbs;
      applyShadow(ctx);
      ctx.drawImage(
        tmpCanvas,
        -halfPxW,
        -halfPxH,
        dw,
        dh
      );
      disableShadow(ctx);
    }
  }
  /**
   * 查找当前时间对应的字幕（二分搜索 + lastHit 缓存）
   */
  findCaptionAt(timeSec, captions) {
    if (captions !== this.captionIndexSource) {
      this.captionIndex = new CaptionIndex(captions);
      this.captionIndexSource = captions;
    }
    return this.captionIndex.findAt(timeSec);
  }
  /**
   * 渲染字幕叠加层 — 委托给 captionTextRenderer 适配器
   */
  renderCaptionsOverlay(ctx, canvasWidth, canvasHeight, timeSec, captions, style, animation, captionScaleX = 1, captionScaleY = 1) {
    const current = this.findCaptionAt(timeSec, captions);
    if (!current) return;
    const currentTimeMs = timeSec * 1e3;
    const captionStartMs = srtTimeToMs(current.startTime);
    const captionEndMs = srtTimeToMs(current.endTime);
    const defaultColor = style?.fontColor ?? "#FFFFFF";
    const animState = calculateCaptionAnimationState(
      currentTimeMs,
      captionStartMs,
      captionEndMs,
      current.text || "",
      animation,
      defaultColor,
      canvasHeight,
      current.wordTimings
    );
    if (animState.opacity <= 0) return;
    const charWidthCache = this._charWidthCache;
    const fns = {
      wrapText: (c, t, maxWidth, spacingPx) => this.getWrappedText(c, t, maxWidth, spacingPx),
      measureLineWidth: (c, line, spacingPx) => this.cachedMeasureWidth(c, line, spacingPx),
      getCharWidth: (c, fontSpec, char) => this.measureCharWidth(c, fontSpec, char, charWidthCache),
      measureTextMetrics: (c, fontSize) => this.cachedTextMetrics(c, fontSize)
    };
    renderCaptionTextServer(
      ctx,
      current.text || "",
      canvasWidth,
      canvasHeight,
      style,
      animState,
      fns,
      captionScaleX,
      captionScaleY
    );
  }
  /**
   * 绘制渐变背景（与前端 TimelineRenderer.drawGradientBackground 一致）
   */
  drawGradientBackground(ctx, canvasWidth, canvasHeight, gradientString) {
    try {
      if (gradientString.includes("linear-gradient")) {
        const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        const colors = gradientString.match(/#[0-9a-fA-F]{6}/g) || [];
        colors.forEach((color, index) => {
          gradient.addColorStop(index / Math.max(1, colors.length - 1), color);
        });
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      } else if (gradientString.includes("radial-gradient")) {
        const gradient = ctx.createRadialGradient(
          canvasWidth / 2,
          canvasHeight / 2,
          0,
          canvasWidth / 2,
          canvasHeight / 2,
          Math.max(canvasWidth, canvasHeight) / 2
        );
        const colors = gradientString.match(/#[0-9a-fA-F]{6}/g) || [];
        colors.forEach((color, index) => {
          gradient.addColorStop(index / Math.max(1, colors.length - 1), color);
        });
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      } else {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
    } catch (error) {
      console.warn("[ServerRenderExporter] Failed to draw gradient background:", error);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
  }
  /**
   * 渲染模糊背景（与前端 TimelineRenderer.renderBlurBackground 一致）
   * 找到第一个视频/图片元素，cover-fit 绘制到离屏画布，然后模糊覆盖到主画布
   */
  async renderBlurBackground(ctx, outWidth, outHeight, activeElements, time, blurIntensity, resolvedPaths, imageLoader, videoExtractor, offCanvas, offCtx) {
    const bgCandidate = activeElements.find(
      ({ element: element2 }) => (element2.type === "video" || element2.type === "image") && element2.src
    );
    if (!bgCandidate) return;
    const element = bgCandidate.element;
    const localPath = resolvedPaths.get(element.src);
    if (!localPath) return;
    if (!offCanvas || !offCtx) {
      offCanvas = new Canvas(outWidth, outHeight);
      offCtx = offCanvas.getContext("2d");
    } else {
      offCtx.clearRect(0, 0, outWidth, outHeight);
    }
    try {
      let sourceImg;
      if (element.type === "video") {
        const localTimeRaw = time - element.startTime + element.trimStart;
        const visibleDuration = Math.max(0, element.duration - element.trimStart - element.trimEnd);
        const clampedLocalTime = Math.min(Math.max(0, localTimeRaw), Math.max(0, visibleDuration - 1e-3));
        const targetMediaTime = this.getTargetMediaTime(element, clampedLocalTime);
        sourceImg = await videoExtractor.extractFrame(localPath, Math.max(0, targetMediaTime));
      } else {
        sourceImg = await imageLoader.load(localPath);
      }
      const imgW = sourceImg.naturalWidth ?? sourceImg.width;
      const imgH = sourceImg.naturalHeight ?? sourceImg.height;
      const imgAspect = imgW / imgH;
      const canvasAspect = outWidth / outHeight;
      let drawWidth, drawHeight, drawX, drawY;
      if (imgAspect > canvasAspect) {
        drawHeight = outHeight;
        drawWidth = drawHeight * imgAspect;
        drawX = (outWidth - drawWidth) / 2;
        drawY = 0;
      } else {
        drawWidth = outWidth;
        drawHeight = drawWidth / imgAspect;
        drawX = 0;
        drawY = (outHeight - drawHeight) / 2;
      }
      offCtx.drawImage(sourceImg, drawX, drawY, drawWidth, drawHeight);
      ctx.save();
      try {
        ctx.filter = `blur(${Math.max(0, blurIntensity)}px)`;
      } catch {
      }
      ctx.drawImage(offCanvas, 0, 0);
      ctx.restore();
      try {
        ctx.filter = "none";
      } catch {
      }
    } catch (err) {
      console.warn("[ServerRenderExporter] Failed to render blur background:", err);
    }
  }
  /**
   * 使用 FFmpeg 将帧序列 + 音频编码为视频
   */
  encodeVideo(framesDir, audioPath, outputPath, fps, bitrate, _format, width = 1920, height = 1080) {
    return new Promise((resolve3, reject) => {
      const encoderArgs = buildEncoderArgs(bitrate, fps, width, height);
      const args = [
        "-framerate",
        String(fps),
        "-i",
        path4.join(framesDir, "frame_%06d.jpg")
      ];
      if (audioPath) {
        args.push("-i", audioPath);
      }
      args.push(...encoderArgs);
      if (audioPath) {
        args.push("-c:a", "aac", "-b:a", "192k");
      }
      args.push(
        "-movflags",
        "+faststart",
        "-y",
        outputPath
      );
      const proc = spawnProcess("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] });
      proc.stderr.on("data", () => {
      });
      proc.on("close", (code) => {
        if (code === 0) {
          resolve3();
        } else {
          reject(new Error(`FFmpeg encoding failed (code ${code})`));
        }
      });
      proc.on("error", (err) => {
        reject(new Error(`FFmpeg spawn error: ${err.message}`));
      });
    });
  }
};

// ../../server/src/cli/render-video.ts
function printHelp() {
  console.log(`
Usage: tsx src/cli/render-video.ts <input.json> [options]

Arguments:
  <input.json>           Path to JSON file containing canvasState

Options:
  -o, --output <path>    Output file path (default: ./output/video-<timestamp>.mp4)
  --fps <number>         Frame rate (default: 30)
  --quality <level>      low | medium | high | very_high (default: medium)
  --format <fmt>         mp4 | mov | mp3 (default: mp4)
  --width <number>       Override output width
  --height <number>      Override output height
  -q, --quiet            Suppress progress output
  -h, --help             Show help

Input JSON format:
  Full submit payload:
    { "canvasState": {...}, "outputFormat": {...}, "resolution": {...} }

  Or bare canvasState (outputFormat defaults applied):
    { "width": 1920, "height": 1080, "elements": [...], ... }
  `.trim());
}
function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    printHelp();
    process.exit(0);
  }
  const opts = {
    inputPath: "",
    fps: 30,
    quality: "medium",
    format: "mp4",
    quiet: false
  };
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "-o":
      case "--output":
        opts.outputPath = args[++i];
        break;
      case "--fps":
        opts.fps = parseInt(args[++i], 10);
        break;
      case "--quality":
        opts.quality = args[++i];
        break;
      case "--format":
        opts.format = args[++i];
        break;
      case "--width":
        opts.width = parseInt(args[++i], 10);
        break;
      case "--height":
        opts.height = parseInt(args[++i], 10);
        break;
      case "-q":
      case "--quiet":
        opts.quiet = true;
        break;
      default:
        if (arg.startsWith("-")) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        opts.inputPath = arg;
        break;
    }
    i++;
  }
  if (!opts.inputPath) {
    console.error("Error: input JSON file path is required.");
    printHelp();
    process.exit(1);
  }
  return opts;
}
async function main() {
  const opts = parseArgs(process.argv);
  const inputPath = path5.resolve(opts.inputPath);
  if (!fs5.existsSync(inputPath)) {
    console.error(`Error: file not found: ${inputPath}`);
    process.exit(1);
  }
  let raw;
  try {
    raw = JSON.parse(fs5.readFileSync(inputPath, "utf-8"));
  } catch (e) {
    console.error(`Error: invalid JSON in ${inputPath}`);
    process.exit(1);
  }
  const isFullPayload = raw.canvasState && typeof raw.canvasState === "object";
  const canvasState = isFullPayload ? raw.canvasState : raw;
  const payloadOutputFormat = isFullPayload ? raw.outputFormat : void 0;
  const payloadResolution = isFullPayload ? raw.resolution : void 0;
  const outputFormat = {
    fps: opts.fps || payloadOutputFormat?.fps || 30,
    quality: opts.quality || payloadOutputFormat?.quality || "medium",
    format: opts.format || payloadOutputFormat?.format || "mp4"
  };
  const resolution = opts.width && opts.height ? { width: opts.width, height: opts.height } : payloadResolution || void 0;
  const outputDir = path5.resolve("./output");
  if (!fs5.existsSync(outputDir)) {
    fs5.mkdirSync(outputDir, { recursive: true });
  }
  const ext = outputFormat.format === "mp3" ? "mp3" : outputFormat.format;
  const outputPath = opts.outputPath ? path5.resolve(opts.outputPath) : path5.join(outputDir, `video-${Date.now()}.${ext}`);
  const outputParent = path5.dirname(outputPath);
  if (!fs5.existsSync(outputParent)) {
    fs5.mkdirSync(outputParent, { recursive: true });
  }
  if (!opts.quiet) {
    const w = resolution?.width || canvasState.width || 1920;
    const h = resolution?.height || canvasState.height || 1080;
    console.log(`Input:      ${inputPath}`);
    console.log(`Output:     ${outputPath}`);
    console.log(`Resolution: ${w}x${h}`);
    console.log(`FPS:        ${outputFormat.fps}`);
    console.log(`Quality:    ${outputFormat.quality}`);
    console.log(`Format:     ${outputFormat.format}`);
    console.log();
  }
  FontRegistry.registerGoogleFonts();
  const onProgress = opts.quiet ? void 0 : (progress, stage) => {
    process.stdout.write(`\r[${String(Math.floor(progress)).padStart(3)}%] ${stage}${"".padEnd(20)}`);
    if (progress >= 100) console.log();
  };
  const startTime = Date.now();
  const exporter = new ServerRenderExporter();
  try {
    const result = await exporter.export(canvasState, outputFormat, resolution, onProgress);
    if (result !== outputPath) {
      fs5.copyFileSync(result, outputPath);
      try {
        fs5.unlinkSync(result);
      } catch {
      }
    }
    const elapsed = ((Date.now() - startTime) / 1e3).toFixed(1);
    const size = (fs5.statSync(outputPath).size / (1024 * 1024)).toFixed(1);
    if (!opts.quiet) {
      console.log();
      console.log(`Done in ${elapsed}s`);
      console.log(`Output: ${outputPath} (${size} MB)`);
    } else {
      console.log(outputPath);
    }
  } catch (error) {
    console.error();
    console.error("Export failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
main();
