// Utility for 30-minute rotating exam tokens and Anti-Cheat Web Audio Alarm

export const TOKEN_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

// Unambiguous uppercase alphanumeric characters (no 0/O, 1/I/L)
const TOKEN_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Generates a deterministic 6-character token for a task that changes every 30 minutes.
 */
export function generateTaskToken(taskId: string, timestampMs: number = Date.now()): string {
  const timeSlot = Math.floor(timestampMs / TOKEN_INTERVAL_MS);
  const rawInput = `${taskId}::SMAN21_EXAM_TOKEN::${timeSlot}`;

  // FNV-1a inspired multiple-pass hash for uniform distribution
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < rawInput.length; i++) {
    const ch = rawInput.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + i * 31;
    h2 = Math.imul(h2, 0x85ebca6b);
  }

  let token = '';
  let combined = (h1 >>> 0) ^ (h2 >>> 0);
  for (let i = 0; i < 6; i++) {
    const idx = Math.abs((combined + i * 17) ^ (h1 >>> (i * 3))) % TOKEN_CHARS.length;
    token += TOKEN_CHARS[idx];
    combined = Math.imul(combined ^ (h2 >>> i), 0x27d4eb2d) >>> 0;
  }

  return token;
}

/**
 * Validates a student-submitted token against the task's current 30-minute token.
 */
export function verifyTaskToken(taskId: string, inputToken: string, timestampMs: number = Date.now()): boolean {
  if (!inputToken || !taskId) return false;
  const normalized = inputToken.trim().toUpperCase();
  const currentToken = generateTaskToken(taskId, timestampMs);
  return normalized === currentToken;
}

/**
 * Returns remaining milliseconds and formatted MM:SS until the current 30-minute token rotates.
 */
export function getTokenTimeRemaining(timestampMs: number = Date.now()): {
  remainingMs: number;
  remainingSeconds: number;
  formatted: string;
  progressPercent: number;
} {
  const elapsedInSlot = timestampMs % TOKEN_INTERVAL_MS;
  const remainingMs = TOKEN_INTERVAL_MS - elapsedInSlot;
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = Math.min(100, Math.max(0, (remainingMs / TOKEN_INTERVAL_MS) * 100));

  return {
    remainingMs,
    remainingSeconds: totalSeconds,
    formatted,
    progressPercent
  };
}

/**
 * Web Audio API Anti-Cheat Siren Alarm Controller
 */
class AntiCheatAlarmController {
  private audioCtx: AudioContext | null = null;
  private intervalId: number | null = null;
  private isPlaying = false;

  public startAlarm() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx && AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      let highTone = true;
      const playBeep = () => {
        if (!this.isPlaying || !this.audioCtx) return;
        try {
          if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
          }
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(highTone ? 960 : 620, this.audioCtx.currentTime);
          highTone = !highTone;

          gain.gain.setValueAtTime(0.35, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.35);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start();
          osc.stop(this.audioCtx.currentTime + 0.36);
        } catch (e) {
          console.warn('Alarm beep error:', e);
        }
      };

      playBeep();
      this.intervalId = window.setInterval(playBeep, 400);

      // Voice warning via Web Speech API if supported
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
          'Peringatan! Anda terdeteksi membuka aplikasi lain saat mengerjakan soal. Segera kembali ke halaman ujian!'
        );
        utterance.lang = 'id-ID';
        utterance.rate = 1.05;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.warn('Could not start audio alarm:', err);
    }
  }

  public stopAlarm() {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public getStatus() {
    return this.isPlaying;
  }
}

export const antiCheatAlarm = new AntiCheatAlarmController();
