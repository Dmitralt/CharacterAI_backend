import mongoose from 'mongoose';

const characterSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    personality: { type: String, required: true },
    role: String,
    background: String,
    speaking_style: String,
    goals: String,
    avatar_url: String
});

const Character = mongoose.model('Character', characterSchema);

export default Character;


