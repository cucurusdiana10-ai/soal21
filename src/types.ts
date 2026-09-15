export interface User {
  id: string;
  role: 'admin' | 'guru' | 'siswa';
  username: string;
  name: string;
  status: 'active' | 'inactive';
}

export interface Class {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
  guru_id: string;
}

export interface Material {
  id: string;
  subject_id: string;
  class_id: string;
  topic: string;
  content_json: any;
}

export interface Task {
  id: string;
  material_id: string;
  title: string;
  content: any;
  created_at: string;
}

export interface Submission {
  id: string;
  task_id: string;
  student_id: string;
  score: number;
  status: string;
}

export interface CapaianPembelajaran {
  id: string;
  mata_pelajaran: string;
  fase: string; // e.g. 'Fase E (Kelas X)', 'Fase F (Kelas XI)', 'Fase F (Kelas XII)'
  judul: string;
  deskripsi?: string;
  teks_cp?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  file_data?: string; // base64 data url
  uploaded_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface ModulAjarItem {
  id: string;
  guru_id: string;
  subject_name: string;
  grade: string;
  cp: string;
  metode?: string;
  pertemuan_count?: number;
  alokasi_waktu?: string;
  title: string;
  content_json: any;
  created_at: string;
  updated_at?: string;
}

