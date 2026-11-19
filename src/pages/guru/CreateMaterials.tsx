import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import {
  BookOpen,
  Sparkles,
  Loader2,
  Save,
  Trash2,
  Eye,
  X,
  Send,
  Edit3,
  Maximize2,
  Minimize2,
  Film,
  FileText,
  CheckCircle2,
  Search,
  LayoutGrid,
  List,
  Calendar,
  Layers,
  Presentation,
  Trophy,
  Network,
  BarChart3,
  FlaskConical,
  Globe,
  Headphones,
  Wand2,
  AlertTriangle,
  Plus,
  Check,
  SlidersHorizontal,
  Clock,
  HelpCircle,
  Play
} from 'lucide-react';
import {
  analyzeModulAjarApi,
  generateMaterialApi,
  searchYoutubeVideosApi,
  YoutubeSearchItem,
  formatAiErrorMessage
} from '../../lib/aiService';
import { resolveRelevantYoutubeVideo } from '../../lib/youtubeLibrary';
import { extractMateriTitleFromModule } from './CreateModulAjar';
import BahanAjarViewer from '../../components/bahan-ajar/BahanAjarViewer';
import AiCreativeAssistantPanel from '../../components/bahan-ajar/AiCreativeAssistantPanel';
import {
  BAHAN_AJAR_FORMATS,
  BahanAjarFormatId,
  ModulAnalysisResult,
  MultiFormatBahanAjarContent,
  StudentDifficultyLevel
} from '../../types/bahanAjar';

const FORMAT_ICONS: Record<BahanAjarFormatId, React.ComponentType<{ className?: string }>> = {
  slide_interaktif: Presentation,
  video_pembelajaran: Film,
  gamifikasi: Trophy,
  peta_konsep: Network,
  infografis: BarChart3,
  modul_digital: BookOpen,
  simulasi_praktik: FlaskConical,
  web_pembelajaran: Globe,
  podcast_audio: Headphones,
  custom_format: Wand2
};

function getFormatSummaryText(mat: any): string {
  const c = mat?.content_json;
  if (!c) return '-';
  if (Array.isArray(c.selectedFormats) && c.selectedFormats.length > 0) {
    return c.selectedFormats
      .map((id: BahanAjarFormatId) => BAHAN_AJAR_FORMATS.find(f => f.id === id)?.label || id)
      .join(' · ');
  }
  const subCount = Array.isArray(c.materials) ? c.materials.length : 0;
  const parts: string[] = [`${subCount} Sub-Materi`];
  if (c.videoUrl) parts.push('Video');
  if (c.imageUrl) parts.push('Visual');
  return parts.join(' · ');
}

