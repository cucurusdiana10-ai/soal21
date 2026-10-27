import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import {
  CheckSquare,
  Eye,
  Sparkles,
  Loader2,
  Save,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  KeyRound,
  RotateCcw,
  Edit2,
  Calculator,
  Activity,
  Send,
  Search,
  Check,
  AlertTriangle,
  FileText,
  Award,
  Filter,
  RefreshCw,
  Users,
  TrendingUp,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { gradeEssayApi } from '../../lib/aiService';
import { generateTaskToken, getTokenTimeRemaining } from '../../lib/examToken';
import { countAnsweredQuestions } from '../../lib/examMonitoring';

interface TaskSubmissionItem {
  student: any;
  submission: any | null;
}

export default function GradeReports() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [submissions, setSubmissions] = useState<TaskSubmissionItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState<boolean>(false);

  // Search & Filter for Exam Packages (Tabel Paket Soal)
  const [taskSearch, setTaskSearch] = useState<string>('');
  const [taskClassFilter, setTaskClassFilter] = useState<string>('ALL');

  // Search & Filter for Student Grade Report Table (Tabel Nilai Siswa)
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Task stats cache (submission count, average score per task)
  const [taskStatsMap, setTaskStatsMap] = useState<Record<string, { count: number; totalStudents: number; avgScore: number | null }>>({});

  // Detail Modal (Detail Jawaban Benar & Salah Siswa)
  const [detailModalItem, setDetailModalItem] = useState<TaskSubmissionItem | null>(null);
  const [detailFilter, setDetailFilter] = useState<'ALL' | 'CORRECT' | 'WRONG' | 'ESSAY'>('ALL');

  // Koreksi & Edit Modal (Koreksi Esai & Penjumlahan Nilai Akhir)
  const [gradingModal, setGradingModal] = useState<TaskSubmissionItem | null>(null);
  const [isEditingExamAnswers, setIsEditingExamAnswers] = useState<boolean>(false);
  const [editingAnswers, setEditingAnswers] = useState<Record<number, string>>({});
  const [essayScores, setEssayScores] = useState<Record<number, number>>({});
  const [gradingScore, setGradingScore] = useState<number>(0);
  const [calculatedPgScore, setCalculatedPgScore] = useState<number>(0);
  const [totalEssayPoints, setTotalEssayPoints] = useState<number>(0);
  const [gradingFeedback, setGradingFeedback] = useState<string>('');
  const [gradingStatus, setGradingStatus] = useState<'graded' | 'submitted'>('graded');
  const [aiGradingLoading, setAiGradingLoading] = useState<boolean>(false);
  const [savingGrade, setSavingGrade] = useState<boolean>(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  // 1s ticker for token countdown
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const reportSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [user]);

  async function fetchTasks() {
    if (!user || !supabase) return;
    setLoadingTasks(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, class:classes(name)')
        .eq('guru_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const ownTasks = data.filter((t: any) => t.guru_id === user.id);
        setTasks(ownTasks);
        fetchStatsForAllTasks(ownTasks);
      } else {
        setTasks([]);
      }
    } catch {
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }

  // Fetch summary stats for all tasks in table
  async function fetchStatsForAllTasks(taskList: any[]) {
    if (!supabase || taskList.length === 0) return;
    try {
      const taskIds = taskList.map(t => t.id);
      const { data: allSubs } = await supabase
        .from('task_submissions')
        .select('task_id, score, status')
        .in('task_id', taskIds);

      const statsMap: Record<string, { count: number; totalStudents: number; avgScore: number | null }> = {};

      taskList.forEach(t => {
        const taskSubs = (allSubs || []).filter(s => s.task_id === t.id && (s.status === 'graded' || s.status === 'submitted'));
        const scoredSubs = taskSubs.filter(s => s.score !== null && s.score !== undefined);
        const avg = scoredSubs.length > 0
          ? Math.round((scoredSubs.reduce((acc, s) => acc + Number(s.score), 0) / scoredSubs.length) * 10) / 10
          : null;

        statsMap[t.id] = {
          count: taskSubs.length,
          totalStudents: 0,
          avgScore: avg
        };
      });

      setTaskStatsMap(statsMap);
    } catch {
      // Ignore non-blocking stats errors
    }
  }

  async function handleSelectTask(task: any, scrollIntoView: boolean = true) {
    setSelectedTask(task);
    setLoadingSubmissions(true);

    try {
      // Fetch all students in the task's target class
      const { data: classStudents } = await supabase!
        .from('class_students')
        .select('student:users!student_id(id, name, username, status)')
        .eq('class_id', task.class_id);

      // Fetch existing submissions for this task
      const { data: subs } = await supabase!
        .from('task_submissions')
        .select('*')
        .eq('task_id', task.id);

      const subMap: Record<string, any> = {};
      if (subs) {
        subs.forEach(s => {
          subMap[s.student_id] = s;
        });
      }

      const studentsList = (classStudents || [])
        .map((cs: any) => cs.student)
        .filter(Boolean)
        .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

      const combined: TaskSubmissionItem[] = studentsList.map(st => ({
        student: st,
        submission: subMap[st.id] || null
      }));

      setSubmissions(combined);

      // Update totalStudents count in stats cache
      setTaskStatsMap(prev => ({
        ...prev,
        [task.id]: {
          ...prev[task.id],
          count: (subs || []).filter(s => s.status === 'graded' || s.status === 'submitted').length,
          totalStudents: studentsList.length,
          avgScore: prev[task.id]?.avgScore ?? null
        }
      }));

      if (scrollIntoView) {
        setTimeout(() => {
          reportSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
    } catch (err: any) {
      alert('Gagal memuat data nilai: ' + err.message);
    } finally {
      setLoadingSubmissions(false);
    }
  }

  // Calculate scores for PG and individual essays with weights
  const calculateCombinedScore = (
    currentAnswers: Record<number, string>,
    currentEssayScores: Record<number, number>,
    questions: any[],
    weightPg?: number,
    weightEssay?: number
  ) => {
    if (!questions || questions.length === 0) {
      return { pgScore: 0, essayPoints: 0, totalScore: 0, weightPg: 100, weightEssay: 0 };
    }

    const pgQuestions = questions.filter(q => q.type === 'pg');
    const essayQuestions = questions.filter(q => q.type === 'essay');
    const hasPg = pgQuestions.length > 0;
    const hasEssay = essayQuestions.length > 0;

    let wPg = weightPg !== undefined && weightPg !== null ? Number(weightPg) : (hasPg && hasEssay ? 70 : hasPg ? 100 : 0);
    let wEssay = weightEssay !== undefined && weightEssay !== null ? Number(weightEssay) : (hasPg && hasEssay ? 30 : hasEssay ? 100 : 0);

    if (hasPg && hasEssay && wPg + wEssay !== 100) {
      const sum = wPg + wEssay;
      if (sum > 0) {
        wPg = Math.round((wPg / sum) * 100);
        wEssay = 100 - wPg;
      } else {
        wPg = 70;
        wEssay = 30;
      }
    }

    // 1. Raw PG score (0-100)
    let pgCorrectCount = 0;
    questions.forEach((q, idx) => {
      if (q.type === 'pg') {
        const studentAns = currentAnswers[idx] ?? currentAnswers[String(idx)] ?? '';
        const isCorrect = String(studentAns).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
        if (isCorrect) pgCorrectCount++;
      }
    });
    const pgRaw = pgQuestions.length > 0 ? (pgCorrectCount / pgQuestions.length) * 100 : 0;

    // 2. Raw Essay score (0-100)
    let essayScoreSum = 0;
    questions.forEach((q, idx) => {
      if (q.type === 'essay') {
        const rawScore = Number(currentEssayScores[idx] ?? currentEssayScores[String(idx)] ?? 0);
        essayScoreSum += Math.max(0, Math.min(100, rawScore));
      }
    });
    const essayRaw = essayQuestions.length > 0 ? essayScoreSum / essayQuestions.length : 0;

    // 3. Final weighted calculation
    let calculatedFinal = 0;
    if (hasPg && hasEssay) {
      calculatedFinal = (pgRaw * wPg / 100) + (essayRaw * wEssay / 100);
    } else if (hasPg) {
      calculatedFinal = pgRaw;
    } else {
      calculatedFinal = essayRaw;
    }

    const roundedPg = Math.round(pgRaw);
    const roundedEssay = Math.round(essayRaw);
    const totalScore = Math.min(100, Math.max(0, Math.round(calculatedFinal)));

    return {
      pgScore: roundedPg,
      essayPoints: roundedEssay,
      totalScore,
      weightPg: wPg,
      weightEssay: wEssay
    };
  };

  // Open Correction & Essay Grading Modal
  const openGradingModal = (item: TaskSubmissionItem, startInEditMode: boolean = false) => {
    if (!selectedTask) return;
    const sub = item.submission;
    const rawAnswers = sub?.answers || {};
    const normalizedAnswers: Record<number, string> = {};
    Object.keys(rawAnswers).forEach(k => {
      normalizedAnswers[Number(k)] = String(rawAnswers[k] ?? '');
    });

    const rawEssayScores = sub?.essay_scores || {};
    const normalizedEssayScores: Record<number, number> = {};
    const questions = Array.isArray(selectedTask.content) ? selectedTask.content : [];

    questions.forEach((q: any, idx: number) => {
      if (q.type === 'essay') {
        normalizedEssayScores[idx] = Number(rawEssayScores[idx] ?? rawEssayScores[String(idx)] ?? 0);
      }
    });

    const { pgScore, essayPoints, totalScore } = calculateCombinedScore(
      normalizedAnswers,
      normalizedEssayScores,
      questions,
      selectedTask.weight_pg,
      selectedTask.weight_essay
    );

    setGradingModal(item);
    setEditingAnswers(normalizedAnswers);
    setEssayScores(normalizedEssayScores);
    setCalculatedPgScore(pgScore);
    setTotalEssayPoints(essayPoints);
    // If student has existing recorded score, use it; otherwise use freshly calculated
    setGradingScore(sub?.score !== null && sub?.score !== undefined ? sub.score : totalScore);
    setGradingFeedback(sub?.feedback || '');
    setGradingStatus(sub?.status === 'submitted' ? 'submitted' : 'graded');
    setIsEditingExamAnswers(startInEditMode);
  };

  // Handle essay score change per question
  const handleEssayScoreChange = (questionIdx: number, newScoreVal: number) => {
    if (!selectedTask) return;
    const clampedScore = Math.max(0, Math.min(100, newScoreVal));
    const nextEssayScores = {
      ...essayScores,
      [questionIdx]: clampedScore
    };
    setEssayScores(nextEssayScores);

    const questions = Array.isArray(selectedTask.content) ? selectedTask.content : [];
    const { pgScore, essayPoints, totalScore } = calculateCombinedScore(
      editingAnswers,
      nextEssayScores,
      questions,
      selectedTask.weight_pg,
      selectedTask.weight_essay
    );

    setCalculatedPgScore(pgScore);
    setTotalEssayPoints(essayPoints);
    setGradingScore(totalScore);
  };

  // Open Student Answer Details Modal (Jawaban Benar & Salah)
  const openDetailModal = (item: TaskSubmissionItem) => {
    setDetailModalItem(item);
    setDetailFilter('ALL');
  };

  // AI Auto Grade for all essay questions in the current grading modal
  const handleAiAutoGrade = async () => {
    if (!gradingModal || !selectedTask) return;
    const questions = Array.isArray(selectedTask.content) ? selectedTask.content : [];
    const essayQuestions = questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => q.type === 'essay');

    if (essayQuestions.length === 0) {
      alert('Tidak ada soal bertipe Esai pada paket soal ini. Nilai pilihan ganda sudah dihitung otomatis.');
      return;
    }

    setAiGradingLoading(true);
    try {
      const nextEssayScores = { ...essayScores };
      const feedbackNotes: string[] = [];

      for (const { q, idx } of essayQuestions) {
        const studentAns = editingAnswers[idx] || editingAnswers[String(idx)] || '-';
        try {
          const aiRes = await gradeEssayApi({
            question: q.question,
            answerKey: q.answerKey || q.answer || '',
            studentAnswer: studentAns
          });

          if (aiRes && aiRes.score !== undefined) {
            const roundedScore = Math.max(0, Math.min(100, Math.round(Number(aiRes.score))));
            nextEssayScores[idx] = roundedScore;
            feedbackNotes.push(
              `Soal #${idx + 1} (Esai): Nilai ${roundedScore}/100. ${aiRes.feedback || ''}`
            );
          }
        } catch {
          feedbackNotes.push(`Soal #${idx + 1} (Esai): Perlu koreksi manual`);
        }
      }

      setEssayScores(nextEssayScores);

      const { pgScore, essayPoints, totalScore } = calculateCombinedScore(
        editingAnswers,
        nextEssayScores,
        questions
      );

      setCalculatedPgScore(pgScore);
      setTotalEssayPoints(essayPoints);
      setGradingScore(totalScore);

      const existingFb = gradingFeedback ? gradingFeedback + '\n\n' : '';
      setGradingFeedback(existingFb + `🤖 Koreksi Otomatis AI Esai:\n` + feedbackNotes.join('\n'));
      alert(`✅ Koreksi AI untuk ${essayQuestions.length} butir esai selesai! Nilai akhir telah dijumlahkan menjadi ${totalScore}.`);
    } catch (err: any) {
      alert('Gagal menjalankan koreksi AI: ' + err.message);
    } finally {
      setAiGradingLoading(false);
    }
  };

  // Save changes to student grade, essay scores, and answers
  const handleSaveGrade = async () => {
    if (!gradingModal || !selectedTask) return;
    const sub = gradingModal.submission;
    const st = gradingModal.student;

    setSavingGrade(true);
    try {
      const payload: Record<string, any> = {
        answers: editingAnswers,
        essay_scores: essayScores,
        score: gradingScore,
        status: gradingStatus,
        feedback: gradingFeedback,
        updated_at: new Date().toISOString()
      };

      if (sub?.id) {
        const { error } = await supabase!
          .from('task_submissions')
          .update(payload)
          .eq('id', sub.id);

        if (error) {
          // Fallback if essay_scores column not synced
          await supabase!
            .from('task_submissions')
            .update({
              answers: editingAnswers,
              score: gradingScore,
              status: gradingStatus,
              feedback: gradingFeedback
            })
            .eq('id', sub.id);
        }
      } else {
        const insertPayload = {
          task_id: selectedTask.id,
          student_id: st.id,
          answers: editingAnswers,
          essay_scores: essayScores,
          score: gradingScore,
          status: gradingStatus,
          feedback: gradingFeedback || 'Diinput/dikoreksi langsung oleh Guru.',
          started_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        };

        const { error } = await supabase!
          .from('task_submissions')
          .insert([insertPayload]);

        if (error) throw error;
      }

      alert(`✅ Nilai siswa "${st.name}" berhasil disimpan dengan Nilai Akhir: ${gradingScore}!`);
      setGradingModal(null);
      await handleSelectTask(selectedTask, false);
      fetchStatsForAllTasks(tasks);
    } catch (err: any) {
      alert('Gagal menyimpan nilai ujian: ' + err.message);
    } finally {
      setSavingGrade(false);
    }
  };

  // Optional: Reset student exam from 0
  const handleResetStudentExam = async (item: TaskSubmissionItem) => {
    const st = item.student;
    const sub = item.submission;
    if (!sub || !selectedTask) return;

    if (
      !confirm(
        `PERINGATAN: Apakah Anda yakin ingin MERESET ULANG DARI 0 seluruh hasil ujian siswa "${st.name}"?\n\n` +
          `Semua lembar jawaban akan dihapus agar siswa dapat mengerjakan ulang dari awal.`
      )
    ) {
      return;
    }

    setResettingId(st.id);
    try {
      const { error } = await supabase!
        .from('task_submissions')
        .delete()
        .eq('id', sub.id);

      if (error) throw error;

      if (gradingModal?.student?.id === st.id) setGradingModal(null);
      if (detailModalItem?.student?.id === st.id) setDetailModalItem(null);

      await handleSelectTask(selectedTask, false);
      fetchStatsForAllTasks(tasks);
      alert(`✅ Hasil ujian siswa "${st.name}" berhasil direset ke 0.`);
    } catch (err: any) {
      alert('Gagal mereset ujian siswa: ' + err.message);
    } finally {
      setResettingId(null);
    }
  };

  // Export CSV / Excel
  const handleDownloadReport = () => {
    if (!selectedTask || submissions.length === 0) {
      alert('Tidak ada data siswa untuk diunduh');
      return;
    }

    const taskKkm = Number(selectedTask?.kkm !== undefined && selectedTask?.kkm !== null ? selectedTask.kkm : 75);
    const headers = ['No', 'Nama Siswa', 'NISN', 'Nilai PG', 'Nilai Esai', 'Nilai Akhir', 'KKM', 'Status Kelulusan', 'Status Pengerjaan'];

    const rows = submissions.map((item, idx) => {
      const st = item.student;
      const sub = item.submission;
      const scoreVal = sub && sub.score !== null ? sub.score : '-';
      const kelulusan =
        sub && sub.score !== null && sub.status !== 'in_progress'
          ? sub.score >= taskKkm
            ? 'TUNTAS'
            : 'REMEDIAL'
          : '-';
      const statusText = !sub
        ? 'Belum Mengumpulkan'
        : sub.status === 'graded'
        ? 'Sudah Dinilai'
        : sub.status === 'in_progress'
        ? 'Sedang Mengerjakan'
        : 'Perlu Koreksi Esai';

      return [
        idx + 1,
        `"${st.name ? st.name.replace(/"/g, '""') : ''}"`,
        `"${st.username ? st.username.replace(/"/g, '""') : ''}"`,
        sub?.score !== null ? sub.score : '-',
        '-',
        scoreVal,
        taskKkm,
        `"${kelulusan}"`,
        `"${statusText}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const className = selectedTask.class?.name || 'Kelas';
    const taskTitle = (selectedTask.title || 'Tugas').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `Laporan_Nilai_${className}_${taskTitle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter tasks list
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchSearch =
        (t.title || '').toLowerCase().includes(taskSearch.toLowerCase()) ||
        (t.subject_name || '').toLowerCase().includes(taskSearch.toLowerCase());
      const matchClass = taskClassFilter === 'ALL' || t.class?.name === taskClassFilter;
      return matchSearch && matchClass;
    });
  }, [tasks, taskSearch, taskClassFilter]);

  // Unique classes for task filter
  const uniqueTaskClasses = useMemo(() => {
    const setCls = new Set<string>();
    tasks.forEach(t => {
      if (t.class?.name) setCls.add(t.class.name);
    });
    return Array.from(setCls);
  }, [tasks]);

  // Computed summary metrics for selected task
  const reportStats = useMemo(() => {
    if (!selectedTask || submissions.length === 0) {
      return { total: 0, submitted: 0, graded: 0, needsGrading: 0, inProgress: 0, notStarted: 0, passed: 0, remedial: 0, avg: 0 };
    }

    const kkm = Number(selectedTask.kkm !== undefined && selectedTask.kkm !== null ? selectedTask.kkm : 75);
    let total = submissions.length;
    let submitted = 0;
    let graded = 0;
    let needsGrading = 0;
    let inProgress = 0;
    let notStarted = 0;
    let passed = 0;
    let remedial = 0;
    let totalScoreSum = 0;
    let scoredCount = 0;

    submissions.forEach(item => {
      const sub = item.submission;
      if (!sub) {
        notStarted += 1;
      } else if (sub.status === 'in_progress') {
        inProgress += 1;
      } else if (sub.status === 'submitted') {
        submitted += 1;
        needsGrading += 1;
        if (sub.score !== null && sub.score !== undefined) {
          totalScoreSum += Number(sub.score);
          scoredCount += 1;
          if (sub.score >= kkm) passed += 1;
          else remedial += 1;
        }
      } else if (sub.status === 'graded') {
        submitted += 1;
        graded += 1;
        if (sub.score !== null && sub.score !== undefined) {
          totalScoreSum += Number(sub.score);
          scoredCount += 1;
          if (sub.score >= kkm) passed += 1;
          else remedial += 1;
        }
      }
    });

    const avg = scoredCount > 0 ? Math.round((totalScoreSum / scoredCount) * 10) / 10 : 0;

    return { total, submitted, graded, needsGrading, inProgress, notStarted, passed, remedial, avg };
  }, [selectedTask, submissions]);

  // Filtered submissions in student table
  const filteredSubmissions = useMemo(() => {
    if (!selectedTask) return [];
    const kkm = Number(selectedTask.kkm !== undefined && selectedTask.kkm !== null ? selectedTask.kkm : 75);

    return submissions.filter(item => {
      const st = item.student;
      const sub = item.submission;

      const matchSearch =
        (st.name || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
        (st.username || '').toLowerCase().includes(studentSearch.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'PASSED') return sub && sub.score !== null && sub.score >= kkm;
      if (statusFilter === 'REMEDIAL') return sub && sub.score !== null && sub.score < kkm;
      if (statusFilter === 'NEEDS_GRADING') return sub && sub.status === 'submitted';
      if (statusFilter === 'IN_PROGRESS') return sub && sub.status === 'in_progress';
      if (statusFilter === 'NOT_STARTED') return !sub;

      return true;
    });
  }, [submissions, selectedTask, studentSearch, statusFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header (Compact & Sleek) */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 bg-blue-500/25 border border-blue-400/30 rounded-md text-[11px] font-bold text-blue-200 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-blue-300" />
                Laporan Nilai & Koreksi Esai
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Laporan Nilai, Koreksi Esai & Detail Hasil Ujian
            </h1>
            <p className="text-blue-200 text-xs mt-0.5 max-w-2xl leading-relaxed">
              Pilih paket soal untuk melihat rekap nilai siswa di bawah. Dilengkapi <strong>Detail Jawaban Benar & Salah</strong> serta <strong>Koreksi Nilai Esai per Butir Soal</strong> otomatis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              to="/dashboard/monitoring"
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Monitoring Ujian Live
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION 1: TABEL PILIH PAKET SOAL (Ultra-Compact & Space-Efficient) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-3 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Award className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-gray-900">
              Pilih Paket Soal Ujian
            </h2>
            <span className="text-[10px] text-gray-500 font-medium hidden sm:inline">
              ({tasks.length} paket soal)
            </span>
            {selectedTask && (
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200 truncate max-w-[240px]">
                Dipilih: {selectedTask.title}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative min-w-[160px]">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari paket / mapel..."
                value={taskSearch}
                onChange={e => setTaskSearch(e.target.value)}
                className="w-full pl-6 pr-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 font-medium"
              />
            </div>

            {uniqueTaskClasses.length > 1 && (
              <select
                value={taskClassFilter}
                onChange={e => setTaskClassFilter(e.target.value)}
                className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs font-semibold text-gray-700"
              >
                <option value="ALL">Semua Kelas ({uniqueTaskClasses.length})</option>
                {uniqueTaskClasses.map((cls, i) => (
                  <option key={i} value={cls}>Kelas {cls}</option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={fetchTasks}
              className="p-1 bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 rounded transition"
              title="Segarkan Daftar Paket Soal"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingTasks ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loadingTasks ? (
          <div className="py-4 text-center text-gray-500 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" /> Memuat daftar paket soal...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-xs">
            Tidak ada paket soal yang cocok dengan pencarian Anda.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-52 sm:max-h-60 overflow-y-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="sticky top-0 bg-slate-100 z-10 shadow-2xs">
                <tr className="border-b border-gray-200 text-gray-600 font-bold uppercase text-[9px] tracking-wider">
                  <th className="py-1.5 px-2 w-8 text-center">No</th>
                  <th className="py-1.5 px-2 min-w-[170px]">Paket Soal & Mapel</th>
                  <th className="py-1.5 px-2 whitespace-nowrap">Kelas</th>
                  <th className="py-1.5 px-2 whitespace-nowrap">Tipe & Butir</th>
                  <th className="py-1.5 px-2 text-center whitespace-nowrap">KKM</th>
                  <th className="py-1.5 px-2 min-w-[120px] whitespace-nowrap">Pengumpulan</th>
                  <th className="py-1.5 px-2 text-center whitespace-nowrap">Rata-rata</th>
                  <th className="py-1.5 px-2 min-w-[130px] whitespace-nowrap">Token (30 Mnt)</th>
                  <th className="py-1.5 px-2 text-right whitespace-nowrap w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTasks.map((task, idx) => {
                  const isSelected = selectedTask?.id === task.id;
                  const qCount = Array.isArray(task.content) ? task.content.length : 0;
                  const activeToken = generateTaskToken(task.id, nowMs);
                  const stats = taskStatsMap[task.id];

                  return (
                    <tr
                      key={task.id}
                      onClick={() => handleSelectTask(task, true)}
                      className={`transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/90 font-medium border-l-2 border-l-blue-600'
                          : 'hover:bg-slate-50/80 bg-white'
                      }`}
                    >
                      <td className="py-1 px-2 text-center text-gray-400 font-semibold">{idx + 1}</td>
                      <td className="py-1 px-2">
                        <div className="leading-tight">
                          <p className={`font-bold text-xs truncate max-w-[210px] ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {task.title}
                          </p>
                          <p className="text-[9px] text-gray-500 font-medium truncate">{task.subject_name || '-'}</p>
                        </div>
                      </td>
                      <td className="py-1 px-2 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 font-bold rounded text-[9px]">
                          Kelas {task.class?.name || '-'}
                        </span>
                      </td>
                      <td className="py-1 px-2 whitespace-nowrap">
                        <span className="font-semibold text-gray-800 text-[10px]">
                          {task.type === 'pg' ? 'PG' : task.type === 'essay' ? 'Esai' : 'Campuran'}
                        </span>
                        <span className="text-gray-500 text-[9px] ml-1">({qCount} Soal)</span>
                      </td>
                      <td className="py-1 px-2 text-center whitespace-nowrap">
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded border border-emerald-200 text-[9px]">
                          {task.kkm !== undefined && task.kkm !== null ? task.kkm : 75}
                        </span>
                      </td>
                      <td className="py-1 px-2 whitespace-nowrap">
                        {stats ? (
                          <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                            <Users className="w-3 h-3 text-indigo-600" />
                            {stats.count} {stats.totalStudents > 0 ? `/ ${stats.totalStudents}` : ''}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[10px]">Memuat...</span>
                        )}
                      </td>
                      <td className="py-1 px-2 text-center whitespace-nowrap">
                        {stats?.avgScore !== null && stats?.avgScore !== undefined ? (
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                            stats.avgScore >= (task.kkm || 75)
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {stats.avgScore}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[10px]">-</span>
                        )}
                      </td>
                      <td className="py-1 px-2 whitespace-nowrap">
                        <span className="font-mono font-bold text-[10px] text-indigo-950 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-200">
                          {activeToken}
                        </span>
                      </td>
                      <td className="py-1 px-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleSelectTask(task, true);
                          }}
                          className={`px-2 py-0.5 rounded font-bold text-[10px] transition flex items-center gap-1 ml-auto shadow-2xs ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                          }`}
                        >
                          <Eye className="w-2.5 h-2.5" />
                          {isSelected ? 'Dilihat' : 'Lihat Nilai'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: DAFTAR LAPORAN NILAI SISWA (TAMPIL DI BAWAHNYA) */}
      <div ref={reportSectionRef}>
        {selectedTask ? (
          <div className="space-y-4">
            {/* Stats Cards for Selected Task */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] text-gray-500 font-bold block">Total Siswa</span>
                <span className="text-xl font-black text-gray-900 mt-0.5 block">{reportStats.total}</span>
                <span className="text-[9px] text-gray-500">Kelas {selectedTask.class?.name}</span>
              </div>

              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] text-blue-700 font-bold block">Mengumpulkan</span>
                <span className="text-xl font-black text-blue-700 mt-0.5 block">{reportStats.submitted}</span>
                <span className="text-[9px] text-blue-600">{reportStats.inProgress} sedang ujian</span>
              </div>

              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] text-amber-800 font-bold block">Perlu Koreksi Esai</span>
                <span className="text-xl font-black text-amber-700 mt-0.5 block">{reportStats.needsGrading}</span>
                <span className="text-[9px] text-amber-700">Menunggu penilaian</span>
              </div>

              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] text-emerald-800 font-bold block">Tuntas (≥{selectedTask.kkm || 75})</span>
                <span className="text-xl font-black text-emerald-700 mt-0.5 block">{reportStats.passed}</span>
                <span className="text-[9px] text-emerald-600">Memenuhi standar</span>
              </div>

              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] text-red-800 font-bold block">Remedial (&lt;{selectedTask.kkm || 75})</span>
                <span className="text-xl font-black text-red-600 mt-0.5 block">{reportStats.remedial}</span>
                <span className="text-[9px] text-red-600">Perlu bimbingan</span>
              </div>

              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] text-indigo-800 font-bold block">Rata-rata Nilai</span>
                <span className="text-xl font-black text-indigo-700 mt-0.5 block">{reportStats.avg}</span>
                <span className="text-[9px] text-indigo-600">Dari siswa dinilai</span>
              </div>
            </div>

            {/* Student Grade Report Table Box */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header Box */}
              <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-bold text-gray-900">
                      Laporan Nilai: {selectedTask.title}
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded">
                      Kelas {selectedTask.class?.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded border border-emerald-300">
                      KKM: {selectedTask.kkm !== undefined && selectedTask.kkm !== null ? selectedTask.kkm : 75}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Gunakan <strong>Detail Jawaban</strong> untuk melihat rincian benar/salah, atau <strong>Koreksi & Nilai</strong> untuk mengisi esai per butir.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/dashboard/monitoring?taskId=${selectedTask.id}`}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-xs rounded-lg transition flex items-center gap-1"
                  >
                    <Activity className="w-3.5 h-3.5 text-indigo-600" />
                    Monitoring Live
                  </Link>

                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Download (Excel)
                  </button>
                </div>
              </div>

              {/* Filter and Search inside Student Table */}
              <div className="p-3 bg-white border-b border-gray-100 grid sm:grid-cols-2 gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Cari nama siswa atau NISN..."
                    className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: 'ALL', label: `Semua (${submissions.length})` },
                    { id: 'PASSED', label: `Tuntas (${reportStats.passed})` },
                    { id: 'REMEDIAL', label: `Remedial (${reportStats.remedial})` },
                    { id: 'NEEDS_GRADING', label: `Perlu Koreksi (${reportStats.needsGrading})` },
                    { id: 'IN_PROGRESS', label: `Sedang Ujian (${reportStats.inProgress})` },
                    { id: 'NOT_STARTED', label: `Belum (${reportStats.notStarted})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap transition ${
                        statusFilter === tab.id
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-3 py-2 w-10 text-center">No</th>
                      <th className="px-3 py-2 min-w-[180px]">Nama Siswa & NISN</th>
                      <th className="px-3 py-2">Status Pengerjaan</th>
                      <th className="px-3 py-2 text-center whitespace-nowrap">
                        Skor PG {selectedTask.weight_pg !== undefined && selectedTask.weight_pg !== null ? `(${selectedTask.weight_pg}%)` : ''}
                      </th>
                      <th className="px-3 py-2 text-center whitespace-nowrap">
                        Skor Esai {selectedTask.weight_essay !== undefined && selectedTask.weight_essay !== null ? `(${selectedTask.weight_essay}%)` : ''}
                      </th>
                      <th className="px-3 py-2 text-center">Nilai Akhir</th>
                      <th className="px-3 py-2 text-center">Status KKM</th>
                      <th className="px-3 py-2 text-right min-w-[210px]">Aksi Laporan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loadingSubmissions ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-xs">
                          <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1.5 text-blue-600" />
                          Memuat data nilai siswa...
                        </td>
                      </tr>
                    ) : filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-xs">
                          Tidak ada siswa yang sesuai dengan filter pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((item, idx) => {
                        const st = item.student;
                        const sub = item.submission;
                        const isGraded = sub?.status === 'graded';
                        const isInProgress = sub?.status === 'in_progress';
                        const isNeedsGrading = sub?.status === 'submitted';
                        const answeredCount = countAnsweredQuestions(sub?.answers);
                        const totalQ = Array.isArray(selectedTask.content) ? selectedTask.content.length : 0;
                        const taskKkm = Number(selectedTask.kkm !== undefined && selectedTask.kkm !== null ? selectedTask.kkm : 75);

                        // Calculate individual scores preview with weights
                        const hasQuestions = Array.isArray(selectedTask.content) && selectedTask.content.length > 0;
                        const scoreBreakdown = hasQuestions && sub?.answers
                          ? calculateCombinedScore(
                              sub.answers,
                              sub.essay_scores || {},
                              selectedTask.content,
                              selectedTask.weight_pg,
                              selectedTask.weight_essay
                            )
                          : null;

                        return (
                          <tr key={st.id} className="hover:bg-slate-50 transition">
                            <td className="px-3 py-2 text-center font-semibold text-gray-500">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <div className="font-bold text-gray-900 text-xs sm:text-sm">{st.name}</div>
                              <div className="text-[10px] text-gray-500 font-mono">NISN: {st.username}</div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {!sub ? (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded flex items-center w-max gap-1">
                                  <Clock className="w-3 h-3 text-gray-400" /> Belum Mulai
                                </span>
                              ) : isInProgress ? (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded flex items-center w-max gap-1">
                                  <Activity className="w-3 h-3 animate-pulse text-blue-600" /> Sedang Ujian ({answeredCount}/{totalQ})
                                </span>
                              ) : isGraded ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded flex items-center w-max gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sudah Dinilai
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded flex items-center w-max gap-1">
                                  <AlertCircle className="w-3 h-3 text-amber-600" /> Perlu Koreksi Esai
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              {sub && scoreBreakdown ? (
                                <span className="font-semibold text-gray-800 text-xs">
                                  {scoreBreakdown.pgScore}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              {sub && scoreBreakdown ? (
                                <span className="font-semibold text-indigo-700 text-xs">
                                  {scoreBreakdown.essayPoints}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              {sub && sub.score !== null && !isInProgress ? (
                                <span className={`font-black text-sm ${sub.score >= taskKkm ? 'text-emerald-700' : 'text-red-600'}`}>
                                  {sub.score}
                                </span>
                              ) : (
                                <span className="text-gray-400 font-bold text-xs">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              {sub && sub.score !== null && !isInProgress ? (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                                  sub.score >= taskKkm
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-red-50 text-red-800 border-red-200'
                                }`}>
                                  {sub.score >= taskKkm ? 'TUNTAS' : 'REMEDIAL'}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1 flex-wrap">
                                {/* DETAIL JAWABAN SISWA (Benar & Salah) */}
                                <button
                                  type="button"
                                  onClick={() => openDetailModal(item)}
                                  disabled={!sub}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-md font-bold text-[11px] transition flex items-center gap-1 disabled:opacity-40"
                                  title="Lihat Detail Butir Jawaban Benar & Salah Siswa"
                                >
                                  <FileText className="w-3 h-3 text-indigo-600" />
                                  Detail
                                </button>

                                {/* KOREKSI ESAI & NILAI */}
                                <button
                                  type="button"
                                  onClick={() => openGradingModal(item, false)}
                                  className={`px-2 py-1 rounded-md font-bold text-[11px] transition flex items-center gap-1 ${
                                    isNeedsGrading
                                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs'
                                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                                  }`}
                                  title="Koreksi Esai & Atur Nilai Siswa"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  {isNeedsGrading ? 'Koreksi' : 'Nilai'}
                                </button>

                                {/* Reset Ujian Siswa dari 0 (Optional Retake) */}
                                {sub && (
                                  <button
                                    type="button"
                                    onClick={() => handleResetStudentExam(item)}
                                    disabled={resettingId === st.id}
                                    className="px-1.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md font-semibold text-[11px] transition flex items-center gap-0.5 disabled:opacity-50"
                                    title="Reset ujian dari 0 agar siswa bisa mengulang"
                                  >
                                    {resettingId === st.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    )}
                                    Reset 0
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center space-y-3">
            <Award className="w-12 h-12 text-indigo-400 mx-auto" />
            <h3 className="font-bold text-gray-800 text-base">Belum Ada Paket Soal yang Dipilih</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Silakan klik tombol <strong>"Lihat Laporan Nilai"</strong> pada salah satu baris paket soal di tabel atas untuk memuat daftar laporan nilai dan lembar jawaban siswa.
            </p>
          </div>
        )}
      </div>

      {/* MODAL 1: DETAIL JAWABAN BENAR & SALAH SISWA */}
      {detailModalItem && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-200 rounded-full text-xs font-bold border border-blue-400/30">
                    Detail Lembar Jawaban Siswa
                  </span>
                  <span className="text-xs text-gray-300">
                    Kelas {selectedTask.class?.name}
                  </span>
                </div>
                <h3 className="text-xl font-bold mt-1">
                  {detailModalItem.student.name}
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  NISN: {detailModalItem.student.username} • Paket: {selectedTask.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetailModalItem(null)}
                className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Score & Correct/Wrong Summary Strip */}
            {(() => {
              const sub = detailModalItem.submission;
              const answers = sub?.answers || {};
              const questions = Array.isArray(selectedTask.content) ? selectedTask.content : [];
              const taskKkm = Number(selectedTask.kkm || 75);

              let correctCount = 0;
              let wrongCount = 0;
              let unansCount = 0;
              let essayCount = 0;

              questions.forEach((q, idx) => {
                const ans = answers[idx] ?? answers[String(idx)] ?? '';
                if (q.type === 'pg') {
                  if (!ans) unansCount += 1;
                  else if (String(ans).trim().toLowerCase() === String(q.answer).trim().toLowerCase()) correctCount += 1;
                  else wrongCount += 1;
                } else if (q.type === 'essay') {
                  essayCount += 1;
                }
              });

              return (
                <div className="p-4 bg-slate-100 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="text-gray-500 block">Nilai Akhir:</span>
                      <strong className={`text-base font-black ${
                        sub?.score !== null && sub?.score >= taskKkm ? 'text-emerald-700' : 'text-red-600'
                      }`}>
                        {sub?.score !== null ? sub.score : '-'}
                      </strong>
                    </div>

                    <div className="h-6 w-px bg-gray-300 hidden sm:block" />

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {correctCount} Jawaban Benar
                      </span>
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        {wrongCount} Jawaban Salah
                      </span>
                      {essayCount > 0 && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-bold flex items-center gap-1">
                          <Edit2 className="w-3.5 h-3.5 text-purple-600" />
                          {essayCount} Soal Esai
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Filter in Modal */}
                  <div className="flex items-center gap-1">
                    {[
                      { id: 'ALL', label: 'Semua Soal' },
                      { id: 'CORRECT', label: 'Hanya Benar' },
                      { id: 'WRONG', label: 'Hanya Salah' },
                      { id: 'ESSAY', label: 'Soal Esai' }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setDetailFilter(f.id as any)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                          detailFilter === f.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Questions List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {(() => {
                const sub = detailModalItem.submission;
                const answers = sub?.answers || {};
                const essayScoresMap = sub?.essay_scores || {};
                const questions = Array.isArray(selectedTask.content) ? selectedTask.content : [];

                const filteredQ = questions
                  .map((q, idx) => ({ q, idx }))
                  .filter(({ q, idx }) => {
                    const ans = answers[idx] ?? answers[String(idx)] ?? '';
                    const isPg = q.type === 'pg';
                    const isCorrect = isPg && String(ans).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
                    const isWrong = isPg && Boolean(ans) && !isCorrect;

                    if (detailFilter === 'CORRECT') return isCorrect;
                    if (detailFilter === 'WRONG') return isWrong || (!ans && isPg);
                    if (detailFilter === 'ESSAY') return q.type === 'essay';
                    return true;
                  });

                if (filteredQ.length === 0) {
                  return (
                    <div className="py-8 text-center text-gray-500 text-xs">
                      Tidak ada butir soal yang sesuai filter.
                    </div>
                  );
                }

                return filteredQ.map(({ q, idx }) => {
                  const studentAns = answers[idx] ?? answers[String(idx)] ?? '';
                  const isPg = q.type === 'pg';
                  const isCorrect = isPg && String(studentAns).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
                  const essayScoreVal = essayScoresMap[idx] ?? essayScoresMap[String(idx)] ?? null;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition ${
                        isPg
                          ? isCorrect
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-red-50/40 border-red-200'
                          : 'bg-slate-50 border-gray-200'
                      }`}
                    >
                      {/* Question Top Header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                            isPg
                              ? isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-red-600 text-white'
                              : 'bg-indigo-600 text-white'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-gray-900 text-sm">
                            {q.question}
                          </span>
                        </div>

                        {/* Status Badge */}
                        {isPg ? (
                          isCorrect ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              BENAR
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0">
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              SALAH
                            </span>
                          )
                        ) : (
                          <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-bold shrink-0">
                            ESAI {essayScoreVal !== null ? `(Skor: ${essayScoreVal}/100)` : '(Perlu Koreksi)'}
                          </span>
                        )}
                      </div>

                      {/* Content: PG Options & Status */}
                      {isPg && (
                        <div className="space-y-2 mt-3 pt-2 border-t border-gray-200/60">
                          <div className="grid sm:grid-cols-2 gap-2">
                            {q.options?.map((opt: string, oIdx: number) => {
                              const letter = String.fromCharCode(65 + oIdx);
                              const isStudentPick = studentAns === letter || studentAns === opt;
                              const isKey = q.answer === letter || q.answer === opt;

                              return (
                                <div
                                  key={oIdx}
                                  className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${
                                    isStudentPick && isKey
                                      ? 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold'
                                      : isStudentPick && !isKey
                                      ? 'bg-red-100 text-red-950 border-red-400 font-bold'
                                      : isKey
                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold'
                                      : 'bg-white text-gray-700 border-gray-200'
                                  }`}
                                >
                                  <span>
                                    <strong>{letter}.</strong> {opt}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {isStudentPick && (
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                                        isKey ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white'
                                      }`}>
                                        Jawaban Siswa
                                      </span>
                                    )}
                                    {isKey && !isStudentPick && (
                                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
                                        Kunci Benar
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Content: Essay Answers & Score */}
                      {q.type === 'essay' && (
                        <div className="space-y-2.5 mt-3 pt-2 border-t border-gray-200/60 text-xs">
                          <div className="p-3 bg-white rounded-xl border border-gray-200">
                            <span className="text-gray-500 font-semibold block mb-1">Jawaban yang Ditulis Siswa:</span>
                            <p className="text-gray-900 font-medium whitespace-pre-wrap">
                              {studentAns || <em className="text-gray-400">Siswa tidak mengisi jawaban esai ini.</em>}
                            </p>
                          </div>

                          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                            <span className="text-emerald-800 font-bold block mb-1">Kunci Acuan / Pedoman Guru:</span>
                            <p className="text-emerald-950 font-medium whitespace-pre-wrap">
                              {q.answerKey || q.answer || '-'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const targetItem = detailModalItem;
                  setDetailModalItem(null);
                  openGradingModal(targetItem, false);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Buka Koreksi & Input Nilai Esai
              </button>

              <button
                type="button"
                onClick={() => setDetailModalItem(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-xs rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: KOREKSI ESAI & PENJUMLAHAN NILAI AKHIR */}
      {gradingModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-200 rounded-full text-xs font-bold border border-blue-400/30">
                    Koreksi Lembar Jawaban & Nilai Esai
                  </span>
                  <span className="text-xs text-gray-300">
                    Kelas {selectedTask.class?.name}
                  </span>
                </div>
                <h3 className="text-xl font-bold mt-1">
                  {gradingModal.student.name}
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  NISN: {gradingModal.student.username} • {selectedTask.title}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingExamAnswers(!isEditingExamAnswers)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                    isEditingExamAnswers
                      ? 'bg-amber-500 text-white border-amber-400'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                  }`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {isEditingExamAnswers ? 'Mode Edit Jawaban Aktif' : 'Edit Lembar Jawaban Siswa'}
                </button>

                <button
                  onClick={() => setGradingModal(null)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Interactive Live Calculation Banner */}
            <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Calculator className="w-4 h-4 text-indigo-700 shrink-0" />
                  <span className="font-semibold text-gray-700">Rincian Bobot:</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-bold">
                    Skor PG: {calculatedPgScore} (Bobot {selectedTask.weight_pg ?? 70}%)
                  </span>
                  <span className="text-gray-400">+</span>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded font-bold">
                    Skor Esai: {totalEssayPoints} (Bobot {selectedTask.weight_essay ?? 30}%)
                  </span>
                  <span className="text-gray-400">=</span>
                  <span className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-black text-sm shadow-2xs">
                    Nilai Akhir: {gradingScore}
                  </span>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs border ${
                  gradingScore >= (selectedTask.kkm || 75)
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-red-100 text-red-800 border-red-300'
                }`}>
                  {gradingScore >= (selectedTask.kkm || 75) ? '✓ TUNTAS KKM' : '✗ REMEDIAL'}
                </span>
              </div>

              {/* AI Auto Grade Button for Essay */}
              <button
                type="button"
                onClick={handleAiAutoGrade}
                disabled={aiGradingLoading}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              >
                {aiGradingLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                )}
                {aiGradingLoading ? 'Mengkoreksi...' : 'Koreksi Semua Esai dengan AI'}
              </button>
            </div>

            {/* Modal Body: Question List with Essay Score Inputs */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="space-y-4">
                {selectedTask.content?.map((q: any, idx: number) => {
                  const studentAns = editingAnswers[idx] ?? editingAnswers[String(idx)] ?? '';
                  const isPg = q.type === 'pg';
                  const essayScoreVal = essayScores[idx] ?? essayScores[String(idx)] ?? 0;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border text-sm space-y-2.5 transition ${
                        isPg
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-purple-50/50 border-purple-200 ring-1 ring-purple-400/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                            isPg ? 'bg-gray-700 text-white' : 'bg-purple-700 text-white'
                          }`}>
                            {idx + 1}
                          </span>
                          <p className="font-bold text-gray-900">{q.question}</p>
                        </div>
                        <span className="text-[11px] font-semibold px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-600 shrink-0">
                          {isPg ? 'Pilihan Ganda' : 'Soal Esai'}
                        </span>
                      </div>

                      {/* Multiple Choice Section */}
                      {isPg && (
                        isEditingExamAnswers ? (
                          <div className="space-y-2 pt-1">
                            <p className="text-xs font-semibold text-amber-900">Ubah Jawaban Pilihan Ganda Siswa:</p>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {q.options?.map((opt: string, oIdx: number) => {
                                const letter = String.fromCharCode(65 + oIdx);
                                const isSelected = studentAns === letter || studentAns === opt;
                                const isKey = q.answer === letter || q.answer === opt;
                                return (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    onClick={() => {
                                      const next = { ...editingAnswers, [idx]: letter };
                                      setEditingAnswers(next);
                                      const { pgScore, essayPoints, totalScore } = calculateCombinedScore(
                                        next,
                                        essayScores,
                                        selectedTask.content
                                      );
                                      setCalculatedPgScore(pgScore);
                                      setTotalEssayPoints(essayPoints);
                                      setGradingScore(totalScore);
                                    }}
                                    className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                                      isSelected
                                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                    }`}
                                  >
                                    <span><strong>{letter}.</strong> {opt}</span>
                                    {isKey && (
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                        isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                                      }`}>
                                        Kunci
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
                            <div>
                              <span className="text-gray-500">Jawaban Siswa: </span>
                              <strong className={`${
                                String(studentAns).trim().toLowerCase() === String(q.answer).trim().toLowerCase()
                                  ? 'text-emerald-700'
                                  : 'text-red-600'
                              }`}>
                                {studentAns || '-'}
                              </strong>
                            </div>
                            <div>
                              <span className="text-gray-500">Kunci Jawaban: </span>
                              <strong className="text-emerald-700">{q.answer}</strong>
                            </div>
                          </div>
                        )
                      )}

                      {/* Essay Section with Individual Score Input */}
                      {q.type === 'essay' && (
                        <div className="space-y-3 pt-1">
                          <div className="p-3 bg-white rounded-xl border border-purple-200 text-xs space-y-1.5">
                            <span className="text-gray-500 font-semibold block">Jawaban yang Ditulis Siswa:</span>
                            {isEditingExamAnswers ? (
                              <textarea
                                rows={2}
                                value={studentAns}
                                onChange={e => {
                                  setEditingAnswers({ ...editingAnswers, [idx]: e.target.value });
                                }}
                                className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                                placeholder="Edit jawaban esai siswa..."
                              />
                            ) : (
                              <p className="text-gray-900 font-medium whitespace-pre-wrap">
                                {studentAns || <em className="text-gray-400">Siswa tidak mengisi jawaban.</em>}
                              </p>
                            )}
                            <div className="pt-1 text-[11px] text-emerald-800 font-medium">
                              <strong>Kunci/Pedoman Guru:</strong> "{q.answerKey || q.answer || '-'}"
                            </div>
                          </div>

                          {/* Individual Score Input Field for this Essay Question */}
                          <div className="bg-purple-100/70 p-3 rounded-xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-purple-700" />
                                Nilai Butir Soal Esai #{idx + 1} (Skala 0 - 100):
                              </label>
                              <p className="text-[11px] text-purple-800 mt-0.5">
                                Mengisi nilai esai ini otomatis menghitung dan menjumlah ke Nilai Akhir siswa.
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={essayScoreVal}
                                onChange={e => handleEssayScoreChange(idx, Number(e.target.value))}
                                className="w-24 p-2 bg-white border-2 border-purple-400 rounded-xl font-black text-center text-base text-purple-900 focus:ring-2 focus:ring-purple-500 shadow-2xs"
                              />
                              <span className="text-xs font-bold text-purple-900">/ 100</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Final Score & Status Control */}
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1">
                      Nilai Akhir Siswa (Terhitung Otomatis dari PG + Esai)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={gradingScore}
                        onChange={e => setGradingScore(Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="w-full p-3 bg-white border border-gray-300 rounded-xl font-black text-xl text-indigo-700 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                        Skala 0 - 100
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1">
                      Status Kelulusan / Evaluasi
                    </label>
                    <select
                      value={gradingStatus}
                      onChange={e => setGradingStatus(e.target.value as any)}
                      className="w-full p-3 bg-white border border-gray-300 rounded-xl font-bold text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="graded">✅ Selesai Dinilai</option>
                      <option value="submitted">⏳ Perlu Koreksi / Periksa Ulang</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">
                    Catatan / Umpan Balik Guru untuk Siswa
                  </label>
                  <textarea
                    rows={2}
                    value={gradingFeedback}
                    onChange={e => setGradingFeedback(e.target.value)}
                    placeholder="Berikan catatan, masukan, atau evaluasi hasil ujian kepada siswa..."
                    className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {gradingModal.submission && (
                  <button
                    type="button"
                    onClick={() => handleResetStudentExam(gradingModal)}
                    disabled={resettingId === gradingModal.student.id}
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Ujian Siswa Ini (0)
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGradingModal(null)}
                  className="px-4 py-2 text-gray-600 font-semibold hover:bg-gray-200 rounded-xl text-xs transition"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleSaveGrade}
                  disabled={savingGrade}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {savingGrade ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {savingGrade ? 'Menyimpan...' : 'Simpan Nilai & Koreksi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
