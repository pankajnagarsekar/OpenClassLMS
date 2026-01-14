
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { User, CalendarEvent, Notification } from '../types';

interface TeacherCourse {
  id: number;
  title: string;
  student_count: number;
  lesson_count: number;
  createdAt: string;
}

interface EnrolledStudent {
  name: string;
  email: string;
  course_title: string;
  enrolled_at: string;
}

interface GlobalDiscussion {
  id: number;
  title: string;
  course_title: string;
  author: string;
  reply_count: number;
  createdAt: string;
}

type DashboardView = 'courses' | 'discussion' | 'quiz' | 'assignments' | 'gradebook' | 'enroll' | 'students' | 'calendar' | 'notifications';

const TeacherDashboard: React.FC = () => {
  const { settings } = useSettings();
  const [activeView, setActiveView] = useState<DashboardView>('courses');
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Features State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [newTask, setNewTask] = useState({ title: '', date: '', description: '' });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [discussions, setDiscussions] = useState<GlobalDiscussion[]>([]);
  const [discussionSearch, setDiscussionSearch] = useState('');

  // Enrollment State
  const [candidates, setCandidates] = useState<User[]>([]);
  const [enrollCourseId, setEnrollCourseId] = useState('');
  const [selectedCandidateEmails, setSelectedCandidateEmails] = useState<string[]>([]);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchMyCourses();
    fetchMyStudents();
    fetchNotifications(); 
  }, []);

  useEffect(() => {
    if (activeView === 'enroll') fetchCandidates();
    if (activeView === 'calendar') fetchCalendar();
    if (activeView === 'notifications') fetchNotifications();
    if (activeView === 'discussion') fetchDiscussions();
  }, [activeView]);

  const fetchMyCourses = async () => {
    try {
      const res = await api.get('/teacher/my-courses');
      if (Array.isArray(res.data)) {
        setCourses(res.data);
        if (res.data.length > 0 && !enrollCourseId) {
            setEnrollCourseId(res.data[0].id.toString());
        }
      } else {
        setCourses([]); // Fallback
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load courses.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyStudents = async () => {
    try { const res = await api.get('/teacher/students'); setEnrolledStudents(Array.isArray(res.data) ? res.data : []); } catch (err) {}
  };

  const fetchCandidates = async () => {
    try { const res = await api.get('/teacher/candidates'); setCandidates(Array.isArray(res.data) ? res.data : []); } catch (err) {}
  };

  const fetchCalendar = async () => {
    try { const res = await api.get('/teacher/calendar'); setCalendarEvents(Array.isArray(res.data) ? res.data : []); } catch (err) {}
  };

  const fetchNotifications = async () => {
    try { const res = await api.get('/notifications'); setNotifications(Array.isArray(res.data) ? res.data : []); } catch (err) {}
  };

  const fetchDiscussions = async () => {
    try { 
      const res = await api.get(`/teacher/discussions/all?search=${discussionSearch}`); 
      setDiscussions(Array.isArray(res.data) ? res.data : []); 
    } catch (err) {}
  };

  const handleBulkEnroll = async () => {
    if (!enrollCourseId || selectedCandidateEmails.length === 0) return;
    setEnrolling(true);
    try {
      await api.post(`/courses/${enrollCourseId}/enroll`, { emails: selectedCandidateEmails });
      alert(`Successfully enrolled ${selectedCandidateEmails.length} students.`);
      setSelectedCandidateEmails([]);
      fetchMyStudents();
      fetchMyCourses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Enrollment failed.');
    } finally {
      setEnrolling(false);
    }
  };

  const toggleCandidate = (email: string) => {
    if (selectedCandidateEmails.includes(email)) {
      setSelectedCandidateEmails(prev => prev.filter(e => e !== email));
    } else {
      setSelectedCandidateEmails(prev => [...prev, email]);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/teacher/calendar/tasks', newTask);
      setNewTask({ title: '', date: '', description: '' });
      fetchCalendar();
    } catch (err) { alert("Failed to add task"); }
  };

  const markRead = async (id: number, link?: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (link) window.location.hash = link;
    } catch (err) {}
  };

  if (loading) return <div className="p-20 text-center animate-pulse">Loading Instructor Panel...</div>;

  // Sidebar Component with Dark Theme
  const SidebarItem: React.FC<{ view: DashboardView; label: string; icon: string; badge?: number }> = ({ view, label, icon, badge }) => (
    <button 
      onClick={() => setActiveView(view)}
      className={`w-full text-left px-6 py-4 flex items-center justify-between transition-all duration-200 border-l-4 ${
        activeView === view 
          ? 'bg-slate-800 border-indigo-500 text-white shadow-inner' 
          : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      <div className="flex items-center space-x-3">
        <span className="text-xl opacity-80">{icon}</span>
        <span className="text-sm font-medium tracking-wide">{label}</span>
      </div>
      {badge ? <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{badge}</span> : null}
    </button>
  );

  return (
    <div className="flex min-h-[calc(100vh-80px)] bg-slate-50">
      {/* Dark Professional Sidebar */}
      <div className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl z-10">
        <div className="py-8 px-6 border-b border-slate-800">
          <h2 className="font-bold text-xs uppercase tracking-widest text-indigo-400 mb-1">Instructor Console</h2>
          <p className="text-slate-400 text-xs">Manage your curriculum</p>
        </div>
        <nav className="flex-grow py-6 space-y-1">
          <SidebarItem view="courses" label="Courses" icon="📚" />
          <SidebarItem view="discussion" label="Global Discussions" icon="💬" />
          <SidebarItem view="notifications" label="Notifications" icon="🔔" badge={notifications.length} />
          <SidebarItem view="calendar" label="Calendar & Tasks" icon="📅" />
          <SidebarItem view="gradebook" label="Gradebook" icon="📊" />
          <div className="my-4 mx-6 border-t border-slate-800" />
          <p className="px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Students</p>
          <SidebarItem view="enroll" label="Enroll Student" icon="➕" />
          <SidebarItem view="students" label="Directory" icon="👥" />
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl shadow-sm">
              {error}
            </div>
          )}

          {activeView === 'courses' && (
            <div className="animate-fade-in-up">
              <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">My Courses</h2>
                    <p className="text-slate-500 mt-1">Manage content, assignments, and visibility.</p>
                </div>
                <button onClick={() => window.location.hash = '#/teacher/courses/new'} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all">
                  + Create New Course
                </button>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {courses.map(course => (
                  <div key={course.id} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                         <h3 className="text-xl font-bold text-slate-900">{course.title}</h3>
                         <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase">{course.student_count} Students</span>
                    </div>
                    <div className="h-1 w-20 bg-indigo-500 rounded-full mb-6"></div>
                    <div className="flex space-x-3">
                      <button onClick={() => window.location.hash = `#/teacher/courses/${course.id}`} className="flex-1 py-2.5 bg-slate-50 text-slate-700 rounded-lg text-sm font-bold border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all">Edit Content</button>
                      <button onClick={() => window.location.hash = `#/gradebook/${course.id}`} className="flex-1 py-2.5 bg-white text-indigo-600 rounded-lg text-sm font-bold border border-indigo-100 hover:bg-indigo-50 transition-all">Gradebook</button>
                      <button onClick={() => window.location.hash = `#/course/${course.id}`} className="px-4 py-2.5 text-slate-400 hover:text-slate-600 transition-colors">👁️</button>
                    </div>
                  </div>
                ))}
                {courses.length === 0 && <p className="text-slate-500 italic">No courses found. Start creating!</p>}
              </div>
            </div>
          )}

          {activeView === 'notifications' && (
            <div className="max-w-3xl animate-fade-in-up">
              <h2 className="text-3xl font-bold text-slate-900 mb-8">Notifications</h2>
              <div className="space-y-4">
                {notifications.length === 0 && <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">No new notifications.</div>}
                {notifications.map(n => (
                  <div key={n.id} onClick={() => markRead(n.id, n.link)} className={`group p-6 rounded-2xl border cursor-pointer transition-all hover:shadow-md bg-white ${!n.is_read ? 'border-l-4 border-l-indigo-600 border-y-slate-200 border-r-slate-200' : 'border-slate-200 opacity-75 hover:opacity-100'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-4">
                        <div className={`mt-1 w-2 h-2 rounded-full ${!n.is_read ? 'bg-indigo-600' : 'bg-transparent'}`}></div>
                        <div>
                           <p className={`text-sm ${!n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>{n.message}</p>
                           <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">
                         {n.type === 'submission' ? '📝' : n.type === 'reply' ? '💬' : '🔔'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'calendar' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
              <div className="lg:col-span-2">
                <h2 className="text-3xl font-bold text-slate-900 mb-8">Agenda</h2>
                <div className="space-y-4">
                  {calendarEvents.length === 0 && <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">No upcoming events.</div>}
                  {calendarEvents.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(ev => (
                    <div key={ev.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start space-x-6 hover:shadow-md transition-shadow">
                      <div className={`flex-shrink-0 w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white font-bold shadow-lg ${ev.type === 'assignment' ? 'bg-gradient-to-br from-red-400 to-red-600' : ev.type === 'quiz' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-emerald-400 to-emerald-600'}`}>
                         <span className="text-xs uppercase opacity-80">{new Date(ev.date).toLocaleString('default', { month: 'short' })}</span>
                         <span className="text-xl">{new Date(ev.date).getDate()}</span>
                      </div>
                      <div className="flex-grow pt-1">
                        <h4 className="text-lg font-bold text-slate-900">{ev.title}</h4>
                        <p className="text-sm text-slate-500 mt-1">{ev.description || 'No description provided.'}</p>
                        {ev.link && <a href={ev.link} className="inline-block mt-3 text-xs font-bold text-indigo-600 hover:underline uppercase tracking-wider">View Item &rarr;</a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm sticky top-4">
                  <h3 className="font-bold text-lg text-slate-900 mb-6 flex items-center">
                    <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mr-3 text-slate-500">⚡</span>
                    Quick Task
                  </h3>
                  <form onSubmit={handleAddTask} className="space-y-4">
                    <input type="text" placeholder="Task Title" required className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                    <input type="date" required className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={newTask.date} onChange={e => setNewTask({...newTask, date: e.target.value})} />
                    <textarea placeholder="Details..." className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-24 resize-none" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
                    <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg">Add to Calendar</button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeView === 'discussion' && (
            <div className="animate-fade-in-up">
              <div className="flex flex-col md:flex-row justify-between md:items-end mb-8 gap-4">
                <div>
                   <h2 className="text-3xl font-bold text-slate-900">Global Discussions</h2>
                   <p className="text-slate-500 mt-1">Monitor conversations across all your courses.</p>
                </div>
                <div className="flex space-x-2 w-full md:w-auto">
                  <input 
                    placeholder="Search topics..." 
                    className="flex-grow md:w-64 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={discussionSearch}
                    onChange={e => setDiscussionSearch(e.target.value)}
                  />
                  <button onClick={fetchDiscussions} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">Search</button>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Topic</th>
                      <th className="px-8 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Course</th>
                      <th className="px-8 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Author</th>
                      <th className="px-8 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Activity</th>
                      <th className="px-8 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {discussions.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-5 font-bold text-slate-900">{d.title}</td>
                        <td className="px-8 py-5 text-sm text-slate-600">{d.course_title}</td>
                        <td className="px-8 py-5 text-sm text-slate-600">{d.author}</td>
                        <td className="px-8 py-5">
                          <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">{d.reply_count} Replies</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button onClick={() => window.location.hash = `#/course/${d.id}`} className="text-indigo-600 font-bold text-xs hover:text-indigo-800 uppercase tracking-wider">View Thread &rarr;</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeView === 'students' && (
            <div className="animate-fade-in-up">
              <h2 className="text-3xl font-bold text-slate-900 mb-8">Student Directory</h2>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student Name</th>
                      <th className="px-8 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                      <th className="px-8 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolled Course</th>
                      <th className="px-8 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {enrolledStudents.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-5 font-bold text-slate-900">{s.name}</td>
                        <td className="px-8 py-5 text-sm text-slate-600">{s.email}</td>
                        <td className="px-8 py-5 text-sm text-indigo-600 font-medium">{s.course_title}</td>
                        <td className="px-8 py-5 text-sm text-slate-500">{new Date(s.enrolled_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeView === 'enroll' && (
            <div className="max-w-4xl mx-auto animate-fade-in-up">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Enroll Students</h2>
              <p className="text-slate-500 mb-8">Manually add students to your courses.</p>

              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Course</label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                      value={enrollCourseId}
                      onChange={e => setEnrollCourseId(e.target.value)}
                    >
                      <option value="" disabled>Select a course...</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Filter Candidates</label>
                    <input 
                      type="text"
                      placeholder="Name or email..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                      value={candidateSearch}
                      onChange={e => setCandidateSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mb-6 h-80 overflow-y-auto border border-slate-200 rounded-xl">
                  {candidates
                    .filter(c => c.name.toLowerCase().includes(candidateSearch.toLowerCase()) || c.email.toLowerCase().includes(candidateSearch.toLowerCase()))
                    .map(c => (
                      <label key={c.id} className="flex items-center p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors">
                        <input 
                          type="checkbox"
                          className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          checked={selectedCandidateEmails.includes(c.email)}
                          onChange={() => toggleCandidate(c.email)}
                        />
                        <div className="ml-4">
                          <p className="text-sm font-bold text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.email}</p>
                        </div>
                      </label>
                    ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                   <p className="text-sm font-bold text-slate-500">{selectedCandidateEmails.length} students selected</p>
                   <button 
                    onClick={handleBulkEnroll}
                    disabled={enrolling || selectedCandidateEmails.length === 0 || !enrollCourseId}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200"
                  >
                    {enrolling ? 'Processing...' : 'Confirm Enrollment'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {['quiz', 'assignments', 'gradebook'].includes(activeView) && (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <div className="text-5xl mb-4 text-slate-300">📍</div>
              <h3 className="text-xl font-bold text-slate-900">Context Required</h3>
              <p className="max-w-md mx-auto mt-2 text-slate-500 mb-8">
                To manage specific course items, please navigate to the <b>Courses</b> tab and select the course you wish to manage.
              </p>
              <button onClick={() => setActiveView('courses')} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50">Go to Courses</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
