// Internal animation & keyframe extraction utilities
// Used by elements.mjs (attachInline) and build.mjs (extractInline)

let _autoId = 0;
function _uid(prefix) { return `${prefix}_${++_autoId}`; }

export function _attachInline(el, { animIn, animOut, animLoop, kf } = {}) {
  if (animIn) el._animIn = animIn;
  if (animOut) el._animOut = animOut;
  if (animLoop) el._animLoop = animLoop;
  if (kf) el._kf = kf;
  return el;
}

export function _extractInline(elements, externalAnims = [], externalKf = []) {
  const anims = [...externalAnims];
  const kfTracks = [...externalKf];

  for (const el of elements) {
    const id = el.id;

    // animIn: ["blurIn", 1200] or ["blurIn", 1200, "easeOutElastic"]
    if (el._animIn) {
      const [type, dur, easing = "easeOut"] = el._animIn;
      anims.push({ id: _uid("ai"), targetId: id, type, duration: dur, group: "in", easing, properties: {} });
    }
    // animOut: ["fadeOut", 700] or ["fadeOut", 700, "easeIn"]
    if (el._animOut) {
      const [type, dur, easing = "easeIn"] = el._animOut;
      anims.push({ id: _uid("ao"), targetId: id, type, duration: dur, group: "out", easing, properties: {} });
    }
    // animLoop: ["pulse", 2000] or ["pulse", 2000, "easeInOut"]
    if (el._animLoop) {
      const [type, dur, easing = "easeInOut"] = el._animLoop;
      anims.push({ id: _uid("al"), targetId: id, type, duration: dur, group: "loop", easing, properties: {} });
    }

    // kf: { scale: { dur, amp }, opacity: { dur, amp }, position: { dur, dx, dy } }
    // or custom: { scale: [[0, {scaleX:1}], [3000, {scaleX:1.02}], ...] }
    if (el._kf) {
      for (const [prop, cfg] of Object.entries(el._kf)) {
        if (Array.isArray(cfg)) {
          // Custom keyframes: [[time, props, easing?], ...]
          const kfs = cfg.map((kf, i) => ({
            id: _uid("kf"), time: kf[0], properties: kf[1], easing: kf[2] ?? "easeInOut",
          }));
          kfTracks.push({ id: _uid("kt"), targetId: id, propertyType: prop, enabled: true, keyframes: kfs });
        } else {
          // Shortcut presets
          const { dur, amp, dx, dy, cycles } = cfg;
          const n = cycles ?? Math.max(2, Math.round(dur / 3000));
          const kfs = [];

          if (prop === "scale") {
            for (let i = 0; i <= n * 2; i++) {
              const t = Math.round((dur / (n * 2)) * i);
              const v = i % 2 === 0 ? 1 : 1 + (amp ?? 0.02);
              kfs.push({ id: _uid("kf"), time: t, properties: { scaleX: v, scaleY: v }, easing: "easeInOut" });
            }
          } else if (prop === "opacity") {
            for (let i = 0; i <= n * 2; i++) {
              const t = Math.round((dur / (n * 2)) * i);
              const v = i % 2 === 0 ? 1 : 1 - (amp ?? 0.18);
              kfs.push({ id: _uid("kf"), time: t, properties: { opacity: v }, easing: "easeInOut" });
            }
          } else if (prop === "position") {
            const ex = el.placement?.x ?? 0;
            const ey = el.placement?.y ?? 0;
            for (let i = 0; i <= n * 2; i++) {
              const t = Math.round((dur / (n * 2)) * i);
              const moved = i % 2 !== 0;
              kfs.push({ id: _uid("kf"), time: t, properties: { x: ex + (moved ? (dx ?? 0) : 0), y: ey + (moved ? (dy ?? 0) : 0) }, easing: "easeInOut" });
            }
          }

          if (kfs.length) {
            kfTracks.push({ id: _uid("kt"), targetId: id, propertyType: prop, enabled: true, keyframes: kfs });
          }
        }
      }
    }

    // Clean up temporary properties before passing to renderer
    delete el._animIn;
    delete el._animOut;
    delete el._animLoop;
    delete el._kf;
  }

  return { animations: anims, keyframeTracks: kfTracks };
}
