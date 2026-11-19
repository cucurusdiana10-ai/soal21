import React, { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { BookOpen, Search, X, HelpCircle, Film, Image, Layers, ArrowUpDown } from 'lucide-react';
import BahanAjarViewer from '../../components/bahan-ajar/BahanAjarViewer';
import { BAHAN_AJAR_FORMATS, BahanAjarFormatId } from '../../types/bahanAjar';

export default function SiswaMateri() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'subject'>('newest');
  const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);

  useEffect(() => {
    fetchStudentMaterials();
  }, [user]);

  async function fetchStudentMaterials() {
    if (!user) return;

    // Get student's class
    const { data: classStud } = await supabase
      .from('class_students')
      .select('class_id')
      .eq('student_id', user.id)
      .single();

    if (classStud?.class_id) {
      const { data } = await supabase
        .from('teaching_materials')
        .select('*, class:classes(name), guru:users!guru_id(name)')
        .eq('class_id', classStud.class_id)
        .order('created_at', { ascending: false });

      if (data) setMaterials(data);
    }
    setLoading(false);
  }

  const uniqueSubjects = Array.from(new Set(materials.map(m => m.subject_name).filter(Boolean)));

  const filteredAndSorted = materials
    .filter(m => {
      const matchesSearch =
        !search.trim() ||
        m.title?.toLowerCase().includes(search.toLowerCase()) ||
        m.topic?.toLowerCase().includes(search.toLowerCase()) ||
        m.subject_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.guru?.name?.toLowerCase().includes(search.toLowerCase());
      const matchesSubject = subjectFilter === 'ALL' || m.subject_name === subjectFilter;
      return matchesSearch && matchesSubject;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'title') return (a.title || a.topic || '').localeCompare(b.title || b.topic || '');
      if (sortBy === 'subject') return (a.subject_name || '').localeCompare(b.subject_name || '');
      return 0;
    });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span>Bahan Ajar & Materi Pembelajaran</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Pelajari slide interaktif, simulasi, peta konsep, podcast, infografis, dan tantangan belajar dari guru pengampu kelas Anda.
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
                placeholder="Cari materi / topik / guru..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
              <ArrowUpDown className="w-4 h-4 text-gray-400 hidden sm:block" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                aria-label="Urutkan bahan ajar"
                className="w-full sm:w-auto py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="title">Judul (A-Z)</option>
                <option value="subject">Mata Pelajaran</option>
              </select>
            </div>
          </div>
        </div>

        {/* Subject Filter Segmented Bar */}
        {uniqueSubjects.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setSubjectFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                subjectFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              Semua Mapel ({materials.length})
            </button>
            {uniqueSubjects.map((sub: any, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSubjectFilter(sub)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  subjectFilter === sub
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-xs sm:text-sm">Memuat bahan ajar...</div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="bg-white p-10 text-center rounded-2xl border border-gray-200 text-gray-500">
          <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="font-semibold text-gray-700 text-sm">Belum ada materi pembelajaran yang ditemukan.</p>
          <p className="text-xs text-gray-400 mt-1">Materi yang diterbitkan oleh Guru untuk kelas Anda akan tampil di sini.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-gray-700 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-4">Judul Materi & Topik</th>
                  <th className="py-3 px-3">Mata Pelajaran</th>
                  <th className="py-3 px-3">Guru Pengampu</th>
                  <th className="py-3 px-3">Format & Kelengkapan</th>
                  <th className="py-3 px-3 text-center">Tanggal Terbit</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAndSorted.map((mat, idx) => {
                  const selectedFormats: BahanAjarFormatId[] = Array.isArray(mat.content_json?.selectedFormats)
                    ? mat.content_json.selectedFormats
                    : [];
                  const isV2 = selectedFormats.length > 0 || mat.content_json?.version === 2;
                  const subCount = Array.isArray(mat.content_json?.materials) ? mat.content_json.materials.length : 0;
                  const quizCount = Array.isArray(mat.content_json?.interactiveQuestions) ? mat.content_json.interactiveQuestions.length : 0;
                  const hasVideo = Boolean(mat.content_json?.videoUrl);
                  const hasImage = Boolean(mat.content_json?.imageUrl);
                  const dateStr = new Date(mat.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  const v2FormatText = selectedFormats
                    .map(id => BAHAN_AJAR_FORMATS.find(f => f.id === id)?.label || id)
                    .join(' · ');

                  return (
                    <tr key={mat.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-3 px-3 text-center font-semibold text-gray-500 tabular-nums">{idx + 1}</td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-gray-900 line-clamp-1">{mat.title || mat.topic}</div>
                        {mat.topic && mat.topic !== mat.title && (
                          <div className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">Topik: {mat.topic}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {mat.subject_name || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-medium text-gray-800 text-xs">{mat.guru?.name || 'Guru Pengampu'}</div>
                        <div className="text-[10px] text-gray-400">Kelas {mat.class?.name || mat.grade}</div>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        {isV2 && v2FormatText ? (
                          <div className="text-[11px] font-medium text-slate-700 line-clamp-2">
                            {v2FormatText}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-gray-600">
                            <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                              <Layers className="w-3 h-3 text-blue-600" /> {subCount} Sub
                            </span>
                            <span className="text-gray-300">·</span>
                            <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                              <HelpCircle className="w-3 h-3 text-emerald-600" /> {quizCount} Kuis
                            </span>
                            {hasVideo && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className="text-red-700 font-semibold inline-flex items-center gap-0.5">
                                  <Film className="w-3 h-3" /> Video
                                </span>
                              </>
                            )}
                            {hasImage && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className="text-indigo-700 font-semibold inline-flex items-center gap-0.5">
                                  <Image className="w-3 h-3" /> Visual
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap text-gray-600 text-xs">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedMaterial(mat)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <BookOpen className="w-3.5 h-3.5" /> Pelajari
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Material Modal */}
      {selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-200 bg-slate-50">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  Bahan Ajar Interaktif Siswa
                </p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
                  {selectedMaterial.title || selectedMaterial.topic}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Topik: {selectedMaterial.topic} · Guru: {selectedMaterial.guru?.name || 'Guru Pengampu'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMaterial(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200/70 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1">
              <BahanAjarViewer
                content={selectedMaterial.content_json}
                title={selectedMaterial.title || selectedMaterial.topic}
                subject={selectedMaterial.subject_name || ''}
                isTeacherView={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
