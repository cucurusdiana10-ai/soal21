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
