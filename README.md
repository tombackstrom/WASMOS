# WASMOS

WASMOS is a listening-test application, primarily following ITU-T P.800, with planned support for other methodologies (e.g. MUSHRA). Its core novelty is running on WebAssembly so it can be deployed without a dedicated application server (static hosting is sufficient).

## Running it

No build step or install required — it's plain JS/HTML/CSS loaded as native ES modules. Because browsers block `fetch()` from `file://` pages, serve the folder over local HTTP:

```sh
python3 -m http.server 8000
```

then open `http://localhost:8000/` — a landing page listing every demo in [config/demos.json](config/demos.json), each linking to [test.html](test.html) (the actual test runner) with that demo's config passed as a `?config=` URL parameter. The whole folder can be deployed as-is to any static host (e.g. GitHub Pages: currently skipped since the repo is private — GitHub Pages for private repos needs a paid plan). Note: the results encryption (below) uses the browser's Web Crypto API, which only works in a "secure context" — `localhost` and any `https://` deployment are fine, but a plain `http://` server on another machine will not work.

A test is defined by a config file (e.g. [config/demo-acr.json](config/demo-acr.json)) — human-readable JSON listing the test type, scale, instructions, and items. Items can be `{"type": "tone", "frequency": ...}` (synthesized, no assets needed) or `{"type": "file", "src": "..."}` for a real audio file.

### Test types and adding a new one

The `testType` field in a config (`"acr"` or `"dcr"`) selects which methodology runs the test — each is a small plugin module under [src/testtypes/](src/testtypes/) implementing the same interface (item shape, default rating scale, and how to render/play/collect one item), registered in [src/testtypes/index.js](src/testtypes/index.js). `acr.js` presents one stimulus per item; `dcr.js` presents a reference+test pair per item. Everything else (privacy notice, background questions, practice round with skip, results/encryption/download) is shared and test-type-agnostic.

To add a new methodology (e.g. MUSHRA):
1. Implement `src/testtypes/<name>.js` with `{ id, label, description, defaultScale, async runItems(items, config, { itemLabel, allowSkip, onRate }) }`, reusing or adding a render function in [src/ui.js](src/ui.js) for however that methodology presents an item.
2. Register it in `src/testtypes/index.js`.
3. Write `config/demo-<name>.json` and add an entry to `config/demos.json` so it shows up on the landing page.

Operators picking a methodology for their own study just set `testType` in their config — no code changes needed for `acr`/`dcr`.

The demo config currently uses real audio: [sounds/soundsample.wav](sounds/soundsample.wav) mixed with white and pink noise at a few SNRs via [scripts/generate_demo_sounds.py](scripts/generate_demo_sounds.py) (requires numpy). Replace `soundsample.wav` and re-run the script to regenerate the demo stimuli from a different source recording:

```sh
python3 scripts/generate_demo_sounds.py
```

## Analyzing results

Python tooling under [scripts/](scripts/) (install with `pip install -r scripts/requirements.txt`) decrypts and analyzes downloaded results:

- `python3 scripts/decrypt_results.py <file.json>` — decrypt and print one results file.
- `python3 scripts/extract_results.py <results_dir> <out.csv>` — decrypt and combine a whole directory of results files into one tidy CSV (one row per participant/item rating, background fields flattened as columns).
- `python3 scripts/generate_synthetic_results.py` — generates fabricated results for 50 listeners each on the ACR and DCR demo tests, in the app's exact encrypted format, into `analysis/demo_results/`. Useful for testing/demonstrating the analysis pipeline without real participants.
- [scripts/wasmos_analysis.py](scripts/wasmos_analysis.py) is the shared library behind all three (mirrors `src/crypto.js`'s scheme exactly) — import `load_results_dir` / `load_result_file` directly for custom analysis.

[analysis/results_analysis.ipynb](analysis/results_analysis.ipynb) is a demo notebook that loads `analysis/demo_results/{acr,dcr}` and visualizes them (mean rating per condition with confidence intervals, white-vs-pink-noise comparison, rating spread, listener leniency). To analyze real results, point its `ACR_DIR`/`DCR_DIR` variables at a directory of downloaded results files instead. `analysis/demo_results/` holds **synthetic, fabricated data only** — not real listener responses.

## Status

Implemented: a minimal end-to-end P.800 ACR (Absolute Category Rating) flow — privacy notice/consent screen, welcome screen, an operator-configurable background questionnaire (e.g. age, language skills — skipped entirely if left empty), a configurable set of practice samples (for volume adjustment and previewing the range of sounds, with a skip option for expert users), randomized item presentation with the click-to-play delay, 5-point rating scale, and JSON results download.

Also implemented: a DCR (Degradation Category Rating) test type, alongside ACR — see "Test types" below. Live demos of both are listed on the landing page. Also implemented: Python tooling to decrypt/extract/analyze results, with a demo Jupyter notebook and synthetic data — see "Analyzing results" below.

The privacy notice (a config's `privacyNotice` block) is a GDPR-structured **template**, not vetted legal advice — have it reviewed by your institution's data protection office before running a real study, and fill in `operatorName`/`operatorContact`/`studyPurpose`/`retentionPeriod` for your specific study.

Key design decisions so far:

- Audio playback and DSP run via the Web Audio API, with WASM-compiled codecs/DSP where needed (e.g. via AudioWorklet).
- No absolute SPL calibration; instead, a pre-test training session lets participants adjust volume to a comfortable level.
- A short delay is inserted between a "click to begin" gesture and stimulus playback, to avoid mouse-click noise interfering with the stimulus.
- Result transmission threat model is "honest-but-curious" participants; lightweight keyed encryption over HTTPS is sufficient. Backend/transport choice is deferred until the UI/test-runner is working.
- Downloaded results are a human-readable JSON file with only the `rating` field encrypted (AES-GCM, key derived from `testId` + `participantId`, both left in plain text in the same file) — a participant can inspect the rest of the file to see exactly what's being sent, while casual viewers can't read scores at a glance. The scheme is intentionally open (see [src/crypto.js](src/crypto.js)); operators can decrypt with `python3 scripts/decrypt_results.py <file>`.

## License

MIT — see [LICENSE](LICENSE).
