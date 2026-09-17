# WASMOS

WASMOS is a listening-test application, primarily following ITU-T P.800, with planned support for other methodologies (e.g. MUSHRA). Its core novelty is running on WebAssembly so it can be deployed without a dedicated application server (static hosting is sufficient).

## Status

Early design phase. Key decisions so far:

- Audio playback and DSP run via the Web Audio API, with WASM-compiled codecs/DSP where needed (e.g. via AudioWorklet).
- No absolute SPL calibration; instead, a pre-test training session lets participants adjust volume to a comfortable level.
- A short delay is inserted between a "click to begin" gesture and stimulus playback, to avoid mouse-click noise interfering with the stimulus.
- Result transmission threat model is "honest-but-curious" participants; lightweight keyed encryption over HTTPS is sufficient. Backend/transport choice is deferred until the UI/test-runner is working.

## License

MIT — see [LICENSE](LICENSE).
