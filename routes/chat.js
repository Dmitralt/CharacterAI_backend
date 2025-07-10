const express = require('express');
const Character = require('../models/Character');
const ChatSession = require('../models/ChatSession');

const router = express.Router();

async function fetchWithRetry(url, options, retries = 3, delay = 500) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            return res;
        } catch (err) {
            console.warn(`Fetch attempt ${i + 1} failed: ${err.message}`);
            if (i < retries - 1) await new Promise(r => setTimeout(r, delay));
        }
    }
    throw new Error(`Failed to fetch after ${retries} attempts`);
}

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

        const response = await fetchWithRetry('http://127.0.0.1:1234/v1/chat/completions', {
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

router.post('/:sessionId/message', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const { sessionId } = req.params;
    const { speaker, message } = req.body;

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        const session = await ChatSession.findById(sessionId).populate('participants.characterId');
        if (!session) return res.write(`event: error\ndata: Session not found\n\n`);

        const sender = session.participants.find(p => p.name === speaker);
        if (!sender) return res.write(`event: error\ndata: Invalid speaker\n\n`);

        const aiParticipants = session.participants.filter(p => p.type === 'ai');
        const aiReplies = [];

        for (const ai of aiParticipants) {
            const character = ai.characterId;

            const systemPrompt = `
Ты — персонаж по имени ${character.name}, ${character.description}.
Ты ${character.personality}. Твоя цель: ${character.goals || 'общение'}.
Ты говоришь так: ${character.speaking_style || 'обычно'}.
Ты знаешь: ${session.summary || 'пока ничего особенного'}.
В диалоге участвуют: ${session.participants.map(p => p.name).join(', ')}.

Сейчас твой ход. Ответь как ${character.name}, основываясь на истории ниже.
**Имя персонажа уже добавлено перед сообщением, не дублируй его в ответе.**
            `.trim();

            const recentHistory = session.history.slice(-10).map(m => ({
                role: m.role.startsWith('ai:') ? 'assistant' : 'user',
                content: m.content
            }));

            const payload = {
                model: 'google/gemma-3-1b',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...recentHistory,
                    { role: 'user', content: message }
                ],
                temperature: 0.7,
                stream: true
            };

            let response;
            try {
                response = await fetchWithRetry('http://127.0.0.1:1234/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch (err) {
                console.error(`AI fetch failed for character ${character.name}:`, err.message);
                res.write(`event: error\ndata: Failed to get response for ${character.name}\n\n`);
                continue;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            let fullReply = '';
            res.write(`event: character\n`);
            res.write(`data: ${character.name}\n\n`);

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

                for (const line of lines) {
                    const data = line.replace(/^data:\s*/, '').trim();
                    if (data === '[DONE]') {
                        res.write(`event: end\n`);
                        res.write(`data: ${character.name}\n\n`);
                        break;
                    }

                    try {
                        const json = JSON.parse(data);
                        const token = json.choices?.[0]?.delta?.content;
                        if (token) {
                            fullReply += token;
                            res.write(`data: ${token}\n\n`);
                        }
                    } catch (e) {
                        console.warn('Bad stream chunk:', data);
                    }
                }
            }

            if (fullReply) {
                aiReplies.push({
                    speaker: character.name,
                    role: `ai:${character._id}`,
                    content: fullReply
                });
            }

            await sleep(200);
        }

        if (aiReplies.length > 0) {
            session.history.push({
                speaker,
                role: sender.type === 'ai' ? `ai:${sender.characterId._id}` : 'user',
                content: message
            });
            for (const reply of aiReplies) {
                session.history.push(reply);
            }
            await session.save();
            res.write(`event: complete\ndata: done\n\n`);
        } else {
            res.write(`event: error\ndata: No AI responded. User message not saved.\n\n`);
        }

        res.end();

    } catch (err) {
        console.error(err);
        res.write(`event: error\ndata: ${err.message}\n\n`);
        res.end();
    }
});

module.exports = router;
