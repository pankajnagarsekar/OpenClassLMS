
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { Lesson, LessonType } from '../types';

interface ManageCourseProps {
  courseId?: string;
}

const ManageCourse: React.FC<ManageCourseProps> = ({ courseId }) => {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<'details' | 'curriculum'>('details');
  
  // Details State
  const [formData, setFormData] = useState({
    title: '', description: '', thumbnail_url: '', video_embed_url: '', access_days: 365
  });
  
  // Curriculum State
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [newLesson, setNewLesson] = useState({ title: '', type: LessonType.VIDEO, content_url: '' });

  const [loading, setLoading] = useState(!!courseId);
  const [saving, setSaving] = useState(false);

  const fetchCourseData = async () => {
    try {
      const res = await api.get(`/courses/${courseId}`);
      setFormData({
        title: res.data.title, description: res.data.description,
        thumbnail_url: res.data.thumbnail_url, video_embed_url: res.data.video_embed_url,
        access_days: res.data.access_days
      });
      if (res.data.Lessons) setLessons(res.data.Lessons);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { if (courseId) fetchCourseData(); }, [courseId]);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (courseId) {
        await api.put(`/courses/${courseId}`, formData);
        alert('Details updated!');
      } else {
        const res = await api.post('/courses', formData);
        alert('Course created! Now you can add lessons.');
        window.location.hash = `#/teacher/courses/${res.data.id}`;
      }
    } catch (err) { alert('Failed to save.'); } finally { setSaving(false); }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    try {
      await api.post(`/courses/${courseId}/lessons`, { ...newLesson, position: lessons.length + 1 });
      setNewLesson({ title: '', type: LessonType.VIDEO, content_url: '' });
      fetchCourseData(); // Refresh list
    } catch (err) { alert('Failed to add lesson.'); }
  };

  const handleDeleteLesson = async (id: number) => {
    if (!confirm('Delete this lesson?')) return;
    try {
      await api.delete(`/lessons/${id}`);
      fetchCourseData();
    } catch (err) { alert('Failed to delete.'); }
  };

  if (loading) return <div className="p-20 text-center animate-pulse">Loading Course...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <a href="#/teacher-dashboard" className="text-indigo-600 font-bold mb-2 inline-block hover:underline">&larr; Dashboard</a>
        <h1 className={`text-4xl font-black ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>
          {courseId ? `Manage: ${formData.title}` : 'Create New Course'}
        </h1>
      </div>

      {courseId && (
        <div className="flex space-x-2 mb-8 border-b border-slate-200">
          <button onClick={() => setActiveTab('details')} className={`px-6 py-3 font-bold border-b-2 transition-colors ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Details</button>
          <button onClick={() => setActiveTab('curriculum')} className={`px-6 py-3 font-bold border-b-2 transition-colors ${activeTab === 'curriculum' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Curriculum</button>
        </div>
      )}

      <div className={`p-8 rounded-3xl shadow-sm border ${settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        {activeTab === 'details' ? (
          <form onSubmit={handleSaveDetails} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2">Title</label>
              <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2">Description</label>
              <textarea rows={3} required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Thumbnail URL" value={formData.thumbnail_url} onChange={e => setFormData({...formData, thumbnail_url: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
              <input type="text" placeholder="Intro Video Embed URL" value={formData.video_embed_url} onChange={e => setFormData({...formData, video_embed_url: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
            </div>
            <button type="submit" disabled={saving} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Course Details'}
            </button>
          </form>
        ) : (
          <div>
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4">Add New Lesson</h3>
              <form onSubmit={handleAddLesson} className="flex flex-col md:flex-row gap-4 bg-slate-50 p-4 rounded-2xl">
                <input type="text" placeholder="Lesson Title" required value={newLesson.title} onChange={e => setNewLesson({...newLesson, title: e.target.value})} className="flex-grow px-4 py-3 rounded-xl border border-slate-200" />
                <select value={newLesson.type} onChange={e => setNewLesson({...newLesson, type: e.target.value as LessonType})} className="px-4 py-3 rounded-xl border border-slate-200">
                  <option value={LessonType.VIDEO}>Video</option>
                  <option value={LessonType.PDF}>PDF Document</option>
                  <option value={LessonType.ASSIGNMENT}>Assignment</option>
                  <option value={LessonType.QUIZ}>Quiz</option>
                </select>
                {newLesson.type !== LessonType.ASSIGNMENT && newLesson.type !== LessonType.QUIZ && (
                  <input type="text" placeholder="Content URL" value={newLesson.content_url} onChange={e => setNewLesson({...newLesson, content_url: e.target.value})} className="flex-grow px-4 py-3 rounded-xl border border-slate-200" />
                )}
                <button type="submit" className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700">Add</button>
              </form>
            </div>

            <div className="space-y-4">
              {lessons.map((lesson, idx) => (
                <div key={lesson.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center space-x-4">
                    <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">{idx + 1}</span>
                    <div>
                      <p className="font-bold text-slate-900">{lesson.title}</p>
                      <p className="text-xs uppercase font-bold text-slate-400">{lesson.type}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteLesson(lesson.id)} className="text-red-500 font-bold text-sm hover:underline">Delete</button>
                </div>
              ))}
              {lessons.length === 0 && <p className="text-center text-slate-500 py-10">No lessons yet.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageCourse;
