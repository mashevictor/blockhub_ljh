import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import OverviewPage from './pages/OverviewPage'
import ScenarioCatalogPage from './pages/ScenarioCatalogPage'
import AgentCenterPage from './pages/AgentCenterPage'
import AgentDetailPage from './pages/AgentDetailPage'
import CreationWizardPage from './pages/CreationWizardPage'
import ChatPage from './pages/ChatPage'
import KnowledgePage from './pages/KnowledgePage'
import ApprovalPage from './pages/ApprovalPage'
import ReportPage from './pages/ReportPage'
import NotificationPage from './pages/NotificationPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="agents" element={<AgentCenterPage />} />
        <Route path="agents/:agentId" element={<AgentDetailPage />} />
        <Route path="scenarios" element={<ScenarioCatalogPage />} />
        <Route path="create" element={<CreationWizardPage />} />
        <Route path="creation" element={<Navigate to="/create" replace />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="kb" element={<Navigate to="/knowledge" replace />} />
        <Route path="approvals" element={<ApprovalPage />} />
        <Route path="approval" element={<Navigate to="/approvals" replace />} />
        <Route path="reports" element={<ReportPage />} />
        <Route path="report" element={<Navigate to="/reports" replace />} />
        <Route path="notifications" element={<NotificationPage />} />
        <Route path="notify" element={<Navigate to="/notifications" replace />} />
      </Route>
    </Routes>
  )
}
