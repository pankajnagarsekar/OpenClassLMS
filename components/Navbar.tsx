
import React from 'react';
import { User, UserRole } from '../types';
import { useSettings } from '../context/SettingsContext';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const { settings } = useSettings();

  return (
    <nav className={`backdrop-blur-md border-b sticky top-0 z-50 ${settings.ENABLE_DARK_MODE ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center">
            <a href="#/" className={`text-2xl font-black tracking-tighter flex items-center group ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>
              <span className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mr-3 text-white transition-transform group-hover:rotate-12">O</span>
              OpenClass
            </a>
            
            <div className="hidden md:flex ml-10 space-x-8">
              <a href="#/dashboard" className={`text-sm font-bold transition-colors ${settings.ENABLE_DARK_MODE ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-500 hover:text-indigo-600'}`}>Catalog</a>
              {user && user.role === UserRole.STUDENT && (
                <a href="#/student-dashboard" className={`text-sm font-bold transition-colors ${settings.ENABLE_DARK_MODE ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-500 hover:text-indigo-600'}`}>My Studies</a>
              )}
              {user && user.role === UserRole.TEACHER && (
                <a href="#/teacher-dashboard" className={`text-sm font-bold transition-colors ${settings.ENABLE_DARK_MODE ? 'text-indigo-400' : 'text-indigo-600'}`}>Instructor Panel</a>
              )}
              {user?.role === UserRole.ADMIN && (
                <>
                  <a href="#/admin" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Admin Panel</a>
                  <a href="#/admin/settings" className={`text-sm font-bold transition-colors ${settings.ENABLE_DARK_MODE ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-500 hover:text-indigo-600'}`}>System Settings</a>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {user ? (
              <>
                <div className="hidden lg:flex items-center mr-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-indigo-600 font-black border-2 shadow-sm ${settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-white'}`}>
                    {user.name.charAt(0)}
                  </div>
                  <div className="ml-3">
                    <p className={`text-xs font-black uppercase tracking-tighter leading-none ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>{user.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user.role}</p>
                  </div>
                </div>
                <button 
                  onClick={onLogout}
                  className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all active:scale-95 ${settings.ENABLE_DARK_MODE ? 'text-slate-300 bg-slate-800 hover:bg-slate-700' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'}`}
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <a href="#/login" className={`px-6 py-2.5 text-sm font-bold transition-colors ${settings.ENABLE_DARK_MODE ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>Login</a>
                {settings.ENABLE_PUBLIC_REGISTRATION && (
                  <a href="#/register" className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95">
                    Get Started
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
