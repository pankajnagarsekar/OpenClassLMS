
import React from 'react';
import { User, UserRole } from '../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center">
            <a href="#/" className="text-2xl font-black text-slate-900 tracking-tighter flex items-center group">
              <span className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mr-3 text-white transition-transform group-hover:rotate-12">O</span>
              OpenClass
            </a>
            
            <div className="hidden md:flex ml-10 space-x-8">
              <a href="#/dashboard" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">Catalog</a>
              {user && user.role !== UserRole.ADMIN && (
                <a href="#/student-dashboard" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">My Studies</a>
              )}
              {user?.role === UserRole.ADMIN && (
                <a href="#/admin" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Admin Panel</a>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {user ? (
              <>
                <div className="hidden lg:flex items-center mr-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-indigo-600 font-black border-2 border-white shadow-sm">
                    {user.name.charAt(0)}
                  </div>
                  <div className="ml-3">
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tighter leading-none">{user.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user.role}</p>
                  </div>
                </div>
                <button 
                  onClick={onLogout}
                  className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all active:scale-95"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <a href="#/login" className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">Login</a>
                <a href="#/register" className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95">
                  Get Started
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
