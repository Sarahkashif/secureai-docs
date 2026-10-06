import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from '@/components/guards/guards'
import Landing from '@/pages/public/Landing'
import Login from '@/pages/public/Login'
import Signup from '@/pages/public/Signup'
import ForgotPassword from '@/pages/public/ForgotPassword'
import ResetPassword from '@/pages/public/ResetPassword'
import NotFound from '@/pages/public/NotFound'
import Dashboard from '@/pages/app/Dashboard'
import Upload from '@/pages/app/Upload'
import Library from '@/pages/app/Library'
import Chat from '@/pages/app/Chat'
import Notifications from '@/pages/app/Notifications'
import Profile from '@/pages/app/Profile'
import Pricing from '@/pages/public/Pricing'
import About from '@/pages/public/About'
import Contact from '@/pages/public/Contact'
import Users from '@/pages/admin/Users'
import Subscription from '@/pages/admin/Subscription'
import AuditLogs from '@/pages/admin/AuditLogs'
import Analytics from '@/pages/admin/Analytics'
import Security from '@/pages/admin/Security'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="upload" element={<Upload />} />
        <Route path="library" element={<Library />} />
        <Route path="chat" element={<Chat />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="admin/users" element={<RoleRoute roles={['admin']}><Users /></RoleRoute>} />
        <Route path="admin/subscription" element={<RoleRoute roles={['admin']}><Subscription /></RoleRoute>} />
        <Route path="admin/audit" element={<RoleRoute roles={['admin']}><AuditLogs /></RoleRoute>} />
        <Route path="admin/analytics" element={<RoleRoute roles={['admin']}><Analytics /></RoleRoute>} />
        <Route path="admin/security" element={<RoleRoute roles={['admin']}><Security /></RoleRoute>} />
        <Route path="*" element={<NotFound inApp />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
