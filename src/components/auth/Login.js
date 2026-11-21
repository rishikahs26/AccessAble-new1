import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, EyeOff, Mail, Lock, ArrowRight, KeyRound, ExternalLink, X } from 'lucide-react';
import { validateEmail } from '../../utils/validation';
import { playSuccessChime, playErrorTone, playFocusBeep } from '../../utils/earcons';
import { useAssistant } from '../../hooks/useAssistant';

const Login = ({ onLogin, onSwitchToRegister }) => {
  const [activeTab, setActiveTab] = useState('google'); // 'google' | 'manual'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [inputClientId, setInputClientId] = useState('');
  const [activeClientId, setActiveClientId] = useState(() => {
    return process.env.REACT_APP_GOOGLE_CLIENT_ID || 
           (typeof window !== 'undefined' ? window.localStorage.getItem('accessable_google_client_id') : '') || '';
  });

  const googleBtnRef = useRef(null);
  const emailInputRef = useRef(null);
  const googleContainerRef = useRef(null);
  const { speak } = useAssistant();
  const spokenRef = useRef(false);

  // ── Handle Real Google Credential Response ─────────────────────────────────
  const handleRealGoogleCredential = useCallback(async (response) => {
    if (!response || !response.credential) {
      playErrorTone();
      setError('No credential received from Google');
      return;
    }

    setIsGoogleLoading(true);
    setError('');
    setLiveAnnouncement('Verifying with server...');

    try {
      const apiRes = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await apiRes.json();
      if (!apiRes.ok) {
        throw new Error(data.message || 'Google account verification failed');
      }

      playSuccessChime();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      window.localStorage.setItem('accessableToken', data.token);

      setTimeout(() => {
        setIsGoogleLoading(false);
        onLogin(data.user);
      }, 300);

    } catch (err) {
      playErrorTone();
      const errMsg = err.message || 'Failed to authenticate Google account.';
      setError(errMsg);
      setLiveAnnouncement(errMsg);
      speak(errMsg);
      setIsGoogleLoading(false);
      googleBtnRef.current?.focus();
    }
  }, [speak, onLogin]);

  // ── Initialize Google Identity Services (GIS) ──────────────────────────────
  const initGoogleGIS = useCallback(() => {
    if (typeof window === 'undefined' || !window.google?.accounts?.id || !activeClientId) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: activeClientId,
        callback: handleRealGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: false,
      });

      if (googleContainerRef.current) {
        googleContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleContainerRef.current, {
          type: 'standard',
          theme: 'filled_blue',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 300,
        });
      }
    } catch (err) {
      console.warn('Google Identity Services notice:', err);
    }
  }, [activeClientId, handleRealGoogleCredential]);

  useEffect(() => {
    const timer = setTimeout(() => {
      initGoogleGIS();
    }, 400);
    return () => clearTimeout(timer);
  }, [initGoogleGIS]);

  // ── Auto-Speak and Focus on Initial Page Open (Runs ONCE on mount) ─────────
  useEffect(() => {
    if (googleBtnRef.current) {
      googleBtnRef.current.focus();
    }

    if (!spokenRef.current) {
      spokenRef.current = true;
      speak("Sign in. Press Enter for Google, or Tab for Email.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectTab = (tab) => {
    playFocusBeep();
    setActiveTab(tab);
    setError('');

    if (tab === 'manual') {
      setLiveAnnouncement("Email sign in.");
      speak("Email sign in. Enter email and password.");
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 100);
    } else {
      setLiveAnnouncement("Google sign in.");
      speak("Google sign in.");
      setTimeout(() => {
        googleBtnRef.current?.focus();
      }, 100);
    }
  };

  const handleGoogleBtnClick = () => {
    playFocusBeep();

    if (activeClientId && window.google?.accounts?.id) {
      initGoogleGIS();
      const realBtn = googleContainerRef.current?.querySelector('div[role=button]');
      if (realBtn) {
        realBtn.click();
        return;
      }
      try {
        window.google.accounts.id.prompt();
        return;
      } catch (_) {}
    }

    if (!activeClientId) {
      setShowConfigModal(true);
      speak("Enter your Google Client ID.");
      return;
    }
  };

  const handleSaveClientId = (e) => {
    e.preventDefault();
    if (!inputClientId.trim()) return;

    const trimmed = inputClientId.trim();
    setActiveClientId(trimmed);
    window.localStorage.setItem('accessable_google_client_id', trimmed);
    setShowConfigModal(false);
    playSuccessChime();

    setLiveAnnouncement('Google Client ID saved.');
    speak('Google Client ID connected.');

    setTimeout(() => {
      initGoogleGIS();
    }, 300);
  };

  // ── Manual Email / Password Submit ─────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanEmail || !cleanPassword) {
      playErrorTone();
      const msg = 'Please enter email and password';
      setError(msg);
      setLiveAnnouncement(msg);
      speak(msg);
      setIsLoading(false);
      return;
    }

    const emailValidation = validateEmail(cleanEmail);
    if (!emailValidation.isValid) {
      playErrorTone();
      setError(emailValidation.message);
      setLiveAnnouncement(emailValidation.message);
      speak(emailValidation.message);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        playErrorTone();
        const msg = data.message || 'Login failed.';
        setError(msg);
        setLiveAnnouncement(msg);
        speak(msg);
        setIsLoading(false);
        return;
      }

      playSuccessChime();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      window.localStorage.setItem('accessableToken', data.token);

      setTimeout(() => {
        setIsLoading(false);
        onLogin(data.user);
      }, 300);

    } catch (err) {
      playErrorTone();
      const msg = 'Unable to connect to server.';
      setError(msg);
      setLiveAnnouncement(msg);
      speak(msg);
      console.error('Login error:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Screen Reader Live Announcement */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {liveAnnouncement}
      </div>

      <div className="w-full max-w-md">
        {/* Clean Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-400 border-4 border-white rounded-2xl mb-3 shadow-lg shadow-yellow-400/20">
            <span className="text-4xl font-black text-black" aria-hidden="true">A</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider">AccessAble</h1>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-zinc-900 border-2 border-yellow-400 rounded-2xl p-1 mb-6 gap-1">
          <button
            type="button"
            onClick={() => handleSelectTab('google')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-sm uppercase transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-white ${
              activeTab === 'google'
                ? 'bg-yellow-400 text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            aria-pressed={activeTab === 'google'}
          >
            Google
          </button>
          <button
            type="button"
            onClick={() => handleSelectTab('manual')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-sm uppercase transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-white ${
              activeTab === 'manual'
                ? 'bg-yellow-400 text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            aria-pressed={activeTab === 'manual'}
          >
            Email
          </button>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 rounded-3xl border-4 border-yellow-400 p-8 shadow-2xl">
          <h2 className="text-2xl font-black text-white mb-6 text-center uppercase tracking-wide">
            Sign In
          </h2>

          {/* TAB 1: GOOGLE */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              <button
                ref={googleBtnRef}
                type="button"
                onClick={handleGoogleBtnClick}
                onFocus={playFocusBeep}
                disabled={isGoogleLoading}
                className="w-full relative group bg-white hover:bg-zinc-100 text-black py-4 px-6 rounded-2xl font-black text-xl uppercase tracking-wider border-4 border-yellow-400 shadow-xl focus:outline-none focus:ring-8 focus:ring-yellow-400 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                aria-label="Sign in with Google, press Enter."
              >
                <svg className="h-7 w-7 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isGoogleLoading ? 'SIGNING IN...' : 'CONTINUE WITH GOOGLE'}</span>
              </button>

              <div 
                ref={googleContainerRef} 
                id="google-real-btn-container" 
                className="mt-3 flex justify-center empty:hidden"
              ></div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(true)}
                  className="text-zinc-500 hover:text-yellow-400 text-xs font-bold underline inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded px-1"
                >
                  <KeyRound className="h-3 w-3" />
                  {activeClientId ? 'Change Client ID' : 'Set Client ID'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL EMAIL & PASSWORD */}
          {activeTab === 'manual' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="manual-email" className="block text-sm font-bold text-yellow-400 mb-1 uppercase">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black h-5 w-5 pointer-events-none" aria-hidden="true" />
                  <input
                    ref={emailInputRef}
                    id="manual-email"
                    type="email"
                    value={email}
                    onFocus={playFocusBeep}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    className="w-full pl-12 pr-4 py-3.5 text-black bg-white border-4 border-yellow-400 rounded-xl focus:outline-none focus:ring-4 focus:ring-yellow-400 font-bold text-lg"
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="manual-password" className="block text-sm font-bold text-yellow-400 mb-1 uppercase">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black h-5 w-5 pointer-events-none" aria-hidden="true" />
                  <input
                    id="manual-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onFocus={playFocusBeep}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full pl-12 pr-12 py-3.5 text-black bg-white border-4 border-yellow-400 rounded-xl focus:outline-none focus:ring-4 focus:ring-yellow-400 font-bold text-lg"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      playFocusBeep();
                      setShowPassword(!showPassword);
                      setLiveAnnouncement(showPassword ? "Password hidden" : "Password shown");
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-black hover:text-gray-700 focus:outline-none focus:ring-4 focus:ring-yellow-400 rounded-full p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-950 border-2 border-red-500 rounded-xl p-3" role="alert">
                  <p className="text-red-400 text-sm font-bold text-center">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                onFocus={playFocusBeep}
                className="w-full bg-yellow-400 text-black py-4 px-6 rounded-xl font-black text-xl uppercase tracking-wider hover:bg-yellow-300 focus:outline-none focus:ring-8 focus:ring-white transition-all disabled:opacity-50 flex items-center justify-center gap-3 border-4 border-black"
              >
                {isLoading ? (
                  <>
                    <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                    SIGNING IN...
                  </>
                ) : (
                  <>
                    SIGN IN
                    <ArrowRight className="h-6 w-6" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Clean Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm font-bold text-zinc-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                onFocus={playFocusBeep}
                className="text-yellow-400 hover:text-white underline focus:outline-none focus:ring-4 focus:ring-yellow-400 p-1 rounded font-black"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Google OAuth Client ID Setup Modal */}
      {showConfigModal && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="google-cfg-title"
        >
          <div className="bg-zinc-900 border-4 border-yellow-400 rounded-3xl p-6 md:p-8 max-w-lg w-full text-white shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 rounded-full focus:outline-none focus:ring-4 focus:ring-yellow-400"
              aria-label="Close dialog"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center">
                <KeyRound className="h-5 w-5 text-black" />
              </div>
              <div>
                <h3 id="google-cfg-title" className="text-xl font-black uppercase">
                  Google Client ID
                </h3>
              </div>
            </div>

            <form onSubmit={handleSaveClientId} className="space-y-4">
              <div>
                <label htmlFor="client-id-input" className="block text-xs font-bold text-yellow-400 mb-1 uppercase">
                  Paste Client ID:
                </label>
                <input
                  id="client-id-input"
                  type="text"
                  value={inputClientId}
                  onChange={(e) => setInputClientId(e.target.value)}
                  placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
                  className="w-full p-3 bg-black border-2 border-yellow-400 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-4 focus:ring-yellow-400"
                  required
                />
              </div>

              <div className="bg-black border border-zinc-700 p-3 rounded-xl text-xs space-y-1 text-zinc-400">
                <p>1. Open Google Cloud Console &gt; Credentials</p>
                <p>2. Create OAuth Client ID (Web application)</p>
                <p>3. Add Origin: <code className="text-yellow-400">http://localhost:3000</code></p>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-yellow-400 hover:underline font-bold mt-1"
                >
                  Open Console <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-yellow-400 text-black py-3 rounded-xl font-black uppercase text-sm hover:bg-yellow-300 focus:outline-none focus:ring-4 focus:ring-white"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="bg-zinc-800 text-white px-5 py-3 rounded-xl font-bold uppercase text-xs hover:bg-zinc-700 focus:outline-none focus:ring-4 focus:ring-zinc-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;