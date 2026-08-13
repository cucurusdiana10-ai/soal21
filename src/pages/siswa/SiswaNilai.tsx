import React, { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { CheckSquare, Award, Clock, FileText } from 'lucide-react';

export default function SiswaNilai() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentGrades();
  }, [user]);

  async function fetchStudentGrades() {
    if (!user) return;

    const { data } = await supabase
      .from('task_submissions')
      .select('*, task:tasks(title, type, subject_name)')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setSubmissions(data);
    setLoading(false);
  }

  const averageScore = submissions.length > 0 && submissions.filter(s => s.score !== null).length > 0
    ? Math.round(
        submissions.filter(s => s.score !== null).reduce((acc, curr) => acc + (curr.score || 0), 0) /
        submissions.filter(s => s.score !== null).length
      )
    : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Daftar Nilai Saya</h1>
        <p className="text-gray-500">Pantau perkembangan nilai tugas dan catatan umpan balik dari guru Anda.</p>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
            <Award className="w-8 h-8 text-yellow-300" />
          </div>
          <div>
            <p className="text-blue-100 text-sm font-medium">Rata-Rata Nilai Tugas</p>
            <p className="text-3xl font-black">{averageScore} <span className="text-sm font-normal text-blue-200">/ 100</span></p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{submissions.length}</p>
          <p className="text-xs text-blue-200">Total Tugas Dikumpulkan</p>
        </div>
      </div>

      {/* Submissions List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <CheckSquare className="w-5 h-5 mr-2 text-blue-600" /> Riwayat Penilaian
        </h2>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Memuat nilai...</div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Belum ada tugas yang dikumpulkan atau dinilai.</div>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => (
              <div key={sub.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                      {sub.task?.subject_name || 'Tugas'}
                    </span>
                    <h3 className="font-bold text-gray-900 text-base mt-1">{sub.task?.title}</h3>
                    <p className="text-xs text-gray-500">Dikumpulkan pada {new Date(sub.created_at).toLocaleDateString('id-ID')}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-gray-500 block mb-1">Nilai Akhir</span>
                    <span className={`text-2xl font-black ${sub.score !== null && sub.score >= 75 ? 'text-green-600' : 'text-amber-600'}`}>
                      {sub.score !== null ? sub.score : '-'}
                      <span className="text-xs font-normal text-gray-400">/100</span>
                    </span>
                  </div>
                </div>

                {sub.feedback && (
                  <div className="p-3 bg-white rounded-xl border border-gray-200 text-xs text-gray-700 whitespace-pre-line">
                    <span className="font-bold text-gray-900 block mb-1">Catatan / Umpan Balik Guru:</span>
                    {sub.feedback}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
