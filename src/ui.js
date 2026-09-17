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

export function renderItem({ index, total, scale, itemLabel = "Item" }, handlers) {
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
      <div class="progress">${itemLabel} ${index + 1} of ${total}</div>
      <h2>Listen and rate</h2>
      <div class="play-row">
        <button id="playBtn">Play sound</button>
      </div>
      <div class="scale" id="scale">
        ${scaleButtons}
      </div>
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
  document.getElementById("downloadBtn").addEventListener("click", onDownload);
}
