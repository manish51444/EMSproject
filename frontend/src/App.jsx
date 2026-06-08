import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import PWAInstallPrompt from './components/common/PWAInstallPrompt';
import OfflineIndicator from './components/common/OfflineIndicator';
import Login from './pages/Login';
import Register from './pages/Register';
import SignUp from './pages/SignUp';
import Home from './pages/Home';
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './pages/ForgotPassword';
import AccountDetails from './pages/AccountDetails';
import IntegrationSettings from './pages/IntegrationSettings';
import SiteName from './pages/SiteName';
import WorkType from './pages/WorkType';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectBoard from './pages/ProjectBoard';
import CreateProject from './pages/CreateProject';
import IssueDetail from './pages/IssueDetail';
import FormBuilder from './pages/FormBuilder';
import FormView from './pages/FormView';
import ReportBuilder from './pages/ReportBuilder';
import ReportView from './pages/ReportView';
import Analytics from './pages/Analytics';
import UserManagement from './pages/UserManagement';
import Teams from './pages/Teams';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime in v4)
    },
  },
});

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin' && user.role !== 'manager') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // If user is logged in, redirect to dashboard, otherwise to home
  return <Navigate to={user ? "/dashboard" : "/home"} replace />;
};

const AuthLogoutListener = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = () => navigate('/login');
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [navigate]);
  return null;
};

const Layout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SocketProvider>
            <Router
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
            <Toaster position="top-right" />
            <OfflineIndicator />
            <PWAInstallPrompt />
            <AuthLogoutListener />
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/home" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/account-details" element={<ProtectedRoute><Layout><AccountDetails /></Layout></ProtectedRoute>} />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <IntegrationSettings />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route path="/site-name" element={<SiteName />} />
              <Route path="/work-type" element={<WorkType />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Analytics />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Projects />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/create"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CreateProject />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:id/board"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ProjectBoard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/issues/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <IssueDetail />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:id/forms/:formId"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <FormBuilder />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forms/:shareUrl"
                element={<FormView />}
              />
              <Route
                path="/projects/:id/reports/new"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ReportBuilder />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:id/reports/:reportId"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ReportBuilder />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:id/reports/:reportId/view"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ReportView />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <Layout>
                      <UserManagement />
                    </Layout>
                  </AdminRoute>
                }
              />
              <Route
                path="/teams"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Teams />
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
            </Router>
          </SocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

