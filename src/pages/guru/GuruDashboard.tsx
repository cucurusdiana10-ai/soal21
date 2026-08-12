import React, { useState } from 'react';
import { BookOpen, Sparkles, Loader2, Save } from 'lucide-react';

export default function GuruDashboard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [form, setForm] = useState({
    subject: '',
    grade: '',
    topic: ''
  });

  const handleGenerate = async () => {
    if (!form.subject || !form.grade || !form.topic) return alert('Lengkapi semua form');
    
    setLoading(true);
    try {
      const res = await fetch('/api/generate-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal generate AI');
      setResult(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bahan Ajar Cerdas (AI)</h1>
        <p className="text-gray-500">Buat materi pembelajaran interaktif dengan bantuan AI Gemini.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mata Pelajaran</label>
            <input 
              type="text" 
              value={form.subject}
              onChange={e => setForm({...form, subject: e.target.value})}
              placeholder="Contoh: Biologi" 
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kelas</label>
            <select 
              value={form.grade}
              onChange={e => setForm({...form, grade: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Pilih Kelas</option>
              <option value="X">X (Sepuluh)</option>
              <option value="XI">XI (Sebelas)</option>
              <option value="XII">XII (Dua Belas)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Topik / Capaian Pembelajaran</label>
            <input 
              type="text" 
              value={form.topic}
              onChange={e => setForm({...form, topic: e.target.value})}
              placeholder="Contoh: Sistem Pencernaan" 
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={loading}
          className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition flex items-center justify-center disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
          {loading ? 'AI Sedang Meracik Materi...' : 'Generate Bahan Ajar Interaktif'}
        </button>
      </div>

      {result && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-indigo-50 border-b border-indigo-100 p-6 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-indigo-900">Hasil Generate Bahan Ajar</h2>
              <p className="text-sm text-indigo-600 mt-1">Review materi sebelum disimpan untuk siswa.</p>
            </div>
            <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium flex items-center hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition">
              <Save className="w-4 h-4 mr-2" /> Simpan Materi
            </button>
          </div>
          
          <div className="p-8 space-y-8">
            {/* Mindmap / Konsep Utama */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-indigo-500" /> Peta Konsep Utama
              </h3>
              <div className="flex flex-wrap gap-3">
                {result.mindMap?.map((item: string, idx: number) => (
                  <span key={idx} className="px-4 py-2 bg-gray-100 text-gray-800 rounded-full text-sm font-medium border border-gray-200">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Materi Detail */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Detail Materi Pembelajaran</h3>
              {result.materials?.map((mat: any, idx: number) => (
                <div key={idx} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h4 className="font-bold text-lg text-gray-900 mb-3">{mat.title}</h4>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">{mat.content}</p>
                </div>
              ))}
            </div>

            {/* Pertanyaan Pemantik */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Pertanyaan Pemantik Interaktif</h3>
              <div className="space-y-4">
                {result.interactiveQuestions?.map((q: any, idx: number) => (
                  <div key={idx} className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100">
                    <p className="font-semibold text-gray-900 mb-4">{idx + 1}. {q.question}</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {q.options?.map((opt: string, oIdx: number) => (
                        <div key={oIdx} className={`p-3 rounded-lg border text-sm font-medium ${opt === q.answer ? 'bg-green-100 border-green-200 text-green-800' : 'bg-white border-gray-200 text-gray-700'}`}>
                          {String.fromCharCode(65 + oIdx)}. {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
