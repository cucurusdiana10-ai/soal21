import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, GraduationCap, BookOpen, Shield } from 'lucide-react';

export default function AdminDashboard() {
  const [counts, setCounts] = useState({
    admin: 0,
    guru: 0,
    siswa: 0,
    kelas: 0
  });

  useEffect(() => {
    async function fetchCounts() {
      const getCount = async (table: string, filter?: { column: string, value: string }) => {
        let query = supabase.from(table).select('id', { count: 'exact', head: true });
        if (filter) query = query.eq(filter.column, filter.value);
        const { count } = await query;
        return count || 0;
      };

      const [admin, guru, siswa, kelas] = await Promise.all([
        getCount('users', { column: 'role', value: 'admin' }),
        getCount('users', { column: 'role', value: 'guru' }),
        getCount('users', { column: 'role', value: 'siswa' }),
        getCount('classes')
      ]);

      setCounts({ admin, guru, siswa, kelas });
    }

    fetchCounts();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard Admin</h1>
        <p className="text-gray-500 mt-1">Ringkasan data SMAN 21 Garut.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Total Admin" count={counts.admin} icon={Shield} color="blue" />
        <StatCard title="Total Guru" count={counts.guru} icon={Users} color="green" />
        <StatCard title="Total Siswa" count={counts.siswa} icon={GraduationCap} color="purple" />
        <StatCard title="Total Kelas" count={counts.kelas} icon={BookOpen} color="orange" />
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 md:p-8 text-center mt-8">
        <h2 className="text-xl font-bold text-blue-900 mb-2">Selamat Datang di Portal Administrator</h2>
        <p className="text-blue-700 max-w-2xl mx-auto">
          Gunakan menu di samping (atau tombol menu di layar kecil) untuk mengelola data master seperti Guru, Siswa, Kelas, dan Pengaturan Aplikasi. Semua fitur telah dioptimalkan untuk performa tinggi dan kuota minimal.
        </p>
      </div>
    </div>
  );
}

function StatCard({ title, count, icon: Icon, color }: { title: string, count: string | number, icon: any, color: string }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  };
  
  return (
    <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
      <div className={`p-3 md:p-4 rounded-xl ${colors[color as keyof typeof colors]}`}>
        <Icon className="w-6 h-6 md:w-7 md:h-7" />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
        <p className="text-2xl md:text-3xl font-bold text-gray-900">{count}</p>
      </div>
    </div>
  );
}

