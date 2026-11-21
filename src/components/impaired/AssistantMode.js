import React, { useState, useRef, useEffect } from 'react';
import LiveCaptions from './LiveCaptions';
import OCRScanner from './OCRScanner';
import VoiceForm from './VoiceForm';
import { Eye, Camera, Mic, Sparkles, ChevronDown, ChevronUp, Navigation } from 'lucide-react';

const AssistantMode = () => {
  const [navModeActive, setNavModeActive] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const featureRefs = useRef([]);
  
  const features = [
    { 
      id: 'live-captions', 
      name: 'Live Transcriber', 
      description: 'Real-time speech to text conversion',
      icon: Eye
    },
    { 
      id: 'ocr-scanner', 
      name: 'OCR Scanner', 
      description: 'Extract text from document images',
      icon: Camera
    },
    { 
      id: 'voice-form', 
      name: 'Voice Form Filler', 
      description: 'Step-by-step voice form assistant',
      icon: Mic
    }
  ];

  // Audio announcement function
  const announceFeature = (index) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const feature = features[index];
      const announcement = `Feature ${index + 1} of ${features.length}. ${feature.name}. ${feature.description}.`;
      const utterance = new SpeechSynthesisUtterance(announcement);
      utterance.rate = 1.1;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
      
      // Play earcon
      playNavigationSound(index);
    }
  };

  // Play different tones for different features
  const playNavigationSound = (index) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different frequencies: C5, E5, G5
      const frequencies = [523.25, 659.25, 783.99];
      oscillator.frequency.value = frequencies[index];
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Audio not available:', error);
    }
  };

  // Scroll to feature
  const scrollToFeature = (index) => {
    if (featureRefs.current[index]) {
      featureRefs.current[index].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      featureRefs.current[index].focus();
    }
  };

  // Navigation handlers
  const navigateToFeature = (index) => {
    if (index >= 0 && index < features.length) {
      setCurrentFeature(index);
      scrollToFeature(index);
      announceFeature(index);
    }
  };

  const handleNext = () => {
    const nextIndex = (currentFeature + 1) % features.length;
    navigateToFeature(nextIndex);
  };

  const handlePrevious = () => {
    const prevIndex = currentFeature === 0 ? features.length - 1 : currentFeature - 1;
    navigateToFeature(prevIndex);
  };

  const toggleNavMode = () => {
    const newMode = !navModeActive;
    setNavModeActive(newMode);
    
    // Announce mode change
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const message = newMode 
        ? 'Navigation Mode activated. Use arrow keys to navigate between features. Press Escape to exit.'
        : 'Navigation Mode deactivated.';
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if user is in an input field
      const isInInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      
      // Toggle navigation mode with 'N' key (when not in input)
      if (e.key === 'n' && !isInInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleNavMode();
        return;
      }

      // Navigation mode controls
      if (navModeActive) {
        switch(e.key) {
          case 'ArrowDown':
          case 'j':
            e.preventDefault();
            handleNext();
            break;
          case 'ArrowUp':
          case 'k':
            e.preventDefault();
            handlePrevious();
            break;
          case 'Home':
            e.preventDefault();
            navigateToFeature(0);
            break;
          case 'End':
            e.preventDefault();
            navigateToFeature(features.length - 1);
            break;
          case 'Escape':
            e.preventDefault();
            setNavModeActive(false);
            window.speechSynthesis.cancel();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navModeActive, currentFeature, features.length, handleNext, handlePrevious, navigateToFeature, toggleNavMode]);

  // Announce page on load
  useEffect(() => {
    const timer = setTimeout(() => {
      if ('speechSynthesis' in window) {
        const welcome = new SpeechSynthesisUtterance(
          'Accessibility Assistant Mode loaded. Three features available. Press N to activate Navigation Mode, or use Tab key to navigate normally.'
        );
        welcome.rate = 1.1;
        window.speechSynthesis.speak(welcome);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Skip to content link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-yellow-400 focus:text-black focus:px-6 focus:py-3 focus:rounded-xl focus:font-bold focus:text-lg"
      >
        Skip to main content
      </a>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation Mode Banner */}
        {navModeActive && (
          <div 
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-400 text-black px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-white shadow-2xl animate-pulse max-w-[95vw]"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center gap-2 sm:gap-4">
              <Navigation className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 flex-shrink-0" />
              <div>
                <p className="font-black text-sm sm:text-base md:text-lg lg:text-xl uppercase">🎯 Navigation Mode</p>
                <p className="font-bold text-xs sm:text-sm">
                  <span className="hidden sm:inline">↑/↓ arrows • ESC exit • </span>
                  Feature {currentFeature + 1}/{features.length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Header */}
        <div className="bg-zinc-900 rounded-3xl p-8 border-4 border-yellow-400 shadow-2xl" role="banner">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-yellow-400 pb-6">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-yellow-400 text-black rounded-full border-4 border-white" aria-hidden="true">
                <Sparkles className="h-10 w-10 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-4">
                  <h1 className="text-4xl font-black tracking-wider text-white uppercase">Accessibility Assistant</h1>
                  <span className="px-4 py-2 bg-yellow-400 text-black text-sm font-black uppercase tracking-widest rounded-xl border-4 border-white">
                    Sensory Mode
                  </span>
                </div>
                <p className="text-yellow-400 mt-2 text-lg font-bold uppercase">
                  Smart voice transcription, document OCR scanning, and interactive voice-assisted forms.
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Instructions */}
          <div className="mt-6 p-6 bg-yellow-400 text-black rounded-xl border-4 border-white" role="region" aria-label="Navigation instructions">
            <h2 className="font-black text-2xl uppercase mb-3">🎹 Navigation Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-black text-lg uppercase mb-2">Standard Navigation:</h3>
                <ul className="space-y-1 font-bold">
                  <li>• Tab - Navigate through all features</li>
                  <li>• Click Previous/Next buttons</li>
                </ul>
              </div>
              <div>
                <h3 className="font-black text-lg uppercase mb-2">Enhanced Navigation Mode:</h3>
                <ul className="space-y-1 font-bold">
                  <li>• Press <span className="bg-black text-yellow-400 px-2 py-1 rounded">N</span> to activate</li>
                  <li>• ↑/↓ or J/K - Navigate features</li>
                  <li>• Home/End - Jump to first/last</li>
                  <li>• ESC - Exit navigation mode</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex justify-center items-center gap-4" role="navigation" aria-label="Feature navigation controls">
          <button
            onClick={handlePrevious}
            className="flex items-center gap-2 px-6 py-4 bg-yellow-400 text-black font-black uppercase rounded-xl border-4 border-white hover:bg-yellow-300 focus:outline-none focus:ring-8 focus:ring-yellow-400 transition-all"
            aria-label="Previous feature"
          >
            <ChevronUp className="h-6 w-6" />
            Previous
          </button>
          
          <button
            onClick={toggleNavMode}
            className={`flex items-center gap-2 px-6 py-4 font-black uppercase rounded-xl border-4 transition-all focus:outline-none focus:ring-8 ${
              navModeActive 
                ? 'bg-green-500 text-white border-green-300 focus:ring-green-400' 
                : 'bg-white text-black border-yellow-400 focus:ring-white'
            }`}
            aria-label={navModeActive ? 'Deactivate navigation mode' : 'Activate navigation mode'}
            aria-pressed={navModeActive}
          >
            <Navigation className="h-6 w-6" />
            {navModeActive ? 'Nav Mode ON' : 'Nav Mode OFF'}
          </button>

          <div className="px-6 py-4 bg-white text-black font-black uppercase rounded-xl border-4 border-yellow-400 flex items-center gap-2" aria-live="polite">
            <span className="text-2xl">{currentFeature + 1}</span>
            <span className="text-lg">of {features.length}</span>
          </div>
          
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-4 bg-yellow-400 text-black font-black uppercase rounded-xl border-4 border-white hover:bg-yellow-300 focus:outline-none focus:ring-8 focus:ring-yellow-400 transition-all"
            aria-label="Next feature"
          >
            Next
            <ChevronDown className="h-6 w-6" />
          </button>
        </div>

        {/* Main Accessibility Components */}
        <main id="main-content" className="space-y-8">
          {/* Feature 1: Live Captions */}
          <section
            ref={el => featureRefs.current[0] = el}
            tabIndex={-1}
            className={`transition-all duration-300 rounded-3xl ${
              navModeActive && currentFeature === 0
                ? 'ring-8 ring-yellow-400 shadow-2xl shadow-yellow-400/50' 
                : ''
            }`}
            aria-labelledby="feature-1-title"
            aria-describedby="feature-1-desc"
            aria-roledescription={`Feature 1 of ${features.length}`}
          >
            <div className="bg-zinc-900 rounded-3xl p-6 border-4 border-yellow-400">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-yellow-400 text-black rounded-full border-4 border-white" aria-hidden="true">
                  <Eye className="h-8 w-8" />
                </div>
                <div>
                  <h2 id="feature-1-title" className="font-black text-white text-2xl uppercase">
                    1. Live Transcriber
                  </h2>
                  <p id="feature-1-desc" className="text-yellow-400 font-bold uppercase">
                    Real-time speech to text conversion
                  </p>
                </div>
              </div>
              <LiveCaptions />
            </div>
          </section>

          {/* Features 2 & 3: OCR Scanner and Voice Form */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Feature 2: OCR Scanner */}
            <section
              ref={el => featureRefs.current[1] = el}
              tabIndex={-1}
              className={`lg:col-span-5 transition-all duration-300 rounded-3xl ${
                navModeActive && currentFeature === 1
                  ? 'ring-8 ring-yellow-400 shadow-2xl shadow-yellow-400/50' 
                  : ''
              }`}
              aria-labelledby="feature-2-title"
              aria-describedby="feature-2-desc"
              aria-roledescription={`Feature 2 of ${features.length}`}
            >
              <div className="bg-zinc-900 rounded-3xl p-6 border-4 border-yellow-400 h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-yellow-400 text-black rounded-full border-4 border-white" aria-hidden="true">
                    <Camera className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 id="feature-2-title" className="font-black text-white text-2xl uppercase">
                      2. OCR Scanner
                    </h2>
                    <p id="feature-2-desc" className="text-yellow-400 font-bold uppercase">
                      Extract text from document images
                    </p>
                  </div>
                </div>
                <OCRScanner />
              </div>
            </section>

            {/* Feature 3: Voice Form */}
            <section
              ref={el => featureRefs.current[2] = el}
              tabIndex={-1}
              className={`lg:col-span-7 transition-all duration-300 rounded-3xl ${
                navModeActive && currentFeature === 2
                  ? 'ring-8 ring-yellow-400 shadow-2xl shadow-yellow-400/50' 
                  : ''
              }`}
              aria-labelledby="feature-3-title"
              aria-describedby="feature-3-desc"
              aria-roledescription={`Feature 3 of ${features.length}`}
            >
              <div className="bg-zinc-900 rounded-3xl p-6 border-4 border-yellow-400 h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-yellow-400 text-black rounded-full border-4 border-white" aria-hidden="true">
                    <Mic className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 id="feature-3-title" className="font-black text-white text-2xl uppercase">
                      3. Voice Form Filler
                    </h2>
                    <p id="feature-3-desc" className="text-yellow-400 font-bold uppercase">
                      Step-by-step voice form assistant
                    </p>
                  </div>
                </div>
                <VoiceForm />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AssistantMode;