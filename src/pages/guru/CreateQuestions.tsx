import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { 
  FileText, Sparkles, Loader2, Send, Trash2, Eye, X, CheckCircle2, 
  PlusCircle, Edit2, AlertCircle, Save, Check, ArrowUp, ArrowDown, 
  Copy, HelpCircle, BookOpen, Layers, Clock, AlertTriangle, Lock, Calendar,
  KeyRound, ShieldCheck, Download, Upload, Users, ListOrdered, Activity
} from 'lucide-react';
import { generateQuestionsApi } from '../../lib/aiService';
import { generateTaskToken, getTokenTimeRemaining } from '../../lib/examToken';
import {
  downloadWordQuestionTemplate,
  extractTextFromWordFile,
  parseQuestionsFromText
} from '../../lib/wordQuestionHelper';

export default function CreateQuestions() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [materialTopics, setMaterialTopics] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customTopic, setCustomTopic] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [autoPublish, setAutoPublish] = useState(false);
  
  // Waktu Diterbitkan ke Siswa States
  const [scheduleType, setScheduleType] = useState<'NOW' | 'SCHEDULED'>('NOW');
  const [scheduledAt, setScheduledAt] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  
  const [form, setForm] = useState({
    class_id: '',
    subject_name: '',
    title: '',
    type: 'pg', // 'pg', 'essay', 'mixed'
    count: 5,
    optionCount: 5 // 3 (A-C), 4 (A-D), 5 (A-E)
  });

  // Multi-select classes state (pilihan beberapa kelas)
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  // Import Soal Word Modal States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [importingFile, setImportingFile] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  // Draft questions state - NOT saved to database until user publishes
  const [generatedQuestions, setGeneratedQuestions] = useState<any[] | null>(null);
  const [draftMetadata, setDraftMetadata] = useState<{
    class_id: string;
    class_ids: string[];
    subject_name: string;
    title: string;
    type: string;
  }>({
    class_id: '',
    class_ids: [],
    subject_name: '',
    title: '',
    type: 'pg'
  });

  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [editingExistingTask, setEditingExistingTask] = useState<any | null>(null);
  const [savingEditTask, setSavingEditTask] = useState(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyToken = (taskId: string, token: string) => {
    navigator.clipboard?.writeText(token);
    setCopiedTokenId(taskId);
    setTimeout(() => {
      setCopiedTokenId(prev => (prev === taskId ? null : prev));
    }, 2000);
  };

  useEffect(() => {
    fetchClasses();
    fetchTeacherSubjects();
    fetchMaterialTopics();
    fetchTasks();
  }, [user]);

  async function fetchClasses() {
    const { data } = await supabase.from('classes').select('id, name').order('name');
    if (data) setClasses(data);
  }

  async function fetchTeacherSubjects() {
    if (!user) return;
    const { data } = await supabase
      .from('subjects')
      .select('name')
      .eq('guru_id', user.id);

    if (data && data.length > 0) {
      const parsed: string[] = [];
      data.forEach(s => {
        if (s.name) {
          s.name.split(',').forEach(item => {
            const trimmed = item.trim();
            if (trimmed && !parsed.includes(trimmed)) parsed.push(trimmed);
          });
        }
      });
      setTeacherSubjects(parsed);
      if (parsed.length > 0 && !form.subject_name) {
        setForm(prev => ({ ...prev, subject_name: parsed[0] }));
      }
    }
  }

  async function fetchMaterialTopics() {
    if (!user) return;
    const { data } = await supabase
      .from('teaching_materials')
      .select('id, topic, title, subject_name, grade')
      .eq('guru_id', user.id);

    if (data) setMaterialTopics(data);
  }

  async function fetchTasks() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('guru_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        const ownTasks = data.filter((t: any) => t.guru_id === user.id);
        setTasks(ownTasks);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setTasks([]);
    }
  }

  const toggleSelectClass = (classId: string) => {
    setSelectedClassIds(prev => {
      const exists = prev.includes(classId);
      const next = exists ? prev.filter(id => id !== classId) : [...prev, classId];
      setForm(f => ({ ...f, class_id: next[0] || '' }));
      return next;
    });
  };

  const handleSelectAllClasses = () => {
    if (selectedClassIds.length === classes.length) {
      setSelectedClassIds([]);
      setForm(f => ({ ...f, class_id: '' }));
    } else {
      const allIds = classes.map(c => c.id);
      setSelectedClassIds(allIds);
      setForm(f => ({ ...f, class_id: 'ALL_GRADE' }));
    }
  };

  const toggleDraftClass = (classId: string) => {
    setDraftMetadata(prev => {
      const current = prev.class_ids || [];
      const exists = current.includes(classId);
      const next = exists ? current.filter(id => id !== classId) : [...current, classId];
      return {
        ...prev,
        class_ids: next,
        class_id: next.length === classes.length ? 'ALL_GRADE' : (next[0] || '')
      };
    });
  };

  const buildDefaultOptions = (numOpts: number = form.optionCount) => {
    const count = Math.min(5, Math.max(3, Number(numOpts) || 4));
    return Array.from({ length: count }, (_, i) => `Pilihan ${String.fromCharCode(65 + i)}`);
  };

  const normalizeOptionsCount = (options: any[], targetCount: number) => {
    const count = Math.min(5, Math.max(3, Number(targetCount) || 4));
    const base = Array.isArray(options) ? [...options] : [];
    while (base.length < count) {
      base.push(`Pilihan ${String.fromCharCode(65 + base.length)}`);
    }
    return base.slice(0, count);
  };

  const handleGenerateQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClassIds.length === 0 || !form.subject_name || !form.title) {
      alert('Mohon pilih minimal 1 Target Kelas, Mata Pelajaran, dan Judul/Topik Soal!');
      return;
    }

    setLoading(true);
    setGeneratedQuestions(null);
    setEditingQuestionIdx(null);

    try {
      const data = await generateQuestionsApi({
        topic: `${form.subject_name} - ${form.title}`,
        type: form.type,
        count: form.count,
        optionCount: form.optionCount
      });

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('AI tidak mengembalikan butir soal yang valid.');
      }

      // Normalise questions structure & enforce selected optionCount for PG
      const formatted = data.map((q: any) => {
        const qType = q.type || (form.type === 'essay' ? 'essay' : 'pg');
        const normalizedOpts =
          qType === 'pg'
            ? normalizeOptionsCount(q.options, form.optionCount)
            : [];
        const maxLetter = String.fromCharCode(65 + normalizedOpts.length - 1);
        const rawAns = String(q.answer || 'A').trim().toUpperCase().charAt(0);
        const safeAns = qType === 'pg' && rawAns >= 'A' && rawAns <= maxLetter ? rawAns : 'A';

        return {
          type: qType,
          question: q.question || 'Pertanyaan...',
          options: normalizedOpts,
          answer: qType === 'pg' ? safeAns : (q.answer || ''),
          answerKey: q.answerKey || q.answer || '',
          explanation: q.explanation || ''
        };
      });

      const nextMeta = {
        class_id: selectedClassIds.length === classes.length ? 'ALL_GRADE' : selectedClassIds[0],
        class_ids: [...selectedClassIds],
        subject_name: form.subject_name,
        title: form.title,
        type: form.type
      };

      setGeneratedQuestions(formatted);
      setDraftMetadata(nextMeta);

      // If autoPublish is explicitly checked by user, publish directly
      if (autoPublish) {
        await publishQuestionsDirectly(formatted, nextMeta);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal meracik soal dari AI. Pastikan server aktif dan koneksi stabil.');
    } finally {
      setLoading(false);
    }
  };

  const publishQuestionsDirectly = async (
    questionsToPublish: any[],
    meta = draftMetadata
  ) => {
    if (!questionsToPublish || questionsToPublish.length === 0 || !user) {
      alert('Tidak ada butir soal untuk diterbitkan.');
      return;
    }

    const targetIds: string[] =
      Array.isArray(meta.class_ids) && meta.class_ids.length > 0
        ? meta.class_ids
        : meta.class_id === 'ALL_GRADE'
        ? classes.map(c => c.id)
        : meta.class_id
        ? [meta.class_id]
        : [];

    if (targetIds.length === 0 || !meta.subject_name || !meta.title) {
      alert('Mohon pilih minimal 1 Target Kelas, Mata Pelajaran, dan Judul Soal sebelum menerbitkan.');
      return;
    }

    setSaving(true);
    try {
      const effectivePublishTime = scheduleType === 'SCHEDULED' && scheduledAt
        ? new Date(scheduledAt).toISOString()
        : new Date().toISOString();

      const questionsWithSchedule = questionsToPublish.map(q => ({
        ...q,
        published_at: effectivePublishTime
      }));

      const inserts = targetIds.map(cid => ({
        guru_id: user.id,
        class_id: cid,
        subject_name: meta.subject_name,
        title: meta.title,
        type: meta.type,
        content: questionsWithSchedule
      }));

      const { error } = await supabase.from('tasks').insert(inserts);
      if (error) throw error;

      const targetNames = targetIds
        .map(id => classes.find(c => c.id === id)?.name)
        .filter(Boolean)
        .map(n => `Kelas ${n}`)
        .join(', ');

      const isFuture = new Date(effectivePublishTime).getTime() > Date.now();
      const formattedTime = new Date(effectivePublishTime).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
      if (isFuture) {
        alert(`✅ Sukses! Paket soal "${meta.title}" (${questionsToPublish.length} butir soal) telah dijadwalkan terbit ke ${inserts.length} kelas (${targetNames}) pada ${formattedTime} WIB.`);
      } else {
        alert(`✅ Sukses! Paket soal "${meta.title}" (${questionsToPublish.length} butir soal) berhasil diterbitkan ke ${inserts.length} kelas (${targetNames}).`);
      }

      // Clear draft after publish
      setGeneratedQuestions(null);
      setEditingQuestionIdx(null);
      setForm(prev => ({ ...prev, class_id: '', subject_name: teacherSubjects[0] || '', title: '', type: 'pg', count: 5 }));
      setSelectedClassIds([]);
      setCustomTopic(false);
      fetchTasks();
    } catch (err: any) {
      alert('Gagal menerbitkan soal: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishTask = async () => {
    if (!generatedQuestions) return;
    await publishQuestionsDirectly(generatedQuestions, draftMetadata);
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus paket soal/tugas ini? Data nilai siswa untuk tugas ini juga akan terhapus.')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) fetchTasks();
  };

  const removeQuestion = (idx: number) => {
    if (!generatedQuestions) return;
    if (generatedQuestions.length <= 1) {
      if (!confirm('Ini adalah butir soal terakhir. Yakin ingin menghapusnya?')) return;
    }
    const updated = generatedQuestions.filter((_, i) => i !== idx);
    setGeneratedQuestions(updated);
    if (editingQuestionIdx === idx) setEditingQuestionIdx(null);
  };

  const duplicateQuestion = (idx: number) => {
    if (!generatedQuestions) return;
    const target = generatedQuestions[idx];
    const clone = JSON.parse(JSON.stringify(target));
    clone.question = `${clone.question} (Salinan)`;
    const updated = [...generatedQuestions];
    updated.splice(idx + 1, 0, clone);
    setGeneratedQuestions(updated);
    setEditingQuestionIdx(idx + 1);
  };

  const moveQuestion = (idx: number, direction: 'up' | 'down') => {
    if (!generatedQuestions) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= generatedQuestions.length) return;
    
    const updated = [...generatedQuestions];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setGeneratedQuestions(updated);
    setEditingQuestionIdx(targetIdx);
  };

  const addManualQuestion = () => {
    const isEssayDefault = form.type === 'essay';
    const newQ = {
      type: isEssayDefault ? 'essay' : 'pg',
      question: 'Tulis pertanyaan baru di sini...',
      options: isEssayDefault ? [] : buildDefaultOptions(form.optionCount),
      answer: isEssayDefault ? '' : 'A',
      answerKey: '',
      explanation: 'Penjelasan jawaban'
    };
    if (generatedQuestions) {
      setGeneratedQuestions([...generatedQuestions, newQ]);
      setEditingQuestionIdx(generatedQuestions.length);
    } else {
      const initialClassIds = selectedClassIds.length > 0
        ? [...selectedClassIds]
        : classes[0]?.id ? [classes[0].id] : [];
      if (selectedClassIds.length === 0 && initialClassIds.length > 0) {
        setSelectedClassIds(initialClassIds);
      }
      setGeneratedQuestions([newQ]);
      setDraftMetadata({
        class_id: initialClassIds[0] || '',
        class_ids: initialClassIds,
        subject_name: form.subject_name || (teacherSubjects[0] || 'Mata Pelajaran'),
        title: form.title || 'Paket Soal Manual Baru',
        type: form.type || 'pg'
      });
      setEditingQuestionIdx(0);
    }
  };

  const handleDownloadWordTemplate = async () => {
    try {
      await downloadWordQuestionTemplate(
        form.optionCount,
        form.subject_name || teacherSubjects[0] || 'Mata Pelajaran',
        form.title || 'Evaluasi Pembelajaran'
      );
    } catch (err: any) {
      alert('Gagal mengunduh template Word: ' + err.message);
    }
  };

  const handleWordFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingFile(true);
    setImportFileName(file.name);
    try {
      const extractedText = await extractTextFromWordFile(file);
      setImportRawText(extractedText);
    } catch (err: any) {
      alert('Gagal membaca file Word: ' + (err.message || 'Format file tidak didukung'));
    } finally {
      setImportingFile(false);
      e.target.value = '';
    }
  };

  const handleProcessWordImport = () => {
    const parsed = parseQuestionsFromText(importRawText, form.optionCount);
    if (parsed.length === 0) {
      alert(
        'Tidak ditemukan butir soal yang terdeteksi.\n\nPastikan setiap soal diawali nomor (1., 2., dst.), pilihan jawaban diawali huruf (A., B., C., dst.), dan terdapat baris "Kunci: A".'
      );
      return;
    }

    const initialClassIds = selectedClassIds.length > 0
      ? [...selectedClassIds]
      : classes[0]?.id ? [classes[0].id] : [];
    if (selectedClassIds.length === 0 && initialClassIds.length > 0) {
      setSelectedClassIds(initialClassIds);
    }

    const hasPg = parsed.some(q => q.type === 'pg');
    const hasEssay = parsed.some(q => q.type === 'essay');
    const detectedType = hasPg && hasEssay ? 'mixed' : hasEssay ? 'essay' : 'pg';

    if (generatedQuestions && importMode === 'append') {
      setGeneratedQuestions([...generatedQuestions, ...parsed]);
    } else {
      setGeneratedQuestions(parsed);
      setDraftMetadata({
        class_id: initialClassIds[0] || '',
        class_ids: initialClassIds,
        subject_name: form.subject_name || (teacherSubjects[0] || 'Mata Pelajaran'),
        title: form.title || (importFileName ? importFileName.replace(/\.[^.]+$/, '') : 'Paket Soal Import Word'),
        type: detectedType
      });
    }

    setShowImportModal(false);
    setImportRawText('');
    setImportFileName('');
  };

  // Save changes to existing task
  const handleSaveEditedTask = async () => {
    if (!editingExistingTask) return;
    setSavingEditTask(true);

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: editingExistingTask.title,
          subject_name: editingExistingTask.subject_name,
          class_id: editingExistingTask.class_id,
          type: editingExistingTask.type,
          content: editingExistingTask.content
        })
        .eq('id', editingExistingTask.id);

      if (error) throw error;

      alert('✅ Sukses! Perubahan paket soal berhasil disimpan.');
      setEditingExistingTask(null);
      fetchTasks();
    } catch (err: any) {
      alert('Gagal menyimpan perubahan: ' + err.message);
    } finally {
      setSavingEditTask(false);
    }
  };

  // Filter and deduplicate topics for the selected subject
  const uniqueMaterialTopics: string[] = Array.from(
    new Set(
      materialTopics
        .filter(m => {
          if (!form.subject_name) return true;
          return !m.subject_name || 
            m.subject_name.toLowerCase().includes(form.subject_name.toLowerCase()) || 
            form.subject_name.toLowerCase().includes(m.subject_name.toLowerCase());
        })
        .map(m => String(m.topic || m.title || ''))
        .filter(Boolean)
    )
  );

  const toggleTopic = (topicName: string) => {
    let updated: string[];
    if (selectedTopics.includes(topicName)) {
      updated = selectedTopics.filter(t => t !== topicName);
    } else {
      updated = [...selectedTopics, topicName];
    }
    setSelectedTopics(updated);
    setForm(prev => ({ ...prev, title: updated.join(', ') }));
  };

  const getClassName = (classId: string) => {
    const c = classes.find(item => item.id === classId);
    return c ? c.name : '-';
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Buat Soal & Ujian (AI)</h1>
        <p className="text-gray-500">
          Buat soal Pilihan Ganda, Esai, atau Campuran secara otomatis dengan AI, edit butir soal sebelum terbit, lalu bagikan ke siswa.
        </p>
      </div>

      {/* Generator Form */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" /> Form Racik Soal AI
          </h2>
          <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold rounded-full border border-blue-100">
            Draf & Review Mode
          </span>
        </div>

        <form onSubmit={handleGenerateQuestions} className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Multi-Select Target Kelas */}
            <div className="md:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Pilih Target Kelas ({selectedClassIds.length} Dipilih)</span>
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllClasses}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  {selectedClassIds.length === classes.length && classes.length > 0
                    ? 'Reset Pilihan'
                    : '✓ Pilih Semua Kelas'}
                </button>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-300 rounded-xl max-h-40 overflow-y-auto space-y-1.5">
                {classes.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2 text-center">Belum ada daftar kelas.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {classes.map(c => {
                      const isChecked = selectedClassIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs cursor-pointer transition ${
                            isChecked
                              ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-2xs'
                              : 'bg-white hover:bg-blue-50/60 text-gray-700 border-gray-200 font-medium'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectClass(c.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                          />
                          <span className="truncate">Kelas {c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Centang satu atau beberapa kelas sekaligus untuk membagikan paket soal ini.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mata Pelajaran</label>
              {teacherSubjects.length > 0 ? (
                <select
                  required
                  value={form.subject_name}
                  onChange={e => {
                    const newSub = e.target.value;
                    setForm({ ...form, subject_name: newSub, title: '' });
                  }}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {teacherSubjects.map((sub, idx) => (
                    <option key={idx} value={sub}>{sub}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={form.subject_name}
                  onChange={e => setForm({ ...form, subject_name: e.target.value })}
                  placeholder="Contoh: Matematika"
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            <div className="md:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Judul / Topik Soal
                </label>
                {uniqueMaterialTopics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomTopic(!customTopic);
                      if (!customTopic) setSelectedTopics([]);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    {customTopic ? '← Pilih dari Bahan Ajar' : '+ Ketik Manual'}
                  </button>
                )}
              </div>

              {!customTopic && uniqueMaterialTopics.length > 0 ? (
                <div className="space-y-2">
                  <div className="p-3 bg-gray-50 border border-gray-300 rounded-xl max-h-40 overflow-y-auto space-y-2">
                    <div className="text-xs text-gray-500 font-medium border-b border-gray-200 pb-1 mb-1 flex justify-between">
                      <span>Centang Topik:</span>
                      <span className="font-bold text-blue-600">{selectedTopics.length} Terpilih</span>
                    </div>
                    {uniqueMaterialTopics.map((topName, idx) => {
                      const isChecked = selectedTopics.includes(topName);
                      return (
                        <label 
                          key={idx} 
                          className={`flex items-center gap-2 text-xs p-2 rounded-lg cursor-pointer transition font-medium ${
                            isChecked ? 'bg-blue-100 text-blue-900 font-bold border border-blue-300' : 'bg-white hover:bg-gray-100 border border-gray-200 text-gray-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTopic(topName)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <span className="flex-1 truncate">{topName}</span>
                        </label>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="Judul Soal Tergabung"
                    className="w-full p-2 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-700"
                  />
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="Contoh: Ulangan Harian Bab 1"
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Soal</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="pg">Pilihan Ganda (PG)</option>
                <option value="essay">Esai</option>
                <option value="mixed">Campuran (PG & Esai)</option>
              </select>
            </div>

            {/* Jumlah Pilihan Jawaban untuk Soal PG */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <ListOrdered className="w-4 h-4 text-blue-600" />
                <span>Jumlah Pilihan Jawaban (PG)</span>
              </label>
              <select
                value={form.optionCount}
                disabled={form.type === 'essay'}
                onChange={e => setForm({ ...form, optionCount: Number(e.target.value) })}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 disabled:opacity-50"
              >
                <option value={3}>3 Pilihan Jawaban (A, B, C)</option>
                <option value={4}>4 Pilihan Jawaban (A, B, C, D)</option>
                <option value={5}>5 Pilihan Jawaban (A, B, C, D, E)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Butir Soal (AI)</label>
              <input
                type="number"
                min={1}
                max={50}
                required
                value={form.count}
                onChange={e => setForm({ ...form, count: Math.max(1, Number(e.target.value)) })}
                placeholder="Jumlah soal, contoh: 10"
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="flex items-center gap-2 p-3 bg-blue-50/70 border border-blue-200 rounded-xl cursor-pointer w-full text-xs font-semibold text-blue-900 hover:bg-blue-100 transition">
                <input 
                  type="checkbox"
                  checked={autoPublish}
                  onChange={e => setAutoPublish(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>⚡ Langsung terbitkan ke seluruh kelas terpilih setelah AI selesai meracik (tanpa review draf)</span>
              </label>
            </div>
          </div>

          {/* Pilihan Waktu Diterbitkan ke Siswa */}
          <div className="p-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 rounded-2xl border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Pilihan Waktu Diterbitkan ke Siswa
              </label>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                scheduleType === 'NOW'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                {scheduleType === 'NOW' ? '⚡ Langsung Terbit (Seketika)' : '🕒 Terjadwal Otomatis'}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-center gap-3 ${
                scheduleType === 'NOW' ? 'bg-white border-blue-600 shadow-sm ring-1 ring-blue-300' : 'bg-white/70 border-gray-200 hover:bg-white'
              }`}>
                <input
                  type="radio"
                  name="scheduleType"
                  checked={scheduleType === 'NOW'}
                  onChange={() => setScheduleType('NOW')}
                  className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <div>
                  <p className="text-xs font-bold text-gray-900 flex items-center gap-1">
                    <span>🚀 Terbitkan Sekarang</span>
                  </p>
                  <p className="text-[11px] text-gray-500">Soal langsung tampil dan dapat dikerjakan siswa kelas target</p>
                </div>
              </label>

              <label className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-center gap-3 ${
                scheduleType === 'SCHEDULED' ? 'bg-white border-blue-600 shadow-sm ring-1 ring-blue-300' : 'bg-white/70 border-gray-200 hover:bg-white'
              }`}>
                <input
                  type="radio"
                  name="scheduleType"
                  checked={scheduleType === 'SCHEDULED'}
                  onChange={() => setScheduleType('SCHEDULED')}
                  className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <div>
                  <p className="text-xs font-bold text-gray-900 flex items-center gap-1">
                    <span>📅 Jadwalkan Waktu Tertentu</span>
                  </p>
                  <p className="text-[11px] text-gray-500">Soal terkunci dan otomatis dibuka saat tanggal/jam tiba</p>
                </div>
              </label>
            </div>

            {scheduleType === 'SCHEDULED' && (
              <div className="pt-2 p-3 bg-white rounded-xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-fadeIn">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Pilih Tanggal & Waktu Rilis:
                </label>
                <input
                  type="datetime-local"
                  required={scheduleType === 'SCHEDULED'}
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="p-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 bg-gray-50"
                />
                <span className="text-[11px] text-blue-700 font-medium">
                  🕒 Siswa baru dapat membuka soal mulai waktu yang ditentukan (WIB).
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition flex items-center justify-center disabled:opacity-70 shadow-sm text-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
              {loading ? 'AI Sedang Meracik Soal...' : 'Buatkan Soal dengan AI'}
            </button>

            <button
              type="button"
              onClick={addManualQuestion}
              className="px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition flex items-center text-sm"
            >
              <PlusCircle className="w-4 h-4 mr-2 text-gray-600" /> + Tambah Soal Manual
            </button>

            <button
              type="button"
              onClick={() => {
                setImportMode(generatedQuestions ? 'append' : 'replace');
                setShowImportModal(true);
              }}
              className="px-4 py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold rounded-xl hover:bg-indigo-100 transition flex items-center text-sm gap-2"
            >
              <Upload className="w-4 h-4 text-indigo-600" /> Import Soal dari Word
            </button>

            <button
              type="button"
              onClick={handleDownloadWordTemplate}
              className="px-4 py-3 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold rounded-xl hover:bg-emerald-100 transition flex items-center text-sm gap-2"
              title="Download Template Format Microsoft Word (.docx) untuk Soal Manual"
            >
              <Download className="w-4 h-4 text-emerald-600" /> Template Format Word (.docx)
            </button>
          </div>
        </form>
      </div>

      {/* Generated Preview & Interactive Question Editor */}
      {generatedQuestions && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-300 overflow-hidden animate-fadeIn">
          {/* Action Header Banner */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-5 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-amber-400 text-amber-950 text-xs font-extrabold rounded-full uppercase tracking-wider">
                  Draf Belum Terbit
                </span>
                <h2 className="text-xl font-bold">Hasil Soal ({generatedQuestions.length} Butir Soal)</h2>
              </div>
              <p className="text-xs text-blue-100 mt-1">
                ℹ️ Soal ini masih berupa draf. Silakan review, edit isi pertanyaan/jawaban di bawah, lalu klik <strong>"Terbitkan ke Siswa Sekarang"</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
              <button
                type="button"
                onClick={addManualQuestion}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold backdrop-blur-sm transition flex items-center"
              >
                <PlusCircle className="w-4 h-4 mr-1" /> + Tambah Butir
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportMode('append');
                  setShowImportModal(true);
                }}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold backdrop-blur-sm transition flex items-center"
              >
                <Upload className="w-4 h-4 mr-1" /> + Import Word
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Yakin ingin membuang draf soal ini?')) {
                    setGeneratedQuestions(null);
                    setEditingQuestionIdx(null);
                  }
                }}
                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 rounded-xl text-xs font-bold transition flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Buang Draf
              </button>

              <button
                onClick={handlePublishTask}
                disabled={saving}
                className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl shadow-md transition flex items-center justify-center disabled:opacity-50 text-sm"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                {saving ? 'Menerbitkan...' : '🚀 Terbitkan ke Siswa Sekarang'}
              </button>
            </div>
          </div>

          {/* Draft Metadata Customizer (Supports Multiple Classes) */}
          <div className="p-4 bg-blue-50/60 border-b border-blue-200 space-y-3 text-xs">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Judul Paket Soal</label>
                <input
                  type="text"
                  value={draftMetadata.title}
                  onChange={e => setDraftMetadata({ ...draftMetadata, title: e.target.value })}
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg font-bold text-gray-900"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  value={draftMetadata.subject_name}
                  onChange={e => setDraftMetadata({ ...draftMetadata, subject_name: e.target.value })}
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg font-semibold text-gray-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold text-gray-700">
                  Target Kelas Penerima Soal ({draftMetadata.class_ids?.length || 0} Kelas Dipilih)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const allSelected = (draftMetadata.class_ids?.length || 0) === classes.length;
                    const nextIds = allSelected ? [] : classes.map(c => c.id);
                    setDraftMetadata({
                      ...draftMetadata,
                      class_ids: nextIds,
                      class_id: allSelected ? '' : 'ALL_GRADE'
                    });
                  }}
                  className="text-xs font-bold text-blue-700 hover:underline"
                >
                  {(draftMetadata.class_ids?.length || 0) === classes.length ? 'Reset Pilihan Kelas' : '✓ Pilih Semua Kelas'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {classes.map(c => {
                  const isChecked = (draftMetadata.class_ids || []).includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleDraftClass(c.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 ${
                        isChecked
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                      <span>Kelas {c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Questions Items List */}
          <div className="p-6 space-y-6">
            {generatedQuestions.map((q: any, idx: number) => {
              const isEditingThis = editingQuestionIdx === idx;

              return (
                <div 
                  key={idx} 
                  className={`p-5 rounded-2xl border transition-all ${
                    isEditingThis 
                      ? 'bg-blue-50/70 border-blue-400 shadow-md ring-2 ring-blue-200' 
                      : 'bg-gray-50/80 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        q.type === 'pg' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {q.type === 'pg' ? 'Pilihan Ganda' : 'Esai'}
                      </span>
                      <span className="font-bold text-gray-900 text-sm">Butir Soal #{idx + 1}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveQuestion(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg disabled:opacity-30"
                        title="Geser ke Atas"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(idx, 'down')}
                        disabled={idx === generatedQuestions.length - 1}
                        className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg disabled:opacity-30"
                        title="Geser ke Bawah"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateQuestion(idx)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg"
                        title="Duplikasi Soal"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingQuestionIdx(isEditingThis ? null : idx)}
                        className="px-2.5 py-1 text-xs text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg font-bold flex items-center gap-1 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> {isEditingThis ? 'Selesai Edit' : 'Edit Soal'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuestion(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Hapus Butir Soal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isEditingThis ? (
                    /* Inline Editing Mode */
                    <div className="space-y-4 pt-2">
                      <div className="grid sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-bold text-gray-700 mb-1">Teks Pertanyaan</label>
                          <textarea
                            rows={3}
                            value={q.question}
                            onChange={e => {
                              const updated = [...generatedQuestions];
                              updated[idx].question = e.target.value;
                              setGeneratedQuestions(updated);
                            }}
                            className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Tipe Soal</label>
                          <select
                            value={q.type}
                            onChange={e => {
                              const updated = [...generatedQuestions];
                              updated[idx].type = e.target.value;
                              if (e.target.value === 'pg' && (!updated[idx].options || updated[idx].options.length === 0)) {
                                updated[idx].options = ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'];
                                updated[idx].answer = 'A';
                              }
                              setGeneratedQuestions(updated);
                            }}
                            className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold"
                          >
                            <option value="pg">Pilihan Ganda (PG)</option>
                            <option value="essay">Esai</option>
                          </select>
                        </div>
                      </div>

                      {q.type === 'pg' && (
                        <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-gray-200">
                          <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                            <label className="block text-xs font-bold text-gray-700">
                              Pilihan Jawaban ({q.options?.length || 0} Opsi) & Kunci (Klik huruf untuk menetapkan Kunci)
                            </label>
                            <div className="flex items-center gap-1.5">
                              {[3, 4, 5].map(num => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => {
                                    const updated = [...generatedQuestions];
                                    updated[idx].options = normalizeOptionsCount(updated[idx].options, num);
                                    const maxL = String.fromCharCode(65 + num - 1);
                                    if (updated[idx].answer > maxL) {
                                      updated[idx].answer = 'A';
                                    }
                                    setGeneratedQuestions(updated);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold border transition ${
                                    (q.options?.length || 0) === num
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {num} Opsi (A-{String.fromCharCode(65 + num - 1)})
                                </button>
                              ))}
                              {(q.options?.length || 0) < 5 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...generatedQuestions];
                                    const currentOpts = updated[idx].options || [];
                                    updated[idx].options = [...currentOpts, `Pilihan ${String.fromCharCode(65 + currentOpts.length)}`];
                                    setGeneratedQuestions(updated);
                                  }}
                                  className="text-xs font-bold text-blue-600 hover:text-blue-800 ml-1"
                                >
                                  + Tambah Opsi
                                </button>
                              )}
                            </div>
                          </div>

                          {q.options?.map((opt: string, oIdx: number) => {
                            const letter = String.fromCharCode(65 + oIdx);
                            const isCorrect = q.answer === letter;

                            return (
                              <div key={oIdx} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...generatedQuestions];
                                    updated[idx].answer = letter;
                                    setGeneratedQuestions(updated);
                                  }}
                                  className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition shrink-0 ${
                                    isCorrect ? 'bg-green-600 text-white shadow-sm ring-2 ring-green-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                  title={`Jadikan ${letter} sebagai Kunci Jawaban`}
                                >
                                  {letter}
                                </button>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={e => {
                                    const updated = [...generatedQuestions];
                                    updated[idx].options[oIdx] = e.target.value;
                                    setGeneratedQuestions(updated);
                                  }}
                                  className="flex-1 p-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                                  placeholder={`Pilihan ${letter}`}
                                />
                                {isCorrect && (
                                  <span className="text-xs font-bold text-green-700 flex items-center shrink-0">
                                    <Check className="w-3.5 h-3.5 mr-1" /> Kunci
                                  </span>
                                )}
                                {q.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...generatedQuestions];
                                      updated[idx].options = updated[idx].options.filter((_: any, oi: number) => oi !== oIdx);
                                      setGeneratedQuestions(updated);
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                                    title="Hapus opsi ini"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.type === 'essay' && (
                        <div>
                          <label className="block text-xs font-bold text-amber-800 mb-1">Kunci Jawaban Esai / Panduan Guru</label>
                          <textarea
                            rows={2}
                            value={q.answerKey || q.answer || ''}
                            onChange={e => {
                              const updated = [...generatedQuestions];
                              updated[idx].answerKey = e.target.value;
                              updated[idx].answer = e.target.value;
                              setGeneratedQuestions(updated);
                            }}
                            className="w-full p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs"
                            placeholder="Tuliskan kunci/rubrik penilaian esai..."
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Pembahasan / Penjelasan Singkat (Opsional)</label>
                        <input
                          type="text"
                          value={q.explanation || ''}
                          onChange={e => {
                            const updated = [...generatedQuestions];
                            updated[idx].explanation = e.target.value;
                            setGeneratedQuestions(updated);
                          }}
                          className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs"
                          placeholder="Penjelasan kenapa jawaban tersebut benar..."
                        />
                      </div>
                    </div>
                  ) : (
                    /* Read-Only Preview Mode */
                    <div>
                      <p className="text-gray-900 font-medium mb-3 text-sm">{q.question}</p>

                      {q.type === 'pg' && q.options && (
                        <div className="grid sm:grid-cols-2 gap-2.5 mb-2">
                          {q.options.map((opt: string, oIdx: number) => {
                            const letter = String.fromCharCode(65 + oIdx);
                            const isCorrect = q.answer === letter || q.answer === opt;
                            return (
                              <div 
                                key={oIdx} 
                                className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
                                  isCorrect ? 'bg-green-100 border-green-300 text-green-950 font-bold' : 'bg-white border-gray-200 text-gray-700'
                                }`}
                              >
                                <span><strong className="mr-1.5">{letter}.</strong> {opt}</span>
                                {isCorrect && <span className="text-xs text-green-700 font-extrabold">✓ (Kunci)</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.type === 'essay' && (
                        <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-900">
                          <span className="font-bold">Kunci Jawaban Esai:</span> {q.answerKey || q.answer || '-'}
                        </div>
                      )}

                      {q.explanation && (
                        <p className="text-[11px] text-gray-500 mt-2 bg-gray-100/70 p-2 rounded-lg">
                          💡 <strong>Pembahasan:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sticky Bottom Publish Button */}
          <div className="bg-gray-100 p-4 border-t border-gray-200 flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-gray-700">
                Total {generatedQuestions.length} Butir Soal Terbentuk (Draf)
              </span>
              <div className="flex items-center gap-2 text-xs bg-white px-3 py-1.5 rounded-xl border border-gray-300">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-gray-700">Waktu Rilis:</span>
                <select
                  value={scheduleType}
                  onChange={e => setScheduleType(e.target.value as any)}
                  className="font-bold text-gray-900 bg-transparent text-xs cursor-pointer focus:outline-none"
                >
                  <option value="NOW">⚡ Sekarang</option>
                  <option value="SCHEDULED">📅 Terjadwal</option>
                </select>
                {scheduleType === 'SCHEDULED' && (
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    className="p-1 border border-gray-300 rounded text-xs font-bold bg-amber-50"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addManualQuestion}
                className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl font-bold text-xs transition"
              >
                + Tambah Butir
              </button>
              <button
                onClick={handlePublishTask}
                disabled={saving}
                className={`px-6 py-2.5 text-white font-extrabold rounded-xl shadow-md transition flex items-center disabled:opacity-50 text-sm ${
                  scheduleType === 'SCHEDULED'
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : scheduleType === 'SCHEDULED' ? (
                  <Calendar className="w-5 h-5 mr-2" />
                ) : (
                  <Send className="w-5 h-5 mr-2" />
                )}
                {saving
                  ? 'Sedang Memproses...'
                  : scheduleType === 'SCHEDULED'
                  ? '📅 Jadwalkan Terbit Soal'
                  : '🚀 Terbitkan ke Siswa Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Published Tasks List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" /> Daftar Soal & Tugas Terbit (Akun Anda)
            </h2>
            <p className="text-xs text-gray-500">
              Menampilkan daftar soal yang Anda buat. Bagikan <strong>Token Ujian</strong> (otomatis berganti setiap 30 menit) kepada siswa saat ujian dimulai.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              Rotasi Token: {getTokenTimeRemaining(nowMs).formatted}
            </span>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">
              Total: {tasks.length} Paket Soal
            </span>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 font-medium text-sm">Anda belum menerbitkan paket soal pada akun ini.</p>
            <p className="text-gray-400 text-xs mt-1">Gunakan form di atas untuk meracik soal dengan AI dan klik tombol "Terbitkan".</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map((task) => {
              const questionCount = Array.isArray(task.content) ? task.content.length : 0;
              const className = getClassName(task.class_id);
              const pubTime = task.content?.[0]?.published_at || task.created_at;
              const isFuture = pubTime && new Date(pubTime).getTime() > Date.now();
              const currentToken = generateTaskToken(task.id, nowMs);
              const tokenTimer = getTokenTimeRemaining(nowMs);
              const isCopied = copiedTokenId === task.id;

              return (
                <div key={task.id} className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-gray-50/80 px-3 rounded-xl transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-base">{task.title}</span>
                      <span className="text-xs px-2.5 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-md border border-blue-100">
                        Kelas {className}
                      </span>
                      <span className="text-xs text-gray-600 font-medium">
                        · {task.type === 'pg' ? 'Pilihan Ganda' : task.type === 'essay' ? 'Esai' : 'Campuran'} ({questionCount} Soal)
                      </span>
                      {isFuture ? (
                        <span className="text-xs px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-md border border-amber-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-700" />
                          Terjadwal: {new Date(pubTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} WIB
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Terbit Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Mata Pelajaran: <strong className="text-gray-700">{task.subject_name || '-'}</strong> · Dibuat oleh Anda pada {new Date(task.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Rotating 30-Minute Exam Token Box */}
                    <div className="flex items-center gap-2 bg-indigo-50/90 border border-indigo-200 px-3 py-1.5 rounded-xl">
                      <KeyRound className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Token:</span>
                          <span className="font-mono font-black text-sm tracking-widest text-indigo-950 bg-white px-2 py-0.5 rounded border border-indigo-200">
                            {currentToken}
                          </span>
                        </div>
                        <p className="text-[10px] text-indigo-600 font-medium">
                          Berganti dlm <strong>{tokenTimer.formatted}</strong> (30 mnt)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyToken(task.id, currentToken)}
                        className={`ml-1 px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                        }`}
                        title="Salin Token untuk dibagikan ke Siswa"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopied ? 'Tersalin' : 'Salin'}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/dashboard/monitoring?taskId=${task.id}`}
                        className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        title="Monitoring Ujian Siswa (Selesaikan Ujian & Reset Login)"
                      >
                        <Activity className="w-3.5 h-3.5" /> Monitoring
                      </Link>
                      <button 
                        onClick={() => setSelectedTask({ ...task, className })}
                        className="px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        title="Lihat Soal & Token"
                      >
                        <Eye className="w-3.5 h-3.5" /> Lihat
                      </button>
                      <button 
                        onClick={() => setEditingExistingTask(JSON.parse(JSON.stringify(task)))}
                        className="px-3 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        title="Edit Paket Soal"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Hapus Tugas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-blue-50">
              <div>
                <h3 className="text-lg font-bold text-blue-950">{selectedTask.title}</h3>
                <p className="text-xs text-blue-700">Kelas {selectedTask.className || getClassName(selectedTask.class_id)} • {selectedTask.subject_name}</p>
              </div>
              <button 
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Token Ujian 30 Menit Banner in Modal */}
              {(() => {
                const modalToken = generateTaskToken(selectedTask.id, nowMs);
                const modalTimer = getTokenTimeRemaining(nowMs);
                const isModalCopied = copiedTokenId === `modal_${selectedTask.id}`;
                return (
                  <div className="p-4 bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-950 text-white rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                          Token Ujian Siswa (Berubah Otomatis Setiap 30 Menit)
                        </span>
                      </div>
                      <p className="text-xs text-indigo-200">
                        Berikan token ini kepada siswa agar mereka dapat membuka dan mengerjakan soal.
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-amber-300 font-semibold pt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Dilengkapi Sistem Anti-Buka Aplikasi Lain & Alarm Ujian</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/10 border border-white/20 px-4 py-2.5 rounded-xl shrink-0">
                      <div className="text-center">
                        <div className="font-mono text-2xl font-black tracking-widest text-amber-300">
                          {modalToken}
                        </div>
                        <div className="text-[10px] text-indigo-200">
                          Reset dlm <strong>{modalTimer.formatted}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyToken(`modal_${selectedTask.id}`, modalToken)}
                        className="px-3 py-2 bg-white text-indigo-950 hover:bg-indigo-50 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        {isModalCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        {isModalCopied ? 'Tersalin' : 'Salin'}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Publication Status Notice */}
              {(() => {
                const pubTime = selectedTask.content?.[0]?.published_at || selectedTask.created_at;
                const isFuture = pubTime && new Date(pubTime).getTime() > Date.now();
                return (
                  <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                    isFuture ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <Clock className={`w-4 h-4 shrink-0 ${isFuture ? 'text-amber-600' : 'text-emerald-600'}`} />
                      <div>
                        <p className="font-bold">
                          {isFuture ? 'Status: Terjadwal (Belum Dibuka untuk Siswa)' : 'Status: Terbit Aktif (Dapat Dikerjakan Siswa)'}
                        </p>
                        <p className="text-[11px] opacity-80 mt-0.5">
                          Waktu Rilis: <strong>{new Date(pubTime).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })} WIB</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {Array.isArray(selectedTask.content) && selectedTask.content.map((q: any, idx: number) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm">
                  <p className="font-bold text-gray-900 mb-2">{idx + 1}. {q.question}</p>
                  {q.type === 'pg' && q.options && (
                    <div className="space-y-1 pl-4">
                      {q.options.map((opt: string, oIdx: number) => {
                        const letter = String.fromCharCode(65 + oIdx);
                        const isCorrect = q.answer === letter || q.answer === opt;
                        return (
                          <p key={oIdx} className={isCorrect ? 'font-bold text-green-700 bg-green-50 p-1.5 rounded' : 'text-gray-600'}>
                            {letter}. {opt} {isCorrect ? '✓ (Kunci Jawaban)' : ''}
                          </p>
                        );
                      })}
                    </div>
                  )}
                  {q.type === 'essay' && (
                    <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded mt-2">
                      <span className="font-bold">Kunci Jawaban:</span> {q.answerKey || q.answer}
                    </p>
                  )}
                  {q.explanation && (
                    <p className="text-xs text-gray-500 mt-2 bg-gray-100 p-2 rounded">
                      💡 <strong>Pembahasan:</strong> {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Published Task Modal */}
      {editingExistingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-amber-50">
              <div>
                <h3 className="text-lg font-bold text-amber-950 flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-amber-600" /> Edit Paket Soal Terbit
                </h3>
                <p className="text-xs text-amber-700">Perbarui judul, mata pelajaran, target kelas, atau perbaiki butir soal yang telah terbit.</p>
              </div>
              <button 
                onClick={() => setEditingExistingTask(null)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Judul Paket Soal</label>
                  <input
                    type="text"
                    value={editingExistingTask.title || ''}
                    onChange={e => setEditingExistingTask({ ...editingExistingTask, title: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Mata Pelajaran</label>
                  <input
                    type="text"
                    value={editingExistingTask.subject_name || ''}
                    onChange={e => setEditingExistingTask({ ...editingExistingTask, subject_name: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Target Kelas</label>
                  <select
                    value={editingExistingTask.class_id || ''}
                    onChange={e => setEditingExistingTask({ ...editingExistingTask, class_id: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm font-semibold"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>Kelas {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scheduled Publish Time Option in Edit Modal */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  Waktu Diterbitkan ke Siswa (Jadwal Buka Soal)
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <input
                    type="datetime-local"
                    value={(() => {
                      const pubTime = editingExistingTask.content?.[0]?.published_at || editingExistingTask.created_at;
                      if (!pubTime) return '';
                      const d = new Date(pubTime);
                      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    })()}
                    onChange={e => {
                      const iso = e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString();
                      const updatedContent = (editingExistingTask.content || []).map((q: any) => ({
                        ...q,
                        published_at: iso
                      }));
                      setEditingExistingTask({ ...editingExistingTask, content: updatedContent });
                    }}
                    className="p-2 border border-amber-300 bg-white rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-amber-800">
                    {(() => {
                      const pubTime = editingExistingTask.content?.[0]?.published_at;
                      if (!pubTime) return 'Terbit otomatis segera.';
                      const isFuture = new Date(pubTime).getTime() > Date.now();
                      return isFuture 
                        ? '⏳ Soal terkunci dan akan aktif otomatis pada waktu di atas.' 
                        : '✅ Waktu terbit telah lewat / soal aktif sekarang.';
                    })()}
                  </span>
                </div>
              </div>

              {/* Questions Editor Inside Edit Modal */}
              <div className="space-y-4 pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-900 text-sm">Daftar Butir Pertanyaan ({editingExistingTask.content?.length || 0})</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const newQ = {
                        type: 'pg',
                        question: 'Tulis pertanyaan baru...',
                        options: buildDefaultOptions(form.optionCount),
                        answer: 'A'
                      };
                      setEditingExistingTask({
                        ...editingExistingTask,
                        content: [...(editingExistingTask.content || []), newQ]
                      });
                    }}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-100 px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Tambah Butir Soal
                  </button>
                </div>

                {Array.isArray(editingExistingTask.content) && editingExistingTask.content.map((q: any, qIdx: number) => (
                  <div key={qIdx} className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/70 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-gray-700">Soal #{qIdx + 1} ({q.type === 'pg' ? 'Pilihan Ganda' : 'Esai'})</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editingExistingTask.content.filter((_: any, i: number) => i !== qIdx);
                          setEditingExistingTask({ ...editingExistingTask, content: updated });
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Hapus butir soal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Pertanyaan</label>
                      <textarea
                        rows={2}
                        value={q.question}
                        onChange={e => {
                          const updated = [...editingExistingTask.content];
                          updated[qIdx].question = e.target.value;
                          setEditingExistingTask({ ...editingExistingTask, content: updated });
                        }}
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-sm font-medium"
                      />
                    </div>

                    {q.type === 'pg' && q.options && (
                      <div className="space-y-2 bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="block text-xs font-bold text-gray-700">
                            Pilihan Jawaban ({q.options.length} Opsi - Klik huruf untuk kunci):
                          </label>
                          <div className="flex items-center gap-1">
                            {[3, 4, 5].map(num => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => {
                                  const updated = [...editingExistingTask.content];
                                  updated[qIdx].options = normalizeOptionsCount(updated[qIdx].options, num);
                                  const maxL = String.fromCharCode(65 + num - 1);
                                  if (updated[qIdx].answer > maxL) {
                                    updated[qIdx].answer = 'A';
                                  }
                                  setEditingExistingTask({ ...editingExistingTask, content: updated });
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                                  q.options.length === num
                                    ? 'bg-amber-600 text-white border-amber-600'
                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                {num} Opsi
                              </button>
                            ))}
                          </div>
                        </div>
                        {q.options.map((opt: string, oIdx: number) => {
                          const letter = String.fromCharCode(65 + oIdx);
                          const isCorrect = q.answer === letter;

                          return (
                            <div key={oIdx} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...editingExistingTask.content];
                                  updated[qIdx].answer = letter;
                                  setEditingExistingTask({ ...editingExistingTask, content: updated });
                                }}
                                className={`w-7 h-7 rounded text-xs font-bold shrink-0 ${
                                  isCorrect ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                {letter}
                              </button>
                              <input
                                type="text"
                                value={opt}
                                onChange={e => {
                                  const updated = [...editingExistingTask.content];
                                  updated[qIdx].options[oIdx] = e.target.value;
                                  setEditingExistingTask({ ...editingExistingTask, content: updated });
                                }}
                                className="flex-1 p-1.5 text-xs bg-gray-50 border border-gray-300 rounded"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'essay' && (
                      <div>
                        <label className="block text-xs font-bold text-amber-800 mb-1">Kunci Jawaban Esai:</label>
                        <textarea
                          rows={2}
                          value={q.answerKey || q.answer || ''}
                          onChange={e => {
                            const updated = [...editingExistingTask.content];
                            updated[qIdx].answerKey = e.target.value;
                            updated[qIdx].answer = e.target.value;
                            setEditingExistingTask({ ...editingExistingTask, content: updated });
                          }}
                          className="w-full p-2 bg-white border border-amber-200 rounded-lg text-xs"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingExistingTask(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingEditTask}
                onClick={handleSaveEditedTask}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-1.5 disabled:opacity-70 shadow-sm"
              >
                {savingEditTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingEditTask ? 'Menyimpan...' : 'Simpan Perubahan Paket Soal'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Import Soal dari Word & Template Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-200">
            <div className="p-6 bg-gradient-to-r from-indigo-900 to-blue-900 text-white flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> Import Soal Manual & Template Word
                </span>
                <h3 className="text-lg font-bold mt-1">Import Paket Soal dari Microsoft Word (.docx / .doc)</h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  Unduh template Word siap pakai atau unggah file soal Word Anda untuk langsung masuk ke Draf Soal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Step 1: Download Template & Option Count */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-emerald-600" />
                    1. Belum Punya Format? Unduh Template Word (.docx)
                  </h4>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Template otomatis menyesuaikan pilihan ganda <strong>{form.optionCount} Opsi (A–{String.fromCharCode(65 + form.optionCount - 1)})</strong> beserta contoh soal PG & Esai.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadWordTemplate}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-4 h-4" /> Download Template Word
                </button>
              </div>

              {/* Step 2: Upload Word File */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                  2. Pilih File Microsoft Word (.docx / .doc / .txt)
                </label>
                <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl cursor-pointer transition text-center">
                  <Upload className="w-7 h-7 text-indigo-600 mb-2" />
                  <span className="text-sm font-bold text-indigo-950">
                    {importingFile
                      ? 'Sedang membaca dokumen Word...'
                      : importFileName
                      ? `File Terbaca: ${importFileName}`
                      : 'Klik untuk Pilih File Soal Word (.docx / .doc)'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    Mendukung file hasil edit dari Template Word SMAN 21 Garut maupun naskah soal Word standar.
                  </span>
                  <input
                    type="file"
                    accept=".docx,.doc,.txt"
                    onChange={handleWordFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Step 3: Preview / Paste Text */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                    3. Pratinjau Isi Teks Soal / Salin-Tempel Langsung dari Word
                  </label>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                    Terdeteksi: {parseQuestionsFromText(importRawText, form.optionCount).length} Butir Soal
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={importRawText}
                  onChange={e => setImportRawText(e.target.value)}
                  placeholder={`Contoh Format Penulisan:\n1. Ibu kota provinsi Jawa Barat adalah...\nA. Bandung\nB. Garut\nC. Bogor\nD. Bekasi\nE. Cirebon\nKunci: A\nPembahasan: Bandung adalah ibu kota Jawa Barat.\n\n2. [ESAI] Jelaskan 3 faktor utama perubahan sosial!\nKunci: Faktor internal, eksternal, dan perkembangan ilmu pengetahuan.`}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono leading-relaxed focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {generatedQuestions && generatedQuestions.length > 0 && (
                <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="font-bold text-gray-700">Mode Import ke Draf:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-800">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-indigo-600"
                    />
                    <span>Tambahkan ke {generatedQuestions.length} soal draf saat ini</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-800">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-indigo-600"
                    />
                    <span>Ganti dengan soal hasil import baru</span>
                  </label>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-gray-600 font-semibold hover:bg-gray-200 rounded-xl text-sm transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessWordImport}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Proses & Masukkan ke Draf Soal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
