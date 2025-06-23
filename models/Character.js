const mongoose = require('mongoose');

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


module.exports = mongoose.model('Character', characterSchema);

