import React, { useState } from 'react';
import { setAuthToken } from '../utils/auth';
import { API_BASE_URL } from '../utils/config';

interface LoginProps {
    onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [view, setView] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Register Form State
    const [regName, setRegName] = useState('');
    const [regScale, setRegScale] = useState('Kabupaten/Kota');
    const [regDesc, setRegDesc] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');

    // Registration Success State
    const [regSuccess, setRegSuccess] = useState<boolean>(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to login");

            // Save Token & User Info
            setAuthToken(data.token);
            if (data.user) {
                localStorage.setItem('user_email', data.user.email);
                localStorage.setItem('user_role', data.user.role);
            }
            if (data.laz) {
                localStorage.setItem('laz_name', data.laz.name);
            }

            onLoginSuccess();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const payload = {
                laz_name: regName,
                laz_scale: regScale,
                laz_description: regDesc,
                email: regEmail,
                password: regPassword
            };

            const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to register");

            setRegSuccess(true);
            setRegEmail('');
            setRegPassword('');
            setRegName('');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 font-sans">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                {/* Header Section */}
                <div className="bg-emerald-600 p-8 text-center bg-opacity-95">
                    <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 text-white backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 011.043-3.296A3.745 3.745 0 0121 12z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">ERM ZISWAF</h1>
                    <p className="text-sm text-emerald-50 mt-2 font-medium">Enterprise Risk Management System</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-100 p-1 mx-6 -mt-6 rounded-lg relative z-10 shadow-sm border border-gray-200">
                    <button
                        className={`flex-1 py-3 text-sm font-bold rounded-md transition-all duration-200 ${view === 'login' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => { setView('login'); setError(''); setRegSuccess(false); }}
                    >
                        Login
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-bold rounded-md transition-all duration-200 ${view === 'register' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => { setView('register'); setError(''); setRegSuccess(false); }}
                    >
                        Register
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 pt-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3 mb-6 text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    {view === 'login' ? (
                        <div className="space-y-6">
                            <form onSubmit={handleLogin} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        placeholder="admin@laz.org"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors text-gray-900"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors text-gray-900"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all">
                                    Login
                                </button>
                            </form>

                            <div className="text-center pt-2">
                                <p className="text-sm text-gray-600">
                                    Don't have an account?{' '}
                                    <button
                                        onClick={() => setView('register')}
                                        className="text-emerald-600 font-bold hover:text-emerald-700 hover:underline"
                                    >
                                        Register Organization
                                    </button>
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {regSuccess ? (
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">Registration Successful!</h3>
                                    <p className="text-gray-600 text-sm">Your organization and admin account have been created. Please login to continue.</p>
                                    <button
                                        onClick={() => setView('login')}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow mt-2"
                                    >
                                        Go to Login
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleRegister} className="space-y-4">
                                    <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Organization Details</h3>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">LAZ Name</label>
                                        <input type="text" placeholder="e.g. LAZ Al-Falah" className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors text-gray-900" required value={regName} onChange={e => setRegName(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Scale</label>
                                            <select className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors text-gray-900" value={regScale} onChange={e => setRegScale(e.target.value)}>
                                                <option>Nasional</option>
                                                <option>Provinsi</option>
                                                <option>Kabupaten/Kota</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</label>
                                        <textarea placeholder="Brief description..." className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors h-16 text-gray-900" value={regDesc} onChange={e => setRegDesc(e.target.value)}></textarea>
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-800 border-b pb-2 pt-2">Admin Account</h3>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Admin Email</label>
                                        <input type="email" placeholder="admin@laz.org" className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors text-gray-900" required value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Password</label>
                                        <input type="password" placeholder="••••••••" className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors text-gray-900" required value={regPassword} onChange={e => setRegPassword(e.target.value)} />
                                    </div>

                                    <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 mt-4">
                                        Register Account & LAZ
                                    </button>
                                </form>
                            )}

                            {!regSuccess && (
                                <div className="text-center pt-2">
                                    <p className="text-sm text-gray-600">
                                        Already have an account?{' '}
                                        <button
                                            onClick={() => setView('login')}
                                            className="text-emerald-600 font-bold hover:text-emerald-700 hover:underline"
                                        >
                                            Login
                                        </button>
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-8 text-center text-sm text-gray-400 font-medium">
                &copy; {new Date().getFullYear()} ERM ZISWAF System. All rights reserved.
            </div>
        </div>
    );
};

export default Login;
