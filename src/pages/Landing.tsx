import React from 'react';
import { Link } from 'react-router-dom';
import heroImg from '../assets/images/sman_21_learning_1786499884070.jpg';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col overflow-hidden">
      <nav className="h-20 bg-blue-800 flex items-center justify-between px-6 md:px-10 shadow-lg shrink-0 text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-800 font-bold text-2xl">
            21
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight uppercase">SMAN 21 GARUT</h1>
            <p className="text-xs opacity-80 uppercase tracking-widest hidden sm:block">Portal Pembelajaran Digital</p>
          </div>
        </div>
        <div className="hidden md:flex gap-6 text-sm font-medium">
          <span className="opacity-70">Tahun Ajaran 2023/2024</span>
          <span className="bg-blue-600 px-3 py-1 rounded">Semester Ganjil</span>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        <div className="w-full lg:w-[640px] p-8 lg:p-12 flex flex-col justify-center shrink-0">
          <div className="mb-8">
            <h2 className="text-4xl font-extrabold text-slate-800 mb-4 leading-tight">
              Membangun Karakter & Prestasi di Era Digital
            </h2>
            <p className="text-slate-600 text-lg max-w-md">
              Aplikasi manajemen pembelajaran terpadu untuk pergantian semester dan tahun ajaran yang lebih terorganisir.
            </p>
          </div>
          
          <div className="relative h-64 w-full bg-slate-200 rounded-2xl overflow-hidden border-4 border-white shadow-xl flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/40 to-transparent z-10 pointer-events-none"></div>
            <img 
              src={heroImg} 
              alt="Kegiatan belajar mengajar SMAN 21 Garut" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="z-20 text-center px-4 md:px-10 mt-auto mb-4">
              <p className="text-sm text-slate-700 italic bg-white/90 backdrop-blur-sm py-2 px-4 rounded-full inline-block font-medium shadow-sm">
                "Mewujudkan Lingkungan Sekolah yang Tertib dan Berakhlak Mulia"
              </p>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-blue-700">1.240</p>
              <p className="text-[10px] md:text-xs text-slate-500 uppercase font-semibold">Siswa Aktif</p>
            </div>
            <div className="text-center border-x border-slate-200">
              <p className="text-2xl md:text-3xl font-bold text-blue-700">68</p>
              <p className="text-[10px] md:text-xs text-slate-500 uppercase font-semibold">Guru Pengampu</p>
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-blue-700">36</p>
              <p className="text-[10px] md:text-xs text-slate-500 uppercase font-semibold">Kelas Tersedia</p>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white lg:border-l border-t lg:border-t-0 shadow-2xl flex flex-col p-8 lg:p-10 justify-center gap-8 lg:overflow-y-auto">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-800">Masuk Aplikasi</h3>
            <p className="text-slate-500 text-sm">Silahkan pilih portal sesuai dengan peran Anda di sekolah.</p>
          </div>
          
          <div className="space-y-4">
            <Link to="/login?role=admin" className="w-full group flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50 transition-all text-left">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold group-hover:bg-blue-700 group-hover:text-white transition-colors">AD</div>
              <div className="flex-1">
                <div className="font-bold text-slate-800">Portal Administrator</div>
                <div className="text-xs text-slate-500">Kelola Guru, Siswa, dan Kelas</div>
              </div>
            </Link>
            
            <Link to="/login?role=guru" className="w-full group flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50 transition-all text-left">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold group-hover:bg-emerald-700 group-hover:text-white transition-colors">GR</div>
              <div className="flex-1">
                <div className="font-bold text-slate-800">Portal Guru</div>
                <div className="text-xs text-slate-500">Bahan Ajar AI, Kuis, & Nilai</div>
              </div>
            </Link>
            
            <Link to="/login?role=siswa" className="w-full group flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-orange-600 hover:bg-orange-50 transition-all text-left">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center text-orange-700 font-bold group-hover:bg-orange-700 group-hover:text-white transition-colors">SW</div>
              <div className="flex-1">
                <div className="font-bold text-slate-800">Portal Siswa</div>
                <div className="text-xs text-slate-500">Tugas Terbaru & Daftar Nilai</div>
              </div>
            </Link>
          </div>
          
          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path></svg>
              <span>Pastikan Anda memiliki NISN atau NIP yang valid.</span>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="h-12 bg-white border-t px-6 md:px-10 flex items-center justify-between text-[11px] text-slate-500 shrink-0 font-medium">
        <p>&copy; 2024 SMAN 21 Garut - Sistem Informasi Akademik</p>
        <div className="hidden sm:flex gap-4">
          <span>Dukungan Teknis</span>
          <span>Panduan Pengguna</span>
          <span>Kebijakan Privasi</span>
        </div>
      </footer>
    </div>
  );
}
