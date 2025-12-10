import React, { useState, useEffect, useRef } from 'react';
import { JarvisStatus } from '../types';

interface AuraProps {
  status: JarvisStatus;
}

const Aura: React.FC<AuraProps> = ({ status }) => {
  // Fix: Pass an initial value to useRef to fix "Expected 1 arguments, but got 0" error.
  const prevStatusRef = useRef<JarvisStatus | undefined>(undefined);
  const [wasProcessing, setWasProcessing] = useState(false);
  const [wasSpeaking, setWasSpeaking] = useState(false);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;

    const prevIsProcessing = prevStatus === JarvisStatus.PROCESSING || prevStatus === JarvisStatus.LISTENING;
    const isCurrentlyProcessing = status === JarvisStatus.PROCESSING || status === JarvisStatus.LISTENING;

    if (prevIsProcessing && !isCurrentlyProcessing) {
      setWasProcessing(true);
      setTimeout(() => setWasProcessing(false), 500);
    }

    if (prevStatus === JarvisStatus.SPEAKING && status !== JarvisStatus.SPEAKING) {
      setWasSpeaking(true);
      setTimeout(() => setWasSpeaking(false), 1000);
    }
    
    prevStatusRef.current = status;
  }, [status]);


  const isIdle = status === JarvisStatus.IDLE;
  const isProcessing = status === JarvisStatus.PROCESSING || status === JarvisStatus.LISTENING;
  const isSpeaking = status === JarvisStatus.SPEAKING;

  const showProcessingParticles = isProcessing || wasProcessing;
  const showSpeakingParticles = isSpeaking || wasSpeaking;

  const auraBaseClasses = "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500 ease-in-out";

  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80">
      {/* Outer Glow */}
      <div
        className={`${auraBaseClasses} bg-yellow-400/30 filter blur-2xl ${isIdle ? 'w-64 h-64 md:w-80 md:h-80 animate-pulse' : ''} ${isProcessing ? 'w-72 h-72 md:w-96 md:h-96' : ''} ${isSpeaking ? 'w-80 h-80 md:w-[28rem] md:h-[28rem]' : 'w-64 h-64 md:w-80 md:h-80'}`}
      ></div>

      {/* Inner Core */}
      <div
        className={`${auraBaseClasses} bg-yellow-400/80 filter blur-lg ${isIdle ? 'w-32 h-32 md:w-40 md:h-40 animate-pulse' : ''} ${isProcessing ? 'w-36 h-36 md:w-48 md:h-48' : ''} ${isSpeaking ? 'w-40 h-40 md:w-56 md:h-56' : 'w-32 h-32 md:w-40 md:h-40'}`}
      ></div>
      
      {/* Center Point */}
      <div className={`${auraBaseClasses} w-4 h-4 bg-white rounded-full`}></div>
      
      {/* Processing Particles */}
      {showProcessingParticles && (
        <div className={`absolute inset-0 w-full h-full animate-spin [animation-duration:10s] transition-opacity duration-500 ${isProcessing ? 'opacity-100' : 'opacity-0'}`}>
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 bg-yellow-300 rounded-full"
              style={{
                top: `${50 + 45 * Math.sin((2 * Math.PI * i) / 15)}%`,
                left: `${50 + 45 * Math.cos((2 * Math.PI * i) / 15)}%`,
                transform: 'translate(-50%, -50%)',
                animation: `particle-float ${2 + Math.random() * 2}s ease-in-out infinite alternate`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            ></div>
          ))}
        </div>
      )}

      {/* Speaking Particles */}
      {showSpeakingParticles && (
        <div className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${isSpeaking ? 'opacity-100' : 'opacity-0'}`}>
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2"
              style={{
                transform: `rotate(${(360 / 20) * i}deg)`,
              }}
            >
              <div
                className="w-2 h-2 bg-yellow-200 rounded-full"
                style={{
                  animation: `spiral-out 2.5s ease-out infinite`,
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Aura;