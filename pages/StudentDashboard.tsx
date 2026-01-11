
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { DashboardCourse } from '../types';

const StudentDashboard: React.FC = () => {
  const [enrolledCourses, setEnrolledCourses] = useState<DashboardCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/student/dashboard');
        setEnrolledCourses(res.data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchDashboard();
  }, []);

  const handleDownloadCertificate = async (courseId: number) => {
    try {
      const response = await api.post(`/courses/${courseId}/certificate`, {}, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Certificate-${courseId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) { alert("Complete all lessons to unlock your certificate."); }
  };

  if (loading) return <div className="p-20 text-center animate-pulse">Synchronizing Learning State...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Student Workspace</h1>
        <p className="text-slate-500 mt-2">Active enrollments and lifetime achievements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {enrolledCourses.map(course => {
          const isExpired = new Date(course.expires_at) < new Date();
          return (
            <div key={course.course_id} className={`bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group transition-all ${isExpired ? 'opacity-70 saturate-50' : 'hover:-translate-y-1 hover:shadow-md'}`}>
              <div className="aspect-video relative overflow-hidden bg-slate-100">
                <img src={course.thumbnail_url || `https://picsum.photos/seed/${course.course_id}/400/225`} className="w-full h-full object-cover" />
                <div className="absolute top-4 right-4">
                  {isExpired ? (
                    <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg">Access Expired</span>
                  ) : (
                    <span className="px-3 py-1 bg-white/90 text-slate-800 text-[10px] font-black uppercase rounded-lg shadow-sm border border-slate-100">
                      Access ends: {new Date(course.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-8 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{course.title}</h3>
                <div className="mt-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Mastery</span>
                    <span className="text-xs font-black text-indigo-600">{course.progress_percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${course.progress_percentage}%` }} />
                  </div>
                </div>

                <div className="mt-auto space-y-3">
                  <button onClick={() => !isExpired && (window.location.hash = `#/course/${course.course_id}`)} disabled={isExpired} className={`w-full py-3 rounded-xl font-bold transition-all ${isExpired ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'}`}>
                    {isExpired ? 'Enrollment Terminated' : 'Continue Study'}
                  </button>
                  {course.progress_percentage === 100 && (
                    <button onClick={() => handleDownloadCertificate(course.course_id)} className="w-full py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold border border-emerald-100 hover:bg-emerald-100 flex items-center justify-center space-x-2">
                      <span>Download Certificate</span> <span>🎓</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StudentDashboard;
