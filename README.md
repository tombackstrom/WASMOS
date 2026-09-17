# WASMOS

WASMOS is a listening-test application, primarily following ITU-T P.800, with support for other methodologies (MUSHRA, per ITU-R BS.1534). Its core novelty is running on WebAssembly so it can be deployed without a dedicated application server (static hosting is sufficient).

**Live demo:** [tombackstrom.github.io/WASMOS](https://tombackstrom.github.io/WASMOS/)

## Running it

No build step or install required — it's plain JS/HTML/CSS loaded as native ES modules. Because browsers block `fetch()` from `file://` pages, serve the folder over local HTTP:

```sh
python3 -m http.server 8000
```

then open `http://localhost:8000/` — a landing page listing every demo in [config/demos.json](config/demos.json), each linking to [test.html](test.html) (the actual test runner) with that demo's config passed as a `?config=` URL parameter. The same page is deployed live via GitHub Pages at [tombackstrom.github.io/WASMOS](https://tombackstrom.github.io/WASMOS/), and the whole folder can be deployed as-is to any other static host too. Note: the results encryption (below) uses the browser's Web Crypto API, which only works in a "secure context" — `localhost` and any `https://` deployment are fine, but a plain `http://` server on another machine will not work.

A test is defined by a config file (e.g. [config/demo-acr.json](config/demo-acr.json)) — human-readable JSON listing the test type, scale, instructions, and items. Items can be `{"type": "tone", "frequency": ...}` (synthesized, no assets needed) or `{"type": "file", "src": "..."}` for a real audio file.

### Test types and adding a new one

The `testType` field in a config (`"acr"`, `"dcr"`, `"ccr"`, or `"mushra"`) selects which methodology runs the test — each is a small plugin module under [src/testtypes/](src/testtypes/) implementing the same interface (item shape, default rating scale, and how to render/play/collect one item), registered in [src/testtypes/index.js](src/testtypes/index.js). `acr.js` presents one stimulus per item; `dcr.js` and `ccr.js` both present an A/B pair per item via the shared `renderPairItem` in [src/ui.js](src/ui.js) (configurable button labels/heading), but differ in scale and framing: DCR always plays reference-then-test and rates degradation on a 1–5 scale, while CCR treats A and B as an unordered pair and rates B relative to A on a 7-point, signed (-3 to +3) scale — either can be "better." `mushra.js` is structurally different again: one item is a *scene* — a labeled reference plus several unlabeled stimuli (shuffled display order, rendered by `renderMushraItem`), each rated independently on its own continuous 0–100 slider, played at least once before its slider unlocks.

MUSHRA needs multiple ratings per item instead of one, but that needed no changes to the results/encryption schema: each stimulus in a scene is recorded through the same single-scalar `onRate(itemId, rating)` as everything else, just with a composite id — `"<item.id>::ref"` for the hidden reference, `"<item.id>::anchor"` for the hidden low-anchor, `"<item.id>::<conditionId>"` for each named condition. `results.js`, `crypto.js`, and the whole Python analysis pipeline stay generic across all four test types as a result.

To add a new methodology:
1. Implement `src/testtypes/<name>.js` with `{ id, label, description, defaultScale, async runItems(items, config, { itemLabel, allowSkip, onRate }) }`, reusing or adding a render function in [src/ui.js](src/ui.js) for however that methodology presents an item.
2. Register it in `src/testtypes/index.js`.
3. Write `config/demo-<name>.json` and add an entry to `config/demos.json` so it shows up on the landing page.

Operators picking a methodology for their own study just set `testType` in their config — no code changes needed for `acr`/`dcr`/`ccr`/`mushra`.

The demo config currently uses real audio: [sounds/soundsample.wav](sounds/soundsample.wav) mixed with white and pink noise at a few SNRs, plus a 3.5 kHz low-pass version for the MUSHRA hidden anchor, via [scripts/generate_demo_sounds.py](scripts/generate_demo_sounds.py) (requires numpy). Replace `soundsample.wav` and re-run the script to regenerate the demo stimuli from a different source recording:

```sh
python3 scripts/generate_demo_sounds.py
```

## Analyzing results

Python tooling under [scripts/](scripts/) (install with `pip install -r scripts/requirements.txt`) decrypts and analyzes downloaded results:

- `python3 scripts/decrypt_results.py <file.json>` — decrypt and print one results file.
- `python3 scripts/extract_results.py <results_dir> <out.csv>` — decrypt and combine a whole directory of results files into one tidy CSV (one row per participant/item rating, background fields flattened as columns).
- `python3 scripts/generate_synthetic_results.py` — generates fabricated results for 50 listeners each on the ACR, DCR, CCR, and MUSHRA demo tests, in the app's exact encrypted format, into `analysis/demo_results/`. Useful for testing/demonstrating the analysis pipeline without real participants.
- [scripts/wasmos_analysis.py](scripts/wasmos_analysis.py) is the shared library behind all three (mirrors `src/crypto.js`'s scheme exactly) — import `load_results_dir` / `load_result_file` directly for custom analysis.

[analysis/results_analysis.ipynb](analysis/results_analysis.ipynb) is a demo notebook that loads `analysis/demo_results/{acr,dcr,ccr,mushra}` and visualizes them (mean rating per condition with confidence intervals, a diverging chart for CCR's signed comparison scale, MUSHRA's per-stimulus chart plus a hidden-reference listener-screening check, white-vs-pink-noise comparison, rating spread, listener leniency). To analyze real results, point its `ACR_DIR`/`DCR_DIR`/`CCR_DIR`/`MUSHRA_DIR` variables at a directory of downloaded results files instead. `analysis/demo_results/` holds **synthetic, fabricated data only** — not real listener responses.

## Status

Implemented: a minimal end-to-end P.800 ACR (Absolute Category Rating) flow — privacy notice/consent screen, welcome screen, an operator-configurable background questionnaire (e.g. age, language skills — skipped entirely if left empty), a configurable set of practice samples (for volume adjustment and previewing the range of sounds, with a skip option for expert users), randomized item presentation with the click-to-play delay, 5-point rating scale, and JSON results download.

Also implemented: DCR (Degradation Category Rating), CCR (Comparison Category Rating), and MUSHRA test types, alongside ACR — see "Test types" below. Live demos of all four are listed on the landing page. Also implemented: Python tooling to decrypt/extract/analyze results, with a demo Jupyter notebook and synthetic data — see "Analyzing results" below.

MUSHRA also has a clickable/draggable waveform of the reference (canvas-drawn from the decoded audio buffer): a click seeks, a drag selects a region, and either confines playback — of the reference *and every stimulus in the scene* — to that window, so a listener can zoom in on one problematic segment and compare it consistently across all conditions. **This waveform feature is being developed on the `feature/mushra` branch** before merging forward; the rest of MUSHRA is already on `main`.

The privacy notice (a config's `privacyNotice` block) is a GDPR-structured **template**, not vetted legal advice — have it reviewed by your institution's data protection office before running a real study, and fill in `operatorName`/`operatorContact`/`studyPurpose`/`retentionPeriod` for your specific study.

Key design decisions so far:

- Audio playback and DSP run via the Web Audio API, with WASM-compiled codecs/DSP where needed (e.g. via AudioWorklet).
- No absolute SPL calibration; instead, a pre-test training session lets participants adjust volume to a comfortable level.
- A short delay is inserted between a "click to begin" gesture and stimulus playback, to avoid mouse-click noise interfering with the stimulus.
- Result transmission threat model is "honest-but-curious" participants; lightweight keyed encryption over HTTPS is sufficient. Backend/transport choice is deferred until the UI/test-runner is working.
- Downloaded results are a human-readable JSON file with only the `rating` field encrypted (AES-GCM, key derived from `testId` + `participantId`, both left in plain text in the same file) — a participant can inspect the rest of the file to see exactly what's being sent, while casual viewers can't read scores at a glance. The scheme is intentionally open (see [src/crypto.js](src/crypto.js)); operators can decrypt with `python3 scripts/decrypt_results.py <file>`.

## License

MIT — see [LICENSE](LICENSE).
