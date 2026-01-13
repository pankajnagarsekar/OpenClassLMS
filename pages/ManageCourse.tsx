
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { Lesson, LessonType, User } from '../types';

interface ManageCourseProps {
  courseId?: string; // If present, we are editing
}

interface QuizQuestion {
  text: string;
  options: [string, string, string, string];
  correctAnswer: string;
}

const ManageCourse: React.FC<ManageCourseProps> = ({ courseId }) => {
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    video_embed_url: '',
    access_days: 365
  });
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(!!courseId);
  const [saving, setSaving] = useState(false);
  
  // Lesson Form State
  const [lessonForm, setLessonForm] = useState({
    title: '',
    type: LessonType.VIDEO,
    content: '',
    file: null as File | null
  });
  const [addingLesson, setAddingLesson] = useState(false);

  // Assignment Scoping State
  const [assignmentScope, setAssignmentScope] = useState<'all' | 'specific'>('all');
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  // Quiz Builder State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion>({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: ''
  });

  const fetchCourse = async () => {
    try {
      const res = await api.get(`/courses/${courseId}`);
      setFormData({
        title: res.data.title,
        description: res.data.description,
        thumbnail_url: res.data.thumbnail_url,
        video_embed_url: res.data.video_embed_url,
        access_days: res.data.access_days
      });
      if (res.data.Lessons) {
        setLessons(res.data.Lessons);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseStudents = async () => {
    if (!courseId) return;
    try {
      const res = await api.get(`/courses/${courseId}/students`);
      setStudents(res.data);
    } catch (err) {
      console.error("Failed to load students for scoping", err);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  // Fetch students when assignment type is selected
  useEffect(() => {
    if (lessonForm.type === LessonType.ASSIGNMENT && courseId) {
      fetchCourseStudents();
    }
  }, [lessonForm.type, courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (courseId) {
        await api.put(`/courses/${courseId}`, formData);
        alert('Course updated successfully!');
      } else {
        await api.post('/courses', formData);
        alert('Course created successfully!');
        window.location.hash = '#/teacher-dashboard';
      }
    } catch (err) {
      alert('Failed to save course.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = () => {
    if (!currentQuestion.text || currentQuestion.options.some(opt => !opt) || !currentQuestion.correctAnswer) {
      alert("Please fill out all question fields and select a correct answer.");
      return;
    }
    setQuizQuestions([...quizQuestions, currentQuestion]);
    setCurrentQuestion({
      text: '',
      options: ['', '', '', ''],
      correctAnswer: ''
    });
  };

  const removeQuestion = (index: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    
    if (lessonForm.type === LessonType.QUIZ && quizQuestions.length === 0) {
      alert("Please add at least one question to the quiz.");
      return;
    }

    setAddingLesson(true);

    const data = new FormData();
    data.append('title', lessonForm.title);
    data.append('type', lessonForm.type);
    data.append('position', (lessons.length + 1).toString());

    if (lessonForm.type === LessonType.PDF && lessonForm.file) {
      data.append('file', lessonForm.file);
    } else if (lessonForm.type === LessonType.QUIZ) {
      data.append('questions', JSON.stringify(quizQuestions));
    } else {
      data.append('content', lessonForm.content);
    }

    // Handle Scoping for Assignments
    if (lessonForm.type === LessonType.ASSIGNMENT && assignmentScope === 'specific') {
      data.append('target_students', JSON.stringify(selectedStudentIds));
    }

    try {
      await api.post(`/courses/${courseId}/lessons`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Reset form and refresh list
      setLessonForm({ title: '', type: LessonType.VIDEO, content: '', file: null });
      setQuizQuestions([]);
      setAssignmentScope('all');
      setSelectedStudentIds([]);
      fetchCourse();
    } catch (err) {
      alert('Failed to add lesson.');
    } finally {
      setAddingLesson(false);
    }
  };

  const toggleStudentSelection = (studentId: number) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse">Loading Course Details...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10">
        <a href="#/teacher-dashboard" className="text-indigo-600 font-bold mb-2 inline-block hover:underline">&larr; Back to Dashboard</a>
        <h1 className={`text-4xl font-black tracking-tight ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>
          {courseId ? 'Edit Course' : 'Create New Course'}
        </h1>
      </div>

      <div className={`p-8 rounded-3xl shadow-lg border mb-12 ${settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <h2 className={`text-2xl font-bold mb-6 ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>Course Details</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-bold mb-2 ${settings.ENABLE_DARK_MODE ? 'text-slate-300' : 'text-slate-700'}`}>Course Title</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${settings.ENABLE_DARK_MODE ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              placeholder="e.g. Advanced React Patterns"
            />
          </div>

          <div>
            <label className={`block text-sm font-bold mb-2 ${settings.ENABLE_DARK_MODE ? 'text-slate-300' : 'text-slate-700'}`}>Description</label>
            <textarea 
              rows={4}
              required
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${settings.ENABLE_DARK_MODE ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              placeholder="What will students learn in this course?"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
              <label className={`block text-sm font-bold mb-2 ${settings.ENABLE_DARK_MODE ? 'text-slate-300' : 'text-slate-700'}`}>Thumbnail URL</label>
              <input 
                type="text" 
                value={formData.thumbnail_url}
                onChange={e => setFormData({...formData, thumbnail_url: e.target.value})}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${settings.ENABLE_DARK_MODE ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                placeholder="https://..."
              />
            </div>
             <div>
              <label className={`block text-sm font-bold mb-2 ${settings.ENABLE_DARK_MODE ? 'text-slate-300' : 'text-slate-700'}`}>Intro Video Embed URL</label>
              <input 
                type="text" 
                value={formData.video_embed_url}
                onChange={e => setFormData({...formData, video_embed_url: e.target.value})}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${settings.ENABLE_DARK_MODE ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                placeholder="https://www.youtube.com/embed/..."
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-bold mb-2 ${settings.ENABLE_DARK_MODE ? 'text-slate-300' : 'text-slate-700'}`}>Access Duration (Days)</label>
            <input 
              type="number" 
              required
              value={formData.access_days}
              onChange={e => setFormData({...formData, access_days: parseInt(e.target.value)})}
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${settings.ENABLE_DARK_MODE ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
            />
          </div>

          <button 
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Saving...' : (courseId ? 'Update Course Details' : 'Create Course')}
          </button>
        </form>
      </div>

      {/* Curriculum Management Section */}
      {courseId && (
        <div className={`p-8 rounded-3xl shadow-lg border ${settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <h2 className={`text-2xl font-bold mb-6 ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>Curriculum</h2>
          
          <div className="space-y-4 mb-10">
             {lessons.length === 0 ? (
               <p className="text-slate-400 italic">No lessons added yet.</p>
             ) : (
               lessons.map((lesson, idx) => (
                 <div key={lesson.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center space-x-4">
                       <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">{idx + 1}</span>
                       <div>
                          <p className="font-bold text-slate-900">{lesson.title}</p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{lesson.type}</p>
                       </div>
                    </div>
                 </div>
               ))
             )}
          </div>

          <div className="border-t border-slate-100 pt-8">
            <h3 className={`text-lg font-bold mb-4 ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>Add New Lesson</h3>
            <form onSubmit={handleAddLesson} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lesson Title</label>
                   <input 
                      type="text" 
                      required 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200"
                      value={lessonForm.title}
                      onChange={e => setLessonForm({...lessonForm, title: e.target.value})}
                      placeholder="Introduction to..."
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Type</label>
                   <select 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                      value={lessonForm.type}
                      onChange={e => setLessonForm({...lessonForm, type: e.target.value as LessonType})}
                   >
                     <option value={LessonType.VIDEO}>Video</option>
                     <option value={LessonType.PDF}>Document (PDF/Word)</option>
                     <option value={LessonType.TEXT}>Text / Article</option>
                     <option value={LessonType.QUIZ}>Quiz</option>
                     <option value={LessonType.ASSIGNMENT}>Assignment</option>
                   </select>
                </div>
              </div>

              {/* Dynamic Content Inputs */}
              <div>
                 {lessonForm.type === LessonType.VIDEO && (
                    <>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Video Embed URL</label>
                      <input 
                        type="text" 
                        required 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200"
                        value={lessonForm.content}
                        onChange={e => setLessonForm({...lessonForm, content: e.target.value})}
                        placeholder="https://www.youtube.com/embed/..."
                      />
                    </>
                 )}

                 {lessonForm.type === LessonType.PDF && (
                    <>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Upload Document</label>
                      <input 
                        type="file" 
                        required 
                        accept=".pdf,.doc,.docx"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                        onChange={e => setLessonForm({...lessonForm, file: e.target.files?.[0] || null})}
                      />
                    </>
                 )}

                 {lessonForm.type === LessonType.TEXT && (
                    <>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lesson Content</label>
                      <textarea 
                        required 
                        rows={6}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200"
                        value={lessonForm.content}
                        onChange={e => setLessonForm({...lessonForm, content: e.target.value})}
                        placeholder="Write your article or reading material here..."
                      />
                    </>
                 )}

                 {lessonForm.type === LessonType.ASSIGNMENT && (
                    <>
                      <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assignment Scope</label>
                        <div className="flex space-x-4">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="scope" 
                              checked={assignmentScope === 'all'} 
                              onChange={() => setAssignmentScope('all')}
                              className="w-4 h-4 text-indigo-600"
                            />
                            <span className="text-sm font-medium">Assign to All Students</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="scope" 
                              checked={assignmentScope === 'specific'} 
                              onChange={() => setAssignmentScope('specific')}
                              className="w-4 h-4 text-indigo-600"
                            />
                            <span className="text-sm font-medium">Assign to Specific Students</span>
                          </label>
                        </div>

                        {assignmentScope === 'specific' && (
                          <div className="mt-4 p-4 border rounded-xl bg-slate-50 max-h-48 overflow-y-auto">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Select Students</p>
                            {students.length === 0 ? (
                                <p className="text-sm italic text-slate-400">No students enrolled yet.</p>
                            ) : (
                                students.map(student => (
                                  <label key={student.id} className="flex items-center space-x-3 mb-2 cursor-pointer hover:bg-slate-100 p-2 rounded-lg">
                                    <input 
                                      type="checkbox" 
                                      checked={selectedStudentIds.includes(student.id)}
                                      onChange={() => toggleStudentSelection(student.id)}
                                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div>
                                      <p className="text-sm font-bold text-slate-800">{student.name}</p>
                                      <p className="text-xs text-slate-500">{student.email}</p>
                                    </div>
                                  </label>
                                ))
                            )}
                          </div>
                        )}
                      </div>

                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assignment Instructions</label>
                      <textarea 
                        required 
                        rows={6}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200"
                        value={lessonForm.content}
                        onChange={e => setLessonForm({...lessonForm, content: e.target.value})}
                        placeholder="Describe the project requirements..."
                      />
                    </>
                 )}

                 {lessonForm.type === LessonType.QUIZ && (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <h4 className="font-bold text-slate-900 mb-4">Quiz Builder</h4>
                      
                      <div className="space-y-4 mb-6">
                        <input 
                          type="text" 
                          placeholder="Question Text"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200"
                          value={currentQuestion.text}
                          onChange={e => setCurrentQuestion({...currentQuestion, text: e.target.value})}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          {currentQuestion.options.map((opt, idx) => (
                            <div key={idx} className="flex items-center space-x-2">
                              <input 
                                type="radio" 
                                name="correctAnswer" 
                                checked={currentQuestion.correctAnswer === opt && opt !== ''}
                                onChange={() => setCurrentQuestion({...currentQuestion, correctAnswer: opt})}
                                className="w-4 h-4 text-indigo-600"
                              />
                              <input 
                                type="text"
                                placeholder={`Option ${idx + 1}`}
                                className="flex-grow px-3 py-2 rounded-lg border border-slate-200 text-sm"
                                value={opt}
                                onChange={e => {
                                  const newOptions = [...currentQuestion.options] as [string, string, string, string];
                                  newOptions[idx] = e.target.value;
                                  // If this was the correct answer, update that too
                                  const newCorrect = currentQuestion.correctAnswer === opt ? e.target.value : currentQuestion.correctAnswer;
                                  setCurrentQuestion({...currentQuestion, options: newOptions, correctAnswer: newCorrect});
                                }}
                              />
                            </div>
                          ))}
                        </div>
                        
                        <button 
                          type="button" 
                          onClick={handleAddQuestion}
                          className="w-full py-2 bg-indigo-100 text-indigo-700 font-bold rounded-lg hover:bg-indigo-200 text-sm"
                        >
                          Add Question
                        </button>
                      </div>

                      <div className="space-y-3">
                        {quizQuestions.length === 0 && <p className="text-sm text-slate-400 italic">No questions added yet.</p>}
                        {quizQuestions.map((q, idx) => (
                          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start">
                            <div>
                              <p className="font-bold text-sm text-slate-800">{idx + 1}. {q.text}</p>
                              <p className="text-xs text-green-600 font-semibold">Answer: {q.correctAnswer}</p>
                            </div>
                            <button type="button" onClick={() => removeQuestion(idx)} className="text-red-500 text-xs font-bold hover:underline">Remove</button>
                          </div>
                        ))}
                      </div>
                    </div>
                 )}
              </div>

              <button 
                type="submit" 
                disabled={addingLesson}
                className="w-full py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors"
              >
                 {addingLesson ? 'Adding Lesson...' : '+ Add to Curriculum'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCourse;
