import { useState, useCallback } from 'react';

// Wait up to 300ms for voices, or immediately fallback so audio starts without delay
const getVoicesAsync = () =>
  new Promise((resolve) => {
    if (!window.speechSynthesis) return resolve([]);
    const v = window.speechSynthesis.getVoices();
    if (v.length > 0) return resolve(v);
    let resolved = false;
    const handler = () => {
      if (!resolved) {
        resolved = true;
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve(window.speechSynthesis.getVoices());
      }
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve(window.speechSynthesis.getVoices());
      }
    }, 300);
  });

export const useAssistant = (language = 'en-US') => {
  const [isMicActive, setIsMicActive] = useState(false);

  // ── speak — starts speech reliably and resolves when finished ──────────────
  const speak = useCallback(async (text) => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.resume();
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
        // Give Chrome audio thread 60ms to settle after cancellation
        await new Promise((r) => setTimeout(r, 60));
      }
    } catch (_) {}

    const voices = await getVoicesAsync();
    const langCode = language.split('-')[0];
    const isIndic = ['hi','ta','te','kn','ml','bn','gu','mr','pa'].includes(langCode);

    let voice = null;
    if (voices && voices.length > 0) {
      if (isIndic) {
        voice = voices.find(v => v.lang === language)
             || voices.find(v => v.lang.startsWith(langCode))
             || voices.find(v => v.lang.startsWith('en-IN'))
             || voices.find(v => v.lang.startsWith('en'))
             || voices[0];
      } else {
        voice = voices.find(v => v.lang === language)
             || voices.find(v => v.lang.startsWith(langCode))
             || voices[0];
      }
    }

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      if (voice) utterance.voice = voice;
      utterance.onend   = () => resolve();
      utterance.onerror = (e) => { 
        if (e.error !== 'interrupted') console.error('TTS error:', e.error); 
        resolve(); 
      };

      try {
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('speak failed:', err);
        resolve();
      }
    });
  }, [language]);

  // ── listen — waits 400ms after speak finishes before opening mic ──────────
  const listen = useCallback(() => {
    return new Promise((resolve) => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { console.error('SpeechRecognition not supported'); return resolve(''); }

      // 400ms gap so the TTS audio tail doesn't bleed into the mic
      setTimeout(() => {
        const recognition = new SR();
        recognition.lang = language;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        let resolved = false;
        const done = (val) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(tid);
            setIsMicActive(false);
            resolve(val);
          }
        };

        const tid = setTimeout(() => {
          try { recognition.abort(); } catch (_) {}
          done('');
        }, 14000);

        recognition.onstart  = () => setIsMicActive(true);
        recognition.onresult = (e) => done(e.results?.[0]?.[0]?.transcript?.toLowerCase().trim() || '');
        recognition.onerror  = (e) => { if (e.error !== 'aborted') console.error('STT:', e.error); done(''); };
        recognition.onend    = () => done('');

        try { recognition.start(); }
        catch (err) { console.error('recognition.start failed:', err); done(''); }
      }, 400);
    });
  }, [language]);

  return { speak, listen, isMicActive };
};
