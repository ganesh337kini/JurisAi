import { Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./components/RequireAuth.jsx";
import AppShell from "./components/AppShell.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import DocumentDetailPage from "./pages/DocumentDetailPage.jsx";
import UploadPage from "./pages/UploadPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import RiskAnalysisPage from "./pages/RiskAnalysisPage.jsx";
import LearningHub from "./pages/LearningHub.jsx";
import LearningNotesPage from "./pages/LearningNotesPage.jsx";
import QuizCenter from "./pages/QuizCenter.jsx";
import AnnotationWorkspace from "./pages/AnnotationWorkspace.jsx";
import DiscussionForum from "./pages/DiscussionForum.jsx";
import LearningDashboard from "./pages/LearningDashboard.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/chat/:documentId" element={<ChatPage />} />
          <Route path="/risk/:documentId" element={<RiskAnalysisPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/learning" element={<LearningDashboard />} />
          <Route path="/learning/hub" element={<LearningHub />} />
          <Route path="/learning/notes/:documentId" element={<LearningNotesPage />} />
          <Route path="/learning/quiz/:documentId" element={<QuizCenter />} />
          <Route path="/learning/annotate/:documentId" element={<AnnotationWorkspace />} />
          <Route path="/learning/forum" element={<DiscussionForum />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
