
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Course } from '../types';
import { CourseCard } from '../components/CourseCard';
import { useSettings } from '../context/SettingsContext';

const Dashboard: React.FC = () => {
  const { settings, loading: settingsLoading } = useSettings();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Security Check: If public registration is disabled, require login
    if (!settingsLoading && !settings.ENABLE_PUBLIC_REGISTRATION) {
       const token = localStorage.getItem('token');
       if (!token) {
         window.location.hash = '#/login';
         return;
       }
    }

    const fetchCourses = async () => {
      try {
        const response = await api.get('/courses');
        setCourses(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load courses. Please check if backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [settings, settingsLoading]);

  if (loading || settingsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10">
        <h1 className={`text-3xl font-extrabold ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>Explore Courses</h1>
        <p className={`mt-2 ${settings.ENABLE_DARK_MODE ? 'text-slate-400' : 'text-slate-600'}`}>Master new skills with our expert-led classes.</p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex flex-col items-center">
          <p className="font-semibold">{error}</p>
          <p className="text-sm mt-1">Make sure your Node.js server is running and database is connected.</p>
        </div>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {courses.map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <div className="text-slate-400 mb-4 text-4xl">📚</div>
          <h2 className="text-xl font-bold text-slate-700">No courses available yet</h2>
          <p className="text-slate-500 mt-2">Teachers haven't published anything for this term.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
