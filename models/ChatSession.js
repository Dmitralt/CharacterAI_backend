import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    speaker: String,
    role: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
});

const participantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['user', 'ai'], required: true },
    characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' }
});

const chatSessionSchema = new mongoose.Schema({
    participants: [participantSchema],
    userId: { type: String },
    history: [messageSchema],
    summary: { type: String, default: '' }
}, { timestamps: true });

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

export default ChatSession;


