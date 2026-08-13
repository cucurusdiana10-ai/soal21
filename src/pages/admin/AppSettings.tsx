import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Loader2, Image as ImageIcon } from 'lucide-react';

export default function AppSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [settings, setSettings] = useState({
    id: '',
    nama_aplikasi: '',
    npsn: '',
    nama_sekolah: '',
    tahun_pelajaran: '',
    semester: 'Ganjil',
    nama_kepsek: '',
    ttd_kepsek: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error(error);
      } else if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, ttd_kepsek: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase
        .from('app_settings')
        .update({
          nama_aplikasi: settings.nama_aplikasi,
          npsn: settings.npsn,
          nama_sekolah: settings.nama_sekolah,
          tahun_pelajaran: settings.tahun_pelajaran,
          semester: settings.semester,
          nama_kepsek: settings.nama_kepsek,
          ttd_kepsek: settings.ttd_kepsek,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal menyimpan pengaturan.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Kelola Aplikasi</h1>
        <p className="text-slate-500">Konfigurasi pengaturan utama portal pembelajaran sekolah.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-lg border-b pb-2">Identitas Sekolah</h3>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Aplikasi</label>
                <input type="text" name="nama_aplikasi" value={settings.nama_aplikasi} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none" required />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Sekolah</label>
                <input type="text" name="nama_sekolah" value={settings.nama_sekolah} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none" required />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">NPSN</label>
                <input type="text" name="npsn" value={settings.npsn} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none" required />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-lg border-b pb-2">Tahun & Kepemimpinan</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tahun Pelajaran</label>
                  <input type="text" name="tahun_pelajaran" value={settings.tahun_pelajaran} onChange={handleChange} placeholder="Contoh: 2023/2024" className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Semester</label>
                  <select name="semester" value={settings.semester} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none">
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Kepala Sekolah</label>
                <input type="text" name="nama_kepsek" value={settings.nama_kepsek} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none" required />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tanda Tangan Kepala Sekolah</label>
                <div className="flex items-center gap-4">
                  {settings.ttd_kepsek ? (
                    <div className="h-16 w-32 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
                      <img src={settings.ttd_kepsek} alt="TTD Kepsek" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                    </div>
                  ) : (
                    <div className="h-16 w-32 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
                      Upload TTD (PNG/JPG)
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-800 hover:bg-blue-900 transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
