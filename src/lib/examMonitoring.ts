import { supabase } from './supabase';

export interface ViolationLogItem {
  time: string;
  reason: string;
}

export interface LocalExamProgress {
  taskId: string;
  studentId: string;
  answers: Record<number, string>;
  violationCount: number;
  violationLogs: ViolationLogItem[];
  updatedAt: string;
}

const DEVICE_TOKEN_KEY = 'sman21_exam_device_token';

/**
 * Generates or retrieves a persistent device/browser session token.
 * Used to detect if a student is resuming on the same device vs switching devices without a Reset Login.
 */
export function getOrCreateDeviceSessionToken(): string {
  try {
    let token = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (!token) {
      token = 'DEV_' + Math.random().toString(36).substring(2, 10).toUpperCase() + '_' + Date.now().toString(36).toUpperCase();
      localStorage.setItem(DEVICE_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return 'DEV_FALLBACK';
  }
}

function getLocalProgressKey(studentId: string, taskId: string): string {
  return `sman21_exam_progress_${studentId}_${taskId}`;
}

/**
 * Saves student exam progress immediately to localStorage as an offline safety net.
 */
export function saveLocalExamProgress(
  studentId: string,
  taskId: string,
  answers: Record<number, string>,
  violationCount: number = 0,
  violationLogs: ViolationLogItem[] = []
): void {
  try {
    const payload: LocalExamProgress = {
      taskId,
      studentId,
      answers,
      violationCount,
      violationLogs,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(getLocalProgressKey(studentId, taskId), JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Reads any locally cached exam progress for a student + task.
 */
export function getLocalExamProgress(studentId: string, taskId: string): LocalExamProgress | null {
  try {
    const raw = localStorage.getItem(getLocalProgressKey(studentId, taskId));
    if (!raw) return null;
    return JSON.parse(raw) as LocalExamProgress;
  } catch {
    return null;
  }
}

/**
 * Clears local exam draft once exam is officially Reset from 0 by Teacher.
 */
export function clearLocalExamProgress(studentId: string, taskId: string): void {
  try {
    localStorage.removeItem(getLocalProgressKey(studentId, taskId));
  } catch {
    // Ignore
  }
}

/**
 * Normalizes and merges answers from Supabase DB and localStorage so no answered question is ever lost.
 */
export function normalizeAndMergeAnswers(
  dbAnswers: any,
  localAnswers?: Record<number, string> | null
): Record<number, string> {
  const merged: Record<number, string> = {};

  if (dbAnswers && typeof dbAnswers === 'object') {
    Object.keys(dbAnswers).forEach(k => {
      const idx = Number(k);
      const val = String(dbAnswers[k] ?? '');
      if (!Number.isNaN(idx) && val.trim() !== '') {
        merged[idx] = val;
      }
    });
  }

  if (localAnswers && typeof localAnswers === 'object') {
    Object.keys(localAnswers).forEach(k => {
      const idx = Number(k);
      const val = String(localAnswers[idx] ?? '');
      // Keep non-empty local answers if not already in DB or if updated locally
      if (!Number.isNaN(idx) && val.trim() !== '' && !merged[idx]) {
        merged[idx] = val;
      }
    });
  }

  return merged;
}

/**
 * Counts how many valid non-empty answers a student has saved.
 */
export function countAnsweredQuestions(answers: any): number {
  if (!answers || typeof answers !== 'object') return 0;
  return Object.keys(answers).filter(k => {
    const val = answers[k];
    return val !== undefined && val !== null && String(val).trim() !== '';
  }).length;
}

/**
 * Syncs student's in-progress exam state (answers, violations, heartbeat, session lock) to Supabase.
 */
export async function syncExamProgressToSupabase(params: {
  taskId: string;
  studentId: string;
  answers: Record<number, string>;
  violationCount: number;
  violationLogs: ViolationLogItem[];
  sessionToken: string;
  isLocked?: boolean;
}): Promise<{ data: any | null; error: any | null }> {
  if (!supabase) return { data: null, error: new Error('Supabase belum siap') };

  const {
    taskId,
    studentId,
    answers,
    violationCount,
    violationLogs,
    sessionToken,
    isLocked = false
  } = params;

  const nowIso = new Date().toISOString();

  // Save to localStorage first
  saveLocalExamProgress(studentId, taskId, answers, violationCount, violationLogs);

  try {
    // Check existing submission row
    const { data: existing } = await supabase
      .from('task_submissions')
      .select('*')
      .eq('task_id', taskId)
      .eq('student_id', studentId)
      .maybeSingle();

    // If teacher already finished this exam from Monitoring, do not overwrite with in_progress!
    if (existing && (existing.status === 'graded' || existing.status === 'submitted' || existing.status === 'completed')) {
      return { data: existing, error: null };
    }

    const mergedAnswers = normalizeAndMergeAnswers(existing?.answers, answers);
    // Apply latest current answers on top of existing
    Object.keys(answers).forEach(k => {
      const idx = Number(k);
      mergedAnswers[idx] = answers[idx];
    });

    const fullPayload: Record<string, any> = {
      task_id: taskId,
      student_id: studentId,
      answers: mergedAnswers,
      status: 'in_progress',
      session_token: sessionToken,
      is_locked: isLocked,
      violation_count: Math.max(Number(existing?.violation_count || 0), violationCount),
      violation_logs:
        Array.isArray(violationLogs) && violationLogs.length > 0
          ? violationLogs
          : existing?.violation_logs || [],
      last_active_at: nowIso,
      updated_at: nowIso,
      feedback: `Sedang mengerjakan (${countAnsweredQuestions(mergedAnswers)} soal terjawab)`
    };

    if (!existing) {
      fullPayload.started_at = nowIso;
      fullPayload.score = null;
      const { data, error } = await supabase
        .from('task_submissions')
        .insert([fullPayload])
        .select('*')
        .maybeSingle();

      if (!error) return { data, error: null };

      // Fallback if any extended column is still refreshing in cache
      const fallbackPayload = {
        task_id: taskId,
        student_id: studentId,
        answers: mergedAnswers,
        score: null,
        status: 'in_progress',
        feedback: fullPayload.feedback
      };
      const { data: fbData, error: fbErr } = await supabase
        .from('task_submissions')
        .insert([fallbackPayload])
        .select('*')
        .maybeSingle();
      return { data: fbData, error: fbErr };
    } else {
      const { data, error } = await supabase
        .from('task_submissions')
        .update(fullPayload)
        .eq('id', existing.id)
        .select('*')
        .maybeSingle();

      if (!error) return { data, error: null };

      const fallbackPayload = {
        answers: mergedAnswers,
        status: 'in_progress',
        feedback: fullPayload.feedback
      };
      const { data: fbData, error: fbErr } = await supabase
        .from('task_submissions')
        .update(fallbackPayload)
        .eq('id', existing.id)
        .select('*')
        .maybeSingle();
      return { data: fbData, error: fbErr };
    }
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Calculates PG score, checks Essay questions, and formats feedback.
 */
export function calculateExamResult(
  questions: any[],
  answers: Record<number, string>,
  violationCount: number = 0,
  finishedByGuru: boolean = false
): {
  finalScore: number | null;
  calculatedPgScore: number;
  hasEssay: boolean;
  finalStatus: 'graded' | 'submitted';
  feedback: string;
  answeredCount: number;
  totalQuestions: number;
} {
  const safeQuestions = Array.isArray(questions) ? questions : [];
  const totalQuestions = safeQuestions.length;
  const pointsPerQuestion = totalQuestions > 0 ? 100 / totalQuestions : 0;
  let calculatedScore = 0;
  let hasEssay = false;

  for (let i = 0; i < safeQuestions.length; i++) {
    const q = safeQuestions[i];
    const ans = answers[i] ?? (answers as any)[String(i)] ?? '';

    if (q.type === 'pg') {
      const isCorrect = String(ans).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
      if (isCorrect) {
        calculatedScore += pointsPerQuestion;
      }
    } else if (q.type === 'essay') {
      hasEssay = true;
    }
  }

  const roundedPgScore = Math.min(100, Math.round(calculatedScore));
  const finalScore = hasEssay ? roundedPgScore : roundedPgScore;
  const finalStatus: 'graded' | 'submitted' = hasEssay ? 'submitted' : 'graded';
  const answeredCount = countAnsweredQuestions(answers);

  const antiCheatSummary =
    violationCount > 0
      ? ` [Catatan Pengawas: Terdeteksi ${violationCount}x keluar aplikasi/tab saat ujian]`
      : ' [Pengawas Ujian: Jujur / 0 Pelanggaran]';

  const finishedByNote = finishedByGuru
    ? ` [Diselesaikan oleh Guru melalui Monitoring Ujian (${answeredCount}/${totalQuestions} soal terjawab)]`
    : '';

  const baseFeedback = hasEssay
    ? `Jawaban dikumpulkan (${answeredCount}/${totalQuestions} soal terjawab, Skor PG sementara: ${roundedPgScore}). Menunggu koreksi esai Guru.`
    : `Skor Pilihan Ganda Otomatis: ${roundedPgScore} (${answeredCount}/${totalQuestions} soal terjawab).`;

  return {
    finalScore,
    calculatedPgScore: roundedPgScore,
    hasEssay,
    finalStatus,
    feedback: baseFeedback + finishedByNote + antiCheatSummary,
    answeredCount,
    totalQuestions
  };
}

/**
 * Allows the Teacher to finish/submit a student's exam from Exam Monitoring
 * when the student forgot to click finish/submit ("jika siswa lupa menyelesaikan"),
 * keeping all answers the student already worked on.
 */
export async function finishStudentExamByGuru(params: {
  task: any;
  studentId: string;
  existingSubmission?: any | null;
}): Promise<{ data: any | null; error: any | null }> {
  if (!supabase) return { data: null, error: new Error('Supabase belum siap') };

  const { task, studentId, existingSubmission } = params;
  const questions = Array.isArray(task?.content) ? task.content : [];

  // Fetch freshest submission from DB to make sure no recent answer is missed
  const { data: latestSub } = await supabase
    .from('task_submissions')
    .select('*')
    .eq('task_id', task.id)
    .eq('student_id', studentId)
    .maybeSingle();

  const sub = latestSub || existingSubmission || null;
  const savedAnswers = normalizeAndMergeAnswers(sub?.answers, null);
  const violationCount = Number(sub?.violation_count || 0);

  const result = calculateExamResult(questions, savedAnswers, violationCount, true);
  const nowIso = new Date().toISOString();

  const updatePayload: Record<string, any> = {
    answers: savedAnswers,
    score: result.finalScore,
    status: result.finalStatus,
    feedback: result.feedback,
    is_locked: false,
    session_token: null,
    last_active_at: nowIso,
    updated_at: nowIso
  };

  if (sub?.id) {
    const { data, error } = await supabase
      .from('task_submissions')
      .update(updatePayload)
      .eq('id', sub.id)
      .select('*')
      .maybeSingle();

    if (!error) return { data, error: null };

    // Fallback with base columns
    const { data: fbData, error: fbErr } = await supabase
      .from('task_submissions')
      .update({
        answers: savedAnswers,
        score: result.finalScore,
        status: result.finalStatus,
        feedback: result.feedback
      })
      .eq('id', sub.id)
      .select('*')
      .maybeSingle();
    return { data: fbData, error: fbErr };
  } else {
    const insertPayload: Record<string, any> = {
      task_id: task.id,
      student_id: studentId,
      ...updatePayload,
      started_at: nowIso
    };

    const { data, error } = await supabase
      .from('task_submissions')
      .insert([insertPayload])
      .select('*')
      .maybeSingle();

    if (!error) return { data, error: null };

    const { data: fbData, error: fbErr } = await supabase
      .from('task_submissions')
      .insert([{
        task_id: task.id,
        student_id: studentId,
        answers: savedAnswers,
        score: result.finalScore,
        status: result.finalStatus,
        feedback: result.feedback
      }])
      .select('*')
      .maybeSingle();
    return { data: fbData, error: fbErr };
  }
}

/**
 * Resets a student's login/exam session when the student experiences network issues
 * ("reset login jika siswa kendala jaringan tetapi soal yang sudah dikerjakan tidak hilang").
 *
 * Key behavior:
 * 1. Keeps 100% of `answers` already worked on by the student in `task_submissions`.
 * 2. Unlocks the session (`session_token = null`, `is_locked = false`) and sets `status = 'in_progress'`
 *    so the student can log back in from any device/network and continue immediately.
 * 3. Ensures the student's user account status is `'active'` and clears any stuck `active_session_token`.
 */
export async function resetStudentLoginByGuru(params: {
  taskId: string;
  studentId: string;
  existingSubmission?: any | null;
}): Promise<{ data: any | null; answeredCount: number; error: any | null }> {
  if (!supabase) return { data: null, answeredCount: 0, error: new Error('Supabase belum siap') };

  const { taskId, studentId, existingSubmission } = params;
  const nowIso = new Date().toISOString();

  try {
    // 1. Ensure user account is active, unlocked from exam violation, and clear session token
    await supabase
      .from('users')
      .update({
        status: 'active',
        active_session_token: null,
        is_exam_locked: false,
        exam_locked_reason: null,
        exam_locked_at: null
      })
      .eq('id', studentId);
  } catch {
    // Ignore if column not yet cached
  }

  // 2. Fetch latest submission row for this task & student
  const { data: latestSub } = await supabase
    .from('task_submissions')
    .select('*')
    .eq('task_id', taskId)
    .eq('student_id', studentId)
    .maybeSingle();

  const sub = latestSub || existingSubmission || null;
  const preservedAnswers = normalizeAndMergeAnswers(sub?.answers, null);
  const answeredCount = countAnsweredQuestions(preservedAnswers);
  const nextResetCount = Number(sub?.login_reset_count || 0) + 1;

  const feedbackMsg = `Reset Login ke-${nextResetCount} oleh Guru (${new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })}). ${answeredCount} jawaban tersimpan aman. Toleransi pelanggaran dipulihkan.`;

  if (sub?.id) {
    const updatePayload: Record<string, any> = {
      answers: preservedAnswers, // Jawaban yang sudah dikerjakan TIDAK hilang
      status: 'in_progress',     // Buka kembali sesi pengerjaan agar siswa bisa lanjut
      session_token: null,       // Lepas kunci sesi/perangkat
      is_locked: false,
      violation_count: 0,        // Reset hitungan pelanggaran setelah reset oleh guru
      login_reset_count: nextResetCount,
      login_reset_at: nowIso,
      last_active_at: nowIso,
      updated_at: nowIso,
      feedback: feedbackMsg
    };

    const { data, error } = await supabase
      .from('task_submissions')
      .update(updatePayload)
      .eq('id', sub.id)
      .select('*')
      .maybeSingle();

    if (!error) {
      return { data, answeredCount, error: null };
    }

    // Fallback update
    const { data: fbData, error: fbErr } = await supabase
      .from('task_submissions')
      .update({
        answers: preservedAnswers,
        status: 'in_progress',
        feedback: feedbackMsg
      })
      .eq('id', sub.id)
      .select('*')
      .maybeSingle();

    return { data: fbData, answeredCount, error: fbErr };
  } else {
    // Student hasn't created a submission row yet, initialize an unlocked in_progress session
    const insertPayload: Record<string, any> = {
      task_id: taskId,
      student_id: studentId,
      answers: {},
      score: null,
      status: 'in_progress',
      session_token: null,
      is_locked: false,
      login_reset_count: 1,
      login_reset_at: nowIso,
      started_at: nowIso,
      last_active_at: nowIso,
      updated_at: nowIso,
      feedback: 'Sesi login ujian telah direset oleh Guru. Siswa dapat langsung masuk mengerjakan.'
    };

    const { data, error } = await supabase
      .from('task_submissions')
      .insert([insertPayload])
      .select('*')
      .maybeSingle();

    if (!error) {
      return { data, answeredCount: 0, error: null };
    }

    const { data: fbData, error: fbErr } = await supabase
      .from('task_submissions')
      .insert([{
        task_id: taskId,
        student_id: studentId,
        answers: {},
        score: null,
        status: 'in_progress',
        feedback: 'Sesi login ujian telah direset oleh Guru.'
      }])
      .select('*')
      .maybeSingle();

    return { data: fbData, answeredCount: 0, error: fbErr };
  }
}
