
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import ManageCourse from './pages/ManageCourse';
import AdminDashboard from './pages/AdminDashboard';
import AdminSettings from './pages/AdminSettings';
import TeacherGradebook from './pages/TeacherGradebook';
import Login from './pages/Login';
import Register from './pages/Register';
import CoursePlayer from './pages/CoursePlayer';
import VerifyEmail from './pages/VerifyEmail';
import { User, AuthResponse, UserRole } from './types';
import { SettingsProvider, useSettings } from './context/SettingsContext';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/');
  const { settings, loading } = useSettings();

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLoginSuccess = (data: AuthResponse) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    // Redirect based on role
    if (data.user.role === UserRole.ADMIN) {
      window.location.hash = '#/admin';
    } else if (data.user.role === UserRole.TEACHER) {
      window.location.hash = '#/teacher-dashboard';
    } else {
      window.location.hash = '#/student-dashboard';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.hash = '#/';
  };

  const renderContent = () => {
    // Maintenance Mode Check (Admins bypass)
    if (settings.MAINTENANCE_MODE && (!user || user.role !== UserRole.ADMIN)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
          <div className="text-6xl mb-4">🏗️</div>
          <h1 className="text-4xl font-black text-slate-800 mb-2">Under Maintenance</h1>
          <p className="text-slate-500 text-lg">We are upgrading OpenClass. Please check back shortly.</p>
        </div>
      );
    }

    const hash = currentHash;
    if (hash.startsWith('#/course/')) {
      return <CoursePlayer courseId={hash.split('/').pop() || ''} userRole={user?.role} />;
    }
    if (hash.startsWith('#/gradebook/')) {
      return user?.role === UserRole.TEACHER || user?.role === UserRole.ADMIN ? 
        <TeacherGradebook courseId={hash.split('/').pop() || ''} /> : <Home />;
    }
    if (hash.startsWith('#/verify/')) {
      return <VerifyEmail token={hash.split('/').pop() || ''} />;
    }
    if (hash === '#/teacher/courses/new') {
       return user?.role === UserRole.TEACHER ? <ManageCourse /> : <Home />;
    }
    if (hash.startsWith('#/teacher/courses/')) {
       return user?.role === UserRole.TEACHER ? <ManageCourse courseId={hash.split('/').pop() || ''} /> : <Home />;
    }

    switch (hash) {
      case '#/': return <Home />;
      case '#/dashboard': return <Dashboard />;
      case '#/student-dashboard': return user ? <StudentDashboard /> : <Login onLoginSuccess={handleLoginSuccess} />;
      case '#/teacher-dashboard': return user?.role === UserRole.TEACHER ? <TeacherDashboard /> : <Home />;
      case '#/admin': return user?.role === UserRole.ADMIN ? <AdminDashboard /> : <Home />;
      case '#/admin/settings': return user?.role === UserRole.ADMIN ? <AdminSettings /> : <Home />;
      case '#/login': return <Login onLoginSuccess={handleLoginSuccess} />;
      case '#/register': return <Register />;
      default: return <Home />;
    }
  };

  if (loading) return null;

  return (
    <div className={`min-h-screen flex flex-col selection:bg-indigo-100 ${settings.ENABLE_DARK_MODE ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Navbar user={user} onLogout={handleLogout} />
      <main className="flex-grow">{renderContent()}</main>
      <footer className={`py-16 text-center text-xs opacity-50 ${settings.ENABLE_DARK_MODE ? 'bg-black text-white' : 'bg-slate-900 text-white'}`}>
        &copy; {new Date().getFullYear()} OpenClass LMS Infrastructure. Professional Grade.
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
};

export default App;
