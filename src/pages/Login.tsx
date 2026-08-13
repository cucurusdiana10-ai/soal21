import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabase';
import { GraduationCap, ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get('role') || 'siswa';
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setLoading(true);
    setError('');

    try {
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();
      
      const email = `${cleanUsername}@sekolah.com`;

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: cleanPassword
      });

      if (authError) {
        console.error("Auth Error:", authError);
        throw new Error(`Kredensial tidak valid: Pastikan username dan password benar.`);
      }

      if (!authData.user) {
        throw new Error('Kredensial tidak valid: User tidak ditemukan.');
      }

      // Fetch user profile
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (dbError || !userData) {
        console.error("DB Error:", dbError);
        throw new Error(`Database Error: Gagal memuat profil pengguna.`);
      }

      if (userData.status !== 'active') {
        await supabase.auth.signOut();
        throw new Error('Akun Anda tidak aktif.');
      }

      login(userData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat login.');
    } finally {
      setLoading(false);
    }
  };

  const roleLabels: Record<string, string> = {
    siswa: 'Siswa (NISN)',
    guru: 'Guru (NIP/Username)',
    admin: 'Administrator',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 relative">
      <Link to="/" className="absolute top-8 left-8 flex items-center text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-5 h-5 mr-2" />
        Kembali ke Beranda
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-2xl border border-slate-100"
      >
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-800 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            Login {requestedRole.charAt(0).toUpperCase() + requestedRole.slice(1)}
          </h2>
          <p className="mt-2 text-sm text-slate-500 uppercase tracking-widest">
            Portal Pembelajaran Digital
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                {roleLabels[requestedRole] || 'Username'}
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow sm:text-sm"
                placeholder={`Masukkan ${roleLabels[requestedRole]?.split(' ')[0]}`}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-800 hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-800 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Masuk Aplikasi'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
