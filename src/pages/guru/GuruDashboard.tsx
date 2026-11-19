import React from 'react';
import { useLocation } from 'react-router-dom';
import CreateMaterials from './CreateMaterials';
import CreateQuestions from './CreateQuestions';
import GradeReports from './GradeReports';
import ExamMonitoring from './ExamMonitoring';
import CreateModulAjar from './CreateModulAjar';
import CreateLkpd from './CreateLkpd';
import GuruLihatCp from './GuruLihatCp';

export default function GuruDashboard() {
  const location = useLocation();

  if (location.pathname.startsWith('/dashboard/cp')) {
    return <GuruLihatCp />;
  }
  if (location.pathname.startsWith('/dashboard/bahan-ajar')) {
    return <CreateMaterials />;
  }
  if (location.pathname.startsWith('/dashboard/soal')) {
    return <CreateQuestions />;
  }
  if (location.pathname.startsWith('/dashboard/monitoring')) {
    return <ExamMonitoring />;
  }
  if (location.pathname.startsWith('/dashboard/laporan')) {
    return <GradeReports />;
  }
  if (location.pathname.startsWith('/dashboard/modul')) {
    return <CreateModulAjar />;
  }
  if (location.pathname.startsWith('/dashboard/lkpd')) {
    return <CreateLkpd />;
  }

  // Default: Lihat CP as the primary top menu item
  return <GuruLihatCp />;
}
