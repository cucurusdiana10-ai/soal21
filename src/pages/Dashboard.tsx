import React from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { LogOut, LayoutDashboard, Users, BookOpen, FileText, CheckSquare, GraduationCap, Shield } from 'lucide-react';

// Placeholder for Role Dashboards (to be implemented)
import AdminDashboard from './admin/AdminDashboard';
import GuruDashboard from './guru/GuruDashboard';
import SiswaDashboard from './siswa/SiswaDashboard';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = {
    admin: [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
      { path: '/dashboard/admin', icon: Shield, label: 'Kelola Admin' },
      { path: '/dashboard/guru', icon: Users, label: 'Kelola Guru' },
      { path: '/dashboard/kelas', icon: BookOpen, label: 'Kelola Kelas' },
      { path: '/dashboard/siswa', icon: GraduationCap, label: 'Kelola Siswa' },
    ],
    guru: [
      { path: '/dashboard', icon: BookOpen, label: 'Bahan Ajar AI' },
      { path: '/dashboard/soal', icon: FileText, label: 'Buat Soal' },
      { path: '/dashboard/laporan', icon: CheckSquare, label: 'Laporan Nilai' },
    ],
    siswa: [
      { path: '/dashboard', icon: FileText, label: 'Tugas Saya' },
      { path: '/dashboard/nilai', icon: CheckSquare, label: 'Daftar Nilai' },
    ]
  };

  const navLinks = menuItems[user.role] || [];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col fixed inset-y-0">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-gray-900">SMAN 21 Garut</span>
        </div>
        
        <div className="p-4 flex-1">
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
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
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
            <LogOut className="w-5 h-5 mr-3" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-8">
        <Routes>
          {user.role === 'admin' && <Route path="/*" element={<AdminDashboard />} />}
          {user.role === 'guru' && <Route path="/*" element={<GuruDashboard />} />}
          {user.role === 'siswa' && <Route path="/*" element={<SiswaDashboard />} />}
        </Routes>
      </main>
    </div>
  );
}
