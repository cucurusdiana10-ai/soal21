import React, { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { CheckSquare, Award, Clock, FileText, Search, ArrowUpDown, MessageSquare, X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SiswaNilai() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest' | 'subject'>('newest');
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);

  useEffect(() => {
    fetchStudentGrades();
  }, [user]);

  async function fetchStudentGrades() {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('task_submissions')
        .select('*, task:tasks(id, title, type, subject_name, kkm, passing_grade, weight_pg, weight_essay, content)')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setSubmissions(data.filter((s: any) => s.status !== 'in_progress'));
      }
    } catch (err) {
      console.error('Error fetching grades:', err);
    } finally {
      setLoading(false);
    }
  }

  const averageScore = submissions.length > 0 && submissions.filter(s => s.score !== null).length > 0
    ? Math.round(
        submissions.filter(s => s.score !== null).reduce((acc, curr) => acc + (curr.score || 0), 0) /
        submissions.filter(s => s.score !== null).length
      )
    : 0;

  // Compute breakdown for PG and Essay if not explicitly stored
  const getScoreDetails = (sub: any) => {
    const task = sub.task;
    const taskType = task?.type || 'pg';
    const weightPg = task?.weight_pg ?? 70;
    const weightEssay = task?.weight_essay ?? 30;

    let pgDisplay = '-';
    let essayDisplay = '-';

    if (taskType === 'pg') {
      pgDisplay = sub.score !== null ? `${sub.score}` : '-';
      essayDisplay = '-';
    } else if (taskType === 'essay') {
      pgDisplay = '-';
      essayDisplay = sub.score !== null ? `${sub.score}` : '-';
    } else {
      // Mixed
      if (sub.score_pg !== undefined && sub.score_pg !== null) {
        pgDisplay = `${Math.round(sub.score_pg)} (${weightPg}%)`;
      } else if (Array.isArray(task?.content)) {
        const pgQuestions = task.content.filter((q: any) => q.type === 'pg');
        if (pgQuestions.length > 0 && sub.answers) {
          let correct = 0;
          task.content.forEach((q: any, idx: number) => {
            if (q.type === 'pg') {
              const ans = sub.answers[idx] ?? sub.answers[String(idx)];
              if (String(ans).trim().toLowerCase() === String(q.answer).trim().toLowerCase()) correct++;
            }
          });
          const rawPg = Math.round((correct / pgQuestions.length) * 100);
          pgDisplay = `${rawPg} (${weightPg}%)`;
        }
      }

      if (sub.score_essay !== undefined && sub.score_essay !== null) {
        essayDisplay = `${Math.round(sub.score_essay)} (${weightEssay}%)`;
      } else if (sub.essay_scores && typeof sub.essay_scores === 'object') {
        const scores = Object.values(sub.essay_scores).map(Number).filter(n => !isNaN(n));
        if (scores.length > 0) {
          const rawEssay = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
          essayDisplay = `${rawEssay} (${weightEssay}%)`;
        } else {
          essayDisplay = 'Menunggu Koreksi';
        }
      }
    }

    const kkmVal = task?.passing_grade ?? task?.kkm ?? 75;
    const isPass = sub.score !== null && sub.score >= kkmVal;

    return { pgDisplay, essayDisplay, kkmVal, isPass, weightPg, weightEssay, taskType };
  };

  const filteredAndSorted = [...submissions]
    .filter(sub => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        sub.task?.title?.toLowerCase().includes(q) ||
        sub.task?.subject_name?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'highest') return (b.score ?? -1) - (a.score ?? -1);
      if (sortBy === 'lowest') return (a.score ?? 999) - (b.score ?? 999);
      if (sortBy === 'subject') return (a.task?.subject_name || '').localeCompare(b.task?.subject_name || '');
      return 0;
    });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Daftar Nilai Saya</h1>
        <p className="text-gray-500 text-sm mt-0.5">Pantau perkembangan nilai tugas, bobot nilai PG & Esai, dan catatan umpan balik dari guru Anda.</p>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-white/10 rounded-2xl backdrop-blur-md">
            <Award className="w-8 h-8 text-yellow-300" />
          </div>
          <div>
            <p className="text-blue-100 text-xs sm:text-sm font-medium">Rata-Rata Nilai Tugas & Ujian</p>
            <p className="text-3xl font-black">{averageScore} <span className="text-sm font-normal text-blue-200">/ 100</span></p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-2xl font-bold">{submissions.length}</p>
          <p className="text-xs text-blue-200">Total Tugas Dikumpulkan</p>
        </div>
      </div>

      {/* Submissions Table Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span>Riwayat Penilaian & Transkrip Nilai</span>
              <span className="text-xs font-semibold text-gray-500 font-normal">
                · {filteredAndSorted.length} Nilai
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Nilai tugas, ujian, dan rincian bobot PG serta Esai yang telah dikoreksi oleh guru pengampu.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari mapel / tugas..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
              <ArrowUpDown className="w-4 h-4 text-gray-400 hidden sm:block" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                aria-label="Urutkan daftar nilai"
                className="w-full sm:w-auto py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="highest">Nilai Tertinggi</option>
                <option value="lowest">Nilai Terendah</option>
                <option value="subject">Mata Pelajaran (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 text-xs sm:text-sm">Memuat data nilai...</div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="bg-gray-50 p-8 text-center rounded-xl border border-dashed border-gray-200 text-gray-500 text-xs sm:text-sm">
            {search ? `Tidak ada nilai yang cocok dengan pencarian "${search}".` : 'Belum ada tugas yang dikumpulkan atau dinilai.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-gray-700 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-3">Mata Pelajaran</th>
                  <th className="py-3 px-4">Judul Tugas / Ujian</th>
                  <th className="py-3 px-3 text-center">KKM</th>
                  <th className="py-3 px-3 text-center">Nilai PG</th>
                  <th className="py-3 px-3 text-center">Nilai Esai</th>
                  <th className="py-3 px-3 text-center">Nilai Akhir</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Tanggal</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAndSorted.map((sub, idx) => {
                  const details = getScoreDetails(sub);
                  const dateStr = new Date(sub.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <tr key={sub.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-3 px-3 text-center font-semibold text-gray-500">{idx + 1}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {sub.task?.subject_name || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-gray-900 line-clamp-1">{sub.task?.title || '-'}</div>
                        <div className="text-[10px] text-gray-500 capitalize">
                          Tipe: {sub.task?.type === 'pg' ? 'Pilihan Ganda' : sub.task?.type === 'essay' ? 'Esai' : 'Campuran'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">
                        {details.kkmVal}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap font-medium text-gray-800">
                        {details.pgDisplay}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap font-medium text-gray-800">
                        {details.essayDisplay}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {sub.score !== null ? (
                          <span className={`text-base font-black ${details.isPass ? 'text-emerald-600' : 'text-red-600'}`}>
                            {sub.score}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Menunggu</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {sub.score !== null ? (
                          <span
                            className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              details.isPass
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                            }`}
                          >
                            {details.isPass ? 'TUNTAS' : 'REMEDIAL'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-500 font-semibold px-2 py-0.5 bg-gray-100 rounded-full">
                            Diproses
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap text-gray-500 text-[11px]">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {sub.feedback ? (
                          <button
                            type="button"
                            onClick={() => setSelectedFeedback(sub)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 shadow-xs"
                            title="Lihat catatan umpan balik dari guru"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Catatan
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs italic">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-200">
            <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Catatan & Umpan Balik Guru</span>
                <h3 className="font-bold text-base mt-0.5">{selectedFeedback.task?.title}</h3>
                <p className="text-xs text-blue-200">{selectedFeedback.task?.subject_name} · Nilai: {selectedFeedback.score ?? '-'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800 whitespace-pre-line leading-relaxed font-sans">
                {selectedFeedback.feedback}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedFeedback(null)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Tutup Catatan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
