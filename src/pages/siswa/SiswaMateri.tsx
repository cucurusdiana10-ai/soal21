import React, { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { BookOpen, Search, Eye, X, CheckCircle2, Lightbulb, Compass, HelpCircle, Check, AlertTriangle } from 'lucide-react';

export default function SiswaMateri() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

  const filtered = materials.filter(m => 
    m.title?.toLowerCase().includes(search.toLowerCase()) ||
    m.topic?.toLowerCase().includes(search.toLowerCase()) ||
    m.subject_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bahan Ajar & Materi Pembelajaran</h1>
          <p className="text-gray-500">Pelajari materi interaktif, fun fact, dan kuis pemantik seru dari guru Anda.</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari materi / topik..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Memuat bahan ajar...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-2xl border border-gray-200 text-gray-500">
          Belum ada materi pembelajaran yang diterbitkan untuk kelas Anda.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filtered.map(mat => (
            <div key={mat.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:border-blue-300 transition flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-full border border-blue-100">
                    {mat.subject_name || 'Mata Pelajaran'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(mat.created_at).toLocaleDateString('id-ID')}
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 text-lg mb-2">{mat.title}</h3>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                  Guru: {mat.guru?.name || 'Guru Pengampu'} • Topik: {mat.topic}
                </p>
              </div>

              <button
                onClick={() => {
                  setQuizAnswers({});
                  setSelectedMaterial(mat);
                }}
                className="w-full py-2.5 bg-blue-50 text-blue-700 font-semibold text-sm rounded-xl hover:bg-blue-100 transition flex items-center justify-center"
              >
                <BookOpen className="w-4 h-4 mr-2" /> Buka & Pelajari Materi
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Material Modal */}
      {selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-blue-50">
              <div>
                <h3 className="text-xl font-bold text-blue-950">{selectedMaterial.title}</h3>
                <p className="text-xs text-blue-700">Topik: {selectedMaterial.topic} • Guru: {selectedMaterial.guru?.name}</p>
              </div>
              <button onClick={() => setSelectedMaterial(null)} className="text-gray-400 hover:text-gray-600 p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Supporting Image if available */}
              {selectedMaterial.content_json?.imageUrl && (
                <div className="rounded-2xl overflow-hidden max-h-64 border border-gray-200 shadow-sm">
                  <img
                    src={selectedMaterial.content_json.imageUrl}
                    alt={selectedMaterial.title}
                    className="w-full h-64 object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

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
