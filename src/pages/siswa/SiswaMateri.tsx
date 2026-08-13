import React, { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { BookOpen, Search, Eye, X, CheckCircle2 } from 'lucide-react';

export default function SiswaMateri() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
          <p className="text-gray-500">Pelajari materi interaktif dan latihan soal dari guru Anda.</p>
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
                onClick={() => setSelectedMaterial(mat)}
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
                  <h4 className="font-bold text-gray-900 border-b pb-2 text-sm">Penjelasan Ringkas</h4>
                  {selectedMaterial.content_json.materials.map((m: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                      <h5 className="font-bold text-gray-900 mb-2">{m.title}</h5>
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{m.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Interactive Questions Practice */}
              {selectedMaterial.content_json?.interactiveQuestions && (
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 border-b pb-2 text-sm">Pertanyaan Pemantik & Latihan</h4>
                  {selectedMaterial.content_json.interactiveQuestions.map((q: any, idx: number) => (
                    <div key={idx} className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 space-y-3">
                      <p className="font-semibold text-gray-900 text-sm">{idx + 1}. {q.question}</p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {q.options?.map((opt: string, oIdx: number) => (
                          <div key={oIdx} className="p-3 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700">
                            {String.fromCharCode(65 + oIdx)}. {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
