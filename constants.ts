import type { Author } from './types';

export const AUTHORS: Author[] = [
    {
        id: 'hemingway',
        name: 'Ernest Hemingway',
        description: 'Crisp, observational, and understated prose. Short sentences, direct action, and emotional depth beneath the surface.',
        stylePrompt: "Rewrite the following in the literary style of Ernest Hemingway. Use short, declarative sentences. Show, don't tell. Focus on concrete details and actions. The prose should be clean, direct, and carry a sense of stoic emotional weight."
    },
    {
        id: 'marquez',
        name: 'Gabriel García Márquez',
        description: 'Magical realism. Blends fantastical elements with everyday reality, long winding sentences, and a rich, sensory narrative.',
        stylePrompt: "Transform the following into the magical realist style of Gabriel García Márquez. Weave fantastical elements into the ordinary. Use long, labyrinthine sentences that span generations. The tone should be both epic and intimate, with a sense of wonder and fate."
    },
    {
        id: 'austen',
        name: 'Jane Austen',
        description: 'Witty social commentary. Sharp, ironic observations on class, manners, and relationships, with elegant and balanced prose.',
        stylePrompt: "Adapt the following into the voice of Jane Austen. Employ witty irony and keen social observation. The prose must be elegant and balanced, focusing on matters of courtship, social standing, and the subtle interplay of character and manners. Use free indirect discourse to reveal characters' inner thoughts."
    },
    {
        id: 'woolf',
        name: 'Virginia Woolf',
        description: 'Lyrical and melancholic. Stream-of-consciousness, exploring the inner lives of characters with poetic and impressionistic language.',
        stylePrompt: "Render the following in the stream-of-consciousness style of Virginia Woolf. Delve into the characters' inner monologue, capturing fleeting thoughts, sensory details, and memories. The prose should be lyrical, poetic, and concerned with the passage of time and the nature of perception."
    },
    {
        id: 'tolstoy',
        name: 'Leo Tolstoy',
        description: 'Sprawling and detail-rich. Epic narratives, deep philosophical inquiries, and meticulous character development.',
        stylePrompt: "Reimagine the following in the epic, philosophical style of Leo Tolstoy. The narrative should be sweeping and detailed, with a focus on character psychology and grand historical themes. Explore the moral and spiritual questions underlying the events. The prose should be clear, detailed, and profound."
    },
    {
        id: 'yendamoori',
        name: 'Yendamoori Veerendranath',
        description: 'The Mind-Game Novelist. Psychological thrillers with intricate plots, philosophical undertones, and a sense of impending mystery.',
        stylePrompt: "Rewrite the following in the suspenseful, psychological style of Yendamoori Veerendranath. Weave in a sense of internal conflict and philosophical questioning. Use metaphors that evoke a feeling of mystery or fear. The atmosphere should be tense and introspective."
    },
    {
        id: 'malladi',
        name: 'Malladi Venkata Krishna Murthy',
        description: 'The Middle-Class Minstrel. Heartwarming and humorous tales of middle-class life with simple, relatable characters and nostalgic moments.',
        stylePrompt: "Transform the following into a warm, nostalgic narrative in the style of Malladi Venkata Krishna Murthy. Focus on the simple joys and gentle ironies of middle-class life. Evoke a sense of memory and comfort. The prose should be simple, heartwarming, and feel like a shared story."
    },
    {
        id: 'yerramsetti',
        name: 'Yerramsetti Sai',
        description: 'The Dialogue Dynamo. Known for sharp, witty, and impactful dialogue that reveals character and advances the plot with pace and precision.',
        stylePrompt: "Re-craft the following with a focus on sharp, impactful dialogue in the style of Yerramsetti Sai. The narrative should be minimal, letting the conversation carry the weight of the story. Each line should be precise, revealing character and creating tension or wit. Make every word count."
    }
];