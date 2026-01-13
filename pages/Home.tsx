
import React from 'react';
import { useSettings } from '../context/SettingsContext';

const Home: React.FC = () => {
  const { settings } = useSettings();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-slate-900 py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl lg:text-7xl font-black text-white mb-6 leading-tight">
            Learn Without <span className="text-indigo-400">Limits.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            OpenClass is the professional learning infrastructure for modern students and expert teachers. Access premium content anywhere.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            {settings.ENABLE_PUBLIC_REGISTRATION && (
              <a href="#/register" className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/20 transition-all">
                Start Learning for Free
              </a>
            )}
            <a href="#/login" className="px-10 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl backdrop-blur-sm transition-all border border-white/10">
              Sign In to Account
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={`py-12 border-b ${settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className={`text-3xl font-bold ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>10k+</div>
            <div className="text-sm text-slate-500">Active Students</div>
          </div>
          <div>
            <div className={`text-3xl font-bold ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>500+</div>
            <div className="text-sm text-slate-500">Expert Courses</div>
          </div>
          <div>
            <div className={`text-3xl font-bold ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>98%</div>
            <div className="text-sm text-slate-500">Success Rate</div>
          </div>
          <div>
            <div className={`text-3xl font-bold ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>24/7</div>
            <div className="text-sm text-slate-500">Global Access</div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
