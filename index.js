import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sharjeelInfo, myProjects } from './data.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Build a full context string from our data to inject into the system prompt
const portfolioContext = `
DEVELOPER INFO:
Name: ${sharjeelInfo.name}
Role: ${sharjeelInfo.role}
Skills: ${sharjeelInfo.skills.join(', ')}
Contact Email: ${sharjeelInfo.contactEmail}
Availability: ${sharjeelInfo.availability}

PROJECTS:
${myProjects.map(p => `- ${p.title}: ${p.description} (Tech: ${p.tech.join(', ')})`).join('\n')}
`;

// System instruction for the AI
const systemInstruction = `You are the official AI assistant for Sharjeel's portfolio website.
You are helpful, professional, and slightly enthusiastic.
Only answer questions about Sharjeel's professional background, skills, and projects.
If someone asks something unrelated, politely redirect them to ask about Sharjeel's work.
If you don't know something specific, say so and provide his email (${sharjeelInfo.contactEmail}).

Here is Sharjeel's complete professional information to answer questions with:
${portfolioContext}`;

// The Main AI Chat Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        // Initialize Gemini model with system instruction
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: systemInstruction,
        });

        // Convert frontend chat history format to Gemini format
        // Frontend uses { role: 'ai', content: '...' } and { role: 'user', content: '...' }
        // Gemini uses { role: 'model', parts: [{ text: '...' }] } and { role: 'user', parts: [{ text: '...' }] }
        const geminiHistory = history
            .filter(m => m.role === 'user' || m.role === 'ai')
            .map(m => ({
                role: m.role === 'ai' ? 'model' : 'user',
                parts: [{ text: m.content }],
            }));

        // Start a chat session with history
        const chat = model.startChat({ history: geminiHistory });

        // Send the new message
        const result = await chat.sendMessage(message);
        const reply = result.response.text();

        res.json({ reply });

    } catch (error) {
        console.error('AI Error:', error.message);
        res.status(500).json({ error: 'Failed to process AI request' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', model: 'gemini-1.5-flash' });
});

app.listen(PORT, () => {
    console.log(`🤖 AI Backend (Gemini) running on http://localhost:${PORT}`);
});