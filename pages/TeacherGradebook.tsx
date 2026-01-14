
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

  if (loading) return <div className="p-20 text-center animate-pulse">Fetching records...</div>;
  if (!data) return <div className="p-20 text-center text-red-500">Failed to load gradebook.</div>;

  const filteredRows = data.rows.filter(row => 
    row.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    row.student_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const mainText = settings.ENABLE_DARK_MODE ? 'text-white' : 'text-slate-900';
  const mutedText = settings.ENABLE_DARK_MODE ? 'text-slate-400' : 'text-slate-500';
  const cardBg = settings.ENABLE_DARK_MODE ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const tableHeaderBg = settings.ENABLE_DARK_MODE ? 'bg-slate-900/50' : 'bg-slate-50/50';

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <button onClick={() => window.location.hash = `#/course/${courseId}`} className="text-indigo-600 font-bold mb-4 flex items-center hover:underline">
            &larr; Back to Class
          </button>
          <h1 className={`text-4xl font-black tracking-tighter ${mainText}`}>Gradebook</h1>
          <p className={`${mutedText} mt-2`}>Comprehensive performance tracking for all enrolled students.</p>
        </div>
        <div className="flex space-x-3">
          <input 
            type="text" 
            placeholder="Search students..." 
            className={`px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 ${settings.ENABLE_DARK_MODE ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-900'}`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <button onClick={() => window.print()} className="px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 print:hidden">
            Export
          </button>
        </div>
      </div>

      <div className={`rounded-3xl border shadow-sm overflow-hidden ${cardBg}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={tableHeaderBg}>
                <th className={`px-6 py-5 border-b text-xs font-black uppercase tracking-widest sticky left-0 z-10 ${settings.ENABLE_DARK_MODE ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                  Student Details
                </th>
                <th className={`px-6 py-5 border-b text-xs font-black text-center uppercase tracking-widest ${settings.ENABLE_DARK_MODE ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-400'}`}>
                  Status
                </th>
                <th className={`px-6 py-5 border-b text-xs font-black text-center uppercase tracking-widest ${settings.ENABLE_DARK_MODE ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-400'}`}>
                  Notes
                </th>
                {data.columns.map(col => (
                  <th key={col.id} className={`px-6 py-5 border-b text-xs font-black uppercase tracking-widest text-center min-w-[150px] ${settings.ENABLE_DARK_MODE ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-400'}`}>
                    {col.title}
                  </th>
                ))}
                <th className={`px-6 py-5 border-b text-xs font-black text-right uppercase tracking-widest ${settings.ENABLE_DARK_MODE ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-400'}`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${settings.ENABLE_DARK_MODE ? 'divide-slate-700' : 'divide-slate-100'}`}>
              {filteredRows.map((row, idx) => (
                <tr key={idx} className={`transition-colors ${settings.ENABLE_DARK_MODE ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50/50'}`}>
                  <td className={`px-6 py-5 sticky left-0 backdrop-blur-sm z-10 ${settings.ENABLE_DARK_MODE ? 'bg-slate-800/80' : 'bg-white/80'}`}>
                    <p className={`font-bold ${mainText}`}>{row.student_name}</p>
                    <p className={`text-[10px] font-medium ${mutedText}`}>{row.student_email}</p>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button 
                      onClick={() => handleToggleStatus(row.enrollment_id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-transform active:scale-95 ${row.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {row.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button 
                      onClick={() => setNoteModal({ id: row.enrollment_id, text: row.teacher_notes || '' })}
                      className="text-xl hover:scale-110 transition-transform"
                      title="View/Edit Notes"
                    >
                      {row.teacher_notes ? '📝' : '📄'}
                    </button>
                  </td>
                  {data.columns.map(col => (
                    <td key={col.id} className="px-6 py-5 text-center">
                      {row.grades[col.id] !== undefined ? (
                        <span className={`font-black text-sm ${row.grades[col.id] >= 80 ? 'text-green-600' : settings.ENABLE_DARK_MODE ? 'text-slate-300' : 'text-slate-700'}`}>
                          {row.grades[col.id]}%
                        </span>
                      ) : (
                        <span className="text-slate-300 font-medium">-</span>
                      )}
                    </td>
                  ))}
                  <td className="px-6 py-5 text-right">
                    <button 
                      onClick={() => handleDelete(row.enrollment_id)}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors"
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
        <div className={`text-center py-20 mt-8 rounded-3xl border ${cardBg}`}>
          <p className="text-slate-400">No students found matching your search.</p>
        </div>
      )}

      {/* Note Modal */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className={`w-full max-w-md p-8 rounded-3xl shadow-2xl ${settings.ENABLE_DARK_MODE ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
            <h3 className={`text-xl font-black mb-4 ${mainText}`}>Student Notes</h3>
            <textarea 
              className={`w-full h-40 p-4 rounded-xl border mb-6 resize-none focus:ring-2 focus:ring-indigo-600 ${settings.ENABLE_DARK_MODE ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              placeholder="Private comments about this student's performance..."
              value={noteModal.text}
              onChange={e => setNoteModal({ ...noteModal, text: e.target.value })}
            />
            <div className="flex space-x-3">
              <button 
                onClick={() => setNoteModal(null)}
                className={`flex-grow py-3 font-bold rounded-xl ${settings.ENABLE_DARK_MODE ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveNote}
                className="flex-grow py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
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
