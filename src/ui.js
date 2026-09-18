const app = document.getElementById("app");

// Draws a min/max envelope waveform into `canvas` for `buffer` (an
// AudioBuffer), with an optional {start, end} (seconds) selection
// highlighted.
function drawWaveform(canvas, buffer, selection) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const data = buffer.getChannelData(0);
  const step = Math.max(1, Math.ceil(data.length / width));
  const mid = height / 2;

  ctx.clearRect(0, 0, width, height);

  if (selection) {
    const x0 = (selection.start / buffer.duration) * width;
    const x1 = (selection.end / buffer.duration) * width;
    ctx.fillStyle = "rgba(37, 99, 235, 0.18)";
    ctx.fillRect(x0, 0, x1 - x0, height);
  }

  ctx.strokeStyle = "#2563eb";
  ctx.beginPath();
  for (let x = 0; x < width; x++) {
    const start = x * step;
    const end = Math.min(start + step, data.length);
    let min = 0;
    let max = 0;
    for (let i = start; i < end; i++) {
      const v = data[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    ctx.moveTo(x + 0.5, mid + min * mid);
    ctx.lineTo(x + 0.5, mid + max * mid);
  }
  ctx.stroke();
}

// Wires up click/drag selection on a waveform canvas: a plain click seeks
// (plays from that point to the end), a drag selects a region (plays only
// that window). Calls onChange(selection | null) as the selection changes.
function setupWaveformInteraction(canvas, buffer, onChange) {
  let dragStartX = null;

  function timeAtClientX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * buffer.duration;
  }

  canvas.addEventListener("pointerdown", (e) => {
    dragStartX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (dragStartX === null) return;
    const start = Math.min(timeAtClientX(dragStartX), timeAtClientX(e.clientX));
    const end = Math.max(timeAtClientX(dragStartX), timeAtClientX(e.clientX));
    onChange({ start, end });
  });

  canvas.addEventListener("pointerup", (e) => {
    if (dragStartX === null) return;
    const draggedPixels = Math.abs(e.clientX - dragStartX);
    if (draggedPixels < 5) {
      // A plain click: seek to this point, play to the end of the clip.
      onChange({ start: timeAtClientX(e.clientX), end: buffer.duration });
    } else {
      const start = Math.min(timeAtClientX(dragStartX), timeAtClientX(e.clientX));
      const end = Math.max(timeAtClientX(dragStartX), timeAtClientX(e.clientX));
      onChange({ start, end });
    }
    dragStartX = null;
  });
}

function renderScaleButtons(scale) {
  const buttons = scale
    .map(
      (s) => `
      <button class="rating" data-value="${s.value}" disabled>
        <span class="value">${s.displayValue ?? s.value}</span>
        <span class="label">${s.label}</span>
      </button>
    `
    )
    .join("");
  return `<div class="scale" id="scale">${buttons}</div>`;
}

export function renderPrivacyNotice(notice, onAccept) {
  const {
    operatorName = "the study operator",
    operatorContact = "",
    studyPurpose = "this research study",
    retentionPeriod = "as long as needed for the study, and no longer",
  } = notice ?? {};

  const contactLine = operatorContact ? ` (${operatorContact})` : "";

  app.innerHTML = `
    <div class="screen">
      <h1>Privacy notice</h1>
      <p>This listening test is run by <strong>${operatorName}</strong>${contactLine} for the purpose of ${studyPurpose}.</p>
      <p><strong>What is collected:</strong> the ratings you give for each sound sample, timestamps, and any background information (e.g. age, language skills) requested on the next screens. This app does not access your microphone or camera, and does not record audio or video of you.</p>
      <p><strong>Legal basis:</strong> your data is processed on the basis of your consent (GDPR Art. 6(1)(a)).</p>
      <p><strong>Storage and retention:</strong> your results are saved to a file on your own device, which you then send to the operator yourself. Data will be kept for ${retentionPeriod}.</p>
      <p><strong>Your rights:</strong> participation is voluntary. You may withdraw at any time, for any reason and without consequence, simply by closing this page before sending your results. You have the right to access, correct, or request deletion of your data, and to lodge a complaint with a data protection supervisory authority. To exercise these rights, contact ${operatorContact || operatorName}.</p>
      <label class="consent-label">
        <input type="checkbox" id="consentCheckbox" />
        <span>I have read and understood this notice, and I consent to take part in this study.</span>
      </label>
      <div class="actions">
        <button class="primary" id="acceptBtn" disabled>Continue</button>
      </div>
    </div>
  `;

  const acceptBtn = document.getElementById("acceptBtn");
  document.getElementById("consentCheckbox").addEventListener("change", (e) => {
    acceptBtn.disabled = !e.target.checked;
  });
  acceptBtn.addEventListener("click", () => onAccept());
}

