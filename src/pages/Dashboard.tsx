import React, { useState } from 'react';
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { LogOut, LayoutDashboard, Users, BookOpen, FileText, CheckSquare, GraduationCap, Shield, Settings, Menu, X } from 'lucide-react';

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

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const handleLogout = () => {
    logout();
    window.location.href = '/';
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
      { path: '/dashboard/siswa', icon: GraduationCap, label: 'Kelola Siswa' },
      { path: '/dashboard/pengaturan', icon: Settings, label: 'Kelola Aplikasi' },
    ],
    guru: [
      { path: '/dashboard', icon: BookOpen, label: 'Bahan Ajar AI' },
      { path: '/dashboard/soal', icon: FileText, label: 'Buat Soal' },
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
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 md:hidden" 
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-50 transform transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:static md:block`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-gray-900">SMAN 21 Garut</span>
          </div>
          <button onClick={closeSidebar} className="md:hidden p-1 text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-6 px-3 py-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Masuk sebagai</p>
            <p className="font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-sm text-gray-500 capitalize">{user.role}</p>
          </div>
          
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={closeSidebar}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3 flex-shrink-0" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center gap-4 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-gray-900 truncate">SMAN 21 Garut</span>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Routes>
            {user.role === 'admin' && (
              <>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/admin" element={<UserManagement role="admin" title="Kelola Admin" />} />
                <Route path="/guru" element={<UserManagement role="guru" title="Kelola Guru" />} />
                <Route path="/kelas" element={<ClassManagement />} />
                <Route path="/siswa" element={<UserManagement role="siswa" title="Kelola Siswa" />} />
                <Route path="/pengaturan" element={<AppSettings />} />
                <Route path="/*" element={<AdminDashboard />} />
              </>
            )}
            {user.role === 'guru' && <Route path="/*" element={<GuruDashboard />} />}
            {user.role === 'siswa' && <Route path="/*" element={<SiswaDashboard />} />}
          </Routes>
        </div>
      </main>
    </div>
  );
}
