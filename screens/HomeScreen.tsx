import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { SunIcon, LightbulbIcon, ThermostatIcon, MusicIcon, MicIcon, SpeakerIcon, TrashIcon } from '../components/icons';
import Aura from '../components/Aura';
import { JarvisStatus } from '../types';

const textGlowStyle = "drop-shadow-[0_0_6px_rgba(255,215,0,0.7)] text-yellow-300";

interface HomeScreenProps {
  onConnect: () => void;
}

const WidgetCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <div className={`bg-gray-900/50 border border-yellow-400/20 rounded-lg p-4 backdrop-blur-sm transition-all duration-300 hover:border-yellow-400/50 flex flex-col ${className}`}>
    <h3 className={`text-yellow-400 font-bold tracking-widest uppercase mb-3 text-sm ${textGlowStyle}`}>{title}</h3>
    {children}
  </div>
);

const TopBar: React.FC = () => {
    const [time, setTime] = useState(new Date());
    const [selectedVoice, setSelectedVoice] = useState('Charon');

    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    useEffect(() => {
        const savedVoice = localStorage.getItem('jarvis_voice_preference');
        if (savedVoice) {
            setSelectedVoice(savedVoice);
        }
    }, []);

    const handleVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const voiceName = event.target.value;
        setSelectedVoice(voiceName);
        localStorage.setItem('jarvis_voice_preference', voiceName);
    };

    return (
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 text-sm md:text-base">
            <div className="flex items-center space-x-6">
                <div className={`${textGlowStyle} font-semibold`}>
                    {time.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="flex items-center space-x-2">
                     <SpeakerIcon />
                     <select
                        id="voice-select"
                        value={selectedVoice}
                        onChange={handleVoiceChange}
                        className={`bg-transparent border-0 text-yellow-300 focus:ring-0 focus:outline-none ${textGlowStyle} font-semibold`}
                        aria-label="Select Voice Profile"
                     >
                        <option value="Charon" className="bg-gray-900 text-yellow-300">Standard Male</option>
                        <option value="Kore" className="bg-gray-900 text-yellow-300">Female</option>
                    </select>
                </div>
            </div>
            <div className="flex items-center space-x-4">
                 <div className="flex items-center space-x-2">
                    <SunIcon />
                    <span className={`${textGlowStyle} font-semibold`}>72°F Sunny</span>
                </div>
                <div className={`${textGlowStyle} font-semibold`}>
                    {time.toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
};


const DailyOverviewWidget: React.FC<{className?: string}> = ({className}) => {
    const [quote, setQuote] = useState("Loading your daily inspiration...");

    useEffect(() => {
        const fetchQuote = async () => {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: "Generate a short, futuristic, and inspirational quote suitable for an AI assistant like JARVIS to display on a home screen.",
                });
                setQuote(response.text.trim().replace(/"/g, '').replace(/\*/g, ''));
            } catch (error) {
                console.error("Failed to fetch quote:", error);
                setQuote("The future is what you make of it."); // Fallback
            }
        };
        fetchQuote();
    }, []);

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning, Sir.";
        if (hour < 18) return "Good Afternoon, Sir.";
        return "Good Evening, Sir.";
    }

    return (
        <WidgetCard title="Daily Overview" className={className}>
            <h2 className={`text-2xl md:text-3xl mb-2 ${textGlowStyle}`}>{greeting()}</h2>
            <p className="text-gray-300 italic">"{quote}"</p>
        </WidgetCard>
    );
};

