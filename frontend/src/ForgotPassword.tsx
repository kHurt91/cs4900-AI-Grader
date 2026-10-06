import React, { useState } from 'react';
import { publicClient } from './api/client';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [userId, setUserId] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const { data, error } = await publicClient.POST("/api/users/auth/forgot_password/", {
        body: { email },
      });
      if (error) {
        setError((error as any).error || 'An error occurred');
      } else {
        setMessage(data.message);
        setResetToken(data.reset_token ?? '');
        setUserId(String(data.user_id ?? ''));
        setShowResetForm(true);
      }
    } catch {
      setError('Network error. Please try again.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const { data, error } = await publicClient.POST("/api/users/auth/reset_password/", {
        body: { user_id: Number(userId), new_password: newPassword },
      });
      if (error) {
        setError((error as any).error || 'An error occurred');
      } else {
        setMessage(data.message);
        setShowResetForm(false);
      }
    } catch {
      setError('Network error. Please try again.');
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="max-w-md mx-auto rounded-3xl bg-white border shadow-sm p-6 md:p-7">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-5">Forgot Password</h2>

        {!showResetForm ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@wmich.edu"
                className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C]"
              />
            </div>
            <button type="submit" className="w-full rounded-2xl font-bold py-3 transition shadow-sm bg-[#4E3629] text-white hover:opacity-95">
              Send Reset Instructions
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="new password"
                className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C]"
              />
            </div>
            <button type="submit" className="w-full rounded-2xl font-bold py-3 transition shadow-sm bg-[#4E3629] text-white hover:opacity-95">
              Reset Password
            </button>
          </form>
        )}

        {message && <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 mt-4">{message}</div>}
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mt-4">{error}</div>}
      </div>
    </main>
  );
};

export default ForgotPassword;
