const app = document.getElementById("app");

// Landing page listing every demo declared in config/demos.json, each
// linking to the generic test runner (test.html) with that demo's config.
// Adding a new test type to the live demo list is then just: implement the
// test type (src/testtypes/), write a config/demo-<id>.json, and add one
// entry here — no other code changes needed.
async function main() {
  const demos = await fetch("config/demos.json").then((r) => r.json());

  const cards = demos
    .map(
      (d) => `
      <div class="demo-card">
        <h2>${d.label}</h2>
        <p>${d.description}</p>
        <a class="button-link" href="test.html?config=${encodeURIComponent(d.config)}">Try demo</a>
      </div>
    `
    )
    .join("");

  app.innerHTML = `
    <div class="screen">
      <h1>WASMOS</h1>
      <p>A WebAssembly-based listening test app, primarily following ITU-T P.800. Pick a test type below to try a live demo, entirely in your browser — nothing is installed or sent anywhere.</p>
      ${cards}
    </div>
  `;
}

main();
