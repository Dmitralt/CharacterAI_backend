const express = require('express');
const Character = require('../models/Character');
const ChatSession = require('../models/ChatSession');

const router = express.Router();

router.post('/:sessionId/summarize', async (req, res) => {
    try {
        const session = await ChatSession.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        const historyText = session.history.map(m => `${m.role}: ${m.content}`).join('\n');

        const summaryPrompt = `
Ты — ассистент, помогающий сжать диалог в краткое описание событий.
История диалога:
${historyText}

Сделай краткое описание разговора, не более 100 слов.
`;

        const response = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'google/gemma-3-1b',
                messages: [
                    { role: 'system', content: summaryPrompt }
                ],
                temperature: 0.5
            })
        });

        const data = await response.json();
        const summary = data.choices?.[0]?.message?.content;

        if (!summary) throw new Error('No summary returned');

        session.summary = summary;
        await session.save();

        res.json({ summary });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Summarization failed', message: err.message });
    }
});


router.post('/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        const session = await ChatSession.findById(sessionId).populate('characterId');
        if (!session) return res.status(404).json({ error: 'Chat session not found' });

        const char = session.characterId;

        const systemPrompt = `
Ты — персонаж по имени ${char.name}, ${char.description}.
Ты ${char.personality}. 
Ты выполняешь роль: ${char.role || 'не указано'}. 
Ты родом из ${char.background || 'неизвестного края'}.
Ты говоришь так: ${char.speaking_style || 'обычная речь'}.
Твоя цель: ${char.goals || 'общаться с собеседником'}.
Отвечай от первого лица, как ${char.name}.
${session.summary ? `Ты помнишь, что: ${session.summary}` : ''}
    `.trim();

        const history = session.history.slice(-8);

        const payload = {
            model: "google/gemma-3-1b",
            messages: [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: message }
            ],
            temperature: 0.7
        };

        const response = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || 'Нет ответа от модели';

        session.history.push({ role: 'user', content: message });
        session.history.push({ role: 'assistant', content: reply });
        await session.save();

        res.json({ reply });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'AI error', message: err.message });
    }
});

module.exports = router;
