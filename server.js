const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const chatRoutes = require('./routes/chat');
const chatSessionRoutes = require('./routes/chatSession');
require('dotenv').config();

const app = express();




// 🟢 Обязательно подключи!
app.use(express.json());
app.use(cors());
app.use('/avatars', express.static('public/avatars'));
app.use('/landscape', express.static('public/landscape'));
app.use('/api/chat', chatRoutes);
app.use('/api/sessions', chatSessionRoutes);
// Подключение к Mongo
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

// Роуты
const characterRoutes = require('./routes/characters');
app.use('/api/characters', characterRoutes);

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

