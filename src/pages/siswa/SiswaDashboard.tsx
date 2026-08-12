import React from 'react';
import { useAuth } from '../../components/AuthProvider';
import { BookOpen, CheckCircle2, Clock, Search } from 'lucide-react';

export default function SiswaDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Halo, {user?.name}!</h1>
        <p className="text-blue-100 text-lg">NISN: {user?.username} • Semangat belajarnya hari ini!</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Daftar Tugas / Soal</h2>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari mata pelajaran..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Placeholder for tasks */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-300 transition-colors group cursor-pointer">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">Biologi - Sel & Jaringan</h3>
                <p className="text-sm text-gray-500">Guru: Bpk. Ahmad</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full flex items-center">
              <Clock className="w-3 h-3 mr-1" /> Belum Dikerjakan
            </span>
          </div>
          <p className="text-gray-600 text-sm mb-6 line-clamp-2">Pelajari materi sistem pencernaan dan kerjakan soal latihan interaktif untuk mengukur pemahaman.</p>
          
          <button className="w-full py-2.5 bg-gray-50 text-blue-600 font-semibold rounded-xl border border-gray-200 group-hover:bg-blue-50 transition-colors">
            Mulai Kerjakan
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Matematika - Aljabar</h3>
                <p className="text-sm text-gray-500">Guru: Ibu Siti</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Selesai
            </span>
          </div>
          
          <div className="mt-6 flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-600 font-medium">Nilai Akhir</span>
            <span className="text-2xl font-black text-green-600">85<span className="text-sm text-gray-400 font-normal">/100</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
