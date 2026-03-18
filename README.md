# ChatFlow — Real-Time Chat Application

A full-stack real-time chat application built with the MERN stack and Socket.io.

![MERN](https://img.shields.io/badge/Stack-MERN-green) ![Socket.io](https://img.shields.io/badge/Realtime-Socket.io-blue) ![Status](https://img.shields.io/badge/Status-Live-brightgreen)

## 🌐 Live Application

- **Frontend**: [https://real-time-chat-application-zeta-five.vercel.app](https://real-time-chat-application-zeta-five.vercel.app)
- **Backend API**: [https://realtime-chat-application-1-ffxh.onrender.com](https://realtime-chat-application-1-ffxh.onrender.com)

## Features

- 🔐 JWT Authentication (Register/Login)
- 💬 Real-time messaging with Socket.io
- 👥 Private & group chats
- ⌨️ Typing indicators
- 🟢 Online/offline status
- ✅ Read receipts (single/double tick)
- ✏️ Edit & delete messages
- 🎨 Modern dark UI with animations (Framer Motion)
- 📱 Responsive design

## Tech Stack

| Layer    | Technology                              |
| -------- | --------------------------------------- |
| Frontend | React 18, Vite, React Router, Axios     |
| Backend  | Node.js, Express                        |
| Database | MongoDB, Mongoose                       |
| Realtime | Socket.io                               |
| Auth     | JWT, bcryptjs                           |
| UI       | Framer Motion, Inter font, custom CSS   |

## Prerequisites

- **Node.js** v18+
- **MongoDB** (local or [Atlas](https://www.mongodb.com/atlas))

## Setup

### 1. Clone & Install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment

**Server** (`server/.env`):
```env
MONGO_URI=mongodb://localhost:27017/chatflow
JWT_SECRET=your_secret_key_here
PORT=5000
```

**Client** (`client/.env`):
```env
VITE_API_URL=http://localhost:5000
```

### 3. Run

```bash
# Terminal 1 — Start server
cd server
npm run dev

# Terminal 2 — Start client
cd client
npm run dev
```

- **Client**: http://localhost:3000
- **Server**: http://localhost:5000

## Project Structure

```
├── server/
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express API routes
│   ├── middleware/       # JWT auth middleware
│   ├── socket/          # Socket.io event handler
│   ├── server.js        # Entry point
│   └── .env
│
├── client/
│   └── src/
│       ├── components/  # Sidebar, ChatWindow, MessageBubble, etc.
│       ├── context/     # AuthContext, SocketContext
│       ├── hooks/       # useChat, useSocket
│       ├── pages/       # Login, Register, Chat
│       ├── utils/       # Axios instance, time helpers
│       ├── App.jsx      # Router & layout
│       └── index.css    # Design system
│
└── README.md
```

## API Endpoints

| Method | Endpoint                          | Description              |
| ------ | --------------------------------- | ------------------------ |
| POST   | `/api/auth/register`              | Register new user        |
| POST   | `/api/auth/login`                 | Login                    |
| GET    | `/api/auth/me`                    | Get current user         |
| GET    | `/api/users/search?q=`            | Search users             |
| GET    | `/api/users/:id`                  | Get user profile         |
| PATCH  | `/api/users/status`               | Update status            |
| POST   | `/api/chats/room`                 | Create/get private room  |
| POST   | `/api/chats/group`                | Create group room        |
| GET    | `/api/chats/rooms`                | List user's rooms        |
| GET    | `/api/chats/room/:id/messages`    | Get paginated messages   |
| PATCH  | `/api/chats/message/:id`          | Edit message             |
| DELETE | `/api/chats/message/:id`          | Delete message           |

## Socket.io Events

| Event              | Direction      | Description             |
| ------------------ | -------------- | ----------------------- |
| `join_room`        | Client → Server | Join a chat room        |
| `send_message`     | Client → Server | Send a message          |
| `typing`           | Client → Server | Start typing            |
| `stop_typing`      | Client → Server | Stop typing             |
| `mark_read`        | Client → Server | Mark messages as read   |
| `receive_message`  | Server → Client | New message received    |
| `user_typing`      | Server → Client | User is typing          |
| `user_stop_typing` | Server → Client | User stopped typing     |
| `message_read`     | Server → Client | Messages marked read    |
| `user_status_change` | Server → Client | Online/offline change |
| `new_room`         | Server → Client | New room notification   |
