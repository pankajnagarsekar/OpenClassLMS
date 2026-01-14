
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Course, Lesson, LessonType, UserRole, AssignmentSubmission, DiscussionTopic, DiscussionReply } from '../types';
import { QuizView } from '../components/QuizView';
import { AnnouncementsTab } from '../components/AnnouncementsTab';
import { useSettings } from '../context/SettingsContext';

// Extend Course type for internal state
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
      if (res.data.Lessons?.length > 0 && !activeLesson) {
        setActiveLesson(res.data.Lessons[0]);
      }
      
      // Check for completion and feedback
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
      fetchData(); // Refresh to ensure backend knows feedback is submitted
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

  // Handle Assignment Upload
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

  // Handle Discussion Actions
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

  if (loading) return <div className="p-20 text-center animate-pulse">Loading Classroom...</div>;
  if (!course) return <div className="p-20 text-center text-red-500 font-bold">Course not found.</div>;

  const API_BASE = (import.meta as any).env?.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  const renderActiveContent = () => {
    if (!activeLesson) return null;
    const isCompleted = (activeLesson.Submissions && activeLesson.Submissions.length > 0) || 
                       (activeLesson.AssignmentSubmissions && activeLesson.AssignmentSubmissions.length > 0);
    const mySubmission = activeLesson.AssignmentSubmissions?.[0];

    const contentBg = settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900';

    switch (activeLesson.type) {
      case LessonType.VIDEO:
        return (
          <div className={`rounded-3xl shadow-sm overflow-hidden border ${contentBg}`}>
            <div className="aspect-video bg-slate-900">
              <iframe className="w-full h-full" src={activeLesson.content_url} title={activeLesson.title} frameBorder="0" allowFullScreen></iframe>
            </div>
            <div className="p-8 flex justify-between items-start">
              <div>
                <h1 className={`text-3xl font-bold ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>{activeLesson.title}</h1>
                <p className={settings.ENABLE_DARK_MODE ? 'text-slate-400' : 'text-slate-600'}>Video Lesson</p>
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
          <div className={`rounded-3xl shadow-sm overflow-hidden border ${contentBg}`}>
            <div className="aspect-video bg-slate-900 flex flex-col items-center justify-center text-white space-y-6">
              <span className="text-7xl">📄</span>
              <a href={`${API_BASE}${activeLesson.content_url}`} target="_blank" className="px-10 py-4 bg-white text-indigo-600 rounded-2xl font-black hover:bg-slate-100 transition-all">Download PDF</a>
            </div>
            <div className="p-8 flex justify-between">
              <h1 className="text-3xl font-bold">{activeLesson.title}</h1>
              {!isCompleted && <button onClick={markAsComplete} className="px-6 py-2 bg-green-500 text-white font-bold rounded-xl">Mark as Finished</button>}
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
            } catch (e) {
                console.error("Failed to parse assignment scope", e);
            }
        }

        return (
          <div className={`rounded-3xl shadow-sm border p-10 ${contentBg}`}>
            <h1 className="text-3xl font-bold mb-4">{activeLesson.title}</h1>
            <p className={`${settings.ENABLE_DARK_MODE ? 'text-slate-400' : 'text-slate-500'} mb-10`}>Submit your project or assignment files here for instructor review.</p>

            {userRole === UserRole.TEACHER ? (
              <div>
                <button 
                  onClick={() => { setView('assignment-admin'); fetchSubmissions(activeLesson.id); }}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                >
                  View All Submissions
                </button>
              </div>
            ) : isAccessDenied ? (
              <div className="p-8 bg-slate-100 text-slate-500 font-medium rounded-xl border border-slate-200 text-center">
                  🔒 This assignment is not assigned to you.
              </div>
            ) : mySubmission ? (
              <div className={`p-8 rounded-2xl border ${settings.ENABLE_DARK_MODE ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
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
                    <p className={`${settings.ENABLE_DARK_MODE ? 'text-slate-300' : 'text-slate-700'} italic`}>"{mySubmission.feedback}"</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {settings.ENABLE_STUDENT_UPLOADS ? (
                  <>
                    <div className={`border-2 border-dashed rounded-2xl p-10 text-center ${settings.ENABLE_DARK_MODE ? 'border-slate-600' : 'border-slate-200'}`}>
                      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" id="assignment-upload" />
                      <label htmlFor="assignment-upload" className="cursor-pointer">
                        <span className="text-4xl block mb-4">📤</span>
                        <span className={`font-bold block ${settings.ENABLE_DARK_MODE ? 'text-slate-300' : 'text-slate-600'}`}>{file ? file.name : 'Select file to upload'}</span>
                        <span className="text-xs text-slate-400 mt-2 block">PDF, Word, or ZIP accepted</span>
                      </label>
                    </div>
                    {file && (
                      <button onClick={handleFileUpload} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all">
                        Submit Assignment
                      </button>
                    )}
                  </>
                ) : (
                  <div className="p-6 bg-orange-50 text-orange-700 rounded-xl border border-orange-100 font-bold text-center">
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
    // ... (Discussion render code same as previous) ...
    // Shortened for brevity, assumes identical content as previously generated
    const cardBg = settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900';
    const inputBg = settings.ENABLE_DARK_MODE ? 'bg-slate-700 text-white placeholder-slate-400' : 'bg-slate-50 text-slate-900 placeholder-slate-500';

    if (activeTopic) {
      return (
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setActiveTopic(null)} className="mb-6 text-indigo-600 font-bold flex items-center">&larr; Back to Topics</button>
          <div className={`rounded-3xl border shadow-sm p-8 mb-8 ${cardBg}`}>
            <h2 className="text-2xl font-black mb-2">{activeTopic.title}</h2>
            <div className="flex items-center text-xs text-slate-400 mb-6">
               <span className="font-bold text-indigo-600 mr-2">{activeTopic.User?.name}</span>
               <span>• {new Date(activeTopic.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="leading-relaxed whitespace-pre-wrap">{activeTopic.content}</p>
          </div>
          <div className="space-y-6 mb-12">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Replies ({activeTopic.DiscussionReplies?.length || 0})</h3>
            {activeTopic.DiscussionReplies?.map(reply => (
              <div key={reply.id} className={`rounded-2xl p-6 border ${settings.ENABLE_DARK_MODE ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold ${reply.User?.role === UserRole.TEACHER ? 'text-indigo-600' : (settings.ENABLE_DARK_MODE ? 'text-slate-300' : 'text-slate-700')}`}>
                    {reply.User?.name} {reply.User?.role === UserRole.TEACHER && ' (Instructor)'}
                  </span>
                  <span className="text-[10px] text-slate-400">{new Date(reply.createdAt).toLocaleDateString()}</span>
                </div>
                <p className={`text-sm ${settings.ENABLE_DARK_MODE ? 'text-slate-200' : 'text-slate-600'}`}>{reply.content}</p>
              </div>
            ))}
          </div>
          <div className={`rounded-3xl border p-6 sticky bottom-6 shadow-xl ${cardBg}`}>
             <textarea 
               className={`w-full rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-600 border-none ${inputBg}`}
               placeholder="Write a reply..."
               rows={3}
               value={newReplyContent}
               onChange={e => setNewReplyContent(e.target.value)}
             />
             <div className="mt-4 flex justify-end">
               <button onClick={handleCreateReply} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700">Post Reply</button>
             </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {userRole === UserRole.TEACHER && (
          <div className={`p-8 rounded-3xl border shadow-sm ${cardBg}`}>
            <h3 className="text-xl font-black mb-6">Start New Discussion</h3>
            <form onSubmit={handleCreateTopic} className="space-y-4">
              <input 
                placeholder="Topic Title"
                className={`w-full px-5 py-3 border-none rounded-xl focus:ring-2 focus:ring-indigo-600 ${inputBg}`}
                value={newTopicForm.title}
                onChange={e => setNewTopicForm({...newTopicForm, title: e.target.value})}
                required
              />
              <textarea 
                placeholder="Initial post content..."
                className={`w-full px-5 py-3 border-none rounded-xl focus:ring-2 focus:ring-indigo-600 h-24 ${inputBg}`}
                value={newTopicForm.content}
                onChange={e => setNewTopicForm({...newTopicForm, content: e.target.value})}
                required
              />
              <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all">
                Create Topic
              </button>
            </form>
          </div>
        )}
        <div className="space-y-4">
           {topics.length === 0 ? (
             <div className={`text-center py-20 rounded-3xl border-2 border-dashed ${settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-100/50 border-slate-300 text-slate-500'}`}>
               <p className="font-medium">No discussion topics created yet.</p>
             </div>
           ) : (
             topics.map(topic => (
               <button key={topic.id} onClick={() => fetchThread(topic.id)} className={`w-full p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all text-left group ${cardBg}`}>
                 <div className="flex justify-between items-start mb-2">
                   <h4 className="text-lg font-bold group-hover:text-indigo-600 transition-colors">{topic.title}</h4>
                   <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-bold">{topic.reply_count} Replies</span>
                 </div>
                 <p className="text-slate-500 text-sm line-clamp-2 mb-4">{topic.content}</p>
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
    <div className={`flex flex-col lg:flex-row min-h-[calc(100vh-80px)] ${settings.ENABLE_DARK_MODE ? 'bg-slate-900 text-slate-100' : 'bg-slate-50'}`}>
      {/* Sidebar */}
      <div className={`w-full lg:w-96 border-r flex flex-col h-auto lg:h-[calc(100vh-80px)] sticky top-20 ${settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`p-8 border-b ${settings.ENABLE_DARK_MODE ? 'border-slate-700' : 'border-slate-100'}`}>
          <h2 className={`font-black text-xl leading-tight mb-2 ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>{course.title}</h2>
          <div className="flex flex-col space-y-3 mt-4">
            <button onClick={() => setView('content')} className={`text-xs font-black uppercase tracking-widest py-2 px-4 rounded-lg transition-all ${view === 'content' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-indigo-50/10'}`}>Curriculum</button>
            {settings.SHOW_COURSE_ANNOUNCEMENTS && (
              <button onClick={() => { setView('announcements'); setActiveLesson(null); }} className={`text-xs font-black uppercase tracking-widest py-2 px-4 rounded-lg transition-all ${view === 'announcements' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-indigo-50/10'}`}>Announcements</button>
            )}
            <button onClick={() => { setView('discussions'); fetchTopics(); setActiveLesson(null); }} className={`text-xs font-black uppercase tracking-widest py-2 px-4 rounded-lg transition-all ${view === 'discussions' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-indigo-50/10'}`}>Discussions</button>
            {(userRole === UserRole.TEACHER || userRole === UserRole.ADMIN) && <a href={`#/gradebook/${courseId}`} className="text-xs font-black uppercase tracking-widest py-2 px-4 rounded-lg text-emerald-600 hover:bg-emerald-50 text-center border border-emerald-100">Gradebook</a>}
          </div>
        </div>

        <div className="flex-grow overflow-y-auto">
          {view === 'content' && course.Lessons?.map((lesson: any) => (
            <button key={lesson.id} onClick={() => { setActiveLesson(lesson); setView('content'); }} className={`w-full text-left px-8 py-5 flex items-start space-x-4 transition-all ${activeLesson?.id === lesson.id ? 'bg-indigo-50/50 border-r-4 border-indigo-600' : 'hover:bg-slate-50/10 border-r-4 border-transparent'}`}>
              <div className="mt-1 flex-shrink-0">{(lesson.Submissions?.length > 0 || lesson.AssignmentSubmissions?.length > 0) ? '✅' : '▶️'}</div>
              <div className="flex-grow">
                <p className={`text-sm font-black ${activeLesson?.id === lesson.id ? 'text-indigo-600' : 'text-slate-500'}`}>{lesson.title}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{lesson.type}</p>
              </div>
            </button>
          ))}
          {(!course.Lessons || course.Lessons.length === 0) && view === 'content' && (
             <div className="p-8 text-center text-slate-400 text-xs italic">
                {course.is_enrolled ? "No lessons released yet." : "Enroll to view curriculum."}
             </div>
          )}
        </div>
      </div>

      {/* Main View */}
      <div className="flex-grow p-6 lg:p-12 overflow-y-auto relative">
        <div className="max-w-6xl mx-auto">
          {view === 'announcements' ? (
            <AnnouncementsTab courseId={course.id} userRole={userRole} />
          ) : view === 'discussions' ? (
            renderDiscussions()
          ) : view === 'assignment-admin' ? (
            // Assignment Admin Render Logic (abbreviated, same as before)
            <div className={`rounded-3xl border shadow-sm overflow-hidden ${settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className={`p-8 border-b flex justify-between items-center ${settings.ENABLE_DARK_MODE ? 'border-slate-700' : 'border-slate-50'}`}>
                <h2 className={`text-2xl font-black ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>Assignment Submissions</h2>
                <button onClick={() => setView('content')} className="text-indigo-600 font-bold text-sm">Back to Class</button>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className={`text-[10px] font-black text-slate-400 uppercase tracking-widest border-b ${settings.ENABLE_DARK_MODE ? 'border-slate-700' : 'border-slate-50'}`}>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Submitted File</th>
                    <th className="px-6 py-4">Grade</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${settings.ENABLE_DARK_MODE ? 'divide-slate-700' : 'divide-slate-50'}`}>
                  {submissions.map(sub => (
                    <tr key={sub.id} className={`transition-colors ${settings.ENABLE_DARK_MODE ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                      <td className="px-6 py-4">
                        <p className={`text-sm font-bold ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>{sub.User?.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <a href={`${API_BASE}${sub.file_path}`} target="_blank" className="text-xs font-bold text-indigo-600 hover:underline">Download</a>
                      </td>
                      <td className={`px-6 py-4 font-black ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>{sub.grade !== null ? `${sub.grade}%` : '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setGrading({ id: sub.id, grade: sub.grade?.toString() || '', feedback: sub.feedback || '' })} className="px-4 py-1.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-lg">Grade</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {grading && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className={`rounded-3xl p-8 max-w-md w-full shadow-2xl ${settings.ENABLE_DARK_MODE ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                    <h3 className="text-xl font-black mb-6">Grade Submission</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Score</label>
                        <input type="number" value={grading.grade} onChange={e => setGrading({...grading, grade: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 text-slate-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Feedback</label>
                        <textarea value={grading.feedback} onChange={e => setGrading({...grading, feedback: e.target.value})} className="w-full p-3 rounded-xl h-24 bg-slate-50 text-slate-900" />
                      </div>
                      <div className="flex space-x-3 mt-6">
                        <button onClick={() => setGrading(null)} className="flex-grow py-3 bg-slate-100 text-slate-600 font-bold rounded-xl">Cancel</button>
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
            <div className={`text-center py-20 rounded-3xl border border-dashed ${settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
               <div className="text-6xl mb-6">🎓</div>
               <h2 className={`text-3xl font-black mb-4 ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>{course.title}</h2>
               <p className="text-slate-500 max-w-md mx-auto mb-8">
                  {course.is_enrolled ? "Select a lesson from the sidebar to begin." : "You are not enrolled in this course. Join now to access the full curriculum and assignments."}
               </p>
               {!course.is_enrolled && userRole !== UserRole.TEACHER && userRole !== UserRole.ADMIN && (
                 <button onClick={handleEnroll} className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-95">
                   Enroll Now
                 </button>
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
