const app = document.getElementById("app");

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

export function renderTraining({ items, allowSkip }, handlers) {
  const itemRows = items
    .map(
      (_, i) => `
      <div class="play-row">
        <button class="training-play" data-index="${i}">Play sample ${i + 1}</button>
      </div>
    `
    )
    .join("");

  app.innerHTML = `
    <div class="screen">
      <h2>Practice samples</h2>
      <p>
        Play the samples below to get a sense of the range of sounds you'll
        hear, and adjust your device's volume to a comfortable listening
        level. These samples are not scored — play them as many times as you
        like.
      </p>
      ${itemRows}
      <div class="actions">
        ${allowSkip ? '<button id="skipBtn">Skip practice</button>' : ""}
        <button class="primary" id="continueBtn" disabled>Continue to test</button>
      </div>
    </div>
  `;

  const continueBtn = document.getElementById("continueBtn");

  document.querySelectorAll(".training-play").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      await handlers.onPlay(Number(btn.dataset.index));
      btn.disabled = false;
      continueBtn.disabled = false;
    });
  });

  continueBtn.addEventListener("click", () => handlers.onContinue());

  if (allowSkip) {
    document
      .getElementById("skipBtn")
      .addEventListener("click", () => handlers.onContinue());
  }
}

export function renderItem({ index, total, scale }, handlers) {
  const scaleButtons = scale
    .map(
      (s) => `
      <button class="rating" data-value="${s.value}" disabled>
        <span class="value">${s.value}</span>
        <span class="label">${s.label}</span>
      </button>
    `
    )
    .join("");

  app.innerHTML = `
    <div class="screen">
      <div class="progress">Item ${index + 1} of ${total}</div>
      <h2>Listen and rate</h2>
      <div class="play-row">
        <button id="playBtn">Play sound</button>
      </div>
      <div class="scale" id="scale">
        ${scaleButtons}
      </div>
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
  document.getElementById("downloadBtn").addEventListener("click", onDownload);
}
