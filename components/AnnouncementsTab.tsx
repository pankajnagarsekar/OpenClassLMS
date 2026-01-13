
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Announcement, UserRole } from '../types';
import { useSettings } from '../context/SettingsContext';

interface AnnouncementsTabProps {
  courseId: number;
  userRole?: UserRole;
}

export const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({ courseId, userRole }) => {
  const { settings } = useSettings();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      const res = await api.get(`/courses/${courseId}/announcements`);
      setAnnouncements(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, [courseId]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/courses/${courseId}/announcements`, { title, message });
      setTitle('');
      setMessage('');
      fetchPosts();
    } catch (err) {
      alert("Failed to post announcement.");
    }
  };

  if (loading) return <div className="text-center py-10 text-slate-400">Loading announcements...</div>;

  const cardBg = settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900';
  const inputBg = settings.ENABLE_DARK_MODE ? 'bg-slate-700 text-white placeholder-slate-400' : 'bg-slate-50 text-slate-900 placeholder-slate-500';

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {userRole === UserRole.TEACHER && (
        <div className={`p-8 rounded-3xl border shadow-sm ${cardBg}`}>
          <h3 className="text-xl font-black mb-6">Create New Announcement</h3>
          <form onSubmit={handlePost} className="space-y-4">
            <input 
              placeholder="Announcement Title"
              className={`w-full px-5 py-3 border-none rounded-xl focus:ring-2 focus:ring-indigo-600 ${inputBg}`}
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
            <textarea 
              placeholder="What do your students need to know?"
              className={`w-full px-5 py-3 border-none rounded-xl focus:ring-2 focus:ring-indigo-600 h-32 ${inputBg}`}
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
            />
            <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all">
              Post Announcement
            </button>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {announcements.length === 0 ? (
          <div className={`text-center py-20 rounded-3xl border-2 border-dashed ${settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-100/50 border-slate-300 text-slate-500'}`}>
            <p className="font-medium">No announcements yet. Check back later!</p>
          </div>
        ) : (
          announcements.map(post => (
            <div key={post.id} className={`p-8 rounded-3xl border shadow-sm ${cardBg}`}>
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-lg font-black">{post.title}</h4>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${settings.ENABLE_DARK_MODE ? 'bg-slate-700 text-slate-300' : 'bg-slate-50 text-slate-400'}`}>
                  {new Date(post.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className={`leading-relaxed whitespace-pre-wrap ${settings.ENABLE_DARK_MODE ? 'text-slate-300' : 'text-slate-600'}`}>{post.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
