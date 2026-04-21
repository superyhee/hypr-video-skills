// autoTracks + track/animation/keyframe/transition/caption helpers

// ─── Auto Track Builder ─────────────────────────────────────────────────────

const _trackTypeOrder = ["effect", "text", "shape", "image", "gif", "video", "svg", "audio"];

function _overlaps(a, b) {
  return a.timeFrame.start < b.timeFrame.end && b.timeFrame.start < a.timeFrame.end;
}

export function autoTracks(elements) {
  // Group elements by their type
  const groups = {};
  for (const el of elements) {
    const t = el.type;
    if (!groups[t]) groups[t] = [];
    groups[t].push(el);
  }

  const tracks = [];

  // Process each type in display order
  for (const type of _trackTypeOrder) {
    const els = groups[type];
    if (!els || els.length === 0) continue;

    // Bin-pack into non-overlapping lanes
    const lanes = [];
    for (const el of els) {
      let placed = false;
      for (const lane of lanes) {
        const hasOverlap = lane.some(existing => _overlaps(existing, el));
        if (!hasOverlap) {
          lane.push(el);
          placed = true;
          break;
        }
      }
      if (!placed) {
        lanes.push([el]);
      }
    }

    // Create a track per lane
    for (let i = 0; i < lanes.length; i++) {
      const suffix = lanes.length > 1 ? `_${i + 1}` : "";
      const trackId = `t_${type}${suffix}`;
      const trackName = `${type.charAt(0).toUpperCase() + type.slice(1)}${suffix ? ` ${i + 1}` : ""}`;
      tracks.push({
        id: trackId,
        name: trackName,
        type,
        elementIds: lanes[i].map(el => el.id),
        isVisible: true,
      });
    }
  }

  return tracks;
}

export function makeTrack(id, name, type, elementIds) {
  return { id, name, type, elementIds, isVisible: true };
}

export function makeAnim(id, targetId, type, duration, group, { easing = "easeOut", ...properties } = {}) {
  return { id, targetId, type, duration, group, easing, properties };
}

export function makeKfTrack(id, targetId, propertyType, keyframes, { layerIndex } = {}) {
  return { id, targetId, propertyType, enabled: true, ...(layerIndex != null && { layerIndex }), keyframes };
}

export function makeKf(id, time, properties, easing = "easeOut") {
  return { id, time, properties, easing };
}

export function makeTransition(id, trackId, sourceElementId, targetElementId, type, duration, { easing = "easeInOut" } = {}) {
  return { id, trackId, sourceElementId, targetElementId, type, duration, easing };
}

/** startTime/endTime: SRT format "HH:MM:SS.mmm". wordTimings[].start/end in seconds (float). */
export function makeCaption(id, startTime, endTime, text, { wordTimings } = {}) {
  let wt;
  if (wordTimings && wordTimings.length > 0) {
    let charIdx = 0;
    wt = wordTimings.map((w, i) => {
      const wordStart = charIdx;
      charIdx += w.word.length + (i < wordTimings.length - 1 ? 1 : 0); // +1 for space
      return {
        word: w.word,
        startMs: Math.round(w.start * 1000),
        endMs: Math.round(w.end * 1000),
        charStartIndex: wordStart,
        charEndIndex: wordStart + w.word.length,
      };
    });
  }
  return { id, startTime, endTime, text, ...(wt && { wordTimings: wt }) };
}
