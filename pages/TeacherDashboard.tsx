
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { User, CalendarEvent, Notification, DiscussionTopic } from '../types';

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

// Extended Discussion Interface for the global view
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
    fetchNotifications(); // Always fetch notifications badge
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
      setCourses(res.data);
      if (res.data.length > 0 && !enrollCourseId) {
        setEnrollCourseId(res.data[0].id.toString());
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load courses.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyStudents = async () => {
    try { const res = await api.get('/teacher/students'); setEnrolledStudents(res.data); } catch (err) {}
  };

  const fetchCandidates = async () => {
    try { const res = await api.get('/teacher/candidates'); setCandidates(res.data); } catch (err) {}
  };

  const fetchCalendar = async () => {
    try { const res = await api.get('/teacher/calendar'); setCalendarEvents(res.data); } catch (err) {}
  };

  const fetchNotifications = async () => {
    try { const res = await api.get('/notifications'); setNotifications(res.data); } catch (err) {}
  };

  const fetchDiscussions = async () => {
    try { 
      const res = await api.get(`/teacher/discussions/all?search=${discussionSearch}`); 
      setDiscussions(res.data); 
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

  const mainText = settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900';
  const mutedText = settings.ENABLE_DARK_MODE ? 'text-slate-400' : 'text-slate-500';
  const sidebarBg = settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const contentBg = settings.ENABLE_DARK_MODE ? 'bg-slate-900' : 'bg-slate-50';
  const cardBg = settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const inputBg = settings.ENABLE_DARK_MODE ? 'bg-white text-slate-900 border-slate-200' : 'bg-white text-slate-900 border-slate-200';

  const SidebarItem: React.FC<{ view: DashboardView; label: string; icon: string; badge?: number }> = ({ view, label, icon, badge }) => (
    <button 
      onClick={() => setActiveView(view)}
      className={`w-full text-left px-6 py-4 flex items-center justify-between transition-colors ${activeView === view ? 'bg-indigo-600 text-white font-bold' : `${mutedText} hover:bg-slate-100/10`}`}
    >
      <div className="flex items-center space-x-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm tracking-wide">{label}</span>
      </div>
      {badge ? <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{badge}</span> : null}
    </button>
  );

  return (
    <div className={`flex min-h-[calc(100vh-80px)] ${contentBg}`}>
      {/* Sidebar Navigation */}
      <div className={`w-64 flex-shrink-0 border-r ${sidebarBg} flex flex-col`}>
        <div className="py-6 px-6 border-b border-slate-100/10">
          <h2 className={`font-black text-lg ${mainText}`}>Instructor Panel</h2>
        </div>
        <nav className="flex-grow py-4">
          <SidebarItem view="courses" label="Courses" icon="📚" />
          <SidebarItem view="discussion" label="Global Discussions" icon="💬" />
          <SidebarItem view="notifications" label="Notifications" icon="🔔" badge={notifications.length} />
          <SidebarItem view="calendar" label="Calendar & Tasks" icon="📅" />
          <SidebarItem view="gradebook" label="Gradebook" icon="📊" />
          <div className="my-2 border-t border-slate-100/10" />
          <SidebarItem view="enroll" label="Enroll Student" icon="➕" />
          <SidebarItem view="students" label="View Student" icon="👥" />
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow p-8 overflow-y-auto">
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
            {error}
          </div>
        )}

        {activeView === 'courses' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className={`text-3xl font-black ${mainText}`}>My Courses</h2>
              <button onClick={() => window.location.hash = '#/teacher/courses/new'} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg hover:bg-indigo-700">
                + Create Course
              </button>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {courses.map(course => (
                <div key={course.id} className={`p-6 rounded-2xl border shadow-sm ${cardBg}`}>
                  <h3 className={`text-xl font-bold mb-2 ${mainText}`}>{course.title}</h3>
                  <div className={`flex space-x-4 text-xs font-bold uppercase tracking-widest ${mutedText} mb-6`}>
                    <span>{course.student_count} Students</span>
                    <span>{course.lesson_count} Lessons</span>
                  </div>
                  <div className="flex space-x-3">
                    <button onClick={() => window.location.hash = `#/teacher/courses/${course.id}`} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">Edit</button>
                    <button onClick={() => window.location.hash = `#/gradebook/${course.id}`} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">Gradebook</button>
                    <button onClick={() => window.location.hash = `#/course/${course.id}`} className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs font-bold">Preview</button>
                  </div>
                </div>
              ))}
              {courses.length === 0 && <p className={mutedText}>No courses found.</p>}
            </div>
          </div>
        )}

        {activeView === 'notifications' && (
          <div className="max-w-3xl">
            <h2 className={`text-3xl font-black mb-8 ${mainText}`}>Notifications</h2>
            <div className="space-y-4">
              {notifications.length === 0 && <p className={mutedText}>No new notifications.</p>}
              {notifications.map(n => (
                <div key={n.id} onClick={() => markRead(n.id, n.link)} className={`p-6 rounded-xl border shadow-sm cursor-pointer transition-all hover:bg-slate-50/10 ${cardBg} ${!n.is_read ? 'border-indigo-500 border-l-4' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`font-bold ${mainText}`}>{n.message}</p>
                      <p className={`text-xs mt-1 ${mutedText}`}>{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    {n.type === 'submission' && <span className="text-xl">📝</span>}
                    {n.type === 'reply' && <span className="text-xl">💬</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className={`text-3xl font-black mb-8 ${mainText}`}>Agenda</h2>
              <div className="space-y-4">
                {calendarEvents.length === 0 && <p className={mutedText}>No upcoming events.</p>}
                {calendarEvents.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(ev => (
                  <div key={ev.id} className={`p-6 rounded-xl border shadow-sm flex items-center space-x-4 ${cardBg}`}>
                    <div className={`w-2 h-16 rounded-full ${ev.type === 'assignment' ? 'bg-red-500' : ev.type === 'quiz' ? 'bg-blue-500' : 'bg-green-500'}`} />
                    <div className="flex-grow">
                      <p className={`text-xs font-black uppercase tracking-widest ${mutedText}`}>{new Date(ev.date).toDateString()}</p>
                      <h4 className={`text-lg font-bold ${mainText}`}>{ev.title}</h4>
                      {ev.description && <p className="text-sm text-slate-500">{ev.description}</p>}
                    </div>
                    {ev.link && <a href={ev.link} className="text-indigo-600 font-bold text-sm">View</a>}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <div className={`p-6 rounded-3xl border shadow-sm sticky top-4 ${cardBg}`}>
                <h3 className={`font-bold text-xl mb-4 ${mainText}`}>Add Personal Task</h3>
                <form onSubmit={handleAddTask} className="space-y-4">
                  <input type="text" placeholder="Title" required className={`w-full px-4 py-2 rounded-xl border ${inputBg}`} value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                  <input type="date" required className={`w-full px-4 py-2 rounded-xl border ${inputBg}`} value={newTask.date} onChange={e => setNewTask({...newTask, date: e.target.value})} />
                  <textarea placeholder="Notes..." className={`w-full px-4 py-2 rounded-xl border h-24 ${inputBg}`} value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
                  <button type="submit" className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700">Add Task</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeView === 'discussion' && (
          <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-8">
              <h2 className={`text-3xl font-black ${mainText}`}>Global Discussions</h2>
              <div className="flex space-x-2 mt-4 md:mt-0">
                <input 
                  placeholder="Search topics..." 
                  className={`px-4 py-2 rounded-xl border ${inputBg}`}
                  value={discussionSearch}
                  onChange={e => setDiscussionSearch(e.target.value)}
                />
                <button onClick={fetchDiscussions} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Search</button>
              </div>
            </div>
            
            <div className={`rounded-2xl border shadow-sm overflow-hidden ${cardBg}`}>
              <table className="w-full text-left">
                <thead>
                  <tr className={`text-xs font-black uppercase tracking-widest border-b ${settings.ENABLE_DARK_MODE ? 'border-slate-700 text-slate-500' : 'border-slate-50 text-slate-400'}`}>
                    <th className="px-6 py-4">Topic</th>
                    <th className="px-6 py-4">Course</th>
                    <th className="px-6 py-4">Author</th>
                    <th className="px-6 py-4">Replies</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${settings.ENABLE_DARK_MODE ? 'divide-slate-700' : 'divide-slate-50'}`}>
                  {discussions.map(d => (
                    <tr key={d.id} className={`transition-colors ${settings.ENABLE_DARK_MODE ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                      <td className={`px-6 py-4 font-bold ${mainText}`}>{d.title}</td>
                      <td className={`px-6 py-4 ${mutedText}`}>{d.course_title}</td>
                      <td className={`px-6 py-4 ${mutedText}`}>{d.author}</td>
                      <td className="px-6 py-4">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold">{d.reply_count}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => window.location.hash = `#/course/${d.id}`} className="text-indigo-600 font-bold text-xs hover:underline">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Existing Views: Enroll, Students */}
        {activeView === 'students' && (
          <div>
            <h2 className={`text-3xl font-black mb-8 ${mainText}`}>Enrolled Students</h2>
            <div className={`rounded-2xl border shadow-sm overflow-hidden ${cardBg}`}>
              <table className="w-full text-left">
                <thead>
                  <tr className={`text-xs font-black uppercase tracking-widest border-b ${settings.ENABLE_DARK_MODE ? 'border-slate-700 text-slate-500' : 'border-slate-50 text-slate-400'}`}>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Course</th>
                    <th className="px-6 py-4">Enrolled Date</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${settings.ENABLE_DARK_MODE ? 'divide-slate-700' : 'divide-slate-50'}`}>
                  {enrolledStudents.map((s, idx) => (
                    <tr key={idx} className={`transition-colors ${settings.ENABLE_DARK_MODE ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                      <td className={`px-6 py-4 font-bold ${mainText}`}>{s.name}</td>
                      <td className={`px-6 py-4 ${mutedText}`}>{s.email}</td>
                      <td className="px-6 py-4 text-indigo-600 font-bold">{s.course_title}</td>
                      <td className={`px-6 py-4 ${mutedText}`}>{new Date(s.enrolled_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeView === 'enroll' && (
          <div className="max-w-3xl">
            <h2 className={`text-3xl font-black mb-2 ${mainText}`}>Enroll Students</h2>
            <p className={`${mutedText} mb-8`}>Search for students and enroll them in bulk.</p>

            <div className={`p-8 rounded-3xl border shadow-sm ${cardBg}`}>
              <div className="mb-6">
                <label className={`block text-xs font-bold uppercase mb-2 ${mutedText}`}>Select Target Course</label>
                <select 
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
                  value={enrollCourseId}
                  onChange={e => setEnrollCourseId(e.target.value)}
                >
                  <option value="" disabled>Choose a course...</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>

              <div className="mb-6">
                <label className={`block text-xs font-bold uppercase mb-2 ${mutedText}`}>Search Candidates</label>
                <input 
                  type="text"
                  placeholder="Filter by name or email..."
                  className={`w-full px-4 py-3 rounded-xl border mb-4 focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
                  value={candidateSearch}
                  onChange={e => setCandidateSearch(e.target.value)}
                />
                
                <div className={`h-64 overflow-y-auto border rounded-xl p-2 ${settings.ENABLE_DARK_MODE ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  {candidates
                    .filter(c => c.name.toLowerCase().includes(candidateSearch.toLowerCase()) || c.email.toLowerCase().includes(candidateSearch.toLowerCase()))
                    .map(c => (
                      <label key={c.id} className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${settings.ENABLE_DARK_MODE ? 'hover:bg-slate-800' : 'hover:bg-white'}`}>
                        <input 
                          type="checkbox"
                          className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                          checked={selectedCandidateEmails.includes(c.email)}
                          onChange={() => toggleCandidate(c.email)}
                        />
                        <div className="ml-3">
                          <p className={`text-sm font-bold ${mainText}`}>{c.name}</p>
                          <p className={`text-xs ${mutedText}`}>{c.email}</p>
                        </div>
                      </label>
                    ))}
                </div>
                <p className="text-right text-xs font-bold text-indigo-600 mt-2">
                  {selectedCandidateEmails.length} Students Selected
                </p>
              </div>

              <button 
                onClick={handleBulkEnroll}
                disabled={enrolling || selectedCandidateEmails.length === 0 || !enrollCourseId}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                {enrolling ? 'Processing...' : 'Bulk Enroll Selected Students'}
              </button>
            </div>
          </div>
        )}

        {['quiz', 'assignments', 'gradebook'].includes(activeView) && (
          <div className={`text-center py-20 rounded-3xl border-2 border-dashed ${settings.ENABLE_DARK_MODE ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="text-4xl mb-4">📍</div>
            <h3 className={`text-xl font-bold ${mainText}`}>Select a Course First</h3>
            <p className={`max-w-md mx-auto mt-2 ${mutedText}`}>
              To manage {activeView}, please go to the <b>Courses</b> tab and select "Edit" or "Gradebook" on the specific course card.
            </p>
            <button onClick={() => setActiveView('courses')} className="mt-6 text-indigo-600 font-bold hover:underline">Go to Courses &rarr;</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
