
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { GradebookData } from '../types';

const TeacherGradebook: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [data, setData] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const res = await api.get(`/courses/${courseId}/gradebook`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, [courseId]);

  if (loading) return <div className="p-20 text-center animate-pulse">Fetching records...</div>;
  if (!data) return <div className="p-20 text-center text-red-500">Failed to load gradebook.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10 flex justify-between items-end">
        <div>
          <button onClick={() => window.location.hash = `#/course/${courseId}`} className="text-indigo-600 font-bold mb-4 flex items-center">
            &larr; Back to Class
          </button>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Gradebook</h1>
          <p className="text-slate-500 mt-2">Comprehensive performance tracking for all enrolled students.</p>
        </div>
        <button onClick={() => window.print()} className="px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 print:hidden">
          Export to PDF
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-5 border-b border-slate-200 text-xs font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-10">
                  Student Details
                </th>
                {data.columns.map(col => (
                  <th key={col.id} className="px-6 py-5 border-b border-slate-200 text-xs font-black text-slate-400 uppercase tracking-widest text-center min-w-[150px]">
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5 sticky left-0 bg-white/80 backdrop-blur-sm z-10 group-hover:bg-slate-50">
                    <p className="font-bold text-slate-900">{row.student_name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{row.student_email}</p>
                  </td>
                  {data.columns.map(col => (
                    <td key={col.id} className="px-6 py-5 text-center">
                      {row.grades[col.id] !== undefined ? (
                        <span className={`font-black text-sm ${row.grades[col.id] >= 80 ? 'text-green-600' : 'text-slate-700'}`}>
                          {row.grades[col.id]}%
                        </span>
                      ) : (
                        <span className="text-slate-300 font-medium">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {data.rows.length === 0 && (
        <div className="text-center py-20 bg-white mt-8 rounded-3xl border border-slate-200">
          <p className="text-slate-400">No students enrolled in this course yet.</p>
        </div>
      )}
    </div>
  );
};

export default TeacherGradebook;
