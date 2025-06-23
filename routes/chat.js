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

router.post('/:sessionId/message', async (req, res) => {
    const { sessionId } = req.params;
    const { speaker, message } = req.body;

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        const session = await ChatSession.findById(sessionId).populate('participants.characterId');
        if (!session) return res.status(404).json({ error: 'Session not found' });

        console.log('=== Loaded AI Participants ===');
        for (const p of session.participants.filter(p => p.type === 'ai')) {
            console.log({
                name: p.name,
                characterId: p.characterId?._id,
                characterName: p.characterId?.name,
                description: p.characterId?.description,
                speakingStyle: p.characterId?.speaking_style
            });
        }

        const sender = session.participants.find(p => p.name === speaker);
        if (!sender) return res.status(400).json({ error: 'Invalid speaker' });

        // Добавляем сообщение игрока в историю (без имени в контенте!)
        session.history.push({
            speaker,
            role: sender.type === 'ai' ? `ai:${sender.characterId._id}` : 'user',
            content: message
        });

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

            // История без "speaker:" префикса в content
            const recentHistory = session.history.slice(-10).map(m => ({
                role: m.role.startsWith('ai:') ? 'assistant' : 'user',
                content: m.content
            }));

            console.log(`\n=== System prompt for ${character.name} ===\n`);
            console.log(systemPrompt);

            const payload = {
                model: 'google/gemma-3-1b',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...recentHistory
                ],
                temperature: 0.7
            };

            const getReply = async () => {
                try {
                    const response = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const data = await response.json();
                    return data.choices?.[0]?.message?.content?.trim() || null;
                } catch (err) {
                    console.error(`[ERROR] Failed to get reply from ${character.name}:`, err);
                    return null;
                }
            };

            let reply = await getReply();

            if (!reply) {
                console.warn(`[WARN] Empty reply from ${character.name}, retrying...`);
                await sleep(300);
                reply = await getReply();
            }

            if (reply) {
                // Не добавляем имя в контент — оно уже есть в speaker
                session.history.push({
                    speaker: character.name,
                    role: `ai:${character._id}`,
                    content: reply
                });
                aiReplies.push({ name: character.name, reply });
            } else {
                console.warn(`[WARN] Still no reply from ${character.name}`);
            }

            await sleep(300); // Пауза перед следующим AI
        }

        await session.save();
        res.json({ replies: aiReplies });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Message handling failed', message: err.message });
    }
});







module.exports = router;
