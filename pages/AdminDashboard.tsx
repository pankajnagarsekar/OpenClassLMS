
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { User, Course, AdminStats, UserRole } from '../types';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetModal, setResetModal] = useState<{ userId: number; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, coursesRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/courses')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setCourses(coursesRes.data);
    } catch (err) {
      console.error("Admin Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const toggleUserStatus = async (userId: number) => {
    try {
      await api.put(`/admin/users/${userId}/toggle-status`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !u.is_active } : u));
    } catch (err) {
      alert("Failed to toggle user status.");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure? This delete is permanent.")) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert("Failed to delete user.");
    }
  };

  const handleResetPassword = async () => {
    if (!resetModal || !newPassword) return;
    try {
      await api.post(`/admin/users/${resetModal.userId}/reset-password`, { newPassword });
      alert(`Password for ${resetModal.name} updated.`);
      setResetModal(null);
      setNewPassword('');
    } catch (err) {
      alert("Failed to reset password.");
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse">Vault Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Administration</h1>
          <p className="text-slate-500 mt-2">Manage lifecycle, access control, and moderate content.</p>
        </div>
        <button onClick={fetchAdminData} className="px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">Refresh Data</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {[
          { label: 'Users', value: stats?.totalUsers || 0, icon: '👥', color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Courses', value: stats?.totalCourses || 0, icon: '📚', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Submissions', value: stats?.totalSubmissions || 0, icon: '✍️', color: 'bg-orange-50 text-orange-600' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl ${item.color}`}>{item.icon}</div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
              <p className="text-3xl font-black text-slate-900">{item.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-12">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h2 className="font-black text-slate-800 uppercase tracking-tight text-sm">User Identity & Status</h2>
            <span className="text-xs font-bold text-slate-400">{users.length} Records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="px-6 py-4">Name & Access</th>
                  <th className="px-6 py-4">Lifecycle Status</th>
                  <th className="px-6 py-4 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${user.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {user.is_active ? 'Active' : 'Banned'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-4">
                        <button onClick={() => toggleUserStatus(user.id)} className={`text-xs font-bold ${user.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                          {user.is_active ? 'Deactivate' : 'Restore Access'}
                        </button>
                        <button onClick={() => setResetModal({ userId: user.id, name: user.name })} className="text-indigo-600 hover:text-indigo-800 font-bold text-xs">Reset Pass</button>
                        <button onClick={() => handleDeleteUser(user.id)} className="text-slate-400 hover:text-red-600 font-bold text-xs">Purge</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {resetModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 mb-2">Force Password Reset</h3>
            <input type="password" placeholder="New strong password" className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-600 mb-6" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoFocus />
            <div className="flex space-x-3">
              <button onClick={() => setResetModal(null)} className="flex-grow py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancel</button>
              <button onClick={handleResetPassword} disabled={!newPassword} className="flex-grow py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100">Update Access</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
