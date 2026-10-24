import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { ChatPage } from '@/pages/ChatPage';
import { KnowledgeBasesPage } from '@/pages/KnowledgeBasesPage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { DocumentUploadPage } from '@/pages/DocumentUploadPage';
import { DocumentJobsPage } from '@/pages/DocumentJobsPage';
import { useAppStore } from '@/store/app-store';

export default function App() {
  const identity = useAppStore(s => s.auth?.token ?? 'anonymous');
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<ChatPage />} />
        <Route path="/knowledge/bases" element={<KnowledgeBasesPage key={identity} />} />
        <Route path="/knowledge" element={<DocumentsPage key={identity} />} />
        <Route path="/knowledge/upload" element={<DocumentUploadPage key={identity} />} />
        <Route path="/knowledge/jobs" element={<DocumentJobsPage key={identity} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
