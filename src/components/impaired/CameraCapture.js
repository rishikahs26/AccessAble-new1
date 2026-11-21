import React, { useRef, useEffect, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { useAssistant } from '../../hooks/useAssistant';

const CameraCapture = ({ onCapture, onClose, language }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [countdown, setCountdown] = useState(5);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const { speak } = useAssistant(language);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      // Announce camera ready
      await speak('Camera activated. Position document in view. Auto-capture in 5 seconds. Press Space to capture now, or Escape to cancel.');

      // Start countdown after 1 second
      setTimeout(() => {
        startCountdown();
      }, 1000);

    } catch (err) {
      console.error('Camera error:', err);
      setCameraError(true);
      await speak('Camera access denied or not available. Please grant camera permission or use file upload instead.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const startCountdown = () => {
    let count = 5;
    const timer = setInterval(() => {
      count--;
      setCountdown(count);

      // Announce countdown for last 3 seconds
      if (count <= 3 && count > 0) {
        speak(String(count));
      }

      if (count === 0) {
        clearInterval(timer);
        captureImage();
      }
    }, 1000);
  };

  const captureImage = async () => {
    if (isCapturing || !videoRef.current) return;
    
    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // Convert to blob
      canvas.toBlob(async (blob) => {
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }

        await speak('Image captured. Processing document. Please hold.');
        
        // Stop camera
        stopCamera();
        
        // Send captured image to parent
        onCapture(blob);
        
      }, 'image/jpeg', 0.95);

    } catch (err) {
      console.error('Capture error:', err);
      await speak('Capture failed. Please try again.');
      setIsCapturing(false);
    }
  };

  const handleManualCapture = () => {
    if (countdown > 0) {
      captureImage();
    }
  };

  const handleClose = async () => {
    stopCamera();
    await speak('Camera closed.');
    onClose();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        handleManualCapture();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [countdown, isCapturing]);

  if (cameraError) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-6">
        <div className="bg-zinc-900 border-4 border-yellow-400 rounded-3xl p-8 max-w-2xl text-center space-y-6">
          <div className="text-yellow-400 text-6xl">⚠️</div>
          <h2 className="text-white text-3xl font-black uppercase">Camera Not Available</h2>
          <p className="text-yellow-400 text-xl font-bold">
            Camera access was denied or your device doesn't have a camera.
            Please use the file upload option instead.
          </p>
          <button
            onClick={handleClose}
            className="bg-yellow-400 text-black px-8 py-4 rounded-xl text-xl font-black uppercase hover:bg-yellow-300 transition-all"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black to-transparent z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-yellow-400">
            <Camera size={32} />
            <span className="text-2xl font-black uppercase">Document Capture</span>
          </div>
          <button
            onClick={handleClose}
            className="bg-red-500 text-white px-6 py-3 rounded-xl font-black uppercase hover:bg-red-600 transition-all flex items-center gap-2"
            aria-label="Close camera. Press Escape"
          >
            <X size={24} />
            CANCEL (ESC)
          </button>
        </div>
      </div>

      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        aria-label="Camera viewfinder"
      />

      {/* Document Frame Guide */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="border-4 border-yellow-400 rounded-2xl w-4/5 h-3/5 relative">
          {/* Corner guides */}
          <div className="absolute top-0 left-0 w-16 h-16 border-l-8 border-t-8 border-white rounded-tl-2xl"></div>
          <div className="absolute top-0 right-0 w-16 h-16 border-r-8 border-t-8 border-white rounded-tr-2xl"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 border-l-8 border-b-8 border-white rounded-bl-2xl"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 border-r-8 border-b-8 border-white rounded-br-2xl"></div>
          
          {/* Instructions */}
          <div className="absolute -top-12 sm:-top-16 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 px-4 sm:px-6 py-2 sm:py-3 rounded-xl border-2 border-yellow-400">
            <p className="text-yellow-400 font-black text-xs sm:text-sm md:text-base lg:text-lg uppercase whitespace-nowrap">
              <span className="hidden md:inline">Position Document Inside Frame</span>
              <span className="md:hidden">Position Document</span>
            </p>
          </div>
        </div>
      </div>

      {/* Countdown Display */}
      {countdown > 0 && !isCapturing && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="text-yellow-400 text-7xl sm:text-8xl md:text-9xl lg:text-[12rem] font-black drop-shadow-[0_0_30px_rgba(250,204,21,0.8)] animate-pulse">
            {countdown}
          </div>
        </div>
      )}

      {/* Capturing Indicator */}
      {isCapturing && (
        <div className="absolute inset-0 bg-white animate-flash pointer-events-none"></div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent">
        <div className="flex flex-col items-center gap-4">
          {/* Status Text */}
          <div className="bg-black bg-opacity-75 px-4 py-3 rounded-xl border-2 border-yellow-400">
            <p className="text-yellow-400 font-black text-sm sm:text-base md:text-lg uppercase text-center">
              {isCapturing ? 'Capturing...' : countdown > 0 ? (
                <>
                  <span className="hidden sm:inline">Auto-capture in </span>
                  {countdown}
                  <span className="sm:hidden">...</span>
                  <span className="hidden sm:inline">...</span>
                </>
              ) : 'Processing...'}
            </p>
          </div>

          {/* Manual Capture Button */}
          {countdown > 0 && !isCapturing && (
            <button
              onClick={handleManualCapture}
              className="bg-yellow-400 text-black px-6 sm:px-8 md:px-12 py-4 sm:py-5 md:py-6 rounded-full text-lg sm:text-xl md:text-2xl lg:text-3xl font-black uppercase hover:bg-yellow-300 transition-all active:scale-95 shadow-2xl border-4 border-white"
              aria-label="Capture now. Press Spacebar"
            >
              <span>📷 CAPTURE NOW</span>
              <span className="hidden sm:inline"> (SPACE)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
