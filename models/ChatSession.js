const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    speaker: String, // имя того, кто говорит
    role: String,    // "user", "ai:characterId", "system", и т.д.
    content: String,
    timestamp: { type: Date, default: Date.now }
});

const participantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['user', 'ai'], required: true },
    characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' } // только если ai
});

const chatSessionSchema = new mongoose.Schema({
    participants: [participantSchema],
    userId: { type: String }, // если нужно привязать к пользователю
    history: [messageSchema],
    summary: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('ChatSession', chatSessionSchema);


