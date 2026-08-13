import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, BookOpen, X, Users as UsersIcon } from 'lucide-react';
import { User } from '../../types';

interface ClassItem {
  id: string;
  name: string;
  created_at: string;
  homeroom_teacher_id?: string;
  teacher?: { id: string; name: string } | null;
}

const ITEMS_PER_PAGE = 10;

export default function ClassManagement() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  
  const [classStudents, setClassStudents] = useState<{id: string; name: string; username: string}[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    homeroom_teacher_id: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [page, search]);

  async function fetchTeachers() {
    const { data } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'guru')
      .order('name', { ascending: true });
    
    if (data) setTeachers(data);
  }

  async function fetchClasses() {
    setLoading(true);
    let query = supabase
      .from('classes')
      .select('*, teacher:users!homeroom_teacher_id(id, name)', { count: 'exact' })
      .order('name', { ascending: true });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    query = query.range(from, to);

    const { data, count, error } = await query;

    if (!error && data) {
      setClasses(data);
      setTotalItems(count || 0);
    }
    setLoading(false);
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page on search
  };

  const openAddModal = () => {
    setSelectedClass(null);
    setFormData({ name: '', homeroom_teacher_id: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (cls: ClassItem) => {
    setSelectedClass(cls);
    setFormData({ name: cls.name, homeroom_teacher_id: cls.homeroom_teacher_id || '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const openDeleteModal = (cls: ClassItem) => {
    setSelectedClass(cls);
    setIsDeleteModalOpen(true);
  };

  const openStudentsModal = async (cls: ClassItem) => {
    setSelectedClass(cls);
    setIsStudentsModalOpen(true);
    setStudentsLoading(true);
    setClassStudents([]);

    const { data, error } = await supabase
      .from('class_students')
      .select('student:users!student_id(id, name, username)')
      .eq('class_id', cls.id);

    if (!error && data) {
      // Map to extract student details
      const students = data.map((d: any) => d.student).filter(Boolean);
      setClassStudents(students);
    }
    setStudentsLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const payload = {
        name: formData.name,
        homeroom_teacher_id: formData.homeroom_teacher_id || null
      };

      if (selectedClass) {
        const { error } = await supabase
          .from('classes')
          .update(payload)
          .eq('id', selectedClass.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('classes')
          .insert([payload]);

        if (error) throw error;
      }
      
      setIsModalOpen(false);
      fetchClasses();
    } catch (err: any) {
      if (err.code === '23505' || err.message?.includes('unique constraint')) {
        setFormError('Nama kelas sudah digunakan.');
      } else {
        setFormError(err.message || 'Terjadi kesalahan saat menyimpan data.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClass) return;
    setFormLoading(true);
    try {
      const { error } = await supabase.from('classes').delete().eq('id', selectedClass.id);
      if (error) throw error;
      
      setIsDeleteModalOpen(false);
      fetchClasses();
    } catch (err: any) {
      alert('Gagal menghapus kelas: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Kelas</h1>
          <p className="text-gray-500">Manajemen data kelas SMAN 21 Garut.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium flex items-center justify-center hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Kelas
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari nama kelas..."
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
                <th className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Nama Kelas
                  </div>
                </th>
                <th className="px-6 py-4 whitespace-nowrap">Wali Kelas</th>
                <th className="px-6 py-4 whitespace-nowrap">Siswa</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Memuat data...
                  </td>
                </tr>
              ) : classes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Data tidak ditemukan.
                  </td>
                </tr>
              ) : (
                classes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {c.teacher ? c.teacher.name : <span className="text-gray-400 italic">Belum diatur</span>}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => openStudentsModal(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors"
                      >
                        <UsersIcon className="w-3.5 h-3.5" />
                        Lihat Siswa
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => openEditModal(c)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openDeleteModal(c)}
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
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {selectedClass ? 'Edit' : 'Tambah'} Kelas
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 -mr-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kelas</label>
                <input 
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder="Contoh: X IPA 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wali Kelas (Opsional)</label>
                <select
                  value={formData.homeroom_teacher_id}
                  onChange={e => setFormData({...formData, homeroom_teacher_id: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
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
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Kelas</h3>
            <p className="text-gray-500 mb-6">
              Apakah Anda yakin ingin menghapus kelas <strong>{selectedClass?.name}</strong>? Data terkait mungkin akan ikut terhapus.
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

      {/* View Students Modal */}
      {isStudentsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Daftar Siswa</h3>
                <p className="text-sm text-gray-500">Kelas {selectedClass?.name}</p>
              </div>
              <button 
                onClick={() => setIsStudentsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 -mr-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {studentsLoading ? (
                <div className="text-center text-gray-500 py-8">Memuat daftar siswa...</div>
              ) : classStudents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <UsersIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500">Belum ada siswa di kelas ini.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                  {classStudents.map((student, i) => (
                    <li key={student.id} className="flex flex-col sm:flex-row sm:items-center p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">
                          {i + 1}. {student.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">NISN/Username: {student.username}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
