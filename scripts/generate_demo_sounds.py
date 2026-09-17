"""Generates the demo listening-test stimuli in sounds/ from sounds/soundsample.wav
by mixing in white and pink noise at a few SNRs. Requires numpy. Re-run after
replacing soundsample.wav to regenerate all derived files:

    python3 scripts/generate_demo_sounds.py
"""

import os
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SOUNDS_DIR = os.path.join(HERE, "..", "sounds")
SRC = os.path.join(SOUNDS_DIR, "soundsample.wav")


def read_wav_mono_float(path):
    with wave.open(path, "rb") as w:
        assert w.getsampwidth() == 2, "expected 16-bit PCM"
        n = w.getnframes()
        fr = w.getframerate()
        raw = w.readframes(n)
        data = np.frombuffer(raw, dtype=np.int16).astype(np.float64)
        if w.getnchannels() == 2:
            data = data.reshape(-1, 2).mean(axis=1)
        return data / 32768.0, fr


def write_wav_mono_int16(path, signal, fr):
    peak = np.max(np.abs(signal))
    if peak > 0:
        # normalize to -1 dBFS peak to avoid clipping while keeping levels comparable
        target_peak = 10 ** (-1 / 20)
        signal = signal * (target_peak / peak)
    ints = np.clip(signal * 32767, -32768, 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(fr)
        w.writeframes(ints.tobytes())


def white_noise(n, seed):
    return np.random.default_rng(seed).normal(0, 1, n)


def pink_noise(n, seed):
    white = np.random.default_rng(seed).normal(0, 1, n)
    spec = np.fft.rfft(white)
    freqs = np.fft.rfftfreq(n)
    freqs[0] = freqs[1]  # avoid divide-by-zero at DC
    spec = spec / np.sqrt(freqs)
    pink = np.fft.irfft(spec, n)
    return pink / np.std(pink)


def mix_at_snr(signal, noise, snr_db):
    sig_rms = np.sqrt(np.mean(signal**2))
    noise_rms = np.sqrt(np.mean(noise**2))
    target_noise_rms = sig_rms / (10 ** (snr_db / 20))
    scaled_noise = noise * (target_noise_rms / noise_rms)
    return signal + scaled_noise


def lowpass(signal, fr, cutoff_hz=3500):
    """Brick-wall low-pass via FFT — the standard MUSHRA hidden-anchor
    treatment is a reference low-passed at 3.5 kHz."""
    spec = np.fft.rfft(signal)
    freqs = np.fft.rfftfreq(len(signal), d=1 / fr)
    spec[freqs > cutoff_hz] = 0
    return np.fft.irfft(spec, len(signal))


def main():
    signal, fr = read_wav_mono_float(SRC)
    n = len(signal)

    write_wav_mono_int16(os.path.join(SOUNDS_DIR, "item_clean.wav"), signal, fr)
    write_wav_mono_int16(os.path.join(SOUNDS_DIR, "practice_clean.wav"), signal, fr)

    conditions = [
        ("item_white_20db.wav", white_noise(n, 101), 20),
        ("item_white_5db.wav", white_noise(n, 102), 5),
        ("item_pink_20db.wav", pink_noise(n, 201), 20),
        ("item_pink_5db.wav", pink_noise(n, 202), 5),
        ("practice_white.wav", white_noise(n, 103), 15),
        ("practice_pink.wav", pink_noise(n, 203), 15),
    ]
    for fname, noise, snr in conditions:
        mixed = mix_at_snr(signal, noise, snr)
        write_wav_mono_int16(os.path.join(SOUNDS_DIR, fname), mixed, fr)

    # MUSHRA hidden low-anchor: reference low-passed at 3.5 kHz.
    write_wav_mono_int16(os.path.join(SOUNDS_DIR, "item_anchor_lp35.wav"), lowpass(signal, fr), fr)
    write_wav_mono_int16(os.path.join(SOUNDS_DIR, "practice_anchor_lp35.wav"), lowpass(signal, fr), fr)

    print(f"Wrote {2 + len(conditions) + 2} files to {SOUNDS_DIR}")


if __name__ == "__main__":
    main()
