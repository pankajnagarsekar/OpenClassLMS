
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';

interface ManageCourseProps {
  courseId?: string; // If present, we are editing
}

const ManageCourse: React.FC<ManageCourseProps> = ({ courseId }) => {
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    video_embed_url: '',
    access_days: 365
  });
  const [loading, setLoading] = useState(!!courseId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (courseId) {
      const fetchCourse = async () => {
        try {
          const res = await api.get(`/courses/${courseId}`);
          setFormData({
            title: res.data.title,
            description: res.data.description,
            thumbnail_url: res.data.thumbnail_url,
            video_embed_url: res.data.video_embed_url,
            access_days: res.data.access_days
          });
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchCourse();
    }
  }, [courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (courseId) {
        await api.put(`/courses/${courseId}`, formData);
        alert('Course updated successfully!');
      } else {
        await api.post('/courses', formData);
        alert('Course created successfully!');
        window.location.hash = '#/teacher-dashboard';
      }
    } catch (err) {
      alert('Failed to save course.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse">Loading Course Details...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10">
        <a href="#/teacher-dashboard" className="text-indigo-600 font-bold mb-2 inline-block hover:underline">&larr; Back to Dashboard</a>
        <h1 className={`text-4xl font-black tracking-tight ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>
          {courseId ? 'Edit Course' : 'Create New Course'}
        </h1>
      </div>

      <div className={`p-8 rounded-3xl shadow-lg border ${settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-bold mb-2 ${settings.ENABLE_DARK_MODE ? 'text-slate-300' : 'text-slate-700'}`}>Course Title</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${settings.ENABLE_DARK_MODE ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              placeholder="e.g. Advanced React Patterns"
            />
          </div>

          <div>
            <label className={`block text-sm font-bold mb-2 ${settings.ENABLE_DARK_MODE ? 'text-slate-300' : 'text-slate-700'}`}>Description</label>
            <textarea 
              rows={4}
              required
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${settings.ENABLE_DARK_MODE ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              placeholder="What will students learn in this course?"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
              <label className={`block text-sm font-bold mb-2 ${settings.ENABLE_DARK_MODE ? 'text-slate-300' : 'text-slate-700'}`}>Thumbnail URL</label>
              <input 
                type="text" 
                value={formData.thumbnail_url}
                onChange={e => setFormData({...formData, thumbnail_url: e.target.value})}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${settings.ENABLE_DARK_MODE ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                placeholder="https://..."
              />
            </div>
             <div>
              <label className={`block text-sm font-bold mb-2 ${settings.ENABLE_DARK_MODE ? 'text-slate-300' : 'text-slate-700'}`}>Intro Video Embed URL</label>
              <input 
                type="text" 
                value={formData.video_embed_url}
                onChange={e => setFormData({...formData, video_embed_url: e.target.value})}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${settings.ENABLE_DARK_MODE ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                placeholder="https://www.youtube.com/embed/..."
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-bold mb-2 ${settings.ENABLE_DARK_MODE ? 'text-slate-300' : 'text-slate-700'}`}>Access Duration (Days)</label>
            <input 
              type="number" 
              required
              value={formData.access_days}
              onChange={e => setFormData({...formData, access_days: parseInt(e.target.value)})}
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${settings.ENABLE_DARK_MODE ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
            />
          </div>

          <button 
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Saving...' : (courseId ? 'Update Course Details' : 'Create Course')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ManageCourse;
