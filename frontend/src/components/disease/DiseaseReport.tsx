'use client';

import { Suspense, lazy } from 'react';
import { ScanResult } from './types';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { buildDiseaseReportData } from '@/components/ReportGenerator';

const ReportGenerator = lazy(() => import('@/components/ReportGenerator'));

interface Props {
  result: ScanResult;
  uploadedPreview: string | null;
  onClose: () => void;
}

export default function DiseaseReport({ result, uploadedPreview, onClose }: Props) {
  const { user } = useAuth();
  const { langCode } = useLanguage();
  const reportData = buildDiseaseReportData(result, user?.name, langCode);

  return (
    <Suspense fallback={null}>
      <ReportGenerator
        data={{ ...reportData, imagePreview: uploadedPreview }}
        onClose={onClose}
      />
    </Suspense>
  );
}
