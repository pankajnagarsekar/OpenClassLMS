
import React, { useEffect, useState } from 'react';
import api from '../services/api';

const VerifyEmail: React.FC<{ token: string }> = ({ token }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await api.post('/auth/verify', { token });
        setStatus('success');
        setMessage(res.data.message);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The token may be invalid or expired.');
      }
    };
    if (token) verify();
  }, [token]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md border border-slate-100 text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-6"></div>
            <p className="text-slate-600 font-medium">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Verified!</h2>
            <p className="text-slate-600 mb-8">{message}</p>
            <a 
              href="#/login" 
              className="block w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all"
            >
              Back to Login
            </a>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
              !
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Oops!</h2>
            <p className="text-slate-600 mb-8">{message}</p>
            <a 
              href="#/register" 
              className="block w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              Try Registering Again
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
