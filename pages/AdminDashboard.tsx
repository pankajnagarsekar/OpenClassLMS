
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { User, Course, AdminStats, UserRole } from '../types';

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onSave: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/admin/users/${user.id}`, formData);
      onSave();
    } catch (err) {
      alert("Failed to update user.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-100">
        <h3 className="text-xl font-bold text-slate-900 mb-6">Edit Credentials</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
            <select 
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
            >
              <option value={UserRole.STUDENT}>Student</option>
              <option value={UserRole.TEACHER}>Teacher</option>
              <option value={UserRole.ADMIN}>Administrator</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password (Optional)</label>
            <input 
              type="password" 
              placeholder="Leave blank to keep current"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onClose} className="flex-grow py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50">Cancel</button>
            <button type="submit" className="flex-grow py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
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
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to toggle status.");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure? This delete is permanent and will remove all associated data.")) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete user.");
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400">Loading System Data...</div>;

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const instructors = filteredUsers.filter(u => u.role === UserRole.TEACHER || u.role === UserRole.ADMIN);
  const students = filteredUsers.filter(u => u.role === UserRole.STUDENT);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Administration</h1>
          <p className="text-slate-500 mt-1">Global access control and platform metrics.</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
           <input 
             type="text" 
             placeholder="Search database..." 
             className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none w-64 shadow-sm"
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
           <button onClick={fetchAdminData} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm">Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
          { label: 'Total Users', value: stats?.totalUsers || 0, icon: '👥', color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
          { label: 'Total Courses', value: stats?.totalCourses || 0, icon: '📚', color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
          { label: 'Submissions', value: stats?.totalSubmissions || 0, icon: '✍️', color: 'bg-orange-50 text-orange-600', border: 'border-orange-100' },
        ].map((item, idx) => (
          <div key={idx} className={`bg-white p-6 rounded-2xl border ${item.border} shadow-sm flex items-center space-x-5 hover:shadow-md transition-shadow`}>
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${item.color}`}>{item.icon}</div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
              <p className="text-3xl font-bold text-slate-900">{item.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-12">
        {/* Instructor Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Instructor Performance</h2>
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-500">{instructors.length} Records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Name & Role</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Content</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Audience</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {instructors.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded mt-1 inline-block">{user.role}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{user.stats?.courses_created || 0} Courses</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{user.stats?.total_students || 0} Students</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md border ${user.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                        {user.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-3">
                        <button onClick={() => setEditingUser(user)} className="text-indigo-600 hover:text-indigo-800 font-bold text-xs uppercase tracking-wide">Edit</button>
                        <button onClick={() => toggleUserStatus(user.id)} className={`text-xs font-bold uppercase tracking-wide ${user.is_active ? 'text-slate-400 hover:text-orange-600' : 'text-emerald-600'}`}>{user.is_active ? 'Suspend' : 'Activate'}</button>
                        <button onClick={() => handleDeleteUser(user.id)} className="text-slate-400 hover:text-red-600 font-bold text-xs uppercase tracking-wide">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Student Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Student Progress</h2>
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-500">{students.length} Records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Student Profile</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Enrollments</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Avg. Progress</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{user.stats?.courses_enrolled || 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${user.stats?.avg_completion || 0}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-600">{user.stats?.avg_completion || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md border ${user.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                        {user.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-3">
                        <button onClick={() => setEditingUser(user)} className="text-indigo-600 hover:text-indigo-800 font-bold text-xs uppercase tracking-wide">Edit</button>
                        <button onClick={() => toggleUserStatus(user.id)} className={`text-xs font-bold uppercase tracking-wide ${user.is_active ? 'text-slate-400 hover:text-orange-600' : 'text-emerald-600'}`}>{user.is_active ? 'Suspend' : 'Activate'}</button>
                        <button onClick={() => handleDeleteUser(user.id)} className="text-slate-400 hover:text-red-600 font-bold text-xs uppercase tracking-wide">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingUser && (
        <EditUserModal 
          user={editingUser} 
          onClose={() => setEditingUser(null)} 
          onSave={() => { setEditingUser(null); fetchAdminData(); }} 
        />
      )}
    </div>
  );
};

export default AdminDashboard;
