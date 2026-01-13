
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';

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

const TeacherDashboard: React.FC = () => {
  const { settings } = useSettings();
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Enrollment Form State
  const [enrollForm, setEnrollForm] = useState({ courseId: '', email: '' });
  const [enrolling, setEnrolling] = useState(false);

  const fetchMyCourses = async () => {
    try {
      const res = await api.get('/teacher/my-courses');
      setCourses(res.data);
      // Pre-select first course if available
      if (res.data.length > 0 && !enrollForm.courseId) {
        setEnrollForm(prev => ({ ...prev, courseId: res.data[0].id.toString() }));
      }
    } catch (err: any) {
      console.error("Failed to load teacher courses", err);
      setError(err.response?.data?.message || "Failed to load courses. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyStudents = async () => {
    try {
      const res = await api.get('/teacher/students');
      setStudents(res.data);
    } catch (err) {
      console.error("Failed to load students", err);
    }
  };

  useEffect(() => {
    fetchMyCourses();
    fetchMyStudents();
  }, []);

  const handleManualEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollForm.courseId || !enrollForm.email) return;
    setEnrolling(true);

    try {
      await api.post(`/courses/${enrollForm.courseId}/enroll`, { email: enrollForm.email });
      alert('Student Assigned Successfully');
      setEnrollForm(prev => ({ ...prev, email: '' }));
      fetchMyStudents(); // Refresh student list
      fetchMyCourses(); // Refresh counts
    } catch (err: any) {
      alert(err.response?.data?.message || 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse">Loading Instructor Panel...</div>;

  const cardBg = settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const textMain = settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900';
  const textMuted = settings.ENABLE_DARK_MODE ? 'text-slate-400' : 'text-slate-500';
  const inputBg = settings.ENABLE_DARK_MODE ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900';

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className={`text-4xl font-black tracking-tight ${textMain}`}>Instructor Panel</h1>
          <p className={`${textMuted} mt-2`}>Manage your curriculum and track student progress.</p>
        </div>
        <button 
          onClick={() => window.location.hash = '#/teacher/courses/new'}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          + Create New Course
        </button>
      </div>

      {error && (
        <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-center space-x-4">
          <div className="text-2xl">⚠️</div>
          <div>
            <p className="font-bold">System Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Manual Enrollment Section */}
      <div className={`p-8 rounded-3xl border shadow-sm mb-12 ${cardBg}`}>
        <h2 className={`text-xl font-bold mb-6 ${textMain}`}>Enroll Student Manually</h2>
        <form onSubmit={handleManualEnroll} className="flex flex-col md:flex-row gap-4">
           <select 
             className={`flex-1 px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
             value={enrollForm.courseId}
             onChange={e => setEnrollForm({...enrollForm, courseId: e.target.value})}
             required
           >
             <option value="" disabled>Select a Course</option>
             {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
           </select>
           <input 
             type="email" 
             placeholder="Student Email Address"
             className={`flex-1 px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
             value={enrollForm.email}
             onChange={e => setEnrollForm({...enrollForm, email: e.target.value})}
             required
           />
           <button 
             type="submit" 
             disabled={enrolling}
             className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors disabled:opacity-50"
           >
             {enrolling ? 'Assigning...' : 'Assign to Course'}
           </button>
        </form>
      </div>

      {/* Courses List */}
      <div className="grid grid-cols-1 gap-6 mb-12">
        <h2 className={`text-2xl font-black ${textMain}`}>My Courses</h2>
        {courses.length === 0 && !error ? (
          <div className={`p-16 rounded-3xl border-2 border-dashed text-center ${settings.ENABLE_DARK_MODE ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
            <div className="text-5xl mb-4">🎓</div>
            <h3 className={`text-xl font-bold mb-2 ${textMain}`}>You haven't created any courses yet.</h3>
            <p className={textMuted}>Get started by clicking the button above to launch your first class.</p>
          </div>
        ) : (
          courses.map(course => (
            <div key={course.id} className={`p-8 rounded-3xl border shadow-sm flex flex-col md:flex-row items-center justify-between transition-all hover:shadow-md ${cardBg}`}>
              <div className="mb-6 md:mb-0">
                <h3 className={`text-xl font-bold mb-1 ${textMain}`}>{course.title}</h3>
                <div className={`flex space-x-6 text-sm ${textMuted}`}>
                  <span className="flex items-center">👥 {course.student_count} Students</span>
                  <span className="flex items-center">📚 {course.lesson_count} Lessons</span>
                  <span className="flex items-center">📅 Created {new Date(course.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex space-x-3 w-full md:w-auto">
                <button 
                  onClick={() => window.location.hash = `#/teacher/courses/${course.id}`}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors flex-grow md:flex-grow-0"
                >
                  Edit Course
                </button>
                <button 
                  onClick={() => window.location.hash = `#/gradebook/${course.id}`}
                  className="px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors flex-grow md:flex-grow-0"
                >
                  Gradebook
                </button>
                <button 
                   onClick={() => window.location.hash = `#/course/${course.id}`}
                   className="px-5 py-2.5 border border-slate-200 text-slate-500 rounded-xl font-bold text-sm hover:text-indigo-600 hover:border-indigo-200 transition-colors flex-grow md:flex-grow-0"
                >
                  View as Student
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Students List */}
      <div className={`rounded-3xl border shadow-sm overflow-hidden ${cardBg}`}>
        <div className={`p-8 border-b ${settings.ENABLE_DARK_MODE ? 'border-slate-700' : 'border-slate-100'}`}>
          <h2 className={`text-xl font-bold ${textMain}`}>My Students</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`text-xs font-black uppercase tracking-widest border-b ${settings.ENABLE_DARK_MODE ? 'border-slate-700 text-slate-500' : 'border-slate-50 text-slate-400'}`}>
                <th className="px-8 py-4">Student Name</th>
                <th className="px-8 py-4">Email Address</th>
                <th className="px-8 py-4">Enrolled Course</th>
                <th className="px-8 py-4">Date Enrolled</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${settings.ENABLE_DARK_MODE ? 'divide-slate-700' : 'divide-slate-50'}`}>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-8 text-center text-slate-500 italic">No students found.</td>
                </tr>
              ) : (
                students.map((student, idx) => (
                  <tr key={idx} className={`transition-colors ${settings.ENABLE_DARK_MODE ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                    <td className={`px-8 py-4 font-bold ${textMain}`}>{student.name}</td>
                    <td className={`px-8 py-4 ${textMuted}`}>{student.email}</td>
                    <td className={`px-8 py-4 font-bold text-indigo-600`}>{student.course_title}</td>
                    <td className={`px-8 py-4 ${textMuted}`}>{new Date(student.enrolled_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
