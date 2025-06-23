const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role: String,       // "user" || "assistant"
    content: String,
    timestamp: { type: Date, default: Date.now }
});

const chatSessionSchema = new mongoose.Schema({
    characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character', required: true },
    userId: { type: String },
    history: [messageSchema],
    summary: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('ChatSession', chatSessionSchema);

