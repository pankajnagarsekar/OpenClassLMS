
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Announcement, UserRole } from '../types';

interface AnnouncementsTabProps {
  courseId: number;
  userRole?: UserRole;
}

export const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({ courseId, userRole }) => {
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

  if (loading) return <div className="text-center py-10 text-slate-400">Loading feed...</div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {userRole === UserRole.TEACHER && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-6">Create New Announcement</h3>
          <form onSubmit={handlePost} className="space-y-4">
            <input 
              placeholder="Announcement Title"
              className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-600"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
            <textarea 
              placeholder="What do your students need to know?"
              className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-600 h-32"
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
          <div className="text-center py-20 bg-slate-100/50 rounded-3xl border border-dashed border-slate-300">
            <p className="text-slate-500 font-medium">No announcements yet. Check back later!</p>
          </div>
        ) : (
          announcements.map(post => (
            <div key={post.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-lg font-black text-slate-900">{post.title}</h4>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                  {new Date(post.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{post.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
