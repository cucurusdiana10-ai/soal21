import React, { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { BookOpen, Search, X, CheckCircle2, Lightbulb, Compass, HelpCircle, Check, AlertTriangle, Film, Image, Layers, Calendar, User } from 'lucide-react';
import MediaViewer from '../../components/MediaViewer';
import InteractiveBahanAjar from '../../components/InteractiveBahanAjar';

export default function SiswaMateri() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});

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

  const filtered = materials.filter(m => {
    const matchesSearch =
      m.title?.toLowerCase().includes(search.toLowerCase()) ||
      m.topic?.toLowerCase().includes(search.toLowerCase()) ||
      m.subject_name?.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = subjectFilter === 'ALL' || m.subject_name === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bahan Ajar & Materi Pembelajaran</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Pelajari materi interaktif, peta konsep, studi kasus, dan kuis pemantik dari guru pengampu kelas Anda.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari judul materi atau topik..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition"
            />
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
        <div className="text-center py-12 text-gray-500">Memuat bahan ajar...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-10 text-center rounded-2xl border border-gray-200 text-gray-500">
          <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="font-semibold text-gray-700">Belum ada materi pembelajaran yang ditemukan.</p>
          <p className="text-xs text-gray-400 mt-1">Materi yang diterbitkan oleh Guru untuk kelas Anda akan tampil di sini.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {filtered.map((mat, idx) => {
            const subCount = Array.isArray(mat.content_json?.materials) ? mat.content_json.materials.length : 0;
            const quizCount = Array.isArray(mat.content_json?.interactiveQuestions) ? mat.content_json.interactiveQuestions.length : 0;
            const dateStr = new Date(mat.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });

            return (
              <div
                key={mat.id}
                className="group bg-white p-6 rounded-2xl border border-gray-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Quiet Metadata Kicker */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                    <div className="flex items-center gap-1.5 font-medium truncate">
                      <span className="font-bold text-blue-700">{mat.subject_name || 'Mata Pelajaran'}</span>
                      <span aria-hidden="true">·</span>
                      <span>Kelas {mat.class?.name || mat.grade}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {dateStr}
                    </span>
                  </div>

                  {/* Primary Title & Topic */}
                  <h3 className="font-bold text-gray-900 text-lg leading-snug group-hover:text-blue-950 transition-colors mb-1.5 line-clamp-2">
                    {idx + 1}. {mat.title || mat.topic}
                  </h3>

                  {mat.topic && mat.topic !== mat.title && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-1">
                      Topik: <span className="font-medium text-gray-800">{mat.topic}</span>
                    </p>
                  )}

                  <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-4">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>Pengampu: <strong className="text-gray-700">{mat.guru?.name || 'Guru Mata Pelajaran'}</strong></span>
                  </p>

                  {/* Structured Content Indicators */}
                  <div className="py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600 mb-5">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      {subCount} Sub-Materi
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                      {quizCount} Kuis Interaktif
                    </span>
                    {mat.content_json?.videoUrl && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="flex items-center gap-1 text-red-700 font-medium">
                          <Film className="w-3.5 h-3.5" /> Video
                        </span>
                      </>
                    )}
                    {mat.content_json?.imageUrl && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="flex items-center gap-1 text-indigo-700 font-medium">
                          <Image className="w-3.5 h-3.5" /> Ilustrasi
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setQuizAnswers({});
                    setSelectedMaterial(mat);
                  }}
                  className="w-full py-2.5 px-4 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition flex items-center justify-center shadow-xs"
                >
                  <BookOpen className="w-4 h-4 mr-2" /> Buka & Pelajari Materi
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Material Modal */}
      {selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs">
                  Bahan Ajar Interaktif Siswa
                </span>
                <h3 className="text-xl font-black text-blue-950 mt-1">{selectedMaterial.title}</h3>
                <p className="text-xs text-blue-700">Topik: {selectedMaterial.topic} • Guru: {selectedMaterial.guru?.name}</p>
              </div>
              <button onClick={() => setSelectedMaterial(null)} className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-white/80 transition">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-7 flex-1">
              {/* Media Player / Image Viewer */}
              <MediaViewer
                imageUrl={selectedMaterial.content_json?.imageUrl}
                videoUrl={selectedMaterial.content_json?.videoUrl}
                mediaType={selectedMaterial.content_json?.mediaType || 'both'}
                title={selectedMaterial.title}
                subject={selectedMaterial.subject_name || ''}
              />

              {/* Interactive Gamification & Peta Konsep Arena */}
              <InteractiveBahanAjar
                petaKonsep={selectedMaterial.content_json?.petaKonsep}
                gamifikasi={selectedMaterial.content_json?.gamifikasi}
                mindMapFallback={selectedMaterial.content_json?.mindMap}
                topicTitle={selectedMaterial.topic || selectedMaterial.title}
                pertemuanMateri={selectedMaterial.content_json?.pertemuanMateri}
              />

              {/* Fun Fact / Tahukah Kamu */}
              {selectedMaterial.content_json?.funFact && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-amber-900 text-sm">Tahukah Kamu? (Fun Fact)</h5>
                    <p className="text-amber-800 text-xs mt-1 leading-relaxed">
                      {selectedMaterial.content_json.funFact}
                    </p>
                  </div>
                </div>
              )}

              {/* Real World Application */}
              {selectedMaterial.content_json?.realWorldApplication && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-3">
                  <Compass className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-emerald-900 text-sm">Aplikasi di Dunia Nyata & Kasus Seru</h5>
                    <p className="text-emerald-800 text-xs mt-1 leading-relaxed">
                      {selectedMaterial.content_json.realWorldApplication}
                    </p>
                  </div>
                </div>
              )}

              {/* Mind Map */}
              {selectedMaterial.content_json?.mindMap && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-3 text-sm flex items-center">
                    <BookOpen className="w-4 h-4 mr-2 text-blue-600" /> Peta Konsep Utama
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMaterial.content_json.mindMap.map((item: string, idx: number) => (
                      <span key={idx} className="px-3 py-1.5 bg-blue-50 text-blue-800 rounded-full text-xs font-semibold border border-blue-100">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Material Detail */}
              {selectedMaterial.content_json?.materials && (
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 border-b pb-2 text-sm">Pembahasan Materi</h4>
                  {selectedMaterial.content_json.materials.map((m: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                      <h5 className="font-bold text-gray-900 mb-2">{m.title}</h5>
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{m.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Interactive Questions Practice with Instant Check */}
              {selectedMaterial.content_json?.interactiveQuestions && selectedMaterial.content_json.interactiveQuestions.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 border-b pb-2 text-sm flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-indigo-600" /> Kuis & Pertanyaan Pemantik (Cek Langsung Pemahamanmu)
                  </h4>
                  {selectedMaterial.content_json.interactiveQuestions.map((q: any, idx: number) => {
                    const answered = quizAnswers[idx];
                    const isCorrect = answered && (answered === q.answer || answered === q.answer?.[0]);
                    return (
                      <div key={idx} className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 space-y-3">
                        <p className="font-semibold text-gray-900 text-sm">{idx + 1}. {q.question}</p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {q.options?.map((opt: string, oIdx: number) => {
                            const letter = String.fromCharCode(65 + oIdx);
                            const isSelected = answered === letter || answered === opt;
                            const isOptionCorrect = letter === q.answer || opt === q.answer;
                            
                            let btnStyle = 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50';
                            if (answered) {
                              if (isSelected && isOptionCorrect) {
                                btnStyle = 'bg-green-100 border-green-400 text-green-900 font-bold';
                              } else if (isSelected && !isOptionCorrect) {
                                btnStyle = 'bg-red-100 border-red-400 text-red-900 font-bold';
                              } else if (isOptionCorrect) {
                                btnStyle = 'bg-green-50 border-green-300 text-green-800 font-semibold';
                              }
                            }

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => setQuizAnswers(prev => ({ ...prev, [idx]: letter }))}
                                className={`p-3 border rounded-xl text-xs font-medium text-left transition flex items-center justify-between ${btnStyle}`}
                              >
                                <span>
                                  <span className="font-bold mr-1.5">{letter}.</span> {opt}
                                </span>
                                {answered && isOptionCorrect && (
                                  <Check className="w-4 h-4 text-green-600 shrink-0 ml-1" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {answered && (
                          <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${isCorrect ? 'bg-green-50 text-green-900 border border-green-200' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}>
                            {isCorrect ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                            <div>
                              <p className="font-bold">{isCorrect ? '🎉 Jawaban Tepat!' : `Kunci yang benar adalah pilihan (${q.answer}).`}</p>
                              {q.explanation && <p className="mt-1 text-gray-700">{q.explanation}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
