const express = require('express');
const router = express.Router();
const Character = require('../models/Character');

// GET /api/characters 
router.get('/', async (req, res) => {
    const characters = await Character.find();
    res.json(characters);
});

// GET /api/characters/:id 
router.get('/:id', async (req, res) => {
    const char = await Character.findById(req.params.id);
    if (!char) return res.status(404).send('Character not found');
    res.json(char);
});

// POST /api/characters 
router.post('/', async (req, res) => {
    const newChar = new Character(req.body);
    await newChar.save();
    res.status(201).json(newChar);
});

// PUT /api/characters/:id 
router.put('/:id', async (req, res) => {
    const updated = await Character.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
});

// DELETE /api/characters/:id 
router.delete('/:id', async (req, res) => {
    await Character.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
});

module.exports = router;
