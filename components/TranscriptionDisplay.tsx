
import React, { useEffect, useRef } from 'react';
import { Transcript } from '../types';

interface TranscriptionDisplayProps {
  transcripts: Transcript[];
}

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ transcripts }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const textGlowStyle = "drop-shadow-[0_0_6px_rgba(255,215,0,0.7)] text-yellow-300";

  return (
    <div className="w-full max-w-4xl h-full flex flex-col space-y-4 p-4 overflow-y-auto">
      {transcripts.map((t) => (
        <div
          key={t.id}
          className={`flex flex-col ${t.speaker === 'USER' ? 'items-end' : 'items-start'}`}
        >
          <div
            className={`px-4 py-2 rounded-lg max-w-prose ${
              t.speaker === 'USER'
                ? 'bg-gray-800/50'
                : 'bg-yellow-900/30'
            }`}
          >
            <p className={`text-base md:text-lg leading-relaxed ${textGlowStyle} ${!t.isFinal ? 'opacity-70' : ''}`}>
              {t.text}
            </p>
          </div>
        </div>
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
};

export default TranscriptionDisplay;
