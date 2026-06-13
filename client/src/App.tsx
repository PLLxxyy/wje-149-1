import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import CoachList from './pages/CoachList';
import CoachDetail from './pages/CoachDetail';
import MyBookings from './pages/MyBookings';
import CoachSchedule from './pages/CoachSchedule';
import CoachStudents from './pages/CoachStudents';
import StudentProfile from './pages/StudentProfile';
import AdminDashboard from './pages/AdminDashboard';
import Header from './components/Header';
import Nav from './components/Nav';

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  function getDefaultRoute(): string {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'coach') return '/coach-schedule';
    return '/coaches';
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Navigate to={getDefaultRoute()} />} />

      <Route path="/coaches" element={
        <PrivateRoute roles={['student']}>
          <Header /><Nav /><CoachList />
        </PrivateRoute>
      } />
      <Route path="/coaches/:id" element={
        <PrivateRoute roles={['student']}>
          <Header /><Nav /><CoachDetail />
        </PrivateRoute>
      } />
      <Route path="/my-bookings" element={
        <PrivateRoute roles={['student']}>
          <Header /><Nav /><MyBookings />
        </PrivateRoute>
      } />
      <Route path="/my-profile" element={
        <PrivateRoute roles={['student']}>
          <Header /><Nav /><StudentProfile />
        </PrivateRoute>
      } />

      <Route path="/coach-schedule" element={
        <PrivateRoute roles={['coach']}>
          <Header /><Nav /><CoachSchedule />
        </PrivateRoute>
      } />
      <Route path="/coach-bookings" element={
        <PrivateRoute roles={['coach']}>
          <Header /><Nav /><MyBookings />
        </PrivateRoute>
      } />
      <Route path="/coach-students" element={
        <PrivateRoute roles={['coach']}>
          <Header /><Nav /><CoachStudents />
        </PrivateRoute>
      } />

      <Route path="/admin" element={
        <PrivateRoute roles={['admin']}>
          <Header /><Nav /><AdminDashboard />
        </PrivateRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
