import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import RoleGate from './components/RoleGate'
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
import ContractPage from './pages/ContractPage'
import LoginPage from './pages/LoginPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="agents" element={<RoleGate allow={['admin']}><AgentCenterPage /></RoleGate>} />
          <Route path="agents/:agentId" element={<RoleGate allow={['admin']}><AgentDetailPage /></RoleGate>} />
          <Route path="scenarios" element={<RoleGate allow={['admin']}><ScenarioCatalogPage /></RoleGate>} />
          <Route path="create" element={<RoleGate allow={['admin']}><CreationWizardPage /></RoleGate>} />
          <Route path="creation" element={<Navigate to="/create" replace />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="knowledge" element={<KnowledgePage />} />
          <Route path="kb" element={<Navigate to="/knowledge" replace />} />
          <Route path="approvals" element={<ApprovalPage />} />
          <Route path="contracts" element={<RoleGate allow={['admin']}><ContractPage /></RoleGate>} />
          <Route path="approval" element={<Navigate to="/approvals" replace />} />
          <Route path="reports" element={<RoleGate allow={['admin']}><ReportPage /></RoleGate>} />
          <Route path="report" element={<Navigate to="/reports" replace />} />
          <Route path="notifications" element={<NotificationPage />} />
          <Route path="notify" element={<Navigate to="/notifications" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
