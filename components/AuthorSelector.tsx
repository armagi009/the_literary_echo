import React from 'react';
import type { Author } from '../types';
import { AUTHORS } from '../constants';

interface AuthorSelectorProps {
    onSelect: (author: Author) => void;
}

const AuthorSelector: React.FC<AuthorSelectorProps> = ({ onSelect }) => {
    return (
        <div className="flex flex-col items-center">
            <h2 className="text-2xl font-semibold mb-2 text-gray-200">Invoke the Muse</h2>
            <p className="text-gray-400 mb-8 max-w-2xl text-center">Choose a literary master to guide your story. Their voice will shape your memoir, transforming your memories into a work of art.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
                {AUTHORS.map((author) => (
                    <div
                        key={author.id}
                        onClick={() => onSelect(author)}
                        className="author-card bg-gray-800 p-6 rounded-lg border border-gray-700 cursor-pointer hover:bg-gray-700 hover:border-teal-500"
                    >
                        <h3 className="text-xl font-bold text-teal-400 mb-2">{author.name}</h3>
                        <p className="text-gray-300 text-sm">{author.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AuthorSelector;
