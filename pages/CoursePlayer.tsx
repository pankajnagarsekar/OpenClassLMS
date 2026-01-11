
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Course, Lesson, LessonType, UserRole, AssignmentSubmission } from '../types';
import { QuizView } from '../components/QuizView';
import { AnnouncementsTab } from '../components/AnnouncementsTab';

const CoursePlayer: React.FC<{ courseId: string; userRole?: UserRole }> = ({ courseId, userRole }) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [view, setView] = useState<'content' | 'announcements' | 'assignment-admin'>('content');
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [grading, setGrading] = useState<{ id: number; grade: string; feedback: string } | null>(null);

  const fetchData = async () => {
    try {
      const res = await api.get(`/courses/${courseId}`);
      setCourse(res.data);
      if (res.data.Lessons?.length > 0 && !activeLesson) {
        setActiveLesson(res.data.Lessons[0]);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchSubmissions = async (lessonId: number) => {
    try {
      const res = await api.get(`/lessons/${lessonId}/submissions`);
      setSubmissions(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, [courseId]);

  const handleFileUpload = async () => {
    if (!file || !activeLesson) return;
    const formData = new FormData();
    formData.append('assignmentFile', file);
    try {
      await api.post(`/lessons/${activeLesson.id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("Assignment submitted!");
      setFile(null);
      fetchData();
    } catch (err) { alert("Upload failed."); }
  };

  const handleGradeSubmit = async () => {
    if (!grading) return;
    try {
      await api.put(`/submissions/${grading.id}/grade`, { grade: parseInt(grading.grade), feedback: grading.feedback });
      alert("Graded!");
      setGrading(null);
      if (activeLesson) fetchSubmissions(activeLesson.id);
    } catch (err) { alert("Grading failed."); }
  };

  const markAsComplete = async () => {
    if (!activeLesson) return;
    try {
      await api.post(`/lessons/${activeLesson.id}/complete`);
      fetchData();
    } catch (err) { alert("Failed."); }
  };

  if (loading) return <div className="p-20 text-center animate-pulse">Loading Classroom...</div>;
  if (!course) return <div className="p-20 text-center text-red-500 font-bold">Course not found.</div>;

  const API_BASE = (import.meta as any).env?.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  const renderActiveContent = () => {
    if (!activeLesson) return null;
    const isCompleted = (activeLesson.Submissions && activeLesson.Submissions.length > 0) || 
                       (activeLesson.AssignmentSubmissions && activeLesson.AssignmentSubmissions.length > 0);
    const mySubmission = activeLesson.AssignmentSubmissions?.[0];

    switch (activeLesson.type) {
      case LessonType.VIDEO:
        return (
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-200">
            <div className="aspect-video bg-slate-900">
              <iframe className="w-full h-full" src={activeLesson.content_url} title={activeLesson.title} frameBorder="0" allowFullScreen></iframe>
            </div>
            <div className="p-8 flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{activeLesson.title}</h1>
                <p className="text-slate-600">Video Lesson</p>
              </div>
              {!isCompleted ? (
                <button onClick={markAsComplete} className="px-6 py-2 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-all">Mark as Finished</button>
              ) : (
                <span className="px-6 py-2 bg-green-50 text-green-600 font-bold rounded-xl border border-green-200">✅ Completed</span>
              )}
            </div>
          </div>
        );
      case LessonType.PDF:
        return (
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-200">
            <div className="aspect-video bg-slate-900 flex flex-col items-center justify-center text-white space-y-6">
              <span className="text-7xl">📄</span>
              <a href={`${API_BASE}${activeLesson.content_url}`} target="_blank" className="px-10 py-4 bg-white text-indigo-600 rounded-2xl font-black hover:bg-slate-100 transition-all">Download PDF</a>
            </div>
            <div className="p-8 flex justify-between">
              <h1 className="text-3xl font-bold text-slate-900">{activeLesson.title}</h1>
              {!isCompleted && <button onClick={markAsComplete} className="px-6 py-2 bg-green-500 text-white font-bold rounded-xl">Mark as Finished</button>}
            </div>
          </div>
        );
      case LessonType.QUIZ:
        return <QuizView lessonId={activeLesson.id} onComplete={() => fetchData()} existingSubmission={(activeLesson as any).Submissions?.[0]} />;
      case LessonType.ASSIGNMENT:
        return (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-10">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">{activeLesson.title}</h1>
            <p className="text-slate-500 mb-10">Submit your project or assignment files here for instructor review.</p>

            {userRole === UserRole.TEACHER ? (
              <div>
                <button 
                  onClick={() => { setView('assignment-admin'); fetchSubmissions(activeLesson.id); }}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                >
                  View All Submissions
                </button>
              </div>
            ) : mySubmission ? (
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Submission Status</span>
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${mySubmission.grade !== null ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                    {mySubmission.grade !== null ? `Graded: ${mySubmission.grade}/100` : 'Pending Review'}
                  </span>
                </div>
                <div className="mb-4">
                  <p className="text-xs font-bold text-slate-400 mb-1">Submitted File</p>
                  <a href={`${API_BASE}${mySubmission.file_path}`} target="_blank" className="text-indigo-600 font-bold hover:underline">Download my submission</a>
                </div>
                {mySubmission.feedback && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 mb-1">Instructor Feedback</p>
                    <p className="text-slate-700 italic">"{mySubmission.feedback}"</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
                  <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" id="assignment-upload" />
                  <label htmlFor="assignment-upload" className="cursor-pointer">
                    <span className="text-4xl block mb-4">📤</span>
                    <span className="text-slate-600 font-bold block">{file ? file.name : 'Select file to upload'}</span>
                    <span className="text-xs text-slate-400 mt-2 block">PDF, Word, or ZIP accepted</span>
                  </label>
                </div>
                {file && (
                  <button onClick={handleFileUpload} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all">
                    Submit Assignment
                  </button>
                )}
              </div>
            )}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)] bg-slate-50">
      {/* Sidebar */}
      <div className="w-full lg:w-96 bg-white border-r border-slate-200 flex flex-col h-auto lg:h-[calc(100vh-80px)] sticky top-20">
        <div className="p-8 border-b border-slate-100">
          <h2 className="font-black text-slate-900 text-xl leading-tight mb-2">{course.title}</h2>
          <div className="flex flex-col space-y-3 mt-4">
            <button onClick={() => setView('content')} className={`text-xs font-black uppercase tracking-widest py-2 px-4 rounded-lg transition-all ${view === 'content' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>Curriculum</button>
            <button onClick={() => setView('announcements')} className={`text-xs font-black uppercase tracking-widest py-2 px-4 rounded-lg transition-all ${view === 'announcements' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>News Feed</button>
            {userRole === UserRole.TEACHER && <a href={`#/gradebook/${courseId}`} className="text-xs font-black uppercase tracking-widest py-2 px-4 rounded-lg text-emerald-600 hover:bg-emerald-50 text-center border border-emerald-100">Gradebook</a>}
          </div>
        </div>

        <div className="flex-grow overflow-y-auto">
          {view === 'content' && course.Lessons?.map((lesson: any) => (
            <button key={lesson.id} onClick={() => { setActiveLesson(lesson); setView('content'); }} className={`w-full text-left px-8 py-5 flex items-start space-x-4 transition-all ${activeLesson?.id === lesson.id ? 'bg-indigo-50/50 border-r-4 border-indigo-600' : 'hover:bg-slate-50 border-r-4 border-transparent'}`}>
              <div className="mt-1 flex-shrink-0">{(lesson.Submissions?.length > 0 || lesson.AssignmentSubmissions?.length > 0) ? '✅' : '▶️'}</div>
              <div className="flex-grow">
                <p className={`text-sm font-black ${activeLesson?.id === lesson.id ? 'text-indigo-700' : 'text-slate-700'}`}>{lesson.title}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{lesson.type}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main View */}
      <div className="flex-grow p-6 lg:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {view === 'announcements' ? (
            <AnnouncementsTab courseId={course.id} userRole={userRole} />
          ) : view === 'assignment-admin' ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-900">Assignment Submissions</h2>
                <button onClick={() => setView('content')} className="text-indigo-600 font-bold text-sm">Back to Class</button>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Submitted File</th>
                    <th className="px-6 py-4">Grade</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {submissions.map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{sub.User?.name}</p>
                        <p className="text-xs text-slate-400">{sub.User?.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <a href={`${API_BASE}${sub.file_path}`} target="_blank" className="text-xs font-bold text-indigo-600 hover:underline">Download</a>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900">{sub.grade !== null ? `${sub.grade}%` : '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setGrading({ id: sub.id, grade: sub.grade?.toString() || '', feedback: sub.feedback || '' })} className="px-4 py-1.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-lg">Grade</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {grading && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                    <h3 className="text-xl font-black mb-6">Grade Submission</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Score (0-100)</label>
                        <input type="number" value={grading.grade} onChange={e => setGrading({...grading, grade: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Feedback</label>
                        <textarea value={grading.feedback} onChange={e => setGrading({...grading, feedback: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl h-24" />
                      </div>
                      <div className="flex space-x-3 mt-6">
                        <button onClick={() => setGrading(null)} className="flex-grow py-3 bg-slate-100 font-bold rounded-xl">Cancel</button>
                        <button onClick={handleGradeSubmit} className="flex-grow py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100">Save Grade</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeLesson ? (
            renderActiveContent()
          ) : (
            <div className="text-center py-20"><button onClick={() => fetchData()} className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black">Enroll Now</button></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursePlayer;
