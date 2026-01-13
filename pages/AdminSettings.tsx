
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { SystemSettings } from '../types';

const AdminSettings: React.FC = () => {
  const { settings, refreshSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleToggle = (key: keyof SystemSettings) => {
    setLocalSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', localSettings);
      await refreshSettings();
      alert('System configuration updated successfully.');
    } catch (err) {
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const flags = [
    { key: 'ENABLE_PUBLIC_REGISTRATION', label: 'Public Registration', desc: 'Allow visitors to create new student accounts.' },
    { key: 'REQUIRE_EMAIL_VERIFICATION', label: 'Email Verification', desc: 'Enforce email confirmation before login.' },
    { key: 'MAINTENANCE_MODE', label: 'Maintenance Mode', desc: 'Block access for non-admin users immediately.' },
    { key: 'ENABLE_CERTIFICATES', label: 'Certificates', desc: 'Allow students to download PDF certificates upon completion.' },
    { key: 'ENABLE_STUDENT_UPLOADS', label: 'Student Uploads', desc: 'Enable file upload inputs for assignments.' },
    { key: 'SHOW_COURSE_ANNOUNCEMENTS', label: 'Course News Feed', desc: 'Display the announcements tab in the course player.' },
    { key: 'SHOW_FEATURED_COURSES', label: 'Featured Courses', desc: 'Show the curated course list on the homepage.' },
    { key: 'ENABLE_DARK_MODE', label: 'Dark Mode', desc: 'Apply dark theme CSS globally.' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
           <a href="#/admin" className="text-indigo-600 font-bold mb-2 inline-block hover:underline">&larr; Back to Dashboard</a>
           <h1 className="text-4xl font-black tracking-tighter">System Settings</h1>
           <p className="text-slate-500 mt-2">Toggle platform features in real-time.</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {saving ? 'Applying...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {flags.map((flag) => (
            <div key={flag.key} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="pr-8">
                <h3 className="font-bold text-slate-900 text-lg">{flag.label}</h3>
                <p className="text-slate-500 text-sm">{flag.desc}</p>
              </div>
              <button 
                onClick={() => handleToggle(flag.key as keyof SystemSettings)}
                className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 focus:outline-none ${localSettings[flag.key as keyof SystemSettings] ? 'bg-green-500' : 'bg-slate-200'}`}
              >
                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${localSettings[flag.key as keyof SystemSettings] ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
