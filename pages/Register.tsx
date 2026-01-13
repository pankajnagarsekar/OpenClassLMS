
import React, { useState } from 'react';
import api from '../services/api';
import { UserRole } from '../types';
import { useSettings } from '../context/SettingsContext';

const Register: React.FC = () => {
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.STUDENT
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!settings.ENABLE_PUBLIC_REGISTRATION) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Registration Closed</h2>
        <p className="text-slate-500">Public enrollment is currently disabled by the administrator.</p>
        <a href="#/login" className="mt-6 text-indigo-600 font-bold hover:underline">Return to Login</a>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/register', formData);
      
      // Check if the backend requires verification or skipped it
      if (res.data.requireVerification === false) {
        alert("Account created! Logging you in...");
        window.location.hash = '/login';
      } else {
        setSuccess(true);
        setTimeout(() => window.location.hash = '/login', 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Create Account</h2>
          <p className="text-slate-500 mt-2">Join the OpenClass learning community</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm">
            Registration successful! Please check your email to verify your account.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
            <select 
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
            >
              <option value={UserRole.STUDENT}>Student</option>
              <option value={UserRole.TEACHER}>Teacher</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
            <input 
              type="password" 
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          <button 
            type="submit"
            disabled={loading || success}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Get Started'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm">
          <p className="text-slate-600">
            Already have an account? <a href="#/login" className="text-indigo-600 font-bold hover:underline">Sign In</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