export function renderBackgroundQuestions(questions, onSubmit) {
  const fields = questions
    .map((q) => {
      const required = q.required !== false;
      if (q.type === "select") {
        const options = q.options
          .map((opt) => `<option value="${opt}">${opt}</option>`)
          .join("");
        return `
          <label>
            ${q.label}
            <select id="q_${q.id}" ${required ? "required" : ""}>
              <option value="" disabled selected>Select…</option>
              ${options}
            </select>
          </label>
        `;
      }
      const inputType = q.type === "number" ? "number" : "text";
      return `
        <label>
          ${q.label}
          <input type="${inputType}" id="q_${q.id}" ${required ? "required" : ""} />
        </label>
      `;
    })
    .join("");

  app.innerHTML = `
    <div class="screen">
      <h2>About you</h2>
      <p>This information helps interpret the test results. It is not used to identify you.</p>
      <form id="bgForm">
        ${fields}
        <div class="actions">
          <button class="primary" type="submit">Continue</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById("bgForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const answers = {};
    questions.forEach((q) => {
      answers[q.id] = document.getElementById(`q_${q.id}`).value;
    });
    onSubmit(answers);
  });
}

export function renderWelcome({ title, instructions }, onStart) {
  app.innerHTML = `
    <div class="screen">
      <h1>${title}</h1>
      <p>${instructions}</p>
      <label>
        Participant ID
        <input type="text" id="participantId" placeholder="e.g. your initials" />
      </label>
      <div class="actions">
        <button class="primary" id="startBtn">Start</button>
      </div>
    </div>
  `;

  document.getElementById("startBtn").addEventListener("click", () => {
    const raw = document.getElementById("participantId").value.trim();
    const participantId = raw || `p-${Date.now()}`;
    onStart(participantId);
  });
}

export function renderItem({ index, total, scale, itemLabel = "Item" }, handlers) {
  app.innerHTML = `
    <div class="screen">
      <div class="progress">${itemLabel} ${index + 1} of ${total}</div>
      <h2>Listen and rate</h2>
      <div class="play-row">
        <button id="playBtn">Play sound</button>
      </div>
      ${renderScaleButtons(scale)}
      ${handlers.onSkip ? '<div class="actions"><button id="skipBtn">Skip training</button></div>' : ""}
    </div>
  `;

  const playBtn = document.getElementById("playBtn");
  playBtn.addEventListener("click", async () => {
    playBtn.disabled = true;
    await handlers.onPlay();
    playBtn.disabled = false;
    document
      .querySelectorAll("#scale button")
      .forEach((btn) => (btn.disabled = false));
  });

  document.querySelectorAll("#scale button").forEach((btn) => {
    btn.addEventListener("click", () => {
      handlers.onRate(Number(btn.dataset.value));
    });
  });

  if (handlers.onSkip) {
    document.getElementById("skipBtn").addEventListener("click", () => handlers.onSkip());
  }
}

// A generic A/B pair per item (DCR's reference+test, CCR's comparison pair,
// etc.), rated after both sides have been played at least once.
export function renderPairItem(
  {
    index,
    total,
    scale,
    itemLabel = "Item",
    heading = "Listen and rate",
    description = "",
    playALabel = "Play A",
    playBLabel = "Play B",
  },
  handlers
) {
  app.innerHTML = `
    <div class="screen">
      <div class="progress">${itemLabel} ${index + 1} of ${total}</div>
      <h2>${heading}</h2>
      ${description ? `<p>${description}</p>` : ""}
      <div class="play-row">
        <button id="playABtn">${playALabel}</button>
        <button id="playBBtn">${playBLabel}</button>
      </div>
      ${renderScaleButtons(scale)}
      ${handlers.onSkip ? '<div class="actions"><button id="skipBtn">Skip training</button></div>' : ""}
    </div>
  `;

  let aPlayed = false;
  let bPlayed = false;
  function maybeEnableScale() {
    if (!aPlayed || !bPlayed) return;
    document.querySelectorAll("#scale button").forEach((btn) => (btn.disabled = false));
  }

  const playABtn = document.getElementById("playABtn");
  playABtn.addEventListener("click", async () => {
    playABtn.disabled = true;
    await handlers.onPlayA();
    playABtn.disabled = false;
    aPlayed = true;
    maybeEnableScale();
  });

  const playBBtn = document.getElementById("playBBtn");
  playBBtn.addEventListener("click", async () => {
    playBBtn.disabled = true;
    await handlers.onPlayB();
    playBBtn.disabled = false;
    bPlayed = true;
    maybeEnableScale();
  });

  document.querySelectorAll("#scale button").forEach((btn) => {
    btn.addEventListener("click", () => {
      handlers.onRate(Number(btn.dataset.value));
    });
  });

  if (handlers.onSkip) {
    document.getElementById("skipBtn").addEventListener("click", () => handlers.onSkip());
  }
}

// MUSHRA: a labeled reference plus a set of unlabeled stimuli (which may
// include a hidden copy of the reference and a hidden low-anchor), each
// rated on its own continuous 0-100 slider. `stimuli` is `[{ key, label }]`
// in already-shuffled display order; `bands` are the 5 MUSHRA quality-band
// labels shown under each slider. If `handlers.getReferenceBuffer` is given,
// a waveform of the reference is drawn and can be clicked/dragged to focus
// playback (of the reference AND every stimulus) on a specific region.
export function renderMushraItem({ index, total, itemLabel = "Item", bands, stimuli }, handlers) {
  const bandLabels = bands.map((b) => `<span>${b.label}</span>`).join("");

  const rows = stimuli
    .map(
      (s) => `
      <div class="mushra-row">
        <div class="mushra-row-header">
          <span class="mushra-row-label">${s.label}</span>
          <div class="mushra-row-controls">
            <span class="mushra-value" data-key="${s.key}">50</span>
            <button class="mushra-play" data-key="${s.key}">Play</button>
          </div>
        </div>
        <input type="range" class="mushra-slider" data-key="${s.key}" min="0" max="100" value="50" disabled />
        <div class="mushra-bands">${bandLabels}</div>
      </div>
    `
    )
    .join("");

  app.innerHTML = `
    <div class="screen">
      <div class="progress">${itemLabel} ${index + 1} of ${total}</div>
      <h2>Rate each sound against the reference</h2>
      <p>Play the reference as many times as you like. Then play and rate each sound below, from 0 (bad) to 100 (excellent), compared to the reference.</p>
      ${
        handlers.getReferenceBuffer
          ? `
      <div class="waveform-wrap">
        <canvas id="waveformCanvas" class="waveform-canvas" height="80"></canvas>
        <div class="waveform-controls">
          <span id="waveformHint" class="waveform-hint">Loading waveform…</span>
          <button id="resetSelectionBtn" class="small" disabled>Play full clip</button>
        </div>
      </div>`
          : ""
      }
      <div class="play-row">
        <button id="playRefBtn">Play reference</button>
        <button id="stopBtn" disabled>Stop</button>
        <label class="loop-toggle">
          <input type="checkbox" id="loopToggle" /> Loop
        </label>
      </div>
      <div class="mushra-grid">${rows}</div>
      <div class="actions">
        ${handlers.onSkip ? '<button id="skipBtn">Skip training</button>' : ""}
        <button class="primary" id="continueBtn" disabled>Continue</button>
      </div>
    </div>
  `;

  let selection = null; // {start, end} in seconds, or null = full clip

  if (handlers.getReferenceBuffer) {
    const canvas = document.getElementById("waveformCanvas");
    const resetBtn = document.getElementById("resetSelectionBtn");
    const hint = document.getElementById("waveformHint");
    canvas.width = canvas.clientWidth || 640;

    handlers.getReferenceBuffer().then((buffer) => {
      drawWaveform(canvas, buffer, selection);
      hint.textContent = "Click to seek, or drag to select a region — applies to every sound below.";
      setupWaveformInteraction(canvas, buffer, (sel) => {
        selection = sel;
        resetBtn.disabled = !sel;
        drawWaveform(canvas, buffer, sel);
      });

      resetBtn.addEventListener("click", () => {
        selection = null;
        resetBtn.disabled = true;
        drawWaveform(canvas, buffer, null);
      });
    });
  }

  const playRefBtn = document.getElementById("playRefBtn");
  const stopBtn = document.getElementById("stopBtn");
  const loopToggle = document.getElementById("loopToggle");
  const playButtons = [playRefBtn, ...document.querySelectorAll(".mushra-play")];

  // "idle" | "oneshot" | "loop". A one-shot play blocks every other Play
  // button until it finishes (nothing to switch to mid-clip). A loop instead
  // leaves them live, so clicking a different sample switches the loop to
  // it — handled in startPlayback() below via an implicit stop-then-start.
  let playState = "idle";

  function applyPlayState() {
    const busy = playState === "oneshot";
    playButtons.forEach((b) => (b.disabled = busy));
    loopToggle.disabled = busy;
    stopBtn.disabled = playState === "idle";
  }

  async function startPlayback(play) {
    const loop = loopToggle.checked;
    if (playState === "loop") {
      handlers.onStop(); // switching samples: stop the loop already running
    }
    playState = loop ? "loop" : "oneshot";
    applyPlayState();
    await play(loop);
    if (playState === "oneshot") {
      playState = "idle";
      applyPlayState();
    }
  }

  stopBtn.addEventListener("click", () => {
    handlers.onStop();
    playState = "idle";
    applyPlayState();
  });

  playRefBtn.addEventListener("click", () => startPlayback((loop) => handlers.onPlayReference(selection, loop)));

  const continueBtn = document.getElementById("continueBtn");
  const played = new Set();
  function maybeEnableContinue() {
    if (played.size === stimuli.length) continueBtn.disabled = false;
  }

  document.querySelectorAll(".mushra-play").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.key;
      startPlayback((loop) => handlers.onPlayStimulus(key, selection, loop)).then(() => {
        played.add(key);
        document.querySelector(`.mushra-slider[data-key="${key}"]`).disabled = false;
        maybeEnableContinue();
      });
    });
  });

  document.querySelectorAll(".mushra-slider").forEach((slider) => {
    const valueEl = document.querySelector(`.mushra-value[data-key="${slider.dataset.key}"]`);
    slider.addEventListener("input", () => {
      valueEl.textContent = slider.value;
    });
  });

  continueBtn.addEventListener("click", () => {
    handlers.onStop();
    const ratings = {};
    document.querySelectorAll(".mushra-slider").forEach((slider) => {
      ratings[slider.dataset.key] = Number(slider.value);
    });
    handlers.onSubmit(ratings);
  });

  if (handlers.onSkip) {
    document.getElementById("skipBtn").addEventListener("click", () => {
      handlers.onStop();
      handlers.onSkip();
    });
  }
}

export function renderTrainingComplete(handlers) {
  app.innerHTML = `
    <div class="screen">
      <h2>Practice complete</h2>
      <p>The real test starts now — your ratings from this point on will be recorded.</p>
      <div class="actions">
        <button id="retryBtn">Try practice again</button>
        <button class="primary" id="startTestBtn">Start test</button>
      </div>
    </div>
  `;

  document.getElementById("retryBtn").addEventListener("click", () => handlers.onRetry());
  document.getElementById("startTestBtn").addEventListener("click", () => handlers.onStartTest());
}

export function renderEnd(onDownload) {
  app.innerHTML = `
    <div class="screen">
      <h2>Thank you</h2>
      <p>You have completed the listening test. Please download your results and send the file to the test operator.</p>
      <div class="actions">
        <button class="primary" id="downloadBtn">Download results</button>
      </div>
    </div>
  `;
  const downloadBtn = document.getElementById("downloadBtn");
  downloadBtn.addEventListener("click", async () => {
    downloadBtn.disabled = true;
    downloadBtn.textContent = "Preparing…";
    await onDownload();
    downloadBtn.disabled = false;
    downloadBtn.textContent = "Download results";
  });
}
