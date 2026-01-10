import React, { useState } from 'react';
import { setAuthToken } from '../utils/auth';

interface LoginProps {
    onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [view, setView] = useState<'login' | 'register'>('login');
    const [token, setToken] = useState('');
    const [error, setError] = useState('');

    // Register Form State
    const [regName, setRegName] = useState('');
    const [regScale, setRegScale] = useState('Kabupaten/Kota');
    const [regDesc, setRegDesc] = useState('');
    const [regResult, setRegResult] = useState<{ api_token: string, laz_id: number, message: string } | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!token.trim()) {
            setError("Token cannot be empty");
            return;
        }
        setAuthToken(token.trim());
        onLoginSuccess();
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch('http://localhost:8080/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: regName, scale: regScale, description: regDesc })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to register");

            setRegResult(data);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const switchToLoginWithToken = () => {
        if (regResult) {
            setToken(regResult.api_token);
        }
        setView('login');
        setRegResult(null);
        setIsCopied(false);
    };

    const copyToClipboard = () => {
        if (regResult?.api_token) {
            navigator.clipboard.writeText(regResult.api_token);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 font-sans">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                {/* Header Section */}
                <div className="bg-emerald-600 p-8 text-center bg-opacity-95">
                    <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 text-white backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">ERM ZISWAF</h1>
                    <p className="text-sm text-emerald-50 mt-2 font-medium">Enterprise Risk Management System</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-100 p-1 mx-6 -mt-6 rounded-lg relative z-10 shadow-sm border border-gray-200">
                    <button
                        className={`flex-1 py-3 text-sm font-bold rounded-md transition-all duration-200 ${view === 'login' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => { setView('login'); setError(''); }}
                    >
                        Login
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-bold rounded-md transition-all duration-200 ${view === 'register' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => { setView('register'); setError(''); }}
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
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Access Token</label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            placeholder="Paste your token here..."
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-colors text-gray-900 placeholder-gray-400"
                                            value={token}
                                            onChange={e => setToken(e.target.value)}
                                        />
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 14l-1 1-1 1H6v4l-4-4V6a3 3 0 013-3h6a3 3 0 013 3z" /></svg>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">Only authorized partners can access this system.</p>
                                </div>
                                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all">
                                    Access Dashboard
                                </button>
                            </form>

                            <div className="text-center pt-2">
                                <p className="text-sm text-gray-600">
                                    Don't have an account?{' '}
                                    <button
                                        onClick={() => setView('register')}
                                        className="text-emerald-600 font-bold hover:text-emerald-700 hover:underline"
                                    >
                                        Register New Organization
                                    </button>
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {regResult ? (
                                <div className="text-center space-y-6">
                                    <div className="flex flex-col items-center">
                                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600 ring-8 ring-green-50">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900">Partner Registered!</h3>
                                    </div>

                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-left">
                                        <div className="flex items-center gap-2 mb-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Important</p>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed">{regResult.message}</p>
                                    </div>

                                    <div className="relative group">
                                        <div className="bg-gray-100 p-5 rounded-xl font-mono text-sm break-all border border-gray-200 text-center select-all text-emerald-700 font-bold">
                                            {regResult.api_token}
                                        </div>
                                    </div>

                                    <button
                                        onClick={copyToClipboard}
                                        className={`w-full py-3 rounded-xl border-dashed border-2 font-semibold transition-colors flex items-center justify-center gap-2 ${isCopied ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-200 text-gray-600 hover:border-emerald-500 hover:text-emerald-600'}`}
                                    >
                                        {isCopied ? (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                Copied to Clipboard
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                                Copy Secure Token
                                            </>
                                        )}
                                    </button>

                                    <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20" onClick={switchToLoginWithToken}>
                                        Proceed to Login
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <form onSubmit={handleRegister} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Organization Name</label>
                                            <input type="text" placeholder="e.g. LAZ Al-Falah" className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors text-gray-900" required value={regName} onChange={e => setRegName(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Scale</label>
                                            <select className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors text-gray-900" value={regScale} onChange={e => setRegScale(e.target.value)}>
                                                <option>Nasional</option>
                                                <option>Provinsi</option>
                                                <option>Kabupaten/Kota</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                                            <textarea placeholder="Brief description of your organization..." className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors h-24 text-gray-900" value={regDesc} onChange={e => setRegDesc(e.target.value)}></textarea>
                                        </div>
                                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 mt-2">
                                            Register Organization
                                        </button>
                                    </form>

                                    <div className="text-center pt-2">
                                        <p className="text-sm text-gray-600">
                                            Already have an account?{' '}
                                            <button
                                                onClick={() => setView('login')}
                                                className="text-emerald-600 font-bold hover:text-emerald-700 hover:underline"
                                            >
                                                Sign In
                                            </button>
                                        </p>
                                    </div>
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
