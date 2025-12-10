import React, { useState, useRef, useCallback, useEffect } from 'react';
// Fix: The type `Connection` is not exported from `@google/genai`.
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { JarvisStatus, Transcript } from '../types';
import { createBlob, decode, decodeAudioData } from '../utils/audio';
import Aura from '../components/Aura';
import TranscriptionDisplay from '../components/TranscriptionDisplay';

const JARVIS_SYSTEM_INSTRUCTION = `You are JARVIS, an advanced, voice-enabled AI assistant inspired by Tony Stark’s digital companion. You combine the intelligence and capability of Alexa, Google Assistant, and Siri — with a futuristic, glowing yellow aesthetic, and a friendly, emotionally intelligent personality. Your voice should be smooth, calm, and confident. Greet the user based on the time of day when they first connect. Be helpful and proactive, with a touch of wit and charm. Always confirm user actions clearly. Your responses should be concise and conversational.`;

const summarizeConversation = async (conversation: Transcript[]): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const formattedTranscript = conversation
        .map(t => `${t.speaker}: ${t.text}`)
        .join('\n');
    
    const prompt = `You are a summarization model. Briefly summarize the key points of the following conversation between a USER and JARVIS. Focus on facts, user requests, and JARVIS's commitments. Keep it concise, like a memory file for an AI. The summary will be used to give JARVIS context for the next conversation.\n\nCONVERSATION:\n${formattedTranscript}\n\nSUMMARY:`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Failed to summarize conversation:", error);
        return "";
    }
};

interface ConversationScreenProps {
  onDisconnect: () => void;
}

