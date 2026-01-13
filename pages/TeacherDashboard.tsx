
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

const TeacherDashboard: React.FC = () => {
  const { settings } = useSettings();
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyCourses = async () => {
      try {
        const res = await api.get('/teacher/my-courses');
        setCourses(res.data);
      } catch (err) {
        console.error("Failed to load teacher courses", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyCourses();
  }, []);

  if (loading) return <div className="p-20 text-center animate-pulse">Loading Instructor Panel...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className={`text-4xl font-black tracking-tight ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>Instructor Panel</h1>
          <p className="text-slate-500 mt-2">Manage your curriculum and track student progress.</p>
        </div>
        <button 
          onClick={() => window.location.hash = '#/teacher/courses/new'}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          + Create New Course
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {courses.length === 0 ? (
          <div className={`p-16 rounded-3xl border-2 border-dashed text-center ${settings.ENABLE_DARK_MODE ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
            <div className="text-5xl mb-4">🎓</div>
            <h3 className={`text-xl font-bold mb-2 ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>You haven't created any courses yet.</h3>
            <p className="text-slate-500">Get started by clicking the button above to launch your first class.</p>
          </div>
        ) : (
          courses.map(course => (
            <div key={course.id} className={`p-8 rounded-3xl border shadow-sm flex flex-col md:flex-row items-center justify-between transition-all hover:shadow-md ${settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className="mb-6 md:mb-0">
                <h3 className={`text-xl font-bold mb-1 ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>{course.title}</h3>
                <div className="flex space-x-6 text-sm text-slate-500">
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
    </div>
  );
};

export default TeacherDashboard;
