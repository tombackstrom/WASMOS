let audioCtx = null;
const bufferCache = new Map();

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

async function playFile(ctx, src, startTime) {
  const buffer = await loadFileBuffer(src);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(startTime);
  return new Promise((resolve) => {
    source.onended = resolve;
  });
}

// Schedules playback `clickDelayMs` after the calling gesture, so the
// physical sound of the triggering mouse click has decayed before the
// stimulus starts (see project decision on click-to-begin delay).
export async function playItem(item, clickDelayMs) {
  const ctx = getAudioContext();
  const startTime = ctx.currentTime + clickDelayMs / 1000;

  if (item.type === "tone") {
    await playTone(ctx, item.frequency, startTime, item.duration ?? 1.5);
  } else if (item.type === "file") {
    await playFile(ctx, item.src, startTime);
  } else {
    throw new Error(`Unknown item type: ${item.type}`);
  }
}
