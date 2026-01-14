
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { GradebookData } from '../types';
import { useSettings } from '../context/SettingsContext';

const TeacherGradebook: React.FC<{ courseId: string }> = ({ courseId }) => {
  const { settings } = useSettings();
  const [data, setData] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Note Modal State
  const [noteModal, setNoteModal] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    fetchGrades();
  }, [courseId]);

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

  const handleToggleStatus = async (enrollmentId: number) => {
    try {
      await api.put(`/enrollments/${enrollmentId}/toggle`);
      if (data) {
        setData({
          ...data,
          rows: data.rows.map(row => 
            row.enrollment_id === enrollmentId ? { ...row, is_active: !row.is_active } : row
          )
        });
      }
    } catch (err) {
      alert("Failed to toggle status.");
    }
  };

  const handleDelete = async (enrollmentId: number) => {
    if (!confirm("Are you sure? This will remove the student from the course permanently.")) return;
    try {
      await api.delete(`/enrollments/${enrollmentId}`);
      if (data) {
        setData({ ...data, rows: data.rows.filter(row => row.enrollment_id !== enrollmentId) });
      }
    } catch (err) {
      alert("Failed to remove student.");
    }
  };

  const handleSaveNote = async () => {
    if (!noteModal) return;
    try {
      await api.put(`/enrollments/${noteModal.id}/note`, { note: noteModal.text });
      if (data) {
        setData({
          ...data,
          rows: data.rows.map(row => 
            row.enrollment_id === noteModal.id ? { ...row, teacher_notes: noteModal.text } : row
          )
        });
      }
      setNoteModal(null);
    } catch (err) {
      alert("Failed to save note.");
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400">Loading Gradebook...</div>;
  if (!data) return <div className="p-20 text-center text-red-500 font-bold">Failed to load gradebook data.</div>;

  const filteredRows = data.rows.filter(row => 
    row.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    row.student_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`min-h-screen ${settings.ENABLE_DARK_MODE ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <button onClick={() => window.location.hash = `#/course/${courseId}`} className="text-indigo-600 font-bold mb-2 flex items-center hover:underline text-sm uppercase tracking-wide">
              &larr; Return to Course
            </button>
            <h1 className={`text-3xl font-bold tracking-tight ${settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900'}`}>Gradebook</h1>
            <p className={`mt-1 ${settings.ENABLE_DARK_MODE ? 'text-slate-400' : 'text-slate-500'}`}>Monitor student progress and manage enrollments.</p>
          </div>
          
          <div className="flex space-x-3 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Search students..." 
              className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <button onClick={() => window.print()} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
              Export
            </button>
          </div>
        </div>

        <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 sticky left-0 bg-slate-50 z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">Student</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">Notes</th>
                  {data.columns.map(col => (
                    <th key={col.id} className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center min-w-[140px]">
                      {col.title}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 border-r border-transparent group-hover:border-slate-100">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{row.student_name}</p>
                        <p className="text-xs text-slate-500">{row.student_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleToggleStatus(row.enrollment_id)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all ${
                          row.is_active 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100' 
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {row.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setNoteModal({ id: row.enrollment_id, text: row.teacher_notes || '' })}
                        className={`p-2 rounded-lg transition-colors ${row.teacher_notes ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-300 hover:text-slate-500'}`}
                      >
                        <span className="text-lg">✎</span>
                      </button>
                    </td>
                    {data.columns.map(col => (
                      <td key={col.id} className="px-6 py-4 text-center">
                        {row.grades[col.id] !== undefined ? (
                          <span className={`text-sm font-bold ${row.grades[col.id] >= 80 ? 'text-emerald-600' : 'text-slate-700'}`}>
                            {row.grades[col.id]}%
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(row.enrollment_id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-2"
                        title="Remove Student"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {filteredRows.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 mt-4 shadow-sm">
            <p className="text-slate-400 font-medium">No records found.</p>
          </div>
        )}
      </div>

      {/* Note Modal */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-slate-100 transform transition-all scale-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Student Notes</h3>
            <textarea 
              className="w-full h-32 p-4 rounded-xl border border-slate-200 bg-slate-50 mb-6 resize-none focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 text-sm"
              placeholder="Internal comments about this student..."
              value={noteModal.text}
              onChange={e => setNoteModal({ ...noteModal, text: e.target.value })}
            />
            <div className="flex space-x-3">
              <button 
                onClick={() => setNoteModal(null)}
                className="flex-1 py-2.5 font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveNote}
                className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-colors"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherGradebook;
