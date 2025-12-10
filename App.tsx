import React, { useState } from 'react';
import HomeScreen from './screens/HomeScreen';
import ConversationScreen from './screens/ConversationScreen';

const App: React.FC = () => {
    const [view, setView] = useState<'home' | 'conversation'>('home');

    if (view === 'conversation') {
        return <ConversationScreen onDisconnect={() => setView('home')} />;
    }

    return <HomeScreen onConnect={() => setView('conversation')} />;
};

export default App;