interface Task {
    id: number;
    text: string;
    completed: boolean;
}
const TasksWidget: React.FC<{className?: string}> = ({className}) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskText, setNewTaskText] = useState('');

    useEffect(() => {
        try {
            const savedTasks = localStorage.getItem('jarvis_tasks');
            if (savedTasks) {
                setTasks(JSON.parse(savedTasks));
            } else {
                 setTasks([
                    { id: 1, text: "Finalize Arc Reactor schematics", completed: true },
                    { id: 2, text: "Deploy Mark III upgrades", completed: false },
                ]);
            }
        } catch (error) {
            console.error("Failed to parse tasks from localStorage", error);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('jarvis_tasks', JSON.stringify(tasks));
    }, [tasks]);

    const handleToggleTask = (id: number) => {
        setTasks(tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task));
    };

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskText.trim()) {
            setTasks([...tasks, { id: Date.now(), text: newTaskText.trim(), completed: false }]);
            setNewTaskText('');
        }
    };

    const handleDeleteTask = (id: number) => {
        setTasks(tasks.filter(task => task.id !== id));
    };

    return (
        <WidgetCard title="Tasks & Reminders" className={className}>
            <div className="flex-grow overflow-y-auto pr-2">
                <ul className="space-y-2">
                    {tasks.map(task => (
                        <li key={task.id} className="flex items-center justify-between group">
                            <label className={`flex items-center space-x-3 cursor-pointer ${task.completed ? 'line-through text-gray-500' : ''}`}>
                                <input 
                                    type="checkbox" 
                                    checked={task.completed} 
                                    onChange={() => handleToggleTask(task.id)}
                                    className="form-checkbox h-4 w-4 bg-gray-700 border-yellow-400/50 text-yellow-400 rounded focus:ring-yellow-400"
                                />
                                <span>{task.text}</span>
                            </label>
                            <button onClick={() => handleDeleteTask(task.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <TrashIcon />
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            <form onSubmit={handleAddTask} className="flex space-x-2 mt-3 pt-3 border-t border-yellow-400/20">
                <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Add a new task..."
                    className="flex-grow bg-black/30 border border-yellow-400/30 rounded px-2 py-1 text-sm focus:ring-yellow-400 focus:border-yellow-400"
                />
                <button type="submit" className="bg-yellow-600/50 text-white px-3 rounded text-sm hover:bg-yellow-600">Add</button>
            </form>
        </WidgetCard>
    );
};

const MemoryWidget: React.FC<{ className?: string }> = ({ className }) => {
    const [memory, setMemory] = useState('');
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        const savedMemory = localStorage.getItem('jarvis_memory') || '';
        setMemory(savedMemory);
    }, []);

    const handleSave = () => {
        localStorage.setItem('jarvis_memory', memory);
        setFeedback('Memory Matrix Updated.');
        setTimeout(() => setFeedback(''), 2000);
    };

    const handleClear = () => {
        localStorage.removeItem('jarvis_memory');
        setMemory('');
        setFeedback('Memory Matrix Cleared.');
        setTimeout(() => setFeedback(''), 2000);
    };

    return (
        <WidgetCard title="Memory Matrix" className={className}>
            <textarea
                value={memory}
                onChange={(e) => setMemory(e.target.value)}
                placeholder="No conversational memory stored."
                className="flex-grow bg-black/30 border border-yellow-400/30 rounded p-2 text-sm w-full h-24 resize-none focus:ring-yellow-400 focus:border-yellow-400"
            />
            <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-green-400 h-4">{feedback}</span>
                <div className="space-x-2">
                    <button onClick={handleSave} className="bg-yellow-600/50 text-white px-3 py-1 rounded text-xs hover:bg-yellow-600">Save</button>
                    <button onClick={handleClear} className="bg-red-600/50 text-white px-3 py-1 rounded text-xs hover:bg-red-600">Clear</button>
                </div>
            </div>
        </WidgetCard>
    );
};

const SmartHomeWidget: React.FC<{className?: string}> = ({className}) => {
    const [lightsOn, setLightsOn] = useState(true);
    const [workshopLightsOn, setWorkshopLightsOn] = useState(false);

    return (
         <WidgetCard title="Smart Home Control" className={className}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="flex flex-col items-center justify-center p-2 rounded-md bg-black/20">
                    <LightbulbIcon />
                    <span className="text-sm mt-1">Living Room</span>
                    <button onClick={() => setLightsOn(!lightsOn)} className={`mt-2 px-3 py-1 text-xs rounded-full transition-colors ${lightsOn ? 'bg-yellow-400 text-black' : 'bg-gray-600 text-white'}`}>{lightsOn ? 'ON' : 'OFF'}</button>
                </div>
                 <div className="flex flex-col items-center justify-center p-2 rounded-md bg-black/20">
                    <ThermostatIcon />
                    <span className="text-sm mt-1">Thermostat</span>
                    <span className="text-lg font-bold">70°F</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-md bg-black/20">
                    <MusicIcon />
                    <span className="text-sm mt-1">Music</span>
                    <span className="text-lg font-bold">PLAYING</span>
                </div>
                 <div className="flex flex-col items-center justify-center p-2 rounded-md bg-black/20">
                    <LightbulbIcon />
                    <span className="text-sm mt-1">Workshop</span>
                    <button onClick={() => setWorkshopLightsOn(!workshopLightsOn)} className={`mt-2 px-3 py-1 text-xs rounded-full transition-colors ${workshopLightsOn ? 'bg-yellow-400 text-black' : 'bg-gray-600 text-white'}`}>{workshopLightsOn ? 'ON' : 'OFF'}</button>
                </div>
            </div>
        </WidgetCard>
    );
};

const HomeScreen: React.FC<HomeScreenProps> = ({ onConnect }) => {
  return (
    <div className="relative w-full h-screen overflow-y-auto bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white flex flex-col items-center font-mono p-4">
        {/* Central Aura Background */}
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none">
            <Aura status={JarvisStatus.IDLE} />
        </div>

        <TopBar />
        
        <main className="z-10 w-full max-w-5xl mt-16 mb-28 flex-grow">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <DailyOverviewWidget className="md:col-span-4" />
                <TasksWidget className="md:col-span-2" />
                <MemoryWidget className="md:col-span-2" />
                <SmartHomeWidget className="md:col-span-4"/>
            </div>
        </main>
        
        <div className="sticky bottom-10 z-20 mt-auto">
            <button 
                onClick={onConnect} 
                className="w-24 h-24 bg-yellow-400/20 rounded-full flex items-center justify-center border-2 border-yellow-400/50 text-yellow-300
                hover:bg-yellow-400/40 hover:text-white hover:border-yellow-400 transition-all duration-300 animate-[subtle-glow_3s_ease-in-out_infinite]"
                aria-label="Connect to JARVIS"
            >
                <MicIcon />
            </button>
        </div>
        
        <div className="fixed bottom-2 right-4 text-xs text-gray-500 z-10">
            Made by Divy and Dharmendra
        </div>
    </div>
  );
};

export default HomeScreen;