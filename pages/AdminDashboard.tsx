
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { User, AdminStats, UserRole } from '../types';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'teachers' | 'students'>('teachers');
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editUser, setEditUser] = useState<Partial<User> & { password?: string } | null>(null);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([api.get('/admin/stats'), api.get('/admin/users')]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchAdminData(); }, []);

  const handleUpdateUser = async () => {
    if (!editUser || !editUser.id) return;
    try {
      await api.put(`/admin/users/${editUser.id}`, {
        name: editUser.name,
        email: editUser.email,
        role: editUser.role,
        password: editUser.password
      });
      alert('User credentials updated successfully.');
      setEditUser(null);
      fetchAdminData();
    } catch (err: any) { alert(err.response?.data?.message || 'Update failed'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Permanently delete this user?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      fetchAdminData();
    } catch (err: any) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  // Filter Logic
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'teachers') {
      return (u.role === 'teacher') && matchesSearch;
    } else {
      return (u.role === 'student' || u.role === 'admin') && matchesSearch;
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black text-slate-900">Admin Control</h1>
        <div className="flex space-x-6">
          <div className="text-right">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Users</p>
             <p className="text-2xl font-black">{stats?.totalUsers || 0}</p>
          </div>
          <div className="text-right">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Courses</p>
             <p className="text-2xl font-black">{stats?.totalCourses || 0}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-6">
        <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('teachers')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'teachers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Teachers</button>
            <button onClick={() => setActiveTab('students')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'students' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Students</button>
        </div>
        <input 
          type="text" 
          placeholder="Search by name or email..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-grow px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">User Details</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Role</th>
              
              {activeTab === 'teachers' ? (
                <>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Courses Created</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Total Students</th>
                </>
              ) : (
                <>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Enrolled Courses</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Teachers</th>
                </>
              )}
              
              <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs mr-3">
                        {user.name.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 text-sm">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : user.role === 'teacher' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                    {user.role}
                  </span>
                </td>
                
                {activeTab === 'teachers' ? (
                    <>
                        <td className="px-6 py-4">
                            <span className="font-bold text-slate-700">{user.TeachingCourses?.length || 0}</span>
                        </td>
                        <td className="px-6 py-4">
                            <span className="font-bold text-slate-700">
                                {user.TeachingCourses?.reduce((acc: number, course: any) => acc + (course.Enrollments?.length || 0), 0) || 0}
                            </span>
                        </td>
                    </>
                ) : (
                    <>
                         <td className="px-6 py-4">
                            <span className="font-bold text-slate-700">{user.Enrollments?.length || 0}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                            {user.Enrollments?.map((e: any) => e.Course?.Teacher?.name).filter(Boolean).join(', ') || '-'}
                        </td>
                    </>
                )}

                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => setEditUser(user)} className="text-indigo-600 font-bold text-xs hover:underline bg-indigo-50 px-3 py-1 rounded-lg">Edit / Reset Password</button>
                  {user.id !== 1 && (
                    <button onClick={() => handleDelete(user.id)} className="text-red-500 font-bold text-xs hover:underline bg-red-50 px-3 py-1 rounded-lg">Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && <div className="p-8 text-center text-slate-400">No users found.</div>}
      </div>

      {editUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black mb-6">Edit User Credentials</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Name</label>
                <input type="text" value={editUser.name} onChange={e => setEditUser({...editUser, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Email</label>
                <input type="email" value={editUser.email} onChange={e => setEditUser({...editUser, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Role</label>
                <select value={editUser.role} onChange={e => setEditUser({...editUser, role: e.target.value as UserRole})} className="w-full px-4 py-3 bg-slate-50 rounded-xl">
                  <option value={UserRole.STUDENT}>Student</option>
                  <option value={UserRole.TEACHER}>Teacher</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                </select>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-indigo-600 mb-1 uppercase">New Password</label>
                <input type="password" placeholder="Enter new password to reset" value={editUser.password || ''} onChange={e => setEditUser({...editUser, password: e.target.value})} className="w-full px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900 placeholder-indigo-300" />
              </div>
              <div className="flex space-x-3 pt-4">
                <button onClick={() => setEditUser(null)} className="flex-grow py-3 bg-slate-100 font-bold rounded-xl text-slate-600">Cancel</button>
                <button onClick={handleUpdateUser} className="flex-grow py-3 bg-indigo-600 font-bold rounded-xl text-white shadow-lg shadow-indigo-200">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
