# WASMOS

WASMOS is a listening-test application, primarily following ITU-T P.800, with planned support for other methodologies (e.g. MUSHRA). Its core novelty is running on WebAssembly so it can be deployed without a dedicated application server (static hosting is sufficient).

## Running it

No build step or install required — it's plain JS/HTML/CSS loaded as native ES modules. Because browsers block `fetch()` from `file://` pages, serve the folder over local HTTP:

```sh
python3 -m http.server 8000
```

then open `http://localhost:8000/`. The same folder can be deployed as-is to any static host (e.g. GitHub Pages).

The test itself is defined in [config/test-config.json](config/test-config.json) — a human-readable file listing the scale, instructions, and items. The current items are synthesized placeholder tones (no audio assets needed yet); swap an item to `{"type": "file", "src": "..."}` to use a real audio file instead.

## Status

Implemented: a minimal end-to-end P.800 ACR (Absolute Category Rating) flow — welcome screen, a configurable set of practice samples (for volume adjustment and previewing the range of sounds, with a skip option for expert users), randomized item presentation with the click-to-play delay, 5-point rating scale, and JSON results download.

Key design decisions so far:

- Audio playback and DSP run via the Web Audio API, with WASM-compiled codecs/DSP where needed (e.g. via AudioWorklet).
- No absolute SPL calibration; instead, a pre-test training session lets participants adjust volume to a comfortable level.
- A short delay is inserted between a "click to begin" gesture and stimulus playback, to avoid mouse-click noise interfering with the stimulus.
- Result transmission threat model is "honest-but-curious" participants; lightweight keyed encryption over HTTPS is sufficient. Backend/transport choice is deferred until the UI/test-runner is working.

## License

MIT — see [LICENSE](LICENSE).
