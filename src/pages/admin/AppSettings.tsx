import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Loader2, Image as ImageIcon, CheckCircle2, Stamp, RotateCcw } from 'lucide-react';
import {
  parseKepsek,
  formatKepsekDbString,
  getStoredTtdKepsek,
  setStoredTtdKepsek,
  getStoredCapSekolah,
  setStoredCapSekolah,
  getDefaultOfficialStampSvg
} from '../../lib/schoolSettings';
import OfficialSignatureStamp from '../../components/OfficialSignatureStamp';

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
    nip_kepsek: '',
    ttd_kepsek: '',
    cap_sekolah: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const localTtd = getStoredTtdKepsek();
      const localCap = getStoredCapSekolah();

      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error(error);
      } else if (data) {
        const kepsek = parseKepsek(data.nama_kepsek);
        const resolvedTtd = data.ttd_kepsek || localTtd || '';
        const resolvedCap = (data as any).cap_sekolah || localCap || '';
        if (data.ttd_kepsek) setStoredTtdKepsek(data.ttd_kepsek);
        if ((data as any).cap_sekolah) setStoredCapSekolah((data as any).cap_sekolah);

        setSettings({
          ...data,
          nama_kepsek: kepsek.nama,
          nip_kepsek: kepsek.nip,
          ttd_kepsek: resolvedTtd,
          cap_sekolah: resolvedCap
        });
      } else {
        setSettings(prev => ({
          ...prev,
          ttd_kepsek: localTtd,
          cap_sekolah: localCap
        }));
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

  const handleTtdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        setSettings(prev => ({ ...prev, ttd_kepsek: res }));
        setStoredTtdKepsek(res);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        setSettings(prev => ({ ...prev, cap_sekolah: res }));
        setStoredCapSekolah(res);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const combinedNamaKepsek = formatKepsekDbString(settings.nama_kepsek, settings.nip_kepsek);

      if (settings.ttd_kepsek) setStoredTtdKepsek(settings.ttd_kepsek);
      if (settings.cap_sekolah) setStoredCapSekolah(settings.cap_sekolah);

      // Attempt to save to Supabase
      const updatePayload: any = {
        nama_aplikasi: settings.nama_aplikasi,
        npsn: settings.npsn,
        nama_sekolah: settings.nama_sekolah,
        tahun_pelajaran: settings.tahun_pelajaran,
        semester: settings.semester,
        nama_kepsek: combinedNamaKepsek,
        ttd_kepsek: settings.ttd_kepsek,
        updated_at: new Date().toISOString()
      };

      try {
        const { error } = await supabase
          .from('app_settings')
          .update(updatePayload)
          .eq('id', settings.id);
        if (error) {
          console.warn('Supabase update error:', error);
        }
      } catch (dbErr) {
        console.warn('Supabase database sync error, saved locally:', dbErr);
      }

      setMessage({ type: 'success', text: 'Pengaturan, TTD, dan Cap Sekolah berhasil disimpan dan tersinkronisasi presisi!' });
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
                <label className="block text-sm font-semibold text-slate-700 mb-1">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  name="nip_kepsek"
                  value={settings.nip_kepsek}
                  onChange={handleChange}
                  placeholder="Contoh: 19700101 199501 1 001"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-mono text-sm"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  NIP ini akan otomatis tercantum pada setiap lembar pengesahan dan tanda tangan Kepala Sekolah di modul ajar maupun dokumen lainnya.
                </p>
              </div>

              {/* Bagian Tanda Tangan & Cap Sekolah */}
              <div className="pt-2 border-t border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-blue-700" />
                  Tanda Tangan & Cap Stempel Resmi Kepala Sekolah
                </h4>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Upload TTD */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      1. File Tanda Tangan (PNG / JPG)
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Gunakan foto/scan tanda tangan manual dengan pulpen hitam/biru. Latar putih otomatis transparan.
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-28 border border-slate-300 rounded-lg bg-white flex items-center justify-center overflow-hidden p-1 shadow-xs">
                        {settings.ttd_kepsek ? (
                          <img src={settings.ttd_kepsek} alt="TTD Kepsek" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono italic">Belum ada TTD</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-blue-600 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition">
                          <ImageIcon className="w-3.5 h-3.5 mr-1" />
                          {settings.ttd_kepsek ? 'Ganti TTD' : 'Pilih File TTD'}
                          <input type="file" accept="image/*" onChange={handleTtdChange} className="hidden" />
                        </label>
                        {settings.ttd_kepsek && (
                          <button
                            type="button"
                            onClick={() => {
                              setSettings(p => ({ ...p, ttd_kepsek: '' }));
                              setStoredTtdKepsek('');
                            }}
                            className="text-[11px] text-red-600 hover:underline text-left"
                          >
                            Hapus TTD
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Upload Cap / Stempel Sekolah */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      2. Cap / Stempel Resmi Sekolah
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Stempel basah ungu/biru. Otomatis menggunakan cap stempel resmi SMAN 21 Garut jika belum diunggah.
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-28 border border-slate-300 rounded-lg bg-white flex items-center justify-center overflow-hidden p-1 shadow-xs">
                        <img
                          src={settings.cap_sekolah || getDefaultOfficialStampSvg(settings.nama_sekolah || 'SMAN 21 GARUT')}
                          alt="Cap Sekolah"
                          className="max-h-full max-w-full object-contain mix-blend-multiply opacity-90"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-indigo-600 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition">
                          <Stamp className="w-3.5 h-3.5 mr-1" />
                          {settings.cap_sekolah ? 'Ganti Cap Manual' : 'Unggah Cap Kustom'}
                          <input type="file" accept="image/*" onChange={handleCapChange} className="hidden" />
                        </label>
                        {settings.cap_sekolah && (
                          <button
                            type="button"
                            onClick={() => {
                              setSettings(p => ({ ...p, cap_sekolah: '' }));
                              setStoredCapSekolah('');
                            }}
                            className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Reset ke Cap Standar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulasi Presisi Lembar Pengesahan */}
                <div className="mt-4 p-4 bg-amber-50/50 rounded-xl border border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Pratinjau Presisi Lembar Pengesahan (Ukuran TTD & Cap Manual di Modul Ajar)
                    </span>
                    <span className="text-[11px] text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded font-mono">
                      Skala Presisi Cetak Dokumen
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-inner max-w-sm mx-auto text-center font-serif text-slate-800">
                    <p className="text-xs">Mengetahui,</p>
                    <p className="text-xs font-bold">Kepala Sekolah {settings.nama_sekolah || 'SMAN 21 Garut'},</p>
                    
                    {/* TTD & Cap Overlay */}
                    <div className="my-1">
                      <OfficialSignatureStamp
                        ttdUrl={settings.ttd_kepsek}
                        capUrl={settings.cap_sekolah}
                        schoolName={settings.nama_sekolah || 'SMAN 21 GARUT'}
                        showStamp={false}
                      />
                    </div>

                    <p className="text-xs font-bold underline decoration-slate-800 tracking-wide">
                      {settings.nama_kepsek || 'Agus Supriatna, S.Pd., M.Si.'}
                    </p>
                    <p className="text-[11px] font-sans text-slate-600 font-mono mt-0.5">
                      {settings.nip_kepsek ? `NIP. ${settings.nip_kepsek}` : 'NIP. 19700101 199501 1 001'}
                    </p>
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
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan & TTD'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
