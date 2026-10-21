import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { LogOut, LayoutDashboard, Users, BookOpen, FileText, CheckSquare, GraduationCap, Shield, Settings, Menu, X, Sparkles, Database, Activity, ClipboardList } from 'lucide-react';

import AdminDashboard from './admin/AdminDashboard';
import AppSettings from './admin/AppSettings';
import UserManagement from './admin/UserManagement';
import ClassManagement from './admin/ClassManagement';
import GuruDashboard from './guru/GuruDashboard';
import SiswaDashboard from './siswa/SiswaDashboard';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Automatically close mobile sidebar whenever route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const menuItems = {
    admin: [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
      { path: '/dashboard/admin', icon: Shield, label: 'Kelola Admin' },
      { path: '/dashboard/guru', icon: Users, label: 'Kelola Guru' },
      { path: '/dashboard/kelas', icon: BookOpen, label: 'Kelola Kelas' },
      { path: '/dashboard/siswa', icon: GraduationCap, label: 'Data Siswa' },
      { path: '/dashboard/pengaturan', icon: Settings, label: 'Kelola Aplikasi' },
    ],
    guru: [
      { path: '/dashboard/cp', icon: FileText, label: 'Lihat CP' },
      { path: '/dashboard/modul', icon: Sparkles, label: 'Modul Ajar Otomatis' },
      { path: '/dashboard/lkpd', icon: ClipboardList, label: 'Lembar Kerja (LKPD)' },
      { path: '/dashboard/bahan-ajar', icon: BookOpen, label: 'Bahan Ajar AI' },
      { path: '/dashboard/soal', icon: FileText, label: 'Buat Soal' },
      { path: '/dashboard/monitoring', icon: Activity, label: 'Monitoring Ujian' },
      { path: '/dashboard/laporan', icon: CheckSquare, label: 'Laporan Nilai' },
    ],
    siswa: [
      { path: '/dashboard', icon: FileText, label: 'Tugas Saya' },
      { path: '/dashboard/materi', icon: BookOpen, label: 'Materi Saya' },
      { path: '/dashboard/nilai', icon: CheckSquare, label: 'Daftar Nilai' },
    ]
  };

  const navLinks = menuItems[user.role] || [];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity cursor-pointer" 
          onClick={closeSidebar}
          onTouchStart={closeSidebar}
          aria-label="Tutup Menu"
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`fixed inset-y-0 left-0 w-72 max-w-[80vw] md:w-64 bg-white border-r border-gray-200 flex flex-col z-50 transform transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} md:static md:block`}>
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-blue-600 p-2 rounded-xl shadow-xs shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-black text-gray-900 text-sm block leading-tight truncate">SMAN 21 Garut</span>
              <span className="text-[10px] text-gray-500 font-medium block truncate">Portal CBT & Pembelajaran</span>
            </div>
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            className="md:hidden p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 rounded-lg transition shrink-0 flex items-center justify-center cursor-pointer"
            title="Tutup Menu"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-5 px-3.5 py-3 bg-gradient-to-br from-gray-50 to-blue-50/40 rounded-xl border border-gray-200/80">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Masuk sebagai</p>
            <p className="font-bold text-gray-900 text-sm truncate">{user.name}</p>
            <p className="text-xs text-blue-700 font-semibold capitalize mt-0.5">Akun {user.role}</p>
          </div>
          
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = (user.role === 'guru' && link.path === '/dashboard/cp')
                ? (location.pathname === '/dashboard/cp' || location.pathname === '/dashboard' || location.pathname === '/dashboard/')
                : location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={closeSidebar}
                  className={`flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl transition ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-3 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-bold text-red-600 rounded-xl bg-red-50 hover:bg-red-100 transition border border-red-200"
          >
            <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
            Keluar Akun
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-w-0 ${user.role === 'siswa' ? 'pb-16 md:pb-0' : ''}`}>
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              className="p-1.5 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              title="Menu Navigasi"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="bg-blue-600 p-1.5 rounded-lg shrink-0">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-xs sm:text-sm truncate leading-tight">SMAN 21 Garut</p>
              <p className="text-[10px] text-gray-500 truncate leading-tight">{user.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
            title="Keluar Akun"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-[11px] font-bold hidden xs:inline">Keluar</span>
          </button>
        </header>

        <div className="flex-1 p-3 sm:p-4 md:p-8 overflow-y-auto">
          <Routes>
            {user.role === 'admin' && (
              <>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/admin" element={<UserManagement role="admin" title="Kelola Admin" />} />
                <Route path="/guru" element={<UserManagement role="guru" title="Kelola Guru" />} />
                <Route path="/kelas" element={<ClassManagement />} />
                <Route path="/siswa" element={<UserManagement role="siswa" title="Data Siswa" />} />
                <Route path="/pengaturan" element={<AppSettings />} />
                <Route path="/*" element={<AdminDashboard />} />
              </>
            )}
            {user.role === 'guru' && (
              <>
                <Route path="/" element={<Navigate to="/dashboard/cp" replace />} />
                <Route path="/*" element={<GuruDashboard />} />
              </>
            )}
            {user.role === 'siswa' && <Route path="/*" element={<SiswaDashboard />} />}
          </Routes>
        </div>

        {/* Mobile Bottom Navigation for Siswa */}
        {user.role === 'siswa' && (
          <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-30 md:hidden flex items-center justify-around py-1.5 px-2 shadow-lg">
            <Link
              to="/dashboard"
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
                location.pathname === '/dashboard' || location.pathname === '/dashboard/'
                  ? 'text-blue-700 font-black'
                  : 'text-gray-500 hover:text-gray-900 font-medium'
              }`}
            >
              <FileText className={`w-5 h-5 ${location.pathname === '/dashboard' || location.pathname === '/dashboard/' ? 'text-blue-700' : 'text-gray-400'}`} />
              <span className="text-[10px] mt-0.5">Tugas Saya</span>
            </Link>
            <Link
              to="/dashboard/materi"
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
                location.pathname.startsWith('/dashboard/materi')
                  ? 'text-blue-700 font-black'
                  : 'text-gray-500 hover:text-gray-900 font-medium'
              }`}
            >
              <BookOpen className={`w-5 h-5 ${location.pathname.startsWith('/dashboard/materi') ? 'text-blue-700' : 'text-gray-400'}`} />
              <span className="text-[10px] mt-0.5">Materi Saya</span>
            </Link>
            <Link
              to="/dashboard/nilai"
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
                location.pathname.startsWith('/dashboard/nilai')
                  ? 'text-blue-700 font-black'
                  : 'text-gray-500 hover:text-gray-900 font-medium'
              }`}
            >
              <CheckSquare className={`w-5 h-5 ${location.pathname.startsWith('/dashboard/nilai') ? 'text-blue-700' : 'text-gray-400'}`} />
              <span className="text-[10px] mt-0.5">Daftar Nilai</span>
            </Link>
          </nav>
        )}
      </main>
    </div>
  );
}
