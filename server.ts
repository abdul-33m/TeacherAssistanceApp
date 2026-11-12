import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to get GoogleGenAI client safely
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// 1. Generate Grammar Exercises API
app.post('/api/ai/grammar-exercise', async (req, res) => {
  try {
    const { grade, topic, questionCount = 5, difficulty = 'medium' } = req.body;
    const ai = getGenAI();

    if (!ai) {
      return res.status(200).json({
        fallback: true,
        message: 'No GEMINI_API_KEY configured. Returning curriculum fallback.',
        data: null,
      });
    }

    const prompt = `You are an expert middle school English teacher. Generate an interactive grammar exercise set for Grade ${grade || 6} students on the topic "${topic || 'Subject-Verb Agreement'}".
Difficulty: ${difficulty}.
Provide ${questionCount} questions in valid JSON only with NO markdown code fences or backticks. Format:
{
  "title": "${topic} Mastery Practice",
  "topic": "${topic}",
  "grade": ${grade || 6},
  "difficulty": "${difficulty}",
  "rulesExplanation": "2-3 concise sentences explaining the grammatical rule clearly with a quick example.",
  "questions": [
    {
      "id": "q1",
      "prompt": "Sentence with missing word or error to fix",
      "type": "mcq",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The exact correct option",
      "explanation": "Why this answer is grammatically correct."
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error generating grammar exercise:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate grammar exercise' });
  }
});

// 2. Generate English Lesson Plan API
app.post('/api/ai/lesson-plan', async (req, res) => {
  try {
    const { grade, title, durationMinutes = 45, standardsOrGrammar } = req.body;
    const ai = getGenAI();

    if (!ai) {
      return res.status(200).json({
        fallback: true,
        message: 'No GEMINI_API_KEY configured. Returning curriculum fallback.',
        data: null,
      });
    }

    const prompt = `You are a curriculum specialist for Middle School English Language Arts (ELA). Create a structured, highly engaging lesson plan for Grade ${grade || '6/7'} on "${title}".
Grammar/Focus: ${standardsOrGrammar || 'Reading & Syntax'}.
Duration: ${durationMinutes} minutes.
Return purely valid JSON with NO markdown formatting:
{
  "title": "${title}",
  "unit": "ELA Unit",
  "grammarFocus": "${standardsOrGrammar || 'Grammar Standard'}",
  "objectives": ["Students will be able to...", "Students will identify..."],
  "materials": ["Student notebook", "Printed excerpt", "Highlighters"],
  "warmUp": "3-5 minute bellringer activity",
  "directInstruction": "10-12 minute teacher explanation & model",
  "guidedPractice": "12-15 minute group or paired activity",
  "independentPractice": "10 minute individual exercise or quick-write",
  "exitTicket": "A single prompt checking comprehension",
  "homeworkAssigned": "Optional reinforcement task",
  "teacherNotes": "Pedagogical tips and common misconceptions"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error generating lesson plan:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate lesson plan' });
  }
});

// 3. Draft Parent Communication Note
app.post('/api/ai/parent-note', async (req, res) => {
  try {
    const { studentName, gradeClass, attendanceRate, avgScore, recentNotes, tone = 'supportive' } = req.body;
    const ai = getGenAI();

    if (!ai) {
      return res.status(200).json({
        fallback: true,
        data: {
          subject: `English Class Progress Update: ${studentName}`,
          body: `Dear Family,\n\nI am writing to share a brief update on ${studentName}'s progress in English (${gradeClass}). Currently, ${studentName} maintains an attendance rate of ${attendanceRate}% and an average mark of ${avgScore}%. Please reach out if you have any questions!\n\nWarm regards,\nEnglish Teacher`,
        },
      });
    }

    const prompt = `Draft a polite, professional, and ${tone} parent progress message from an English teacher for student ${studentName} in class ${gradeClass}.
Attendance Rate: ${attendanceRate}%
Average Score: ${avgScore}%
Teacher's internal observation: ${recentNotes || 'Consistently attentive and participates during group literature discussions.'}
Keep it under 150 words. Return purely valid JSON:
{
  "subject": "Email/Letter Subject Line",
  "body": "Full body text"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error drafting parent note:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 4. Cloud Backup Simulator (allows saving/retrieving snapshots across multi-device preview)
let cloudBackupStore: { [key: string]: { timestamp: string; data: any } } = {};

app.post('/api/cloud/backup', (req, res) => {
  const { syncKey = 'default_teacher_vault', payload } = req.body;
  if (!payload) return res.status(400).json({ error: 'Missing payload' });
  cloudBackupStore[syncKey] = {
    timestamp: new Date().toISOString(),
    data: payload,
  };
  return res.json({ success: true, syncedAt: cloudBackupStore[syncKey].timestamp });
});

app.get('/api/cloud/backup', (req, res) => {
  const syncKey = (req.query.syncKey as string) || 'default_teacher_vault';
  const entry = cloudBackupStore[syncKey];
  if (!entry) return res.status(404).json({ error: 'No cloud backup found for this key' });
  return res.json({ success: true, ...entry });
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`GradeCraft Teacher App running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
