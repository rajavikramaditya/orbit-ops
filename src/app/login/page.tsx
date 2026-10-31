'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const USERS = [
  { id: 1, email: 'admin@office.com', password: 'admin123', name: 'Admin User', role: 'admin' },
  { id: 2, email: 'manager@office.com', password: 'manager123', name: 'Manager User', role: 'manager' },
  { id: 3, email: 'employee@office.com', password: 'emp123', name: 'Employee User', role: 'employee' },
  { id: 4, email: 'employee2@office.com', password: 'emp123', name: 'Employee Two', role: 'employee' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (user) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = USERS.find(u => u.email === email && u.password === password);
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify({ ...user, password: undefined }));
      router.push('/dashboard');
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Office Task Manager</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Multi-login for Office Team</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="admin@office.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
          >
            Login
          </button>
        </form>

        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
          <p className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Demo Accounts:</p>
          <ul className="space-y-1 text-gray-600 dark:text-gray-400">
            <li>• Admin: admin@office.com / admin123</li>
            <li>• Manager: manager@office.com / manager123</li>
            <li>• Employee: employee@office.com / emp123</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
