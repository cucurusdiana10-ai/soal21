import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabase';
import { GraduationCap, ArrowLeft, Loader2, Shield, Users, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get('role') || 'guru';
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already logged in with this role, redirect to dashboard smoothly
    if (user && user.role === requestedRole) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, requestedRole, navigate]);

  const handleRoleChange = (newRole: string) => {
    setError('');
    setUsername('');
    setPassword('');
    navigate(`/login?role=${newRole}`, { replace: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setLoading(true);
    setError('');

    try {
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();
      
      const emailCandidates: string[] = [];
      if (cleanUsername.includes('@')) {
        emailCandidates.push(cleanUsername);
      } else {
        emailCandidates.push(`${cleanUsername}@sekolah.com`);
        if (cleanUsername.toLowerCase().includes('cucurusdiana') || cleanUsername.toLowerCase() === 'admin') {
          emailCandidates.push('cucurusdiana10@gmail.com');
        }
      }

      let authSuccess = false;
      let userProfile: any = null;

      // 1. Try Supabase Auth first with candidates
      for (const candidateEmail of emailCandidates) {
        if (authSuccess) break;
        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: candidateEmail,
            password: cleanPassword
          });

          if (!authError && authData?.user) {
            let { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', authData.user.id)
              .maybeSingle();

            if (!userData) {
              const usernamePart = cleanUsername.includes('@') ? cleanUsername.split('@')[0] : cleanUsername;
              const { data: matchedUser } = await supabase
                .from('users')
                .select('*')
                .or(`username.ilike.${usernamePart},username.ilike.${cleanUsername}`)
                .limit(1)
                .maybeSingle();
              if (matchedUser) {
                userData = matchedUser;
              }
            }

            if (userData) {
              authSuccess = true;
              userProfile = userData;
              break;
            }
          }
        } catch (authErr) {
          console.warn(`Supabase auth signIn error for ${candidateEmail}:`, authErr);
        }
      }

      // 2. Fallback to direct users table validation (for seeded/database users)
      if (!authSuccess) {
        const usernamePart = cleanUsername.includes('@') ? cleanUsername.split('@')[0] : cleanUsername;
        const { data: dbUser, error: queryErr } = await supabase
          .from('users')
          .select('*')
          .or(`username.ilike.${cleanUsername},username.ilike.${usernamePart}`)
          .limit(1)
          .maybeSingle();

        if (dbUser && !queryErr) {
          if (String(dbUser.password).trim() === cleanPassword) {
            authSuccess = true;
            userProfile = dbUser;
          }
        }
      }

      if (!authSuccess || !userProfile) {
        throw new Error('Username/NISN atau kata sandi tidak cocok. Silakan periksa kembali.');
      }

      if (userProfile.status !== 'active') {
        try { await supabase.auth.signOut(); } catch {}
        throw new Error('Akun Anda sedang dinonaktifkan oleh administrator.');
      }

      login(userProfile);
      if (userProfile.role === 'guru') {
        navigate('/dashboard/cp');
      } else {
        navigate('/dashboard');
      }
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
            Login {requestedRole === 'guru' ? 'Guru' : requestedRole === 'admin' ? 'Administrator' : 'Siswa'}
          </h2>
          <p className="mt-2 text-sm text-slate-500 uppercase tracking-widest">
            Portal Pembelajaran Digital
          </p>
        </div>

        {/* Role Switcher Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => handleRoleChange('guru')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              requestedRole === 'guru'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Guru
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange('siswa')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              requestedRole === 'siswa'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Siswa
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange('admin')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              requestedRole === 'admin'
                ? 'bg-blue-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Admin
          </button>
        </div>
        
        <form className="mt-6 space-y-5" onSubmit={handleLogin}>
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
