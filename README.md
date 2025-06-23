# CharactersAI API

Project: Chat with AI characters, each with a unique personality and memory of previous dialogue context.

## 📦 Setup

1. Install dependencies:
   npm install

2. Start MongoDB:
   mongod.exe --dbpath ./data/db

3. Start the server:
   npm run dev   # if using nodemon
   node server.js

## 🌐 API Endpoints

==============================
🧠 Characters API
==============================

GET /api/characters  
→ Get a list of all characters.

GET /api/characters/:id  
→ Get a character by ID.

POST /api/characters  
→ Create a new character.

Example request body:
{
  "name": "Jarvis",
  "description": "A wandering merchant and warrior",
  "personality": "clever and resourceful",
  "role": "companion in adventures",
  "background": "from Maravia — an eastern desert land",
  "speaking_style": "speaks sharply, sometimes jokes",
  "goals": "entertain the user, help with decisions",
  "avatar_url": "/avatars/Jarvis.jpg"
}

PUT /api/characters/:id  
→ Update character by ID.

DELETE /api/characters/:id  
→ Delete character by ID.

==============================
💬 One-shot Chat API
==============================

POST /api/chat/:characterId  
→ Send a message to the AI character (stateless chat).

Example request body:
{
  "message": "Hello, who are you?"
}

==============================
📚 Chat Sessions API
==============================

POST /api/sessions  
→ Start a new session with a character.

Example body:
{
  "characterId": "CHARACTER_ID"
}

GET /api/sessions  
→ Get all sessions.

GET /api/sessions/:sessionId  
→ Get a session (includes history and summary).

DELETE /api/sessions/:sessionId  
→ Delete a session.

==============================
🗨️ Dialogue Within a Session
==============================

POST /api/chat/:sessionId  
→ Send a message within a session.

Example body:
{
  "message": "What are our plans, Jarvis?"
}

Response:
{
  "reply": "Plans? Find the artifact and sell it, of course."
}

==============================
🧾 Dialogue Summary
==============================

POST /api/chat/:sessionId/summarize  
→ Generate a brief summary of the session's dialogue. Saved in `session.summary`.

==============================
📁 Static Files
==============================

/avatars/...  
→ Character avatars.

/landscape/...  
→ Background images.

## 🛠 Notes

- LM Studio must be running at http://127.0.0.1:1234  
- Model used: google/gemma-3-1b  
- Session context is stored in MongoDB.  
- You can manually summarize and store memory using `/summarize`.