export default function CreateMaterials() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analyzingModul, setAnalyzingModul] = useState(false);
  const [saving, setSaving] = useState(false);

  const [result, setResult] = useState<MultiFormatBahanAjarContent | any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAssistant, setShowAssistant] = useState(true);
  const [fullscreenMaterial, setFullscreenMaterial] = useState<any | null>(null);

  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [savedMaterials, setSavedMaterials] = useState<any[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);
  const [editingSavedMaterial, setEditingSavedMaterial] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Filter & view state
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialSubjectFilter, setMaterialSubjectFilter] = useState('ALL');
  const [materialClassFilter, setMaterialClassFilter] = useState('ALL');
  const [materialViewMode, setMaterialViewMode] = useState<'grid' | 'table'>('table');

  // Step 1: Modul Ajar Source & Analysis
  const [sourceMode, setSourceMode] = useState<'modul_tersimpan' | 'teks_modul' | 'manual'>(
    'modul_tersimpan'
  );
  const [savedModules, setSavedModules] = useState<any[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [selectedMeetingIndex, setSelectedMeetingIndex] = useState<string>('ALL');
  const [rawModulText, setRawModulText] = useState<string>('');
  const [analysis, setAnalysis] = useState<ModulAnalysisResult | null>(null);
  const [analysisConfirmed, setAnalysisConfirmed] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string>('');

  // Step 2: Format Freedom & Configuration
  const [selectedFormats, setSelectedFormats] = useState<BahanAjarFormatId[]>(['slide_interaktif']);
  const [tingkatKesulitan, setTingkatKesulitan] = useState<StudentDifficultyLevel>('reguler');
  const [videoDurationMinutes, setVideoDurationMinutes] = useState<number>(5);
  const [enableLeaderboard, setEnableLeaderboard] = useState<boolean>(true);
  const [customFormatPrompt, setCustomFormatPrompt] = useState<string>('');

  // Practice questions & video configuration
  const [jumlahLatihanSoal, setJumlahLatihanSoal] = useState<number>(5);
  const [jenisLatihanSoal, setJenisLatihanSoal] = useState<'campuran' | 'pg' | 'essay'>('campuran');
  const [includeVideoSupport, setIncludeVideoSupport] = useState<boolean>(true);
  const [searchingVideos, setSearchingVideos] = useState<boolean>(false);
  const [youtubeCandidates, setYoutubeCandidates] = useState<YoutubeSearchItem[]>([]);
  const [selectedVideoMeta, setSelectedVideoMeta] = useState<{ title?: string; channel?: string } | null>(null);

  // Delete modal & feedback banner (non-blocking for iframe environments)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    subject: '',
    grade: '',
    class_id: '',
    topic: '',
    description: '',
    videoUrl: ''
  });

  useEffect(() => {
    fetchClasses();
    fetchTeacherSubjects();
    fetchSavedMaterials();
    fetchSavedModules();
  }, [user]);

  async function fetchClasses() {
    const { data } = await supabase.from('classes').select('id, name').order('name');
    if (data) setClasses(data);
  }

  async function fetchTeacherSubjects() {
    if (!user) return;
    const { data } = await supabase.from('subjects').select('name').eq('guru_id', user.id);

    if (data && data.length > 0) {
      const parsed: string[] = [];
      data.forEach(s => {
        if (s.name) {
          s.name.split(',').forEach((item: string) => {
            const trimmed = item.trim();
            if (trimmed && !parsed.includes(trimmed)) parsed.push(trimmed);
          });
        }
      });
      setTeacherSubjects(parsed);
      if (parsed.length > 0 && !form.subject) {
        setForm(prev => ({ ...prev, subject: parsed[0] }));
      }
    }
  }

  async function fetchSavedMaterials() {
    if (!user) return;
    const { data, error } = await supabase
      .from('teaching_materials')
      .select('*, class:classes(name)')
      .eq('guru_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSavedMaterials(data.filter((m: any) => m.guru_id === user.id));
    } else {
      setSavedMaterials([]);
    }
  }

  async function fetchSavedModules() {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('modul_ajar')
        .select('*')
        .eq('guru_id', user.id)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setSavedModules(data);
        const params = new URLSearchParams(window.location.search);
        const mId = params.get('modulId');
        if (mId) {
          const matched = data.find(m => m.id === mId);
          if (matched) {
            setSourceMode('modul_tersimpan');
            setSelectedModuleId(mId);
            setSelectedMeetingIndex('ALL');
            applyModuleSelection(matched, 'ALL');
          }
        }
      }
    } catch (err) {
      console.warn('Gagal memuat daftar modul ajar:', err);
    }
  }

  const normalizeGrade = (raw: string): string => {
    const upper = (raw || '').toUpperCase();
    if (upper.includes('XII') || upper.includes('12')) return 'XII';
    if (upper.includes('XI') || upper.includes('11')) return 'XI';
    if (upper.includes('X') || upper.includes('10')) return 'X';
    return raw || '';
  };

  const applyModuleSelection = (mod: any, meetingIdxStr: string = 'ALL') => {
    const gradeVal = normalizeGrade(mod.grade || '');
    const subjectVal = mod.subject_name || form.subject;
    const materiTitle = extractMateriTitleFromModule(mod);
    const cleanTitle =
      materiTitle || (mod.title ? mod.title.replace(/^Modul Ajar:\s*/i, '') : mod.subject_name);

    const cJson = mod.content_json || {};
    const pertemuanList = Array.isArray(cJson.pertemuan) ? cJson.pertemuan : [];

    let topicVal = cleanTitle;
    if (meetingIdxStr !== 'ALL' && pertemuanList.length > 0) {
      const idx = parseInt(meetingIdxStr, 10);
      const meet = pertemuanList[idx] || pertemuanList[0];
      const meetName = meet?.topik || meet?.nama || `Pertemuan ${idx + 1}`;
      topicVal = `${cleanTitle} - ${meetName}`;
    }

    setForm(prev => ({
      ...prev,
      subject: subjectVal || prev.subject,
      grade: gradeVal || prev.grade,
      topic: topicVal || prev.topic
    }));
  };

  const handleSelectModule = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setSelectedMeetingIndex('ALL');
    setAnalysis(null);
    setAnalysisConfirmed(false);
    setAnalysisError('');

    const mod = savedModules.find(m => m.id === moduleId);
    if (mod) {
      applyModuleSelection(mod, 'ALL');
    }
  };

  const handleSelectMeeting = (meetingIdxStr: string) => {
    setSelectedMeetingIndex(meetingIdxStr);
    const mod = savedModules.find(m => m.id === selectedModuleId);
    if (mod) {
      applyModuleSelection(mod, meetingIdxStr);
    }
  };

  const handleAnalyzeModul = async () => {
    setAnalysisError('');
    const mod =
      sourceMode === 'modul_tersimpan' ? savedModules.find(m => m.id === selectedModuleId) : null;

    if (sourceMode === 'modul_tersimpan' && !mod) {
      setAnalysisError('Pilih terlebih dahulu Modul Ajar yang akan dianalisis.');
      return;
    }
    if (sourceMode === 'teks_modul' && rawModulText.trim().length < 20) {
      setAnalysisError('Tempelkan isi Modul Ajar yang lengkap minimal beberapa kalimat untuk dianalisis.');
      return;
    }

    setAnalyzingModul(true);
    setAnalysisConfirmed(false);
    try {
      const res = await analyzeModulAjarApi({
        modulTitle: mod?.title || form.topic || 'Modul Ajar',
        subjectName: mod?.subject_name || form.subject,
        grade: mod?.grade || form.grade,
        cp: mod?.cp || '',
        metode: mod?.metode || '',
        alokasiWaktu: mod?.alokasi_waktu || '',
        contentJson: mod?.content_json || undefined,
        rawText: sourceMode === 'teks_modul' ? rawModulText : undefined
      });

      setAnalysis(res);
      setAnalysisConfirmed(!res.butuhKonfirmasiGuru && (!res.missingItems || res.missingItems.length === 0));

      // Populate form faithfully from analysis if available and non-empty
      setForm(prev => ({
        ...prev,
        subject:
          res.mataPelajaran && !res.mataPelajaran.includes('[Perlu Konfirmasi')
            ? res.mataPelajaran
            : prev.subject,
        grade:
          res.jenjangKelas && !res.jenjangKelas.includes('[Perlu Konfirmasi')
            ? normalizeGrade(res.jenjangKelas) || prev.grade
            : prev.grade,
        topic:
          res.materiPokok && !res.materiPokok.includes('[Perlu Konfirmasi')
            ? res.materiPokok
            : prev.topic
      }));
    } catch (err: any) {
      setAnalysisError(formatAiErrorMessage(err));
    } finally {
      setAnalyzingModul(false);
    }
  };

  const toggleFormatSelection = (fmtId: BahanAjarFormatId) => {
    setSelectedFormats(prev => {
      if (prev.includes(fmtId)) {
        // Keep at least one format selected or allow deselect if more than 1
        return prev.length > 1 ? prev.filter(f => f !== fmtId) : prev;
      }
      return [...prev, fmtId];
    });
  };

  const handleSearchYoutube = async (customTopic?: string, customSubject?: string) => {
    const subj = (customSubject ?? form.subject).trim();
    const tpc = (customTopic ?? form.topic).trim();
    if (!subj && !tpc) {
      setActionFeedback({
        type: 'error',
        text: 'Isi Mata Pelajaran dan Topik Materi terlebih dahulu untuk mencari video pembelajaran yang sesuai.'
      });
      return;
    }

    setSearchingVideos(true);
    setActionFeedback(null);
    try {
      const videos = await searchYoutubeVideosApi(subj, tpc);
      setYoutubeCandidates(videos);
      if (videos.length > 0 && !form.videoUrl.trim() && !customTopic) {
        setForm(prev => ({ ...prev, videoUrl: videos[0].url }));
        setSelectedVideoMeta({ title: videos[0].title, channel: videos[0].channel });
      }
    } catch {
      setActionFeedback({
        type: 'error',
        text: 'Gagal mencari video pembelajaran otomatis. Anda tetap dapat menempelkan tautan YouTube secara manual.'
      });
    } finally {
      setSearchingVideos(false);
    }
  };

  const handleGenerate = async () => {
    setActionFeedback(null);
    if (!form.subject || !form.grade || !form.topic) {
      setActionFeedback({
        type: 'error',
        text: 'Lengkapi Mata Pelajaran, Tingkat Kelas, dan Topik Materi terlebih dahulu.'
      });
      return;
    }
    if (selectedFormats.length === 0) {
      setActionFeedback({
        type: 'error',
        text: 'Pilih minimal satu format bahan ajar.'
      });
      return;
    }
    if (selectedFormats.includes('custom_format') && !customFormatPrompt.trim()) {
      setActionFeedback({
        type: 'error',
        text: 'Tuliskan deskripsi/instruksi Format Bebas (Custom) yang Anda inginkan.'
      });
      return;
    }
    if (analysis?.butuhKonfirmasiGuru && !analysisConfirmed) {
      setActionFeedback({
        type: 'error',
        text: 'Analisis Modul Ajar menandai informasi yang belum lengkap. Tinjau kotak Analisis Modul Ajar dan klik "Konfirmasi Hasil Analisis" terlebih dahulu.'
      });
      return;
    }

    setLoading(true);
    setIsEditing(false);
    try {
      const selectedMod =
        sourceMode === 'modul_tersimpan'
          ? savedModules.find(m => m.id === selectedModuleId)
          : null;
      const cJson = selectedMod?.content_json || {};
      const pertemuanList = Array.isArray(cJson.pertemuan) ? cJson.pertemuan : [];
      const shouldIncludeVideo =
        includeVideoSupport ||
        selectedFormats.includes('video_pembelajaran') ||
        selectedFormats.includes('web_pembelajaran') ||
        Boolean(form.videoUrl.trim());

      const data = await generateMaterialApi({
        subject: form.subject,
        grade: form.grade,
        topic: form.topic,
        description: form.description,
        pertemuanList,
        pertemuanCount: pertemuanList.length,
        selectedMeetingIndex,
        selectedFormats,
        tingkatKesulitan,
        videoDurationMinutes,
        enableLeaderboard,
        customFormatPrompt,
        analysis,
        jumlahLatihanSoal: Math.max(0, Math.min(30, Number(jumlahLatihanSoal) || 0)),
        jenisLatihanSoal,
        customVideoUrl: form.videoUrl.trim() || undefined,
        includeVideoSupport: shouldIncludeVideo
      });

      if (shouldIncludeVideo) {
        if (!data.videoUrl) {
          const resolvedVid = resolveRelevantYoutubeVideo(
            form.subject,
            form.topic,
            form.videoUrl
          );
          data.videoUrl = resolvedVid.videoUrl;
          data.videoTitle = data.videoTitle || resolvedVid.videoTitle;
          data.videoChannel = data.videoChannel || resolvedVid.videoChannel;
        }
        if (selectedVideoMeta && form.videoUrl.trim() && data.videoUrl === form.videoUrl.trim()) {
          data.videoTitle = data.videoTitle || selectedVideoMeta.title;
          data.videoChannel = data.videoChannel || selectedVideoMeta.channel;
        }
        if (
          (!Array.isArray(data.suggestedVideos) || data.suggestedVideos.length === 0) &&
          youtubeCandidates.length > 0
        ) {
          data.suggestedVideos = youtubeCandidates.map(v => ({
            id: v.id,
            url: v.url,
            title: v.title,
            channel: v.channel,
            duration: v.duration
          }));
        }
      }

      setResult(data);
      setActionFeedback({
        type: 'success',
        text: 'Bahan ajar berhasil disusun! Anda dapat meninjau video pembelajaran, latihan soal, atau menyunting sebelum dibagikan ke siswa.'
      });
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: formatAiErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMaterial = async () => {
    setActionFeedback(null);
    if (!result) {
      setActionFeedback({ type: 'error', text: 'Belum ada bahan ajar yang dibuat.' });
      return;
    }
    if (!user) {
      setActionFeedback({ type: 'error', text: 'Sesi login Anda telah berakhir, silakan login ulang.' });
      return;
    }
    if (!form.class_id) {
      setActionFeedback({
        type: 'error',
        text: 'Pilih Target Rombel Kelas terlebih dahulu sebelum membagikan ke siswa.'
      });
      return;
    }

    setSaving(true);
    try {
      const subject = form.subject || 'Mata Pelajaran';
      const topic = form.topic || 'Topik Pembelajaran';
      const grade = form.grade || 'X';

      if (form.class_id === 'ALL_GRADE') {
        const matchingClasses = classes.filter(
          c =>
            !grade ||
            c.name.toLowerCase().startsWith(grade.toLowerCase()) ||
            c.name.includes(grade)
        );
        const targetClassList = matchingClasses.length > 0 ? matchingClasses : classes;

        const inserts = targetClassList.map(c => ({
          guru_id: user.id,
          class_id: c.id,
          subject_name: subject,
          grade: grade,
          topic: topic,
          title: `${subject} - ${topic}`,
          content_json: result
        }));

        const { error } = await supabase.from('teaching_materials').insert(inserts);
        if (error) throw error;
        setActionFeedback({
          type: 'success',
          text: `Bahan Ajar berhasil disimpan & dibagikan ke ${inserts.length} kelas tingkat ${grade}!`
        });
      } else {
        const { error } = await supabase.from('teaching_materials').insert([
          {
            guru_id: user.id,
            class_id: form.class_id,
            subject_name: subject,
            grade: grade,
            topic: topic,
            title: `${subject} - ${topic}`,
            content_json: result
          }
        ]);

        if (error) throw error;
        setActionFeedback({
          type: 'success',
          text: 'Bahan Ajar berhasil disimpan & dibagikan ke siswa!'
        });
      }

      setResult(null);
      setIsEditing(false);
      fetchSavedMaterials();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: 'Gagal menyimpan bahan ajar: ' + (err.message || 'Kesalahan server')
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteMaterial = async () => {
    if (!deleteTarget) return;
    setDeletingMaterial(true);
    setActionFeedback(null);
    const targetId = deleteTarget.id;

    try {
      // Clear optional foreign-key links safely before deletion
      await supabase.from('tasks').update({ material_id: null }).eq('material_id', targetId);

      let delQuery = supabase.from('teaching_materials').delete().eq('id', targetId);
      if (user?.id) {
        delQuery = delQuery.eq('guru_id', user.id);
      }
      const { data: deletedRows, error } = await delQuery.select('id');
      if (error) throw error;

      if (!deletedRows || deletedRows.length === 0) {
        const { data: fallbackRows, error: fallbackErr } = await supabase
          .from('teaching_materials')
          .delete()
          .eq('id', targetId)
          .select('id');
        if (fallbackErr) throw fallbackErr;
        if (!fallbackRows || fallbackRows.length === 0) {
          throw new Error(
            'Bahan ajar tidak dapat dihapus (izin akses database tidak mengizinkan atau data sudah terhapus).'
          );
        }
      }

      setSavedMaterials(prev => prev.filter(m => m.id !== targetId));
      if (selectedMaterial?.id === targetId) setSelectedMaterial(null);
      if (fullscreenMaterial?.id === targetId) setFullscreenMaterial(null);
      if (editingSavedMaterial?.id === targetId) setEditingSavedMaterial(null);

      setDeleteTarget(null);
      setActionFeedback({
        type: 'success',
        text: `Bahan ajar "${deleteTarget.title || deleteTarget.topic}" berhasil dihapus.`
      });
      await fetchSavedMaterials();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: 'Gagal menghapus bahan ajar: ' + (err?.message || 'Terjadi kendala pada database.')
      });
      setDeleteTarget(null);
    } finally {
      setDeletingMaterial(false);
    }
  };

  const handleSaveEditedMaterial = async () => {
    if (!editingSavedMaterial) return;
    setSavingEdit(true);
    setActionFeedback(null);
    try {
      const { error } = await supabase
        .from('teaching_materials')
        .update({
          title: editingSavedMaterial.title,
          topic: editingSavedMaterial.topic,
          subject_name: editingSavedMaterial.subject_name,
          grade: editingSavedMaterial.grade,
          class_id: editingSavedMaterial.class_id,
          content_json: editingSavedMaterial.content_json
        })
        .eq('id', editingSavedMaterial.id);

      if (error) throw error;
      setActionFeedback({ type: 'success', text: 'Bahan ajar berhasil diperbarui!' });
      setEditingSavedMaterial(null);
      fetchSavedMaterials();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: 'Gagal memperbarui bahan ajar: ' + err.message
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const availableClasses = form.grade
    ? classes.filter(
        c =>
          c.name.toLowerCase().startsWith(form.grade.toLowerCase()) || c.name.includes(form.grade)
      )
    : classes;

  const selectedModObj = savedModules.find(m => m.id === selectedModuleId);
  const modMeetings = Array.isArray(selectedModObj?.content_json?.pertemuan)
    ? selectedModObj.content_json.pertemuan
    : [];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Studio Bahan Ajar Multi-Format</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Analisis Modul Ajar secara akurat, pilih atau kombinasikan hingga 10 format interaktif, dan perkaya dengan AI Creative Assistant.
          </p>
        </div>
        <Link
          to="/dashboard/modul"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition shrink-0 self-start md:self-auto"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          Buat Modul Ajar Baru →
        </Link>
      </div>

      {/* IN-PAGE FEEDBACK BANNER */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{actionFeedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 shrink-0"
            aria-label="Tutup pesan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STUDIO BUILDER CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-200">
        {/* STEP 1: SUMBER & ANALISIS MODUL AJAR */}
        <section className="p-6 md:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                Langkah 1 · Analisis Modul Ajar
              </p>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                Baca & Analisis Struktur Modul Ajar Acuan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                AI membaca Modul Ajar tanpa mengarang tujuan pembelajaran baru dan menandai bagian yang perlu konfirmasi guru.
              </p>
            </div>

            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start">
              {(
                [
                  { id: 'modul_tersimpan', label: 'Modul Tersimpan' },
                  { id: 'teks_modul', label: 'Tempel Teks Modul' },
                  { id: 'manual', label: 'Input Manual' }
                ] as const
              ).map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSourceMode(m.id);
                    setAnalysisError('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    sourceMode === m.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {sourceMode === 'modul_tersimpan' && (
            <div className="grid md:grid-cols-3 gap-3">
              <div className={modMeetings.length > 0 ? 'md:col-span-2' : 'md:col-span-3'}>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Modul Ajar Anda
                </label>
                <select
                  value={selectedModuleId}
                  onChange={e => handleSelectModule(e.target.value)}
                  className="w-full p-2.5 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Modul Ajar Tersimpan ({savedModules.length}) --</option>
                  {savedModules.map(m => {
                    const mName = extractMateriTitleFromModule(m);
                    return (
                      <option key={m.id} value={m.id}>
                        [{m.grade || 'Fase'}] {m.subject_name} · {mName} ({m.metode || 'PBL'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {modMeetings.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Cakupan Pertemuan
                  </label>
                  <select
                    value={selectedMeetingIndex}
                    onChange={e => handleSelectMeeting(e.target.value)}
                    className="w-full p-2.5 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">Seluruh Pertemuan ({modMeetings.length} Sesi)</option>
                    {modMeetings.map((meet: any, mIdx: number) => (
                      <option key={mIdx} value={String(mIdx)}>
                        Pertemuan {mIdx + 1}: {meet.topik || meet.nama || `Sesi ${mIdx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {sourceMode === 'teks_modul' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tempelkan Teks Modul Ajar (Identitas, Tujuan Pembelajaran, Materi, Kegiatan, Asesmen)
              </label>
              <textarea
                rows={4}
                value={rawModulText}
                onChange={e => {
                  setRawModulText(e.target.value);
                  setAnalysis(null);
                  setAnalysisConfirmed(false);
                }}
                placeholder="Salin dan tempelkan teks Modul Ajar Anda di sini agar AI menganalisis dan memetakan strukturnya..."
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {sourceMode !== 'manual' && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={analyzingModul}
                onClick={handleAnalyzeModul}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-60 shadow-2xs"
              >
                {analyzingModul ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                {analyzingModul ? 'Menganalisis Modul Ajar...' : 'Analisis Isi Modul Ajar'}
              </button>

              {analysis && (
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Hasil analisis terisi dan dapat disunting sebelum meracik bahan ajar
                </span>
              )}
            </div>
          )}

          {analysisError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              {analysisError}
            </div>
          )}

          {/* Structured Modul Ajar Analysis Card */}
          {analysis && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
              {/* Missing Info Warning Banner */}
              {(analysis.butuhKonfirmasiGuru ||
                (Array.isArray(analysis.missingItems) && analysis.missingItems.length > 0)) && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-amber-950">
                          Konfirmasi Guru Diperlukan (Informasi Tidak Ditemukan Lengkap di Modul)
                        </p>
                        <p className="text-[11px] text-amber-800">
                          Sesuai aturan ketepatan substansi, AI tidak mengarang informasi yang tidak tertulis. Silakan lengkapi atau konfirmasi poin berikut:
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAnalysisConfirmed(!analysisConfirmed)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                        analysisConfirmed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {analysisConfirmed ? 'Sudah Dikonfirmasi' : 'Konfirmasi Hasil Analisis'}
                    </button>
                  </div>

                  {Array.isArray(analysis.missingItems) && analysis.missingItems.length > 0 && (
                    <ul className="space-y-1 text-xs text-amber-900 list-disc list-inside pl-1">
                      {analysis.missingItems.map((m, idx) => (
                        <li key={idx}>
                          <strong>{m.label}:</strong> {m.alasan}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Extracted Identity & Topics */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <p className="text-[11px] text-slate-500">Mata Pelajaran</p>
                  <p className="font-bold text-slate-900 mt-0.5">{analysis.mataPelajaran}</p>
                </div>
                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <p className="text-[11px] text-slate-500">Jenjang / Fase</p>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {analysis.jenjangKelas} · {analysis.fase}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <p className="text-[11px] text-slate-500">Alokasi Waktu</p>
                  <p className="font-bold text-slate-900 mt-0.5">{analysis.alokasiWaktu}</p>
                </div>
                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <p className="text-[11px] text-slate-500">Materi Pokok</p>
                  <p className="font-bold text-slate-900 mt-0.5">{analysis.materiPokok}</p>
                </div>
              </div>

              {/* Editable Tujuan Pembelajaran & Submateri */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">
                      Tujuan Pembelajaran (Asli dari Modul — Dapat Disunting)
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setAnalysis({
                          ...analysis,
                          tujuanPembelajaran: [...(analysis.tujuanPembelajaran || []), '']
                        })
                      }
                      className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Tambah TP
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(analysis.tujuanPembelajaran || []).map((tp, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="text-xs font-semibold text-slate-400 mt-2 w-4">{idx + 1}.</span>
                        <input
                          type="text"
                          value={tp}
                          onChange={e => {
                            const next = [...analysis.tujuanPembelajaran];
                            next[idx] = e.target.value;
                            setAnalysis({ ...analysis, tujuanPembelajaran: next });
                          }}
                          className="flex-1 p-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = analysis.tujuanPembelajaran.filter((_, i) => i !== idx);
                            setAnalysis({ ...analysis, tujuanPembelajaran: next });
                          }}
                          className="p-2 text-slate-400 hover:text-red-600"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">
                      Submateri & Kompetensi Tercapai
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setAnalysis({
                          ...analysis,
                          submateri: [...(analysis.submateri || []), '']
                        })
                      }
                      className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Submateri
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(analysis.submateri || []).map((sub, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={sub}
                          onChange={e => {
                            const next = [...analysis.submateri];
                            next[idx] = e.target.value;
                            setAnalysis({ ...analysis, submateri: next });
                          }}
                          className="flex-1 p-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = analysis.submateri.filter((_, i) => i !== idx);
                            setAnalysis({ ...analysis, submateri: next });
                          }}
                          className="p-2 text-slate-400 hover:text-red-600"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {Array.isArray(analysis.kompetensiDicapai) && analysis.kompetensiDicapai.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-600 mb-1">Kompetensi:</p>
                      <ul className="space-y-0.5 text-[11px] text-slate-700 list-disc list-inside">
                        {analysis.kompetensiDicapai.map((k, idx) => (
                          <li key={idx}>{k}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Kegiatan, Asesmen & Struktur Bahan Ajar */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900">
                    Kegiatan Pembelajaran & Asesmen Modul
                  </h4>
                  {Array.isArray(analysis.kegiatanPembelajaran) &&
                    analysis.kegiatanPembelajaran.map((kg, idx) => (
                      <div key={idx} className="text-[11px] text-slate-700 border-b border-slate-100 pb-1.5 last:border-0">
                        <span className="font-semibold text-slate-900">
                          Pertemuan {kg.pertemuanKe}: {kg.namaPertemuan}
                        </span>{' '}
                        <span className="text-slate-500">({kg.metode})</span>
                        <p className="text-slate-600 mt-0.5">{kg.ringkasanAktivitas}</p>
                      </div>
                    ))}
                  {analysis.asesmenDanIndikator && (
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-700 space-y-1">
                      <p>
                        <strong>Formatif:</strong> {analysis.asesmenDanIndikator.asesmenFormatif}
                      </p>
                      <p>
                        <strong>Sumatif:</strong> {analysis.asesmenDanIndikator.asesmenSumatif}
                      </p>
                      {Array.isArray(analysis.asesmenDanIndikator.indikatorKeberhasilan) && (
                        <div>
                          <strong>Indikator Keberhasilan:</strong>
                          <ul className="list-disc list-inside text-slate-600">
                            {analysis.asesmenDanIndikator.indikatorKeberhasilan.map((ind, i) => (
                              <li key={i}>{ind}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900">
                    Rancangan Struktur Bahan Ajar Hasil Analisis
                  </h4>
                  <div className="space-y-2">
                    {(analysis.strukturBahanAjar || []).map((st, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                        <p className="font-bold text-slate-900">
                          {st.urutan}. {st.bagian}
                        </p>
                        <p className="text-slate-600 mt-0.5">{st.fokusMateri}</p>
                        {st.keterkaitanTujuan && (
                          <p className="text-blue-700 mt-0.5">Acuan: {st.keterkaitanTujuan}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* STEP 2: IDENTITAS KELAS & TOPIK */}
        <section className="p-6 md:p-7 space-y-5 bg-slate-50/40">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Langkah 2 · Identitas Sasaran & Kedalaman Materi
            </p>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              Sasaran Kelas, Topik, dan Penyesuaian Jenjang Siswa
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mata Pelajaran
              </label>
              {teacherSubjects.length > 0 ? (
                <select
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Mapel --</option>
                  {teacherSubjects.map((s, idx) => (
                    <option key={idx} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  placeholder="Contoh: Biologi"
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tingkat Kelas
              </label>
              <select
                value={form.grade}
                onChange={e => setForm({ ...form, grade: e.target.value, class_id: '' })}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih Tingkat --</option>
                <option value="X">Tingkat X (Kelas 10)</option>
                <option value="XI">Tingkat XI (Kelas 11)</option>
                <option value="XII">Tingkat XII (Kelas 12)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Rombel Kelas
              </label>
              <select
                value={form.class_id}
                onChange={e => setForm({ ...form, class_id: e.target.value })}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-xl bg-white font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih Kelas --</option>
                {form.grade && (
                  <option value="ALL_GRADE">Semua Kelas Tingkat {form.grade}</option>
                )}
                {(availableClasses.length > 0 ? availableClasses : classes).map(c => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Topik / Materi Pokok
              </label>
              <input
                type="text"
                value={form.topic}
                onChange={e => setForm({ ...form, topic: e.target.value })}
                placeholder="Contoh: Termodinamika"
                className="w-full p-2.5 text-sm border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Arahan Tambahan Guru (Opsional)
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Contoh: Fokuskan pada pemahaman konsep inti dan contoh penerapan kontekstual di lingkungan sekitar siswa..."
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                Kedalaman & Bahasa Materi
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'dasar', label: 'Dasar' },
                    { id: 'reguler', label: 'Reguler' },
                    { id: 'pengayaan', label: 'Pengayaan' }
                  ] as const
                ).map(lvl => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setTingkatKesulitan(lvl.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition ${
                      tingkatKesulitan === lvl.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Menyesuaikan kompleksitas bahasa dan tingkat tantangan soal sesuai kemampuan siswa.
              </p>
            </div>
          </div>
        </section>

        {/* STEP 3: KEBEBASAN MEMILIH FORMAT (10 FORMAT + MULTI-KOMBINASI) */}
        <section className="p-6 md:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                Langkah 3 · Pilih Format Bahan Ajar (Bebas & Dapat Dikombinasikan)
              </p>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                Pilih 1 atau Gabungkan Beberapa Format Pembelajaran
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tidak ada template tunggal yang dipaksakan. Centang format apa saja yang paling sesuai dengan gaya belajar kelas Anda.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-600 tabular-nums">
                {selectedFormats.length} Format Dipilih
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelectedFormats(['slide_interaktif', 'gamifikasi', 'peta_konsep'])
                }
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
              >
                Paket Kombinasi Interaktif
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {BAHAN_AJAR_FORMATS.map(fmt => {
              const Icon = FORMAT_ICONS[fmt.id] || BookOpen;
              const isSelected = selectedFormats.includes(fmt.id);

              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => toggleFormatSelection(fmt.id)}
                  className={`text-left p-4 rounded-xl border transition flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-600 ring-1 ring-blue-600'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-snug">
                        {fmt.label}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {fmt.shortDesc}
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-0.5 text-[10px] text-slate-600 border-t border-slate-200/70 pt-2">
                    {fmt.features.slice(0, 4).map((feat, i) => (
                      <li key={i} className="truncate">
                        • {feat}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {/* Dynamic Options based on Selected Formats */}
          {(selectedFormats.includes('video_pembelajaran') ||
            selectedFormats.includes('gamifikasi') ||
            selectedFormats.includes('custom_format')) && (
            <div className="grid md:grid-cols-2 gap-4 pt-2">
              {selectedFormats.includes('video_pembelajaran') && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-red-600" />
                      Pengaturan Durasi Video Pembelajaran
                    </label>
                    <span className="text-xs font-bold text-blue-700 tabular-nums">
                      {videoDurationMinutes} Menit
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={25}
                    step={1}
                    value={videoDurationMinutes}
                    onChange={e => setVideoDurationMinutes(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <p className="text-[11px] text-slate-500">
                    Pembagian adegan, durasi detik tiap storyboard, dan panjang narasi guru akan disesuaikan otomatis ke {videoDurationMinutes} menit.
                  </p>
                </div>
              )}

              {selectedFormats.includes('gamifikasi') && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-600" />
                        Leaderboard Peringkat Kelas
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Guru menentukan apakah papan peringkat ditampilkan pada gamifikasi siswa.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnableLeaderboard(!enableLeaderboard)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                        enableLeaderboard
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {enableLeaderboard ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </div>
                </div>
              )}

              {selectedFormats.includes('custom_format') && (
                <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Wand2 className="w-4 h-4 text-orange-600" />
                    Instruksi Format Bebas / Kombinasi Desain Pembelajaran (Custom)
                  </label>
                  <textarea
                    rows={3}
                    value={customFormatPrompt}
                    onChange={e => setCustomFormatPrompt(e.target.value)}
                    placeholder="Jelaskan bentuk bahan ajar yang Anda inginkan. Contoh: Buatkan kombinasi komik naratif 4 babak + lembar investigasi detektif + tabel refleksi mandiri yang cocok untuk siswa visual-kinestetik..."
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* PENGATURAN VIDEO PEMBELAJARAN & LATIHAN SOAL MANDIRI (BERLAKU UNTUK SEMUA FORMAT) */}
          <div className="grid lg:grid-cols-2 gap-4 pt-2">
            {/* Pengaturan Jumlah Latihan Soal */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-emerald-600" />
                    Pengaturan Jumlah Latihan Soal
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tentukan berapa banyak latihan soal interaktif yang disertakan dalam bahan ajar ini.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-700 tabular-nums shrink-0">
                  {jumlahLatihanSoal} Soal
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {[0, 3, 5, 10, 15].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setJumlahLatihanSoal(num)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition tabular-nums ${
                      jumlahLatihanSoal === num
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {num === 0 ? 'Tanpa Soal (0)' : `${num} Soal`}
                  </button>
                ))}
                <div className="flex items-center gap-1.5 ml-auto">
                  <label className="text-[11px] text-slate-600 font-medium">Kustom:</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={jumlahLatihanSoal}
                    onChange={e =>
                      setJumlahLatihanSoal(Math.max(0, Math.min(30, parseInt(e.target.value || '0', 10))))
                    }
                    className="w-16 px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 text-center tabular-nums"
                  />
                </div>
              </div>

              {jumlahLatihanSoal > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-600">Tipe Soal:</span>
                  {(
                    [
                      { id: 'campuran', label: 'Campuran PG & Esai' },
                      { id: 'pg', label: 'Pilihan Ganda' },
                      { id: 'essay', label: 'Uraian / Esai' }
                    ] as const
                  ).map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setJenisLatihanSoal(t.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                        jenisLatihanSoal === t.id
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pengaturan Video Pembelajaran Sesuai Materi */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-rose-600" />
                    Video Pembelajaran Sesuai Topik
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cari video YouTube yang relevan dengan topik materi atau tempel tautan pilihan Anda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeVideoSupport(!includeVideoSupport)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition shrink-0 ${
                    includeVideoSupport ||
                    selectedFormats.includes('video_pembelajaran') ||
                    selectedFormats.includes('web_pembelajaran')
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {includeVideoSupport ||
                  selectedFormats.includes('video_pembelajaran') ||
                  selectedFormats.includes('web_pembelajaran')
                    ? 'Aktif'
                    : 'Nonaktif'}
                </button>
              </div>

              {(includeVideoSupport ||
                selectedFormats.includes('video_pembelajaran') ||
                selectedFormats.includes('web_pembelajaran')) && (
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={form.videoUrl}
                      onChange={e => {
                        setForm({ ...form, videoUrl: e.target.value });
                        setSelectedVideoMeta(null);
                      }}
                      placeholder="Kosongkan agar AI mencarikan otomatis, atau tempel link YouTube..."
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => handleSearchYoutube()}
                      disabled={searchingVideos}
                      className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-60"
                    >
                      {searchingVideos ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      Cari Video Materi
                    </button>
                  </div>

                  {youtubeCandidates.length > 0 && (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      <p className="text-[11px] font-semibold text-slate-600">
                        Pilih Video yang Paling Sesuai ({youtubeCandidates.length} Ditemukan):
                      </p>
                      {youtubeCandidates.map((vid, vIdx) => {
                        const isPicked = form.videoUrl === vid.url;
                        return (
                          <button
                            key={vid.id || vIdx}
                            type="button"
                            onClick={() => {
                              setForm(prev => ({ ...prev, videoUrl: vid.url }));
                              setSelectedVideoMeta({ title: vid.title, channel: vid.channel });
                            }}
                            className={`w-full text-left p-2 rounded-lg border transition flex items-center gap-2.5 ${
                              isPicked
                                ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-400'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {vid.thumbnail ? (
                              <img
                                src={vid.thumbnail}
                                alt={vid.title}
                                className="w-16 h-10 object-cover rounded shrink-0 bg-slate-200"
                              />
                            ) : (
                              <div className="w-16 h-10 rounded bg-slate-900 text-white flex items-center justify-center shrink-0">
                                <Play className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-900 line-clamp-1">
                                {vid.title}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {vid.channel}
                                {vid.duration ? ` · ${vid.duration}` : ''}
                              </p>
                            </div>
                            {isPicked && <Check className="w-4 h-4 text-rose-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              Format aktif:{' '}
              <span className="font-semibold text-slate-800">
                {selectedFormats
                  .map(id => BAHAN_AJAR_FORMATS.find(f => f.id === id)?.label || id)
                  .join(' + ')}
              </span>
              <span aria-hidden="true"> · </span>
              <span className="font-semibold text-slate-700 tabular-nums">
                {jumlahLatihanSoal > 0 ? `${jumlahLatihanSoal} Latihan Soal` : 'Tanpa Latihan Soal'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60 shadow-xs"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {loading
                ? 'Menyusun Bahan Ajar Multi-Format...'
                : 'Buat Bahan Ajar Sesuai Format Pilihan'}
            </button>
          </div>
        </section>
      </div>

      {/* GENERATED RESULT STUDIO + AI CREATIVE ASSISTANT */}
      {result && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Studio Header Bar */}
          <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-bold text-blue-700">Hasil Studio Bahan Ajar</span>
                <span aria-hidden="true">·</span>
                <span>{form.subject || result.mataPelajaran}</span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">Level {tingkatKesulitan}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">{form.topic}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAssistant(!showAssistant)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                  showAssistant
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {showAssistant ? 'Sembunyikan Assistant' : 'Buka AI Creative Assistant'}
              </button>

              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                  isEditing
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                {isEditing ? 'Selesai Sunting' : 'Sunting Ringkas'}
              </button>

              <button
                type="button"
                onClick={() =>
                  setFullscreenMaterial({
                    title: `${form.subject} - ${form.topic}`,
                    topic: form.topic,
                    subject_name: form.subject,
                    content_json: result
                  })
                }
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Layar Penuh
              </button>

              <select
                value={form.class_id}
                onChange={e => setForm({ ...form, class_id: e.target.value })}
                className="p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="">-- Target Kelas --</option>
                {form.grade && (
                  <option value="ALL_GRADE">Semua Kelas ({form.grade})</option>
                )}
                {(availableClasses.length > 0 ? availableClasses : classes).map(c => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleSaveMaterial}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-60 shadow-2xs"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {saving ? 'Menyimpan...' : 'Simpan & Bagikan'}
              </button>
            </div>
          </div>

          {/* Inline Simple Editor Drawer when isEditing is active */}
          {isEditing && (
            <div className="p-5 bg-amber-50/70 border-b border-amber-200 space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Topik / Judul Bahan Ajar
                  </label>
                  <input
                    type="text"
                    value={form.topic}
                    onChange={e => {
                      setForm({ ...form, topic: e.target.value });
                      setResult({ ...result, topik: e.target.value });
                    }}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    URL Video Pendukung (Opsional)
                  </label>
                  <input
                    type="text"
                    value={result.videoUrl || ''}
                    onChange={e => setResult({ ...result, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    URL Gambar Ilustrasi (Opsional)
                  </label>
                  <input
                    type="text"
                    value={result.imageUrl || ''}
                    onChange={e => setResult({ ...result, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
              </div>

              {Array.isArray(result.creativeAdditions) && result.creativeAdditions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-800">
                    Kelola Sisipan AI Creative Assistant:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.creativeAdditions.map((add: any) => (
                      <div
                        key={add.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                      >
                        <span className="font-semibold text-slate-800">{add.judul}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setResult({
                              ...result,
                              creativeAdditions: result.creativeAdditions.filter(
                                (x: any) => x.id !== add.id
                              )
                            })
                          }
                          className="text-slate-400 hover:text-red-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Split Studio Content + AI Creative Assistant */}
          <div className="p-6 grid lg:grid-cols-12 gap-6 items-start">
            <div className={showAssistant ? 'lg:col-span-8' : 'lg:col-span-12'}>
              <BahanAjarViewer
                content={result}
                title={form.topic}
                subject={form.subject}
                isTeacherView={true}
                onVideoUrlChange={url => {
                  const pool = [
                    ...(Array.isArray(result?.suggestedVideos) ? result.suggestedVideos : []),
                    ...youtubeCandidates
                  ];
                  const matched = pool.find((v: any) => v.url === url);
                  setResult((prev: any) =>
                    prev
                      ? {
                          ...prev,
                          videoUrl: url,
                          videoTitle: matched?.title || prev.videoTitle,
                          videoChannel: matched?.channel || prev.videoChannel
                        }
                      : prev
                  );
                }}
              />
            </div>

            {showAssistant && (
              <div className="lg:col-span-4 lg:sticky lg:top-4">
                <AiCreativeAssistantPanel
                  subject={form.subject}
                  grade={form.grade}
                  topic={form.topic}
                  tingkatKesulitan={tingkatKesulitan}
                  onTingkatKesulitanChange={lvl => {
                    setTingkatKesulitan(lvl);
                    if (result && result.version === 2) {
                      setResult({ ...result, tingkatKesulitan: lvl });
                    }
                  }}
                  tujuanPembelajaran={result.tujuanPembelajaran || analysis?.tujuanPembelajaran}
                  currentMaterial={result}
                  onInsertAddition={addition => {
                    const existing = Array.isArray(result.creativeAdditions)
                      ? result.creativeAdditions
                      : [];
                    setResult({
                      ...result,
                      creativeAdditions: [...existing, addition]
                    });
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* SAVED MATERIALS DIRECTORY */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span>Daftar Bahan Ajar Terbit</span>
              <span className="text-xs font-normal text-slate-500">
                · {savedMaterials.length} Materi Tersimpan
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola bahan ajar multi-format yang telah Anda terbitkan untuk siswa per kelas.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 self-end md:self-auto">
            <button
              type="button"
              onClick={() => setMaterialViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                materialViewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Kartu
            </button>
            <button
              type="button"
              onClick={() => setMaterialViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                materialViewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Tabel
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        {savedMaterials.length > 0 && (() => {
          const uniqueSubjects = Array.from(
            new Set(savedMaterials.map(m => m.subject_name).filter(Boolean))
          );
          const uniqueClasses = Array.from(
            new Set(savedMaterials.map(m => m.class?.name || m.grade).filter(Boolean))
          );

          return (
            <div className="grid sm:grid-cols-3 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={materialSearch}
                  onChange={e => setMaterialSearch(e.target.value)}
                  placeholder="Cari judul atau topik bahan ajar..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={materialSubjectFilter}
                onChange={e => setMaterialSubjectFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Mata Pelajaran ({uniqueSubjects.length})</option>
                {uniqueSubjects.map((sub: any, idx: number) => (
                  <option key={idx} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>

              <select
                value={materialClassFilter}
                onChange={e => setMaterialClassFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Kelas Target ({uniqueClasses.length})</option>
                {uniqueClasses.map((cls: any, idx: number) => (
                  <option key={idx} value={cls}>
                    Kelas {cls}
                  </option>
                ))}
              </select>
            </div>
          );
        })()}

        {(() => {
          const filteredMaterials = savedMaterials.filter(mat => {
            const matchesSearch =
              !materialSearch ||
              (mat.title || '').toLowerCase().includes(materialSearch.toLowerCase()) ||
              (mat.topic || '').toLowerCase().includes(materialSearch.toLowerCase()) ||
              (mat.subject_name || '').toLowerCase().includes(materialSearch.toLowerCase());
            const matchesSubject =
              materialSubjectFilter === 'ALL' || mat.subject_name === materialSubjectFilter;
            const clsName = mat.class?.name || mat.grade;
            const matchesClass =
              materialClassFilter === 'ALL' || String(clsName) === String(materialClassFilter);
            return matchesSearch && matchesSubject && matchesClass;
          });

          if (savedMaterials.length === 0) {
            return (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-700 font-semibold text-sm">
                  Belum ada bahan ajar yang diterbitkan.
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  Gunakan Studio Bahan Ajar di atas untuk menganalisis modul dan merancang materi sesuai format pilihan Anda.
                </p>
              </div>
            );
          }

          if (filteredMaterials.length === 0) {
            return (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                Tidak ada bahan ajar yang cocok dengan pencarian / filter yang dipilih.
              </div>
            );
          }

          if (materialViewMode === 'grid') {
            return (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredMaterials.map((mat, idx) => {
                  const dateFormatted = new Date(mat.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                  return (
                    <div
                      key={mat.id}
                      className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 shadow-2xs transition flex flex-col justify-between p-5"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                          <div className="flex items-center gap-1.5 font-medium truncate">
                            <span className="font-bold text-blue-700">
                              {mat.subject_name || 'Mapel'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-700 font-semibold">
                              Kelas {mat.class?.name || mat.grade}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {dateFormatted}
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
                          {idx + 1}. {mat.title || mat.topic}
                        </h3>
                        {mat.topic && mat.topic !== mat.title && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                            Topik: <span className="text-slate-700 font-medium">{mat.topic}</span>
                          </p>
                        )}

                        <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{getFormatSummaryText(mat)}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedMaterial(mat)}
                            className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" /> Buka
                          </button>
                          <button
                            type="button"
                            onClick={() => setFullscreenMaterial(mat)}
                            className="px-2.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                          >
                            <Maximize2 className="w-3.5 h-3.5" /> Layar Penuh
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingSavedMaterial(JSON.parse(JSON.stringify(mat)))
                            }
                            className="px-2.5 py-1.5 text-amber-800 hover:bg-amber-50 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActionFeedback(null);
                              setDeleteTarget(mat);
                            }}
                            title="Hapus Bahan Ajar"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          return (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-10">No</th>
                    <th className="px-4 py-3">Judul & Topik Bahan Ajar</th>
                    <th className="px-4 py-3">Mapel & Kelas</th>
                    <th className="px-4 py-3">Format Bahan Ajar</th>
                    <th className="px-4 py-3">Terbit</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaterials.map((mat, idx) => (
                    <tr key={mat.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5 font-semibold text-slate-500 text-xs tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="font-bold text-slate-900 line-clamp-1">
                          {mat.title || mat.topic}
                        </div>
                        <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {mat.topic}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 text-xs">
                          {mat.subject_name || '-'}
                        </div>
                        <div className="text-xs text-blue-700 font-medium mt-0.5">
                          Kelas {mat.class?.name || mat.grade} · Tingkat {mat.grade || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-700 max-w-xs">
                        <span className="line-clamp-2">{getFormatSummaryText(mat)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(mat.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedMaterial(mat)}
                            className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Lihat
                          </button>
                          <button
                            type="button"
                            onClick={() => setFullscreenMaterial(mat)}
                            className="px-2.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                          >
                            <Maximize2 className="w-3.5 h-3.5" /> Presentasi
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingSavedMaterial(JSON.parse(JSON.stringify(mat)))
                            }
                            className="px-2.5 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActionFeedback(null);
                              setDeleteTarget(mat);
                            }}
                            title="Hapus Bahan Ajar"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Material Detail Modal */}
      {selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedMaterial.title}</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Kelas {selectedMaterial.class?.name || selectedMaterial.grade} · Topik:{' '}
                  {selectedMaterial.topic}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFullscreenMaterial(selectedMaterial);
                    setSelectedMaterial(null);
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Layar Penuh
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMaterial(null)}
                  className="text-slate-400 hover:text-slate-600 p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <BahanAjarViewer
                content={selectedMaterial.content_json}
                title={selectedMaterial.title || selectedMaterial.topic}
                subject={selectedMaterial.subject_name || ''}
                isTeacherView={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Presentation Fullscreen Modal */}
      {fullscreenMaterial && (
        <div className="fixed inset-0 z-[100] bg-slate-950 text-white overflow-y-auto flex flex-col p-6 md:p-10">
          <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6 max-w-6xl mx-auto w-full">
            <div>
              <p className="text-xs font-semibold text-sky-400">
                Mode Presentasi Bahan Ajar · SMAN 21 Garut
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
                {fullscreenMaterial.title}
              </h2>
              <p className="text-slate-400 text-xs mt-1">Topik: {fullscreenMaterial.topic}</p>
            </div>

            <button
              type="button"
              onClick={() => setFullscreenMaterial(null)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition flex items-center gap-2 font-bold text-xs"
            >
              <Minimize2 className="w-4 h-4" /> Keluar Layar Penuh
            </button>
          </div>

          <div className="max-w-6xl mx-auto w-full flex-1 pb-12">
            <BahanAjarViewer
              content={fullscreenMaterial.content_json}
              title={fullscreenMaterial.title || fullscreenMaterial.topic}
              subject={fullscreenMaterial.subject_name || ''}
              isTeacherView={true}
              isFullscreen={true}
            />
          </div>
        </div>
      )}

      {/* Edit Saved Material Modal */}
      {editingSavedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-600" /> Edit Bahan Ajar & Pengayaan AI
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Perbarui identitas, target kelas, media, atau sisipkan pengayaan baru dari AI Creative Assistant.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSavedMaterial(null)}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Judul Bahan Ajar
                  </label>
                  <input
                    type="text"
                    value={editingSavedMaterial.title || ''}
                    onChange={e =>
                      setEditingSavedMaterial({ ...editingSavedMaterial, title: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Topik Utama</label>
                  <input
                    type="text"
                    value={editingSavedMaterial.topic || ''}
                    onChange={e =>
                      setEditingSavedMaterial({ ...editingSavedMaterial, topic: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    value={editingSavedMaterial.subject_name || ''}
                    onChange={e =>
                      setEditingSavedMaterial({
                        ...editingSavedMaterial,
                        subject_name: e.target.value
                      })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Kelas
                  </label>
                  <select
                    value={editingSavedMaterial.class_id || ''}
                    onChange={e =>
                      setEditingSavedMaterial({ ...editingSavedMaterial, class_id: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-medium"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Media URLs */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    URL Video (YouTube / MP4)
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={editingSavedMaterial.content_json?.videoUrl || ''}
                      onChange={e =>
                        setEditingSavedMaterial({
                          ...editingSavedMaterial,
                          content_json: {
                            ...editingSavedMaterial.content_json,
                            videoUrl: e.target.value
                          }
                        })
                      }
                      className="flex-1 p-2 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        setSearchingVideos(true);
                        try {
                          const list = await searchYoutubeVideosApi(
                            editingSavedMaterial.subject_name || '',
                            editingSavedMaterial.topic || editingSavedMaterial.title || ''
                          );
                          if (list.length > 0) {
                            setEditingSavedMaterial((prev: any) =>
                              prev
                                ? {
                                    ...prev,
                                    content_json: {
                                      ...prev.content_json,
                                      videoUrl: list[0].url,
                                      videoTitle: list[0].title,
                                      videoChannel: list[0].channel,
                                      suggestedVideos: list.map(v => ({
                                        id: v.id,
                                        url: v.url,
                                        title: v.title,
                                        channel: v.channel,
                                        duration: v.duration
                                      }))
                                    }
                                  }
                                : prev
                            );
                          }
                        } finally {
                          setSearchingVideos(false);
                        }
                      }}
                      disabled={searchingVideos}
                      className="px-2.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0 disabled:opacity-60"
                      title="Cari Video Sesuai Topik"
                    >
                      {searchingVideos ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      Cari
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    URL Gambar Ilustrasi
                  </label>
                  <input
                    type="text"
                    value={editingSavedMaterial.content_json?.imageUrl || ''}
                    onChange={e =>
                      setEditingSavedMaterial({
                        ...editingSavedMaterial,
                        content_json: {
                          ...editingSavedMaterial.content_json,
                          imageUrl: e.target.value
                        }
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                  />
                </div>
              </div>

              {/* Creative Assistant inside Edit Saved Material */}
              <AiCreativeAssistantPanel
                subject={editingSavedMaterial.subject_name || ''}
                grade={editingSavedMaterial.grade || 'X'}
                topic={editingSavedMaterial.topic || editingSavedMaterial.title || ''}
                tingkatKesulitan={
                  editingSavedMaterial.content_json?.tingkatKesulitan || 'reguler'
                }
                onTingkatKesulitanChange={lvl =>
                  setEditingSavedMaterial({
                    ...editingSavedMaterial,
                    content_json: {
                      ...editingSavedMaterial.content_json,
                      tingkatKesulitan: lvl
                    }
                  })
                }
                tujuanPembelajaran={editingSavedMaterial.content_json?.tujuanPembelajaran}
                currentMaterial={editingSavedMaterial.content_json}
                onInsertAddition={addition => {
                  const existing = Array.isArray(
                    editingSavedMaterial.content_json?.creativeAdditions
                  )
                    ? editingSavedMaterial.content_json.creativeAdditions
                    : [];
                  setEditingSavedMaterial({
                    ...editingSavedMaterial,
                    content_json: {
                      ...editingSavedMaterial.content_json,
                      creativeAdditions: [...existing, addition]
                    }
                  });
                }}
              />

              {/* Existing Creative Additions List */}
              {Array.isArray(editingSavedMaterial.content_json?.creativeAdditions) &&
                editingSavedMaterial.content_json.creativeAdditions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-900">
                      Sisipan Pengayaan AI Tersimpan
                    </h4>
                    {editingSavedMaterial.content_json.creativeAdditions.map((add: any) => (
                      <div
                        key={add.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{add.judul}</p>
                          <p className="text-slate-600 line-clamp-2 mt-0.5">{add.konten}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingSavedMaterial({
                              ...editingSavedMaterial,
                              content_json: {
                                ...editingSavedMaterial.content_json,
                                creativeAdditions:
                                  editingSavedMaterial.content_json.creativeAdditions.filter(
                                    (x: any) => x.id !== add.id
                                  )
                              }
                            })
                          }
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

              {/* Legacy materials editor if v1 */}
              {Array.isArray(editingSavedMaterial.content_json?.materials) && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="font-bold text-slate-900 text-xs">Sunting Isi Submateri</h4>
                  {editingSavedMaterial.content_json.materials.map((m: any, mIdx: number) => (
                    <div
                      key={mIdx}
                      className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2"
                    >
                      <input
                        type="text"
                        value={m.title}
                        onChange={e => {
                          const newMats = [...editingSavedMaterial.content_json.materials];
                          newMats[mIdx].title = e.target.value;
                          setEditingSavedMaterial({
                            ...editingSavedMaterial,
                            content_json: {
                              ...editingSavedMaterial.content_json,
                              materials: newMats
                            }
                          });
                        }}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                      />
                      <textarea
                        rows={3}
                        value={m.content}
                        onChange={e => {
                          const newMats = [...editingSavedMaterial.content_json.materials];
                          newMats[mIdx].content = e.target.value;
                          setEditingSavedMaterial({
                            ...editingSavedMaterial,
                            content_json: {
                              ...editingSavedMaterial.content_json,
                              materials: newMats
                            }
                          });
                        }}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingSavedMaterial(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={handleSaveEditedMaterial}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5 disabled:opacity-70"
              >
                {savingEdit ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Non-blocking iframe safe) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Hapus Bahan Ajar?</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Anda yakin ingin menghapus bahan ajar{' '}
                    <strong className="text-slate-900">
                      "{deleteTarget.title || deleteTarget.topic}"
                    </strong>{' '}
                    untuk Kelas {deleteTarget.class?.name || deleteTarget.grade}? Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={deletingMaterial}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingMaterial}
                onClick={confirmDeleteMaterial}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-70"
              >
                {deletingMaterial ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {deletingMaterial ? 'Menghapus...' : 'Ya, Hapus Bahan Ajar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
