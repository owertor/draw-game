// ZzFX minimal sound engine — no external dependency
// https://github.com/KilledByAPixel/ZzFX (MIT)

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return ctx;
}

function zzfx(
  volume = 1, randomness = 0.05, frequency = 220, attack = 0, sustain = 0,
  release = 0.1, shape = 0, shapeCurve = 1, slide = 0, deltaSlide = 0,
  pitchJump = 0, pitchJumpTime = 0, repeatTime = 0, noise = 0, modulation = 0,
  bitCrush = 0, delay = 0, sustainVolume = 1, decay = 0, tremolo = 0
) {
  const ac = getCtx();
  if (!ac) return;

  const sampleRate = ac.sampleRate;
  const lengthSeconds = attack + decay + sustain + release;
  const length = Math.ceil(sampleRate * lengthSeconds) || 1;
  const buffer = ac.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  let phase = 0, freq = frequency, amp = 0, jumpPhase = 0;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Envelope
    if (t < attack) amp = t / attack;
    else if (t < attack + decay) amp = 1 - (1 - sustainVolume) * (t - attack) / decay;
    else if (t < attack + decay + sustain) amp = sustainVolume;
    else amp = sustainVolume * (1 - (t - attack - decay - sustain) / release);

    freq = frequency + slide * t + deltaSlide * t * t;
    if (pitchJump && t > pitchJumpTime) { freq += pitchJump; pitchJump = 0; }
    phase += freq / sampleRate;

    let s = Math.sin(phase * Math.PI * 2);
    if (shape === 1) s = s > 0 ? 1 : -1; // square
    if (shape === 2) s = (phase % 1) * 2 - 1; // sawtooth
    if (shape === 3) s = Math.abs((phase % 1) * 2 - 1) * 2 - 1; // triangle
    if (noise) s += (Math.random() * 2 - 1) * noise;
    if (tremolo) amp *= 1 - Math.sin(t * tremolo * Math.PI * 2) * 0.5;

    data[i] = s * amp * volume * (1 + (Math.random() * 2 - 1) * randomness);
  }

  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.connect(ac.destination);
  src.start();
}

export const Sounds = {
  correct: () => zzfx(0.7, 0, 520, 0, 0.05, 0.2, 0, 1.5, 2, 0, 200, 0.1, 0, 0, 0, 0, 0, 1),
  tick: ()    => zzfx(0.3, 0, 440, 0, 0,    0.06, 1, 1,   0, 0, 0,   0,   0, 0, 0, 0, 0, 1),
  fail: ()    => zzfx(0.5, 0, 180, 0, 0.05, 0.3,  2, 1,  -3, 0, 0,   0,   0, 0, 0, 0, 0, 1),
  start: ()   => zzfx(0.4, 0, 300, 0, 0,    0.15, 0, 1.2, 1, 0, 100, 0.05,0, 0, 0, 0, 0, 1),
};
