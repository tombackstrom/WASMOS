const app = document.getElementById("app");

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
