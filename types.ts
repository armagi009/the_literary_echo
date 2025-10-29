export interface Author {
    id: string;
    name: string;
    description: string;
    stylePrompt: string;
}

export enum AppState {
    SELECTING_AUTHOR,
    CONVERSING,
}

export interface ConversationTurn {
    speaker: 'user' | 'ai';
    text: string;
}
