import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, X, Eye, EyeOff, Upload } from 'lucide-react';
import { User } from '../../types';
import * as XLSX from 'xlsx';

interface UserManagementProps {
  role: 'admin' | 'guru' | 'siswa';
  title: string;
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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page on search
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const toInsert = jsonData.map((row: any) => ({
        role,
        name: row.name || row.Nama || row.NAMA,
        username: String(row.nisn || row.NISN || row.username || row.Username || row.USERNAME || '').replace(/\s+/g, '').toLowerCase(),
        password: String(row.password || row.Password || row.PASSWORD || '123456'),
        status: 'active'
      })).filter(u => u.name && u.username);

      if (toInsert.length === 0) {
        alert('Format file tidak valid. Pastikan ada kolom "name", "nisn" / "username", dan "password".');
        return;
      }

      const { error } = await supabase.from('users').insert(toInsert);
      if (error) throw error;
      
      alert(`Berhasil mengimpor ${toInsert.length} data.`);
      fetchUsers();
    } catch (err: any) {
      alert('Gagal mengimpor file: ' + err.message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500">Kelola data {role} SMAN 21 Garut.</p>
        </div>
        <div className="flex gap-2">
          {(role === 'guru' || role === 'siswa') && (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium flex items-center justify-center hover:bg-green-700 transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Excel
              </button>
            </>
          )}
          <button 
            onClick={openAddModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium flex items-center justify-center hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah {role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder={`Cari nama ${role}...`}
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Nama Lengkap</th>
                <th className="px-6 py-4 whitespace-nowrap">{role === 'siswa' ? 'NISN' : 'Username / Identitas'}</th>
                {role === 'guru' && <th className="px-6 py-4 whitespace-nowrap">Mata Pelajaran</th>}
                {role === 'siswa' && <th className="px-6 py-4 whitespace-nowrap">Kelas / Rombel</th>}
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={role === 'guru' || role === 'siswa' ? 5 : 4} className="px-6 py-8 text-center text-gray-500">
                    Memuat data...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={role === 'guru' || role === 'siswa' ? 5 : 4} className="px-6 py-8 text-center text-gray-500">
                    Data tidak ditemukan.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{u.username}</td>
                    {role === 'guru' && (
                      <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={guruSubjects[u.id] || '-'}>
                        {guruSubjects[u.id] || <span className="italic text-gray-400">Belum diatur</span>}
                      </td>
                    )}
                    {role === 'siswa' && (
                      <td className="px-6 py-4 text-gray-900 font-medium">
                        {studentClasses[u.id]?.name ? (
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                            {studentClasses[u.id]?.name}
                          </span>
                        ) : (
                          <span className="italic text-gray-400 text-xs">Belum diatur</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {u.status === 'active' ? 'Aktif' : 'Non-aktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => openEditModal(u)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openDeleteModal(u)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
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
