let audioCtx = null;
const bufferCache = new Map();
let currentSource = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

async function loadFileBuffer(src) {
  if (bufferCache.has(src)) return bufferCache.get(src);
  const ctx = getAudioContext();
  const response = await fetch(src);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  bufferCache.set(src, audioBuffer);
  return audioBuffer;
}

function playTone(ctx, frequency, startTime, duration) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = frequency;
  osc.connect(gain);
  gain.connect(ctx.destination);

  const fade = Math.min(0.02, duration / 4);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.3, startTime + fade);
  gain.gain.setValueAtTime(0.3, startTime + duration - fade);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration);

  return new Promise((resolve) => {
    osc.onended = resolve;
  });
}

async function playFile(ctx, src, startTime, region, loop) {
  const buffer = await loadFileBuffer(src);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  currentSource = source;

  const offset = region ? Math.max(0, Math.min(region.start, buffer.duration)) : 0;
  const end = region ? Math.max(offset, Math.min(region.end, buffer.duration)) : buffer.duration;

  if (loop) {
    // Loop points, not a `duration` argument to start(): passing a duration
    // alongside loop=true would still cut playback off after that long.
    source.loop = true;
    source.loopStart = offset;
    source.loopEnd = end;
    source.start(startTime, offset);
    return; // Loops until stopPlayback() is called; nothing to await.
  }

  source.start(startTime, offset, end - offset);
  return new Promise((resolve) => {
    source.onended = () => {
      if (currentSource === source) currentSource = null;
      resolve();
    };
  });
}

// Stops whatever is currently playing (including a looped clip started via
// playItem(..., loop=true)). Safe to call when nothing is playing.
export function stopPlayback() {
  if (!currentSource) return;
  try {
    currentSource.stop();
  } catch {
    // Already stopped/ended.
  }
  currentSource = null;
}

// Schedules playback `clickDelayMs` after the calling gesture, so the
// physical sound of the triggering mouse click has decayed before the
// stimulus starts (see project decision on click-to-begin delay).
// `region` (optional, {start, end} in seconds) confines playback of a
// "file" item to that window — used by MUSHRA's waveform selector.
// `loop` (optional, "file" items only) repeats `region` (or the whole
// clip) until stopPlayback() is called; the returned promise then
// resolves as soon as playback starts, not when it ends.
export async function playItem(item, clickDelayMs, region, loop = false) {
  const ctx = getAudioContext();
  const startTime = ctx.currentTime + clickDelayMs / 1000;

  if (item.type === "tone") {
    await playTone(ctx, item.frequency, startTime, item.duration ?? 1.5);
  } else if (item.type === "file") {
    await playFile(ctx, item.src, startTime, region, loop);
  } else {
    throw new Error(`Unknown item type: ${item.type}`);
  }
}

// Exposes the decoded buffer for waveform drawing (cached, so this doesn't
// re-fetch/re-decode if the item is also played via playItem).
export async function getBuffer(src) {
  return loadFileBuffer(src);
}
