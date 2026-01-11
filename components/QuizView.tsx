
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Question } from '../types';

interface QuizViewProps {
  lessonId: number;
  onComplete: (score: number) => void;
  existingSubmission?: { score: number };
}

export const QuizView: React.FC<QuizViewProps> = ({ lessonId, onComplete, existingSubmission }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; correct: number } | null>(
    existingSubmission ? { score: existingSubmission.score, total: 0, correct: 0 } : null
  );

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await api.get(`/lessons/${lessonId}/quiz`);
        setQuestions(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [lessonId]);

  const handleOptionChange = (questionId: number, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      alert("Please answer all questions before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/lessons/${lessonId}/submit`, { answers });
      setResult({
        score: res.data.score,
        total: res.data.totalQuestions,
        correct: res.data.correctCount
      });
      onComplete(res.data.score);
    } catch (err) {
      alert("Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center p-10">Loading Quiz Questions...</div>;

  if (result) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-10 rounded-3xl shadow-lg border border-slate-100 text-center">
        <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-3xl mb-6 ${
          result.score >= 80 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
        }`}>
          {result.score >= 80 ? '🏆' : '📝'}
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Quiz Completed!</h2>
        <p className="text-slate-500 mb-8">You achieved a score of</p>
        <div className="text-6xl font-black text-indigo-600 mb-8">{result.score}%</div>
        
        {result.total > 0 && (
          <p className="text-sm font-medium text-slate-400 mb-8 uppercase tracking-widest">
            {result.correct} out of {result.total} correct
          </p>
        )}

        <button 
          onClick={() => setResult(null)}
          className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
        >
          Retake Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-100 mb-12">
        <h2 className="text-2xl font-bold">Knowledge Check</h2>
        <p className="opacity-80">Test your understanding of the material. All questions are required.</p>
      </div>

      {questions.map((q, idx) => (
        <div key={q.id} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start space-x-4">
            <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0">
              {idx + 1}
            </span>
            <div className="flex-grow">
              <p className="text-lg font-semibold text-slate-900 mb-6">{q.question_text}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {q.options.map((opt) => (
                  <label 
                    key={opt}
                    className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      answers[q.id] === opt 
                        ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200' 
                        : 'border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name={`q-${q.id}`} 
                      className="hidden"
                      checked={answers[q.id] === opt}
                      onChange={() => handleOptionChange(q.id, opt)}
                    />
                    <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                      answers[q.id] === opt ? 'border-indigo-600' : 'border-slate-300'
                    }`}>
                      {answers[q.id] === opt && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                    </div>
                    <span className={`font-medium ${answers[q.id] === opt ? 'text-indigo-900' : 'text-slate-600'}`}>
                      {opt}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="sticky bottom-8 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl flex justify-center">
        <button 
          onClick={handleSubmit}
          disabled={submitting}
          className="px-12 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-95"
        >
          {submitting ? 'Evaluating...' : 'Submit Final Answers'}
        </button>
      </div>
    </div>
  );
};
