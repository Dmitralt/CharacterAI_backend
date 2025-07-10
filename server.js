import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import chatRoutes from './routes/chat.js';
import chatSessionRoutes from './routes/chatSession.js';
import characterRoutes from './routes/characters.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.use('/avatars', express.static('public/avatars'));
app.use('/landscape', express.static('public/landscape'));

app.use('/api/chat', chatRoutes);
app.use('/api/sessions', chatSessionRoutes);
app.use('/api/characters', characterRoutes);

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

