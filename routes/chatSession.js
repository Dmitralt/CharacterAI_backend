const express = require('express');
const ChatSession = require('../models/ChatSession');

const router = express.Router();

// GET all sessions 
router.get('/', async (req, res) => {
    const { characterId, userName } = req.query;
    const filter = {};
    if (characterId) filter.characterId = characterId;
    if (userName) filter.userName = userName;

    const sessions = await ChatSession.find(filter).sort('-updatedAt');
    res.json(sessions);
});

// GET one session by ID
router.get('/:id', async (req, res) => {
    const session = await ChatSession.findById(req.params.id);
    if (!session) return res.status(404).send('Session not found');
    res.json(session);
});

// POST create new session
router.post('/', async (req, res) => {
    const { title, participants } = req.body; // [{ name, type, characterId }]
    const session = new ChatSession({ title, participants, history: [] });
    await session.save();
    res.status(201).json(session);
});


// PUT add message (append to history)
router.put('/:id', async (req, res) => {
    const { role, content } = req.body;
    const session = await ChatSession.findById(req.params.id);
    if (!session) return res.status(404).send('Session not found');

    session.history.push({ role, content });
    await session.save();
    res.json(session);
});

// DELETE session
router.delete('/:id', async (req, res) => {
    await ChatSession.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
});

module.exports = router;
