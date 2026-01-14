
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Course, Lesson, LessonType, UserRole, AssignmentSubmission, DiscussionTopic, DiscussionReply } from '../types';
import { QuizView } from '../components/QuizView';
import { AnnouncementsTab } from '../components/AnnouncementsTab';
import { useSettings } from '../context/SettingsContext';

interface EnrichedCourse extends Course {
  is_enrolled?: boolean;
}

const CoursePlayer: React.FC<{ courseId: string; userRole?: UserRole }> = ({ courseId, userRole }) => {
  const { settings } = useSettings();
  const [course, setCourse] = useState<EnrichedCourse | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [view, setView] = useState<'content' | 'announcements' | 'discussions' | 'assignment-admin'>('content');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  // Feedback Modal State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  // Assignment State
  const [file, setFile] = useState<File | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [grading, setGrading] = useState<{ id: number; grade: string; feedback: string } | null>(null);

  // Discussion State
  const [topics, setTopics] = useState<DiscussionTopic[]>([]);
  const [activeTopic, setActiveTopic] = useState<DiscussionTopic | null>(null);
  const [newTopicForm, setNewTopicForm] = useState({ title: '', content: '' });
  const [newReplyContent, setNewReplyContent] = useState('');

  const calculateProgress = (c: EnrichedCourse | null) => {
    if (!c || !c.Lessons || c.Lessons.length === 0) return 0;
    let completed = 0;
    c.Lessons.forEach(l => {
      if ((l.Submissions && l.Submissions.length > 0) || (l.AssignmentSubmissions && l.AssignmentSubmissions.length > 0)) {
        completed++;
      }
    });
    return Math.round((completed / c.Lessons.length) * 100);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/courses/${courseId}`);
      setCourse(res.data);
      if (view === 'content' && res.data.Lessons?.length > 0 && !activeLesson) {
        setActiveLesson(res.data.Lessons[0]);
      }
      
      const progress = calculateProgress(res.data);
      const hasFeedback = res.data.CourseFeedbacks && res.data.CourseFeedbacks.length > 0;
      if (progress === 100 && !hasFeedback && userRole === UserRole.STUDENT) {
        setShowFeedbackModal(true);
      }

    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchSubmissions = async (lessonId: number) => {
    try {
      const res = await api.get(`/lessons/${lessonId}/submissions`);
      setSubmissions(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchTopics = async () => {
    try {
      const res = await api.get(`/courses/${courseId}/discussions`);
      setTopics(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchThread = async (topicId: number) => {
    try {
      const res = await api.get(`/discussions/${topicId}`);
      setActiveTopic(res.data);
    } catch (err) { console.error(err); }
  };

  const handleEnroll = async () => {
    if (!confirm("Are you sure you want to enroll in this course?")) return;
    try {
      await api.post(`/courses/${courseId}/enroll`);
      alert("Enrolled successfully!");
      fetchData(); 
    } catch (err: any) {
      alert(err.response?.data?.message || "Enrollment failed.");
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSubmitting(true);
    try {
      await api.post(`/courses/${courseId}/feedback`, { rating: feedbackRating, comment: feedbackComment });
      alert("Thank you for your feedback!");
      setShowFeedbackModal(false);
      fetchData(); 
    } catch (err) {
      alert("Failed to submit feedback.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUserId(user.id);
    }
  }, [courseId]);

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

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/courses/${courseId}/discussions`, newTopicForm);
      setNewTopicForm({ title: '', content: '' });
      fetchTopics();
    } catch (err) { alert("Failed to create topic."); }
  };

  const handleCreateReply = async () => {
    if (!activeTopic || !newReplyContent.trim()) return;
    try {
      const res = await api.post(`/discussions/${activeTopic.id}/replies`, { content: newReplyContent });
      setActiveTopic(prev => prev ? { 
         ...prev, 
         DiscussionReplies: [...(prev.DiscussionReplies || []), res.data] 
      } : null);
      setNewReplyContent('');
    } catch (err) { alert("Failed to reply."); }
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

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400">Loading Classroom...</div>;
  if (!course) return <div className="p-20 text-center text-red-500 font-bold">Course not found.</div>;

  const API_BASE = (import.meta as any).env?.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  const isInstructor = userRole === UserRole.TEACHER || userRole === UserRole.ADMIN;

  const renderActiveContent = () => {
    if (!activeLesson) return null;
    const isCompleted = (activeLesson.Submissions && activeLesson.Submissions.length > 0) || 
                       (activeLesson.AssignmentSubmissions && activeLesson.AssignmentSubmissions.length > 0);
    const mySubmission = activeLesson.AssignmentSubmissions?.[0];

    const contentBg = 'bg-white border-slate-200 text-slate-900';

    switch (activeLesson.type) {
      case LessonType.VIDEO:
        return (
          <div className="space-y-6">
            <div className="rounded-2xl shadow-xl overflow-hidden bg-black aspect-video border border-slate-900">
              <iframe className="w-full h-full" src={activeLesson.content_url} title={activeLesson.title} frameBorder="0" allowFullScreen></iframe>
            </div>
            <div className="flex justify-between items-start border-b border-slate-100 pb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{activeLesson.title}</h1>
                <p className="text-slate-500 font-medium">Video Lesson</p>
              </div>
              {!isCompleted ? (
                <button onClick={markAsComplete} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Mark as Finished</button>
              ) : (
                <span className="px-6 py-2.5 bg-emerald-50 text-emerald-600 font-bold rounded-xl border border-emerald-100 flex items-center shadow-sm">
                   <span className="mr-2">✓</span> Completed
                </span>
              )}
            </div>
          </div>
        );
      case LessonType.PDF:
        return (
          <div className={`rounded-2xl shadow-sm overflow-hidden border ${contentBg}`}>
            <div className="aspect-video bg-slate-50 flex flex-col items-center justify-center text-slate-400 space-y-6 border-b border-slate-100">
              <span className="text-8xl opacity-20">📄</span>
              <a href={`${API_BASE}${activeLesson.content_url}`} target="_blank" className="px-8 py-3 bg-white text-indigo-600 rounded-xl font-bold border border-slate-200 shadow-sm hover:shadow-md transition-all">Download PDF Resource</a>
            </div>
            <div className="p-8 flex justify-between items-center">
              <h1 className="text-2xl font-bold">{activeLesson.title}</h1>
              {!isCompleted && <button onClick={markAsComplete} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Mark as Finished</button>}
            </div>
          </div>
        );
      case LessonType.QUIZ:
        return <QuizView lessonId={activeLesson.id} onComplete={() => fetchData()} existingSubmission={(activeLesson as any).Submissions?.[0]} />;
      case LessonType.ASSIGNMENT:
        let isAccessDenied = false;
        if (activeLesson.target_students && userRole === UserRole.STUDENT) {
            try {
                const targets = JSON.parse(activeLesson.target_students);
                if (Array.isArray(targets) && targets.length > 0 && currentUserId && !targets.includes(currentUserId)) {
                    isAccessDenied = true;
                }
            } catch (e) { console.error(e); }
        }

        return (
          <div className={`rounded-2xl shadow-sm border p-10 ${contentBg}`}>
            <h1 className="text-3xl font-bold mb-4">{activeLesson.title}</h1>
            <div className="prose prose-slate max-w-none mb-10 text-slate-600">
               <p>{activeLesson.content_url || "Submit your project or assignment files here for instructor review."}</p>
            </div>

            {userRole === UserRole.TEACHER ? (
              <div>
                <button 
                  onClick={() => { setView('assignment-admin'); fetchSubmissions(activeLesson.id); }}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  View All Submissions
                </button>
              </div>
            ) : isAccessDenied ? (
              <div className="p-8 bg-slate-50 text-slate-500 font-medium rounded-xl border border-slate-200 text-center">
                  🔒 This assignment is restricted to specific students.
              </div>
            ) : mySubmission ? (
              <div className="p-8 rounded-2xl border bg-slate-50 border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</span>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${mySubmission.grade !== null ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                    {mySubmission.grade !== null ? `Graded: ${mySubmission.grade}/100` : 'Pending Review'}
                  </span>
                </div>
                <div className="mb-6">
                  <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Submitted File</p>
                  <a href={`${API_BASE}${mySubmission.file_path}`} target="_blank" className="text-indigo-600 font-bold hover:underline flex items-center">
                    <span className="mr-2">📄</span> Download Submission
                  </a>
                </div>
                {mySubmission.feedback && (
                  <div className="bg-white p-6 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Instructor Feedback</p>
                    <p className="text-slate-700 italic">"{mySubmission.feedback}"</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {settings.ENABLE_STUDENT_UPLOADS ? (
                  <>
                    <div className="border-2 border-dashed rounded-2xl p-12 text-center border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group">
                      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" id="assignment-upload" />
                      <label htmlFor="assignment-upload" className="cursor-pointer block">
                        <span className="text-5xl block mb-6 opacity-30 group-hover:opacity-100 transition-opacity">📤</span>
                        <span className="font-bold block text-lg text-slate-700 group-hover:text-indigo-600">{file ? file.name : 'Click to select file'}</span>
                        <span className="text-sm text-slate-400 mt-2 block">Supported formats: PDF, DOCX, ZIP</span>
                      </label>
                    </div>
                    {file && (
                      <button onClick={handleFileUpload} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">
                        Submit Assignment
                      </button>
                    )}
                  </>
                ) : (
                  <div className="p-6 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 font-bold text-center">
                     File uploads are currently disabled by the system administrator.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      default: return null;
    }
  };

  const renderDiscussions = () => {
    const cardBg = 'bg-white border-slate-200 text-slate-900';
    const inputBg = 'bg-slate-50 text-slate-900 placeholder-slate-500';

    if (activeTopic) {
      return (
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setActiveTopic(null)} className="mb-6 text-indigo-600 font-bold flex items-center text-sm uppercase tracking-wide hover:underline">&larr; Back to Topics</button>
          <div className={`rounded-2xl border shadow-sm p-8 mb-8 ${cardBg}`}>
            <h2 className="text-2xl font-bold mb-3">{activeTopic.title}</h2>
            <div className="flex items-center text-xs text-slate-500 mb-6 font-medium">
               <span className="text-indigo-600 font-bold mr-2">{activeTopic.User?.name}</span>
               <span className="mx-2">•</span>
               <span>{new Date(activeTopic.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="leading-relaxed whitespace-pre-wrap text-slate-700">{activeTopic.content}</p>
          </div>
          <div className="space-y-6 mb-12">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Replies ({activeTopic.DiscussionReplies?.length || 0})</h3>
            {activeTopic.DiscussionReplies?.map(reply => (
              <div key={reply.id} className={`rounded-xl p-6 border bg-slate-50 border-slate-200`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-bold ${reply.User?.role === UserRole.TEACHER ? 'text-indigo-600' : 'text-slate-700'}`}>
                    {reply.User?.name} {reply.User?.role === UserRole.TEACHER && ' (Instructor)'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{new Date(reply.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{reply.content}</p>
              </div>
            ))}
          </div>
          <div className={`rounded-2xl border p-6 sticky bottom-6 shadow-xl ${cardBg}`}>
             <textarea 
               className={`w-full rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-600 border-none ${inputBg}`}
               placeholder="Write a reply..."
               rows={3}
               value={newReplyContent}
               onChange={e => setNewReplyContent(e.target.value)}
             />
             <div className="mt-4 flex justify-end">
               <button onClick={handleCreateReply} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 shadow-sm">Post Reply</button>
             </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {userRole === UserRole.TEACHER && (
          <div className={`p-8 rounded-2xl border shadow-sm ${cardBg}`}>
            <h3 className="text-lg font-bold mb-6">Start New Discussion</h3>
            <form onSubmit={handleCreateTopic} className="space-y-4">
              <input 
                placeholder="Topic Title"
                className={`w-full px-5 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none ${inputBg}`}
                value={newTopicForm.title}
                onChange={e => setNewTopicForm({...newTopicForm, title: e.target.value})}
                required
              />
              <textarea 
                placeholder="Initial post content..."
                className={`w-full px-5 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none h-24 resize-none ${inputBg}`}
                value={newTopicForm.content}
                onChange={e => setNewTopicForm({...newTopicForm, content: e.target.value})}
                required
              />
              <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm">
                Create Topic
              </button>
            </form>
          </div>
        )}
        <div className="space-y-4">
           {topics.length === 0 ? (
             <div className="text-center py-16 rounded-2xl border border-slate-200 bg-slate-50">
               <p className="font-medium text-slate-500">No discussion topics created yet.</p>
             </div>
           ) : (
             topics.map(topic => (
               <button key={topic.id} onClick={() => fetchThread(topic.id)} className={`w-full p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all text-left group bg-white border-slate-200 hover:border-indigo-200`}>
                 <div className="flex justify-between items-start mb-2">
                   <h4 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{topic.title}</h4>
                   <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">{topic.reply_count} Replies</span>
                 </div>
                 <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed">{topic.content}</p>
                 <div className="text-xs text-slate-400 font-medium">
                   Started by {topic.User?.name} • {new Date(topic.createdAt).toLocaleDateString()}
                 </div>
               </button>
             ))
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)] bg-slate-50">
      {/* Clean Light Sidebar */}
      <div className="w-full lg:w-80 border-r border-slate-200 flex flex-col h-auto lg:h-[calc(100vh-80px)] sticky top-20 bg-white shadow-sm z-20">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-lg leading-tight mb-4 text-slate-900 line-clamp-2">{course.title}</h2>
          
          {/* INSTRUCTOR TOOLS */}
          {isInstructor && (
            <div className="mb-6 p-4 rounded-xl border border-indigo-100 bg-indigo-50/50">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3 text-indigo-400">Instructor Tools</p>
                <button onClick={() => window.location.hash = `#/teacher/courses/${courseId}`} className="block w-full text-left text-sm font-bold hover:text-indigo-700 mb-2 text-indigo-600 transition-colors">✏️ Edit Course</button>
                <a href={`#/gradebook/${courseId}`} className="block w-full text-left text-sm font-bold hover:text-indigo-700 text-indigo-600 transition-colors">📊 Gradebook</a>
            </div>
          )}

          <div className="flex flex-col space-y-1">
            <button onClick={() => setView('content')} className={`text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-lg transition-all text-left ${view === 'content' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Curriculum</button>
            {settings.SHOW_COURSE_ANNOUNCEMENTS && (
              <button onClick={() => { setView('announcements'); setActiveLesson(null); }} className={`text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-lg transition-all text-left ${view === 'announcements' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Announcements</button>
            )}
            <button onClick={() => { setView('discussions'); fetchTopics(); setActiveLesson(null); }} className={`text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-lg transition-all text-left ${view === 'discussions' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Discussions</button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto py-2">
          {view === 'content' && course.Lessons?.map((lesson: any, idx) => (
            <button key={lesson.id} onClick={() => { setActiveLesson(lesson); setView('content'); }} className={`w-full text-left px-6 py-4 flex items-start space-x-4 transition-all border-l-4 ${activeLesson?.id === lesson.id ? 'bg-slate-50 border-indigo-600' : 'hover:bg-slate-50 border-transparent'}`}>
              <div className="mt-0.5 flex-shrink-0 text-slate-400 text-xs font-bold w-5 pt-1 text-center">
                 {(lesson.Submissions?.length > 0 || lesson.AssignmentSubmissions?.length > 0) ? <span className="text-emerald-500 text-lg">✓</span> : idx + 1}
              </div>
              <div className="flex-grow">
                <p className={`text-sm font-bold leading-tight mb-1 ${activeLesson?.id === lesson.id ? 'text-indigo-600' : 'text-slate-700'}`}>{lesson.title}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{lesson.type}</p>
              </div>
            </button>
          ))}
          {(!course.Lessons || course.Lessons.length === 0) && view === 'content' && (
             <div className="p-8 text-center text-slate-400 text-xs italic">
                {course.is_enrolled || isInstructor ? "No lessons released yet." : "Enroll to view curriculum."}
             </div>
          )}
        </div>
      </div>

      {/* Main View */}
      <div className="flex-grow p-6 lg:p-12 overflow-y-auto relative bg-slate-50">
        <div className="max-w-5xl mx-auto bg-white min-h-[80vh] rounded-3xl shadow-sm border border-slate-200 p-8 lg:p-12">
          {view === 'announcements' ? (
            <AnnouncementsTab courseId={course.id} userRole={userRole} />
          ) : view === 'discussions' ? (
            renderDiscussions()
          ) : view === 'assignment-admin' ? (
            // Assignment Admin Render Logic (Updated Table Style)
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Assignment Submissions</h2>
                <button onClick={() => setView('content')} className="text-indigo-600 font-bold text-sm hover:underline">Return to Lesson</button>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Student</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">File</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Grade</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {submissions.map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{sub.User?.name}</td>
                      <td className="px-6 py-4">
                        <a href={`${API_BASE}${sub.file_path}`} target="_blank" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wide">Download</a>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">{sub.grade !== null ? `${sub.grade}%` : '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setGrading({ id: sub.id, grade: sub.grade?.toString() || '', feedback: sub.feedback || '' })} className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-50 transition-colors">Grade</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {grading && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="rounded-2xl p-8 max-w-md w-full shadow-2xl bg-white">
                    <h3 className="text-xl font-bold mb-6 text-slate-900">Grade Submission</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Score (0-100)</label>
                        <input type="number" value={grading.grade} onChange={e => setGrading({...grading, grade: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Feedback</label>
                        <textarea value={grading.feedback} onChange={e => setGrading({...grading, feedback: e.target.value})} className="w-full p-3 rounded-xl h-32 bg-slate-50 border border-slate-200 text-slate-900 resize-none focus:ring-2 focus:ring-indigo-600 outline-none" />
                      </div>
                      <div className="flex space-x-3 mt-6">
                        <button onClick={() => setGrading(null)} className="flex-grow py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">Cancel</button>
                        <button onClick={handleGradeSubmit} className="flex-grow py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700">Save</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeLesson ? (
            renderActiveContent()
          ) : (
            <div className="text-center py-24">
               <div className="text-6xl mb-6 opacity-20">🎓</div>
               <h2 className="text-3xl font-black mb-4 text-slate-900">{course.title}</h2>
               
               {isInstructor ? (
                 <p className="text-slate-500 max-w-md mx-auto mb-8">Welcome, Instructor. Use the sidebar to manage content or preview the course.</p>
               ) : course.is_enrolled ? (
                 <p className="text-slate-500 max-w-md mx-auto mb-8">Select a lesson from the sidebar to begin.</p>
               ) : (
                 <>
                   <p className="text-slate-500 max-w-md mx-auto mb-8">You are not enrolled in this course. Join now to access the full curriculum and assignments.</p>
                   <button onClick={handleEnroll} className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-95">
                     Enroll Now
                   </button>
                 </>
               )}
            </div>
          )}
        </div>
      </div>

      {/* FEEDBACK MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-bounce-in">
            <div className="bg-indigo-600 p-8 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-3xl font-black text-white mb-2">Course Completed!</h2>
              <p className="text-indigo-200">You've mastered {course.title}</p>
            </div>
            <form onSubmit={handleSubmitFeedback} className="p-8">
              <p className="text-center text-slate-600 mb-6 font-medium">How would you rate your experience?</p>
              
              <div className="flex justify-center space-x-2 mb-8">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    className={`text-4xl transition-transform hover:scale-110 ${star <= feedbackRating ? 'text-yellow-400' : 'text-slate-200'}`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Comments (Optional)</label>
                <textarea 
                  className="w-full p-4 bg-slate-50 border-none rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                  placeholder="What did you like? What can be improved?"
                  value={feedbackComment}
                  onChange={e => setFeedbackComment(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                disabled={feedbackSubmitting}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
              <button 
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="w-full py-3 mt-2 text-slate-400 font-bold hover:text-slate-600 text-sm"
              >
                Skip for now
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursePlayer;
