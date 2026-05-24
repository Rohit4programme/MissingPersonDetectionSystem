import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAlertStore } from '@/stores/alertStore';
import socketService, { SOCKET_EVENTS } from '@/lib/socket';
import type { Alert, Detection } from '@/types';

import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

// Placeholder pages - will be implemented as needed
const Home = () => (
  <div className="page-container">
    <h1 className="text-3xl font-bold gradient-text mb-4">Missing Person Detection System</h1>
    <p className="text-gray-400">AI-powered facial recognition for locating missing persons.</p>
  </div>
);
const Login = () => <div className="page-container"><h1 className="text-2xl font-bold text-white">Login</h1></div>;
const Register = () => <div className="page-container"><h1 className="text-2xl font-bold text-white">Register</h1></div>;
const MissingPersonsPublic = () => <div className="page-container"><h1 className="text-2xl font-bold text-white">Missing Persons</h1></div>;
const MissingPersonDetail = () => <div className="page-container"><h1 className="text-2xl font-bold text-white">Person Detail</h1></div>;
const ReportMissing = () => <div className="page-container"><h1 className="text-2xl font-bold text-white">Report Missing Person</h1></div>;
const PublicSearch = () => <div className="page-container"><h1 className="text-2xl font-bold text-white">Search</h1></div>;
const Dashboard = () => <div className="page-container"><h1 className="text-2xl font-bold text-white">Dashboard</h1></div>;
const Cases = () => <div className="page-container"><h1 className="text-2xl font-bold text-white">Cases</h1></div>;
const CaseDetail = () => <div className="page-container"><h1 className="text-2xl font-bold text-white">Case Detail</h1></div>;
const NewCase = () => <div className="page-container"><h1 className="text-2xl font-bold text-white">New Case</h1></div>;
const Detections = () => <div className="page-container"><h1 className="text-2xl font-bold text-white">Detections</h1></div>;
const Cameras = () => <div className="page-container"><h1 className="text-2xl font-bold text-white">Cameras</h1></div>;
const Sightings = () => <div className="page-container"><h1 className="text-2xl font-bold text-white">Sightings</h1></div>;
const Alerts = () => <div className="page-container"><h1 className="text-2xl font-bold text-white">Alerts</h1></div>;
const Analytics = () => <div className="page-container"><h1 className="text-2xl font-bold text-white">Analytics</h1></div>;
const Users = () => <div className="page-container"><h1 className="text-2xl font-bold text-white">Users</h1></div>;
const Settings = () => <div className="page-container"><h1 className="text-2xl font-bold text-white">Settings</h1></div>;
const Jurisdictions = () => <div className="page-container"><h1 className="text-2xl font-bold text-white">Jurisdictions</h1></div>;
const NotFound = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-center">
      <h1 className="text-6xl font-bold gradient-text mb-4">404</h1>
      <p className="text-gray-400 text-lg">Page not found</p>
    </div>
  </div>
);

function App() {
  const { checkAuth, isAuthenticated, token } = useAuthStore();
  const { addAlert, fetchUnreadCount } = useAlertStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated && token) {
      socketService.connect(token);
      fetchUnreadCount();

      const unsubAlert = socketService.on<Alert>(SOCKET_EVENTS.ALERT_NEW, (alert) => {
        addAlert(alert);
      });

      const unsubDetection = socketService.on<Detection>(SOCKET_EVENTS.DETECTION_NEW, () => {
        fetchUnreadCount();
      });

      return () => {
        unsubAlert();
        unsubDetection();
        socketService.disconnect();
      };
    }
  }, [isAuthenticated, token, addAlert, fetchUnreadCount]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/missing" element={<MissingPersonsPublic />} />
      <Route path="/missing/:id" element={<MissingPersonDetail />} />
      <Route path="/report" element={<ReportMissing />} />
      <Route path="/search" element={<PublicSearch />} />

      {/* Protected routes - Officer and Admin */}
      <Route element={<ProtectedRoute allowedRoles={['officer', 'admin']} />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/cases/new" element={<NewCase />} />
          <Route path="/cases/:id" element={<CaseDetail />} />
          <Route path="/detections" element={<Detections />} />
          <Route path="/cameras" element={<Cameras />} />
          <Route path="/sightings" element={<Sightings />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/analytics" element={<Analytics />} />
        </Route>
      </Route>

      {/* Admin only routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<Layout />}>
          <Route path="/users" element={<Users />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/jurisdictions" element={<Jurisdictions />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