const ConversationScreen: React.FC<ConversationScreenProps> = ({ onDisconnect }) => {
  const [status, setStatus] = useState<JarvisStatus>(JarvisStatus.IDLE);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Fix: The type `Connection` is not exported from `@google/genai`. The live session object type is not exported, so using `any`.
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptIdCounterRef = useRef<number>(0);
  const currentInputTranscriptRef = useRef<string>('');
  const currentOutputTranscriptRef = useRef<string>('');
  
  const transcriptsRef = useRef(transcripts);
  useEffect(() => {
    transcriptsRef.current = transcripts;
  }, [transcripts]);
  
  useEffect(() => {
      if (gainNodeRef.current) {
          gainNodeRef.current.gain.value = isMuted ? 0 : 1;
      }
  }, [isMuted]);


  const handleDisconnect = useCallback(async () => {
    setStatus(JarvisStatus.IDLE);
    setIsConnected(false);

    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (e) {
            console.warn("Error closing session:", e)
        } finally {
            sessionPromiseRef.current = null;
        }
    }
    
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }

    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close();
    }

    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    gainNodeRef.current = null;

    if (transcriptsRef.current.length > 1) {
        console.log("Summarizing conversation to create memory...");
        const summary = await summarizeConversation(transcriptsRef.current);
        if (summary) {
            localStorage.setItem('jarvis_memory', summary);
            console.log("Memory saved.");
        }
    }

    setTranscripts([]);
    onDisconnect();

  }, [onDisconnect]);

  const handleConnect = useCallback(async () => {
    if (isConnected || sessionPromiseRef.current) return;
    
    setStatus(JarvisStatus.PROCESSING);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      gainNodeRef.current = outputAudioContextRef.current.createGain();
      gainNodeRef.current.connect(outputAudioContextRef.current.destination);
      gainNodeRef.current.gain.value = isMuted ? 0 : 1;

      nextStartTimeRef.current = 0;
      transcriptIdCounterRef.current = 0;
      currentInputTranscriptRef.current = '';
      currentOutputTranscriptRef.current = '';

      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const currentDate = new Date().toLocaleString('en-US', {
        timeZone: userTimeZone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const locationContext = `\n\n--- USER CONTEXT ---\nThe user's current timezone is ${userTimeZone}. The current date and time is ${currentDate}. You must use this information to accurately answer any questions related to time and date.`;

      const memory = localStorage.getItem('jarvis_memory');
      let systemInstruction = JARVIS_SYSTEM_INSTRUCTION + locationContext;
      if (memory) {
        systemInstruction += `\n\n--- PREVIOUS CONVERSATION SUMMARY ---\nYou should use this summary to inform your responses and maintain context. The user is continuing the conversation.\n${memory}`;
      }
      
      const preferredVoice = localStorage.getItem('jarvis_voice_preference') || 'Charon';

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          systemInstruction: systemInstruction,
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: preferredVoice },
            },
          },
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setStatus(JarvisStatus.LISTENING);
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              // Fix: Per Gemini API guidelines, we must use the promise to send data to avoid race conditions and stale closures.
              // The non-null assertion is safe here because this callback is only active when a session promise exists.
              sessionPromiseRef.current!.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
                setStatus(JarvisStatus.LISTENING);
                const text = message.serverContent.inputTranscription.text;
                currentInputTranscriptRef.current += text;
                setTranscripts(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.speaker === 'USER' && !last.isFinal) {
                        return [...prev.slice(0, -1), { ...last, text: currentInputTranscriptRef.current }];
                    }
                    return [...prev, { id: transcriptIdCounterRef.current++, speaker: 'USER', text: currentInputTranscriptRef.current, isFinal: false }];
                });
            }

            if (message.serverContent?.outputTranscription) {
                setStatus(JarvisStatus.SPEAKING);
                const text = message.serverContent.outputTranscription.text;
                currentOutputTranscriptRef.current += text;
                setTranscripts(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.speaker === 'JARVIS' && !last.isFinal) {
                        return [...prev.slice(0, -1), { ...last, text: currentOutputTranscriptRef.current }];
                    }
                    return [...prev, { id: transcriptIdCounterRef.current++, speaker: 'JARVIS', text: currentOutputTranscriptRef.current, isFinal: false }];
                });
            }

            if(message.serverContent?.turnComplete) {
                setStatus(JarvisStatus.LISTENING);
                setTranscripts(prev => prev.map(t => ({...t, isFinal: true})));
                currentInputTranscriptRef.current = '';
                currentOutputTranscriptRef.current = '';
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (audioData) {
              const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current!, 24000, 1);
              const source = outputAudioContextRef.current!.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(gainNodeRef.current!);

              source.addEventListener('ended', () => {
                  audioSourcesRef.current.delete(source);
                  if (audioSourcesRef.current.size === 0) {
                      setStatus(JarvisStatus.LISTENING);
                  }
              });

              const currentTime = outputAudioContextRef.current!.currentTime;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
                audioSourcesRef.current.forEach(source => source.stop());
                audioSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('An error occurred:', e);
            setStatus(JarvisStatus.ERROR);
            handleDisconnect();
          },
          onclose: (e: CloseEvent) => {
            console.log('Connection closed.');
            handleDisconnect();
          },
        }
      });
    } catch (error) {
        console.error("Failed to start session:", error);
        setStatus(JarvisStatus.ERROR);
    }
  }, [isConnected, handleDisconnect, isMuted]);

  useEffect(() => {
    handleConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white flex flex-col items-center justify-center font-mono">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <Aura status={status} />
        </div>
        <div className="absolute top-0 w-full h-3/5 flex justify-center pt-8 md:pt-16 z-10">
            <TranscriptionDisplay transcripts={transcripts} />
        </div>
        <div className="absolute bottom-0 w-full p-8 flex justify-center z-20">
            {isConnected ? (
                <div className="flex items-center space-x-6">
                    <button
                        onClick={() => setIsMuted(prev => !prev)}
                        className="px-6 py-3 bg-gray-700 text-white font-bold text-lg rounded-full uppercase tracking-widest shadow-[0_0_15px_rgba(150,150,150,0.4)] hover:bg-gray-600 hover:shadow-[0_0_25px_rgba(150,150,150,0.6)] transition-all duration-300"
                    >
                        {isMuted ? 'Unmute' : 'Mute'}
                    </button>
                    <button
                        onClick={handleDisconnect}
                        className="px-8 py-4 bg-red-600 text-white font-bold text-xl rounded-full uppercase tracking-widest shadow-[0_0_20px_rgba(255,0,0,0.5)] hover:bg-red-500 hover:shadow-[0_0_30px_rgba(255,0,0,0.8)] transition-all duration-300"
                    >
                        Disconnect
                    </button>
                </div>
            ) : (
                <div className="text-yellow-400 text-xl uppercase tracking-widest animate-pulse">
                     Establishing Connection...
                </div>
            )}
        </div>
        
        <div className="absolute bottom-2 right-4 text-xs text-gray-500 z-10">
            Made by Divy and Dharmendra
        </div>

        {status === JarvisStatus.ERROR && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-800/80 text-white px-4 py-2 rounded-md z-30">
                Connection Error. Please try again.
            </div>
        )}
    </div>
  );
};

export default ConversationScreen;