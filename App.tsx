
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import TeacherGradebook from './pages/TeacherGradebook';
import Login from './pages/Login';
import Register from './pages/Register';
import CoursePlayer from './pages/CoursePlayer';
import VerifyEmail from './pages/VerifyEmail';
import { User, AuthResponse, UserRole } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/');

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
    window.location.hash = data.user.role === UserRole.ADMIN ? '#/admin' : '#/student-dashboard';
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.hash = '#/';
  };

  const renderContent = () => {
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

    switch (hash) {
      case '#/': return <Home />;
      case '#/dashboard': return <Dashboard />;
      case '#/student-dashboard': return user ? <StudentDashboard /> : <Login onLoginSuccess={handleLoginSuccess} />;
      case '#/admin': return user?.role === UserRole.ADMIN ? <AdminDashboard /> : <Home />;
      case '#/login': return <Login onLoginSuccess={handleLoginSuccess} />;
      case '#/register': return <Register />;
      default: return <Home />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-indigo-100">
      <Navbar user={user} onLogout={handleLogout} />
      <main className="flex-grow">{renderContent()}</main>
      <footer className="bg-slate-900 py-16 text-white text-center text-xs opacity-50">
        &copy; {new Date().getFullYear()} OpenClass LMS Infrastructure. Professional Grade.
      </footer>
    </div>
  );
};

export default App;
