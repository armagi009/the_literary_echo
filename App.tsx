import React, { useState } from 'react';
import type { Author } from './types';
import { AppState } from './types';
import AuthorSelector from './components/AuthorSelector';
import ConversationView from './components/ConversationView';

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>(AppState.SELECTING_AUTHOR);
    const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null);

    const handleAuthorSelect = (author: Author) => {
        setSelectedAuthor(author);
        setAppState(AppState.CONVERSING);
    };
    
    const handleBack = () => {
        setSelectedAuthor(null);
        setAppState(AppState.SELECTING_AUTHOR);
    }

    return (
        <div className="min-h-screen bg-[#111827] text-gray-100 font-serif">
            <header className="py-4 px-6 border-b border-gray-700 shadow-lg">
                <h1 className="text-3xl font-bold text-center tracking-wider">The Literary Echo</h1>
                <p className="text-center text-gray-400 text-sm">Your AI Biographer</p>
            </header>
            <main className="p-4 md:p-8">
                {appState === AppState.SELECTING_AUTHOR && (
                    <AuthorSelector onSelect={handleAuthorSelect} />
                )}
                {appState === AppState.CONVERSING && selectedAuthor && (
                    <ConversationView author={selectedAuthor} onBack={handleBack} />
                )}
            </main>
        </div>
    );
};

export default App;
