import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { validateEmail } from '../../utils/validation';
import { playSuccessChime, playErrorTone, playFocusBeep } from '../../utils/earcons';
import { useAssistant } from '../../hooks/useAssistant';

const Register = ({ onRegister, onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const googleBtnRef = useRef(null);
  const { speak } = useAssistant();
  const announcedRef = useRef(false);

  useEffect(() => {
    if (googleBtnRef.current) {
      googleBtnRef.current.focus();
    }

    setLiveAnnouncement("Create Account. Choose Google or enter your details.");

    if (!announcedRef.current) {
      announcedRef.current = true;
      speak("Create Account. Choose Google or fill details.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    setError('');
    setLiveAnnouncement('Creating account with Google...');

    try {
      let googleProfile = {
        name: 'Google User',
        email: 'user.accessable@gmail.com',
      };

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(googleProfile),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Google registration failed');
      }

      playSuccessChime();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      window.localStorage.setItem('accessableToken', data.token);

      setTimeout(() => {
        setIsGoogleLoading(false);
        onRegister(data.user);
      }, 300);

    } catch (err) {
      playErrorTone();
      const errMsg = err.message || 'Google sign up failed.';
      setError(errMsg);
      setLiveAnnouncement(errMsg);
      speak(errMsg);
      setIsGoogleLoading(false);
      googleBtnRef.current?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      playErrorTone();
      const msg = 'Please fill in all fields';
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

    if (password.length < 6) {
      playErrorTone();
      const msg = 'Password must be at least 6 characters';
      setError(msg);
      setLiveAnnouncement(msg);
      speak(msg);
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      playErrorTone();
      const msg = 'Passwords do not match';
      setError(msg);
      setLiveAnnouncement(msg);
      speak(msg);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, email: cleanEmail, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        playErrorTone();
        const msg = data.message || 'Registration failed.';
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
        onRegister(data.user);
      }, 300);

    } catch (err) {
      playErrorTone();
      const msg = 'Unable to connect to server.';
      setError(msg);
      setLiveAnnouncement(msg);
      speak(msg);
      console.error('Registration error:', err);
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

        {/* Register Card */}
        <div className="bg-zinc-900 rounded-3xl border-4 border-yellow-400 p-8 shadow-2xl">
          <h2 className="text-2xl font-black text-white mb-6 text-center uppercase tracking-wide">
            Create Account
          </h2>

          {/* Google Sign-Up Option */}
          <div className="mb-6">
            <button
              ref={googleBtnRef}
              type="button"
              onClick={handleGoogleSignUp}
              onFocus={playFocusBeep}
              disabled={isGoogleLoading || isLoading}
              className="w-full relative group bg-white hover:bg-zinc-100 text-black py-4 px-6 rounded-2xl font-black text-xl uppercase tracking-wider border-4 border-yellow-400 shadow-xl focus:outline-none focus:ring-8 focus:ring-yellow-400 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
              aria-label="Sign up with Google, press Enter."
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
              <span>{isGoogleLoading ? 'CREATING...' : 'SIGN UP WITH GOOGLE'}</span>
            </button>
          </div>

          {/* Separator */}
          <div 
            className="relative flex items-center justify-center my-6"
            role="separator" 
            aria-label="Or register with email and password"
          >
            <div className="border-t-2 border-zinc-700 w-full" aria-hidden="true"></div>
            <span className="bg-zinc-900 px-4 text-xs font-black text-yellow-400 uppercase tracking-widest whitespace-nowrap">
              OR REGISTER WITH EMAIL
            </span>
            <div className="border-t-2 border-zinc-700 w-full" aria-hidden="true"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor="reg-name" className="block text-sm font-bold text-yellow-400 mb-1 uppercase">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black h-5 w-5 pointer-events-none" aria-hidden="true" />
                <input
                  id="reg-name"
                  type="text"
                  value={name}
                  onFocus={playFocusBeep}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="w-full pl-12 pr-4 py-3 text-black bg-white border-4 border-yellow-400 rounded-xl focus:outline-none focus:ring-4 focus:ring-yellow-400 font-bold text-base"
                  placeholder="Your Name"
                  required
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="reg-email" className="block text-sm font-bold text-yellow-400 mb-1 uppercase">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black h-5 w-5 pointer-events-none" aria-hidden="true" />
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onFocus={playFocusBeep}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3 text-black bg-white border-4 border-yellow-400 rounded-xl focus:outline-none focus:ring-4 focus:ring-yellow-400 font-bold text-base"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="reg-password" className="block text-sm font-bold text-yellow-400 mb-1 uppercase">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black h-5 w-5 pointer-events-none" aria-hidden="true" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onFocus={playFocusBeep}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full pl-12 pr-12 py-3 text-black bg-white border-4 border-yellow-400 rounded-xl focus:outline-none focus:ring-4 focus:ring-yellow-400 font-bold text-base"
                  placeholder="Min 6 characters"
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

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="reg-confirmPassword" className="block text-sm font-bold text-yellow-400 mb-1 uppercase">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black h-5 w-5 pointer-events-none" aria-hidden="true" />
                <input
                  id="reg-confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onFocus={playFocusBeep}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full pl-12 pr-12 py-3 text-black bg-white border-4 border-yellow-400 rounded-xl focus:outline-none focus:ring-4 focus:ring-yellow-400 font-bold text-base"
                  placeholder="Confirm password"
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    playFocusBeep();
                    setShowConfirmPassword(!showConfirmPassword);
                    setLiveAnnouncement(showConfirmPassword ? "Confirm password hidden" : "Confirm password shown");
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-black hover:text-gray-700 focus:outline-none focus:ring-4 focus:ring-yellow-400 rounded-full p-1"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
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
              disabled={isLoading || isGoogleLoading}
              onFocus={playFocusBeep}
              className="w-full bg-yellow-400 text-black py-4 px-6 rounded-xl font-black text-xl uppercase tracking-wider hover:bg-yellow-300 focus:outline-none focus:ring-8 focus:ring-white transition-all disabled:opacity-50 flex items-center justify-center gap-3 border-4 border-black mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                  CREATING ACCOUNT...
                </>
              ) : (
                <>
                  CREATE ACCOUNT
                  <ArrowRight className="h-6 w-6" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Clean Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm font-bold text-zinc-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                onFocus={playFocusBeep}
                className="text-yellow-400 hover:text-white underline focus:outline-none focus:ring-4 focus:ring-yellow-400 p-1 rounded font-black"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;