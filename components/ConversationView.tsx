import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality } from '@google/genai';
import type { Author, ConversationTurn } from '../types';
import { CONVERSATION_MAP } from '../constants';
import { encode, decode, decodeAudioData } from '../utils/audio';

// Define a type for Blob to align with Gemini's expectation
interface CustomBlob {
    data: string;
    mimeType: string;
}

const ConversationView: React.FC<{ author: Author, onBack: () => void }> = ({ author, onBack }) => {
    const [isLive, setIsLive] = useState(false);
    const [status, setStatus] = useState('Idle');
    const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
    const [archive, setArchive] = useState<string[]>([]);
    const [isWeaving, setIsWeaving] = useState(false);
    const [topicIndex, setTopicIndex] = useState(0);
    
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    // Refs for managing audio resources
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const inputStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);


    const getOpeningLine = useCallback(async () => {
        setStatus('Setting the mood...');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Write a single, stylistically perfect sentence about the current time of day, as ${author.name} would have described it.`,
            });
            setArchive([response.text]);
        } catch (error) {
            console.error("Error getting opening line:", error);
            setArchive([`Could not channel ${author.name}. Let's begin nonetheless.`]);
        }
        setStatus('Ready to begin. Press Start.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [author.name]);
    
    useEffect(() => {
        getOpeningLine();
    }, [getOpeningLine]);

    const playAudio = useCallback(async (base64Audio: string) => {
        if (!outputAudioContextRef.current) {
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const outputAudioContext = outputAudioContextRef.current;
        const nextStartTime = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
        const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
        const source = outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputAudioContext.destination);
        source.addEventListener('ended', () => {
            sourcesRef.current.delete(source);
        });
        source.start(nextStartTime);
        nextStartTimeRef.current = nextStartTime + audioBuffer.duration;
        sourcesRef.current.add(source);
    }, []);

    const askNextQuestion = useCallback(async () => {
        if (topicIndex >= CONVERSATION_MAP.length) {
            setStatus("We've covered a wonderful journey. Feel free to continue sharing, or we can weave this narrative together.");
            return;
        }
        
        const currentTopic = CONVERSATION_MAP[topicIndex];
        setStatus(`The Archivist is asking about "${currentTopic.topic}"...`);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            
            // 1. Generate the question text
            const questionGenResponse = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: `${currentTopic.prompt} Frame the question in the first person, as if you are the biographer speaking directly to the user. Make it sound natural and empathetic, in the style of ${author.name}.`,
            });
            const questionText = questionGenResponse.text;
            setTranscript(prev => [...prev, { speaker: 'ai', text: questionText }]);

            // 2. Generate audio for the question
            const ttsResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: questionText }] }],
                config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                },
            });

            const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                await playAudio(base64Audio);
            }
            setStatus('Listening...');
        } catch (error) {
            console.error("Error asking next question:", error);
            setStatus("There was a brief silence. Let's try again. Listening...");
        }
    }, [topicIndex, author.name, playAudio]);

    const generateStyledProse = useCallback(async (memory: string) => {
        setStatus('The archivist is writing...');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: `${author.stylePrompt}\n\nUser's memory: "${memory}"`,
                config: { thinkingConfig: { thinkingBudget: 32768 } }
            });
            setArchive(prev => [...prev, response.text]);
        } catch (error) {
            console.error("Error generating styled prose:", error);
            setArchive(prev => [...prev, `[Error transforming memory: ${memory}]`]);
        }
        setTopicIndex(prev => prev + 1);
    }, [author.stylePrompt]);

    useEffect(() => {
        if(isLive && topicIndex > 0 && topicIndex <= CONVERSATION_MAP.length) {
            askNextQuestion();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [topicIndex, isLive]);


    const handleMessage = async (message: LiveServerMessage) => {
        let inputUpdated = false;

        if (message.serverContent?.inputTranscription) {
            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
            inputUpdated = true;
        }
        
        if (inputUpdated) {
             setTranscript(prev => {
                const newTranscript = [...prev];
                const lastTurn = newTranscript[newTranscript.length - 1];
                if (lastTurn?.speaker === 'user') {
                    lastTurn.text = currentInputTranscriptionRef.current;
                } else {
                    newTranscript.push({ speaker: 'user', text: currentInputTranscriptionRef.current });
                }
                return newTranscript;
            });
        }
        

        if (message.serverContent?.turnComplete) {
            const userMemory = currentInputTranscriptionRef.current;
            currentInputTranscriptionRef.current = '';
            currentOutputTranscriptionRef.current = ''; // Reset AI transcript too, as it's not used in this flow
            if (userMemory.trim().length > 10) { // Only process if there's substantial input
                await generateStyledProse(userMemory); // This will trigger the useEffect for the next question
            } else {
                // If the user didn't say much, just ask the next question without saving.
                setTopicIndex(prev => prev + 1);
            }
        }

        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio) {
            await playAudio(base64Audio);
        }

        if (message.serverContent?.interrupted) {
            for (const source of sourcesRef.current.values()) {
                source.stop();
                sourcesRef.current.delete(source);
            }
            nextStartTimeRef.current = 0;
        }
    };

    const startConversation = async () => {
        setStatus('Connecting...');
        setIsLive(true);
        setTopicIndex(0); // Reset to the beginning

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            inputStreamRef.current = stream;

            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            inputAudioContextRef.current = inputAudioContext;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        askNextQuestion(); // Ask the first question
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;
                        
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: CustomBlob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(v => v * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: handleMessage,
                    onerror: (e) => {
                        console.error('Session error:', e);
                        setStatus('Error occurred.');
                        stopConversation();
                    },
                    onclose: () => {
                        console.log('Session closed.');
                        stopConversation(); // Clean up resources when session closes
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    systemInstruction: `You are an Empathetic Archivist, a patient and insightful biographer. Your main role in this live session is to listen intently to the user's spoken memories and provide an accurate transcription. Do not ask questions or make comments. The main application will guide the conversation.`,
                },
            });

        } catch (error) {
            console.error('Failed to start conversation:', error);
            setStatus('Error: Could not access microphone.');
            setIsLive(false);
        }
    };

    const stopConversation = useCallback(async () => {
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (error) {
                console.error('Error closing session:', error);
            }
        }
        sessionPromiseRef.current = null;
    
        // Stop microphone input
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (inputStreamRef.current) {
            inputStreamRef.current.getTracks().forEach(track => track.stop());
            inputStreamRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            await inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }
    
        // Stop audio output
        for (const source of sourcesRef.current.values()) {
            try { source.stop(); } catch (e) { /* Already stopped */ }
        }
        sourcesRef.current.clear();
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            await outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
        nextStartTimeRef.current = 0;
    
        if (isLive) {
            setIsLive(false);
            setStatus('Idle');
        }
    }, [isLive]);

    const weaveNarrative = async () => {
        setIsWeaving(true);
        setStatus('Weaving the narrative...');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const prompt = `You are an editor working in the style of ${author.name}. You have the following collection of memories from a user's life:\n\n${archive.join('\n\n')}\n\nYour task is to find a connecting theme or a narrative thread among these disparate memories. Write a short, insightful paragraph suggesting how these could be woven together into a chapter. For example, suggest a chapter title or a thematic link. Address the user directly in your suggestion. Your analysis should be as perceptive as the author you are emulating.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: { thinkingConfig: { thinkingBudget: 32768 } }
            });

            setArchive(prev => [...prev, `ARCHIVIST'S NOTE: ${response.text}`]);
        } catch (error) {
            console.error("Error weaving narrative:", error);
            setArchive(prev => [...prev, `[Error weaving narrative. Please try again.]`]);
        }
        setStatus('Idle');
        setIsWeaving(false);
    };

    useEffect(() => {
      // Cleanup on unmount
      return () => {
        stopConversation();
      }
    }, [stopConversation]);
    
    return (
        <div className="flex flex-col h-[calc(100vh-150px)]">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <button onClick={onBack} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors">
                       <i className="fas fa-arrow-left mr-2"></i>Change Author
                    </button>
                    <button 
                        onClick={weaveNarrative}
                        disabled={archive.length < 3 || isWeaving || isLive}
                        className="ml-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        <i className="fas fa-magic mr-2"></i>Weave Narrative
                    </button>
                </div>
                 <div className="text-center">
                    <h2 className="text-xl font-bold text-teal-400">In Conversation with {author.name}</h2>
                    <p className="text-sm text-gray-400">{status}</p>
                </div>
                <button
                    onClick={isLive ? stopConversation : startConversation}
                    className={`font-bold py-2 px-6 rounded-full text-lg transition-all duration-300 flex items-center gap-2 ${
                        isLive 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-teal-500 hover:bg-teal-600 text-gray-900'
                    }`}
                >
                    {isLive ? <><i className="fas fa-stop-circle"></i> Stop</> : <><i className="fas fa-microphone-alt"></i> Start</>}
                </button>
            </div>

            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
                <div className="bg-gray-800 rounded-lg p-4 flex flex-col border border-gray-700 overflow-hidden">
                    <h3 className="text-lg font-semibold mb-2 border-b border-gray-600 pb-2 flex-shrink-0">Living Transcript</h3>
                    <div className="flex-grow overflow-y-auto pr-2">
                        {transcript.map((turn, index) => (
                            <div key={index} className={`mb-4 ${turn.speaker === 'user' ? 'text-left' : 'text-left'}`}>
                                <p className={`text-sm font-bold mb-1 ${turn.speaker === 'user' ? 'text-blue-400' : 'text-teal-400'}`}>
                                    {turn.speaker === 'user' ? 'You' : 'Archivist'}
                                </p>
                                <p className="text-gray-300">{turn.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 flex flex-col border border-gray-700 overflow-hidden">
                    <h3 className="text-lg font-semibold mb-2 border-b border-gray-600 pb-2 flex-shrink-0">The Archive</h3>
                    <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                        {archive.map((text, index) => (
                            <p key={index} className="text-gray-200 leading-relaxed border-l-2 border-teal-500 pl-4 italic">
                                {text.startsWith("ARCHIVIST'S NOTE:") ? 
                                    <span className="text-purple-300 not-italic"><strong className="font-bold">Archivist's Note:</strong>{text.substring(18)}</span> 
                                    : text
                                }
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConversationView;