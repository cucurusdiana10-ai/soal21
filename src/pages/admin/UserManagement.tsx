import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Eye, 
  EyeOff, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Check, 
  AlertTriangle 
} from 'lucide-react';
import { User } from '../../types';
import * as XLSX from 'xlsx';

interface UserManagementProps {
  role: 'admin' | 'guru' | 'siswa';
  title: string;
}

interface ParsedStudentRow {
  nisn: string;
  name: string;
  className: string;
  classId?: string;
  password: string;
  isValid: boolean;
  error?: string;
}

interface ParsedGuruRow {
  username: string;
  name: string;
  mapel: string;
  password: string;
  isValid: boolean;
  error?: string;
}

const ITEMS_PER_PAGE = 10;

export default function UserManagement({ role, title }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  
  // Import modal states
  const [importParsedRows, setImportParsedRows] = useState<(ParsedStudentRow | ParsedGuruRow)[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    status: 'active' as 'active' | 'inactive',
    mapel: '',
    class_id: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  // to track mapel per guru & class per student
  const [guruSubjects, setGuruSubjects] = useState<Record<string, string>>({});
  const [studentClasses, setStudentClasses] = useState<Record<string, { id: string; name: string }>>({});
  const [classList, setClassList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchClasses();
    fetchUsers();
  }, [role, page, search]);

  async function fetchClasses() {
    const { data } = await supabase.from('classes').select('id, name').order('name');
    if (data) setClassList(data);
  }

  async function fetchUsers() {
    setLoading(true);
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('role', role)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    query = query.range(from, to);

    const { data, count, error } = await query;

    if (!error && data) {
      setUsers(data);
      setTotalItems(count || 0);

      // Fetch mapel if role is guru
      if (role === 'guru' && data.length > 0) {
        const guruIds = data.map(u => u.id);
        const { data: subjects } = await supabase
          .from('subjects')
          .select('guru_id, name')
          .in('guru_id', guruIds);
        
        if (subjects) {
          const subjectMap: Record<string, string[]> = {};
          subjects.forEach(s => {
            if (!subjectMap[s.guru_id]) subjectMap[s.guru_id] = [];
            subjectMap[s.guru_id].push(s.name);
          });
          
          const combinedMap: Record<string, string> = {};
          Object.keys(subjectMap).forEach(id => {
            combinedMap[id] = subjectMap[id].join(', ');
          });
          setGuruSubjects(combinedMap);
        }
      }

      // Fetch class if role is siswa
      if (role === 'siswa' && data.length > 0) {
        const studentIds = data.map(u => u.id);
        const { data: classStuds } = await supabase
          .from('class_students')
          .select('student_id, class:classes(id, name)')
          .in('student_id', studentIds);

        if (classStuds) {
          const map: Record<string, { id: string; name: string }> = {};
          classStuds.forEach((cs: any) => {
            if (cs.class) map[cs.student_id] = cs.class;
          });
          setStudentClasses(map);
        }
      }
    }
    setLoading(false);
  }

  // Generate and Download Excel Template for Siswa or Guru
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    if (role === 'siswa') {
      // 1. Sheet Data Siswa
      const sampleClasses = classList.length > 0 
        ? classList.map(c => c.name) 
        : ['X-A', 'X-B', 'XI-IPA 1', 'XII-IPS 1'];

      const studentHeaders = ['NISN', 'NAMA_LENGKAP', 'KELAS', 'PASSWORD'];
      const studentData = [
        studentHeaders,
        ['0078912341', 'Ahmad Fauzi Rahman', sampleClasses[0] || 'X-A', '123456'],
        ['0078912342', 'Siti Nurhalizah Putri', sampleClasses[1] || sampleClasses[0] || 'X-B', '123456'],
        ['0078912343', 'Budi Pratama Santoso', sampleClasses[2] || sampleClasses[0] || 'XI-IPA 1', '123456'],
        ['0078912344', 'Dewi Anggraini Lestari', sampleClasses[0] || 'X-A', '123456'],
        ['0078912345', 'Rizky Muhammad Fajar', sampleClasses[1] || sampleClasses[0] || 'X-B', '123456'],
      ];

      const wsStudents = XLSX.utils.aoa_to_sheet(studentData);
      
      // Styling column widths
      wsStudents['!cols'] = [
        { wch: 18 }, // NISN
        { wch: 30 }, // NAMA LENGKAP
        { wch: 16 }, // KELAS
        { wch: 14 }  // PASSWORD
      ];

      XLSX.utils.book_append_sheet(wb, wsStudents, 'DATA_SISWA');

      // 2. Sheet Daftar Kelas Tersedia
      const classHeaders = ['NO', 'NAMA_KELAS_TERDAFTAR', 'STATUS'];
      const classRows = classList.length > 0 
        ? classList.map((c, idx) => [idx + 1, c.name, 'Tersedia di Sistem'])
        : [
            [1, 'X-A', 'Contoh'],
            [2, 'X-B', 'Contoh'],
            [3, 'XI-IPA 1', 'Contoh']
          ];

      const wsClasses = XLSX.utils.aoa_to_sheet([classHeaders, ...classRows]);
      wsClasses['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsClasses, 'DAFTAR_KELAS');

      // 3. Sheet Petunjuk
      const guideData = [
        ['PETUNJUK PENGISIAN TEMPLATE IMPORT SISWA - SMAN 21 GARUT'],
        [''],
        ['1. Kolom NISN: Wajib diisi angka NISN siswa (unik, tanpa spasi). Digunakan siswa untuk login.'],
        ['2. Kolom NAMA_LENGKAP: Wajib diisi nama lengkap siswa.'],
        ['3. Kolom KELAS: Diisi nama kelas sesuai daftar di sheet "DAFTAR_KELAS" (contoh: X-A, XI-IPA 1). Siswa akan otomatis terdaftar ke kelas tersebut.'],
        ['4. Kolom PASSWORD: Bersifat opsional. Jika dikosongkan, password default otomatis "123456".'],
        ['5. Simpan file dalam format .xlsx atau .xls, lalu upload melalui menu "Import Excel".']
      ];
      const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
      wsGuide['!cols'] = [{ wch: 90 }];
      XLSX.utils.book_append_sheet(wb, wsGuide, 'PETUNJUK');

      XLSX.writeFile(wb, 'Template_Import_Siswa_SMAN21Garut.xlsx');
    } else if (role === 'guru') {
      // Sheet Data Guru
      const guruHeaders = ['NIP_ATAU_USERNAME', 'NAMA_LENGKAP', 'MATA_PELAJARAN', 'PASSWORD'];
      const guruData = [
        guruHeaders,
        ['198501012010011001', 'Dra. Hj. Nurjanah, M.Pd.', 'Matematika, Fisika', '123456'],
        ['198702022011022002', 'Budi Hermawan, S.Kom.', 'Informatika, TIK', '123456'],
        ['199003032014031003', 'Siti Rahmawati, S.Pd.', 'Bahasa Indonesia', '123456'],
      ];

      const wsGuru = XLSX.utils.aoa_to_sheet(guruData);
      wsGuru['!cols'] = [
        { wch: 22 },
        { wch: 32 },
        { wch: 28 },
        { wch: 14 }
      ];
      XLSX.utils.book_append_sheet(wb, wsGuru, 'DATA_GURU');

      const guideGuru = [
        ['PETUNJUK PENGISIAN TEMPLATE IMPORT GURU - SMAN 21 GARUT'],
        [''],
        ['1. Kolom NIP_ATAU_USERNAME: Wajib diisi NIP atau username unik untuk login guru.'],
        ['2. Kolom NAMA_LENGKAP: Wajib diisi nama lengkap dan gelar guru.'],
        ['3. Kolom MATA_PELAJARAN: Diisi mapel yang diampu (pisahkan dengan koma jika lebih dari 1, contoh: Matematika, Fisika).'],
        ['4. Kolom PASSWORD: Jika kosong, default "123456".']
      ];
      const wsGuideGuru = XLSX.utils.aoa_to_sheet(guideGuru);
      wsGuideGuru['!cols'] = [{ wch: 90 }];
      XLSX.utils.book_append_sheet(wb, wsGuideGuru, 'PETUNJUK');

      XLSX.writeFile(wb, 'Template_Import_Guru_SMAN21Garut.xlsx');
    }
  };

  // Process Excel File for Import Preview
  const handleProcessFile = async (file: File) => {
    setImportFileName(file.name);
    setImportResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        alert('File Excel kosong atau tidak memiliki data.');
        return;
      }

      if (role === 'siswa') {
        const parsed: ParsedStudentRow[] = jsonData.map((row) => {
          const rawNisn = row.nisn || row.NISN || row.Nisn || row.username || row.Username || row.USERNAME || row.nis || row.NIS || '';
          const nisn = String(rawNisn).replace(/\s+/g, '').toLowerCase();
          
          const name = String(row.nama_lengkap || row.NAMA_LENGKAP || row.Nama_Lengkap || row.name || row.Nama || row.NAMA || row['Nama Siswa'] || row['NAMA SISWA'] || '').trim();
          
          const rawClass = String(row.kelas || row.KELAS || row.Kelas || row.class || row.Class || row.rombel || row.ROMBEL || '').trim();
          
          const rawPassword = row.password || row.PASSWORD || row.Password || row.sandi || row.SANDI || '123456';
          const password = String(rawPassword).trim() || '123456';

          // Match with existing class list
          let matchedClass = classList.find(c => c.name.toLowerCase() === rawClass.toLowerCase());
          if (!matchedClass && rawClass) {
            matchedClass = classList.find(c => c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === rawClass.toLowerCase().replace(/[^a-z0-9]/g, ''));
          }

          const isValid = !!(nisn && name);
          let error = '';
          if (!nisn) error = 'NISN kosong';
          else if (!name) error = 'Nama kosong';

          return {
            nisn,
            name,
            className: rawClass,
            classId: matchedClass?.id,
            password,
            isValid,
            error
          };
        });

        setImportParsedRows(parsed);
        setIsImportModalOpen(true);
      } else if (role === 'guru') {
        const parsed: ParsedGuruRow[] = jsonData.map((row) => {
          const rawUsername = row.nip_atau_username || row.NIP_ATAU_USERNAME || row.nip || row.NIP || row.username || row.Username || row.USERNAME || '';
          const username = String(rawUsername).replace(/\s+/g, '').toLowerCase();
          
          const name = String(row.nama_lengkap || row.NAMA_LENGKAP || row.Nama_Lengkap || row.name || row.Nama || row.NAMA || row['Nama Guru'] || '').trim();
          
          const mapel = String(row.mata_pelajaran || row.MATA_PELAJARAN || row.mapel || row.MAPEL || row.subject || '').trim();
          
          const rawPassword = row.password || row.PASSWORD || row.Password || '123456';
          const password = String(rawPassword).trim() || '123456';

          const isValid = !!(username && name);
          let error = '';
          if (!username) error = 'NIP/Username kosong';
          else if (!name) error = 'Nama kosong';

          return {
            username,
            name,
            mapel,
            password,
            isValid,
            error
          };
        });

        setImportParsedRows(parsed);
        setIsImportModalOpen(true);
      }
    } catch (err: any) {
      alert('Gagal membaca file Excel: ' + err.message);
    }
  };

  // Direct quick file upload
  const handleDirectFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Execute Import to Supabase
  const handleExecuteImport = async () => {
    const validRows = importParsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('Tidak ada data valid yang dapat diimpor.');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      let successCount = 0;
      let failedCount = 0;

      if (role === 'siswa') {
        const studentRows = validRows as ParsedStudentRow[];

        for (const row of studentRows) {
          try {
            // Check if user already exists
            const { data: existingUser } = await supabase
              .from('users')
              .select('id')
              .eq('username', row.nisn)
              .maybeSingle();

            let studentId = existingUser?.id;

            if (existingUser) {
              // Update existing user
              const { error: updateErr } = await supabase
                .from('users')
                .update({
                  name: row.name,
                  password: row.password,
                  status: 'active'
                })
                .eq('id', existingUser.id);

              if (updateErr) throw updateErr;
            } else {
              // Insert new user
              const { data: newUser, error: insertErr } = await supabase
                .from('users')
                .insert([{
                  role: 'siswa',
                  username: row.nisn,
                  name: row.name,
                  password: row.password,
                  status: 'active'
                }])
                .select('id')
                .single();

              if (insertErr) throw insertErr;
              if (newUser) studentId = newUser.id;
            }

            // Assign to class if classId is available or match by name
            if (studentId) {
              let targetClassId = row.classId;

              // If not matched yet, try to find or create class if class name was given
              if (!targetClassId && row.className) {
                const found = classList.find(c => c.name.toLowerCase() === row.className.toLowerCase());
                if (found) {
                  targetClassId = found.id;
                }
              }

              if (targetClassId) {
                // Delete previous class link and insert new
                await supabase.from('class_students').delete().eq('student_id', studentId);
                await supabase.from('class_students').insert([{
                  student_id: studentId,
                  class_id: targetClassId
                }]);
              }
            }

            successCount++;
          } catch (err) {
            console.error('Error importing student:', row.nisn, err);
            failedCount++;
          }
        }
      } else if (role === 'guru') {
        const guruRows = validRows as ParsedGuruRow[];

        for (const row of guruRows) {
          try {
            const { data: existingUser } = await supabase
              .from('users')
              .select('id')
              .eq('username', row.username)
              .maybeSingle();

            let guruId = existingUser?.id;

            if (existingUser) {
              const { error: updateErr } = await supabase
                .from('users')
                .update({
                  name: row.name,
                  password: row.password,
                  status: 'active'
                })
                .eq('id', existingUser.id);
              if (updateErr) throw updateErr;
            } else {
              const { data: newUser, error: insertErr } = await supabase
                .from('users')
                .insert([{
                  role: 'guru',
                  username: row.username,
                  name: row.name,
                  password: row.password,
                  status: 'active'
                }])
                .select('id')
                .single();
              if (insertErr) throw insertErr;
              if (newUser) guruId = newUser.id;
            }

            // Assign subjects
            if (guruId && row.mapel) {
              await supabase.from('subjects').delete().eq('guru_id', guruId);
              const subjectList = row.mapel.split(',').map(s => s.trim()).filter(Boolean);
              if (subjectList.length > 0) {
                const subjectInserts = subjectList.map(name => ({
                  guru_id: guruId,
                  name
                }));
                await supabase.from('subjects').insert(subjectInserts);
              }
            }

            successCount++;
          } catch (err) {
            console.error('Error importing guru:', row.username, err);
            failedCount++;
          }
        }
      }

      setImportResult({
        success: successCount,
        failed: failedCount,
        message: `Selesai! Berhasil mengimpor ${successCount} data ${role}.${failedCount > 0 ? ` (${failedCount} gagal)` : ''}`
      });

      fetchUsers();
    } catch (err: any) {
      alert('Gagal mengeksekusi import: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const openAddModal = () => {
    setSelectedUser(null);
    setFormData({ name: '', username: '', password: '', status: 'active', mapel: '', class_id: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({ 
      name: user.name, 
      username: user.username, 
      password: '', 
      status: user.status,
      mapel: guruSubjects[user.id] || '',
      class_id: studentClasses[user.id]?.id || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      let currentUserId = selectedUser?.id;

      if (selectedUser) {
        // Edit Mode
        const updates: any = {
          name: formData.name,
          username: formData.username,
          status: formData.status
        };
        if (formData.password) {
          updates.password = formData.password;
        }

        const { error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', selectedUser.id);

        if (error) throw error;
      } else {
        // Add Mode
        if (!formData.password) {
          throw new Error('Password wajib diisi untuk pengguna baru.');
        }
        
        const { data, error } = await supabase
          .from('users')
          .insert([{
            role,
            name: formData.name,
            username: formData.username,
            password: formData.password,
            status: formData.status
          }]).select('id').single();

        if (error) throw error;
        if (data) currentUserId = data.id;
      }
      
      // Update subjects if role is guru
      if (role === 'guru' && currentUserId) {
        await supabase.from('subjects').delete().eq('guru_id', currentUserId);
        
        if (formData.mapel.trim()) {
          const mapelList = formData.mapel.split(',').map(s => s.trim()).filter(Boolean);
          if (mapelList.length > 0) {
            const subjectInserts = mapelList.map(name => ({
              guru_id: currentUserId,
              name
            }));
            await supabase.from('subjects').insert(subjectInserts);
          }
        }
      }

      // Update student class if role is siswa
      if (role === 'siswa' && currentUserId) {
        await supabase.from('class_students').delete().eq('student_id', currentUserId);
        if (formData.class_id) {
          await supabase.from('class_students').insert([{
            student_id: currentUserId,
            class_id: formData.class_id
          }]);
        }
      }
      
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setFormLoading(true);
    try {
      const { error } = await supabase.from('users').delete().eq('id', selectedUser.id);
      if (error) throw error;
      
      setIsDeleteModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert('Gagal menghapus pengguna: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500">Kelola data master {role} SMAN 21 Garut.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {(role === 'guru' || role === 'siswa') && (
            <>
              {/* Hidden Direct File Input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleDirectFileUpload} 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
              />
              
              {/* Download Template Excel Button */}
              <button 
                onClick={handleDownloadTemplate}
                className="px-3.5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-semibold flex items-center justify-center hover:bg-emerald-100 hover:border-emerald-300 transition-all shadow-sm active:scale-95"
                title={`Unduh Template Excel ${role === 'siswa' ? 'Siswa' : 'Guru'}`}
              >
                <Download className="w-4 h-4 mr-1.5 text-emerald-600" />
                Template Excel
              </button>

              {/* Import Excel Button */}
              <button 
                onClick={() => {
                  setImportParsedRows([]);
                  setImportFileName('');
                  setImportResult(null);
                  setIsImportModalOpen(true);
                }}
                className="px-3.5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Import Excel
              </button>
            </>
          )}

          {/* Add User Button */}
          <button 
            onClick={openAddModal}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center hover:bg-blue-700 transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah {role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        </div>
      </div>

      {/* Quick Guide Card for Siswa Import */}
      {role === 'siswa' && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-100 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm shrink-0 mt-0.5">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Ingin Mengimpor Data Siswa Sekaligus?</h3>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                Unduh format template Excel resmi dengan daftar kelas terdaftar, isi data NISN, nama, kelas, lalu unggah untuk mendaftarkan ratusan siswa dalam hitungan detik.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={handleDownloadTemplate}
              className="w-full sm:w-auto px-3.5 py-2 bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Unduh Format (.xlsx)
            </button>
            <button
              onClick={() => {
                setImportParsedRows([]);
                setImportFileName('');
                setImportResult(null);
                setIsImportModalOpen(true);
              }}
              className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Unggah File
            </button>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder={`Cari nama atau ${role === 'siswa' ? 'NISN' : 'username'} ${role}...`}
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            />
          </div>
          <div className="text-xs font-semibold text-gray-500">
            Total {totalItems} {role} terdaftar
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Nama Lengkap</th>
                <th className="px-6 py-4 whitespace-nowrap">{role === 'siswa' ? 'NISN (Login)' : 'Username / NIP'}</th>
                {role === 'guru' && <th className="px-6 py-4 whitespace-nowrap">Mata Pelajaran</th>}
                {role === 'siswa' && <th className="px-6 py-4 whitespace-nowrap">Kelas / Rombel</th>}
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={role === 'guru' || role === 'siswa' ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-500">Memuat data {role}...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={role === 'guru' || role === 'siswa' ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-gray-700 mb-1">Data tidak ditemukan</p>
                      <p className="text-xs text-gray-500">
                        {search ? `Tidak ada hasil untuk kata kunci "${search}"` : `Belum ada data ${role}. Tambah manual atau import dari Excel.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-100">
                          {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span className="font-medium text-gray-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                      <span className="bg-gray-100 px-2 py-1 rounded text-gray-700 font-medium">
                        {u.username}
                      </span>
                    </td>
                    {role === 'guru' && (
                      <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={guruSubjects[u.id] || '-'}>
                        {guruSubjects[u.id] ? (
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100 font-medium">
                            {guruSubjects[u.id]}
                          </span>
                        ) : (
                          <span className="italic text-gray-400 text-xs">Belum diatur</span>
                        )}
                      </td>
                    )}
                    {role === 'siswa' && (
                      <td className="px-6 py-4 text-gray-900 font-medium">
                        {studentClasses[u.id]?.name ? (
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">
                            Kelas {studentClasses[u.id]?.name}
                          </span>
                        ) : (
                          <span className="italic text-gray-400 text-xs bg-gray-50 px-2 py-0.5 rounded">Belum ada kelas</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${u.status === 'active' ? 'bg-green-600' : 'bg-red-600'}`}></span>
                        {u.status === 'active' ? 'Aktif' : 'Non-aktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <button 
                        onClick={() => openEditModal(u)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                        title="Edit data"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openDeleteModal(u)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                        title="Hapus data"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalItems > 0 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500 bg-gray-50">
            <div>
              Menampilkan {((page - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(page * ITEMS_PER_PAGE, totalItems)} dari {totalItems} data
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium">Halaman {page} dari {totalPages}</span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Import Excel Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0 bg-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Import Data {role === 'siswa' ? 'Siswa' : 'Guru'} dari Excel
                  </h3>
                  <p className="text-xs text-gray-500">
                    Mendukung format .xlsx, .xls, dan .csv dengan pencocokan kelas otomatis.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-xl hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Step 1: Download Template Banner */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-950">Belum punya format Excel yang sesuai?</p>
                    <p className="text-xs text-emerald-700">Unduh template siap pakai lengkap dengan daftar kelas terdaftar.</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs shrink-0 flex items-center justify-center"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Unduh Template (.xlsx)
                </button>
              </div>

              {/* Step 2: Upload Zone */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Pilih File Excel Data {role === 'siswa' ? 'Siswa' : 'Guru'}
                </label>
                <input 
                  type="file" 
                  ref={modalFileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProcessFile(file);
                  }}
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                />

                <div 
                  onClick={() => modalFileInputRef.current?.click()}
                  className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/50 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 group-hover:scale-110 flex items-center justify-center mb-2 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-indigo-900 mb-1">
                    {importFileName ? `File Terpilih: ${importFileName}` : 'Klik atau Tarik File Excel ke Sini'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Format yang didukung: .xlsx, .xls, .csv
                  </p>
                </div>
              </div>

              {/* Import Result Alert */}
              {importResult && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  importResult.failed === 0 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  {importResult.failed === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="text-sm">
                    <p className="font-bold">{importResult.message}</p>
                    <p className="text-xs mt-0.5">
                      {importResult.success} data berhasil diproses dan disimpan ke database.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Data Preview Table */}
              {importParsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <span>Pratinjau Data ({importParsedRows.length} baris)</span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                        {importParsedRows.filter(r => r.isValid).length} Valid
                      </span>
                      {importParsedRows.filter(r => !r.isValid).length > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-red-100 text-red-800 rounded-full">
                          {importParsedRows.filter(r => !r.isValid).length} Tidak Valid
                        </span>
                      )}
                    </h4>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="p-2.5">No</th>
                          <th className="p-2.5">{role === 'siswa' ? 'NISN' : 'Username'}</th>
                          <th className="p-2.5">Nama Lengkap</th>
                          {role === 'siswa' && <th className="p-2.5">Kelas Terdeteksi</th>}
                          {role === 'guru' && <th className="p-2.5">Mata Pelajaran</th>}
                          <th className="p-2.5">Password</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importParsedRows.map((row: any, idx) => (
                          <tr key={idx} className={row.isValid ? 'hover:bg-gray-50' : 'bg-red-50/50'}>
                            <td className="p-2.5 text-gray-500 font-mono">{idx + 1}</td>
                            <td className="p-2.5 font-mono font-medium">{row.nisn || row.username || '-'}</td>
                            <td className="p-2.5 font-medium text-gray-900">{row.name || '-'}</td>
                            {role === 'siswa' && (
                              <td className="p-2.5">
                                {row.classId ? (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-medium text-[11px]">
                                    Kelas {row.className}
                                  </span>
                                ) : row.className ? (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[11px]" title="Kelas belum terdaftar, siswa tetap dibuat tanpa kelas">
                                    {row.className} (Belum Terdaftar)
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic text-[11px]">Tanpa Kelas</span>
                                )}
                              </td>
                            )}
                            {role === 'guru' && (
                              <td className="p-2.5 text-gray-600">{row.mapel || '-'}</td>
                            )}
                            <td className="p-2.5 font-mono text-gray-500">******</td>
                            <td className="p-2.5">
                              {row.isValid ? (
                                <span className="inline-flex items-center text-green-600 font-semibold">
                                  <Check className="w-3.5 h-3.5 mr-1" /> Siap
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-red-600 font-semibold" title={row.error}>
                                  <AlertCircle className="w-3.5 h-3.5 mr-1" /> {row.error || 'Error'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-xl transition-colors text-sm"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => modalFileInputRef.current?.click()}
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 font-semibold hover:bg-gray-50 rounded-xl transition-colors text-sm"
                >
                  Pilih Ulang File
                </button>

                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={isImporting || importParsedRows.filter(r => r.isValid).length === 0}
                  className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center text-sm shadow-sm"
                >
                  {isImporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Mengimpor...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-1.5" />
                      Impor {importParsedRows.filter(r => r.isValid).length} Data ke Database
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">
                {selectedUser ? 'Edit' : 'Tambah'} {role.charAt(0).toUpperCase() + role.slice(1)}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 -mr-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {role === 'siswa' ? 'NISN (Nomor Induk Siswa Nasional)' : 'Username / Identitas'}
                  <span className="text-gray-400 font-normal ml-1">(tanpa spasi)</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value.replace(/\s+/g, '').toLowerCase()})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder={role === 'siswa' ? 'misal: 0051234567' : 'misal: admin01'}
                />
              </div>

              {role === 'siswa' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kelas / Rombel Siswa
                  </label>
                  <select
                    value={formData.class_id}
                    onChange={e => setFormData({...formData, class_id: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {classList.map(c => (
                      <option key={c.id} value={c.id}>Kelas {c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {role === 'guru' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mata Pelajaran <span className="text-gray-400 font-normal">(Pisahkan dengan koma)</span>
                  </label>
                  <input 
                    type="text" 
                    value={formData.mapel}
                    onChange={e => setFormData({...formData, mapel: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    placeholder="misal: Matematika, Fisika"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {selectedUser && <span className="text-gray-400 font-normal">(kosongkan jika tidak ingin diubah)</span>}
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required={!selectedUser}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none pr-10"
                    placeholder={selectedUser ? '******' : 'Masukkan password'}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Non-aktif</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {formLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden p-6 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Pengguna</h3>
            <p className="text-gray-500 mb-6">
              Apakah Anda yakin ingin menghapus <strong>{selectedUser?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-xl transition-colors flex-1"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={formLoading}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex-1"
              >
                {formLoading ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
