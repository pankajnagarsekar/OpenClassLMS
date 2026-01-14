
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { User } from '../types';

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

type DashboardView = 'courses' | 'discussion' | 'quiz' | 'assignments' | 'gradebook' | 'enroll' | 'students' | 'calendar';

const TeacherDashboard: React.FC = () => {
  const { settings } = useSettings();
  const [activeView, setActiveView] = useState<DashboardView>('courses');
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enrollment State
  const [candidates, setCandidates] = useState<User[]>([]);
  const [enrollCourseId, setEnrollCourseId] = useState('');
  const [selectedCandidateEmails, setSelectedCandidateEmails] = useState<string[]>([]);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchMyCourses();
    fetchMyStudents();
  }, []);

  // Fetch only when enrollment view is active
  useEffect(() => {
    if (activeView === 'enroll') {
      fetchCandidates();
    }
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
    try {
      const res = await api.get('/teacher/students');
      setEnrolledStudents(res.data);
    } catch (err) {
      console.error("Failed to load students", err);
    }
  };

  const fetchCandidates = async () => {
    try {
      const res = await api.get('/teacher/candidates');
      setCandidates(res.data);
    } catch (err) {
      console.error("Failed to load candidate students", err);
    }
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

  if (loading) return <div className="p-20 text-center animate-pulse">Loading Instructor Panel...</div>;

  // UI Theme Helpers
  const mainText = settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900';
  const mutedText = settings.ENABLE_DARK_MODE ? 'text-slate-400' : 'text-slate-500';
  const sidebarBg = settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const contentBg = settings.ENABLE_DARK_MODE ? 'bg-slate-900' : 'bg-slate-50';
  const cardBg = settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const inputBg = settings.ENABLE_DARK_MODE ? 'bg-white text-slate-900 border-slate-200' : 'bg-white text-slate-900 border-slate-200'; // Force readable inputs

  const SidebarItem: React.FC<{ view: DashboardView; label: string; icon: string }> = ({ view, label, icon }) => (
    <button 
      onClick={() => setActiveView(view)}
      className={`w-full text-left px-6 py-4 flex items-center space-x-3 transition-colors ${activeView === view ? 'bg-indigo-600 text-white font-bold' : `${mutedText} hover:bg-slate-100/10`}`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm tracking-wide">{label}</span>
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
          <SidebarItem view="discussion" label="Discussion" icon="💬" />
          <SidebarItem view="quiz" label="Quiz" icon="📝" />
          <SidebarItem view="assignments" label="Assignments" icon="📂" />
          <SidebarItem view="gradebook" label="Gradebook" icon="📊" />
          <div className="my-2 border-t border-slate-100/10" />
          <SidebarItem view="enroll" label="Enroll Student" icon="➕" />
          <SidebarItem view="students" label="View Student" icon="👥" />
          <SidebarItem view="calendar" label="Calendar" icon="📅" />
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
                  {enrolledStudents.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No students found.</td></tr>
                  )}
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

        {/* Placeholders for context-dependent views */}
        {['discussion', 'quiz', 'assignments', 'gradebook', 'calendar'].includes(activeView) && (
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
