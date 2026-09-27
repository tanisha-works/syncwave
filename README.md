# 📺 SyncWave — Real-Time Watch Party App

SyncWave is a real-time collaborative watch party web application built with **React**, **Node.js**, **Express**, and **Socket.io**. It enables users to create synchronized room environments where everyone can watch YouTube videos together, chat live, send floating emoji reactions, and manage host/participant permissions with seamless refresh recovery.

---

## 🌐 Live Deployment
- **Frontend App (Vercel):** [(https://syncwave-jet.vercel.app/)]
- **Backend WebSocket Server (Render):** [(https://syncwave-backend-3n84.onrender.com)]

---

## ✨ Features

- 🎥 **Synchronized Playback:** Real-time play, pause, seek, and video swapping synced across all users in a room.
- 👑 **Role & Permission Management:** 
  - **Host:** Full playback control, assign roles, kick users, and transfer host rights.
  - **Moderators:** Can play/pause/seek and update video streams.
  - **Participants:** Enjoy synchronized watching and chat interaction.
- 🔄 **Refresh & Reconnection Resilience:** Browser refresh retaining room access, video time sync, chat history, and Host/Moderator status using persistent user IDs (`localStorage`) and server-side disconnect grace periods.
- 💬 **Live Room Chat:** Real-time messaging with system notifications for user joins, leaves, and role changes.
- 🍿 **Interactive Floating Emoji Reactions:** Send floating emojis across the screen in real time.
- 🎯 **Presets & Custom Links:** Quick-play preset videos or paste any valid YouTube video URL or ID.

---

## 🏗️ Architecture Overview

The application utilizes a client-server architecture with bidirectional WebSockets (`Socket.io`) for real-time state synchronization:
1. **Room State Management:** Managed in-memory on the Node.js server via an Object-Oriented `RoomManager`.
2. **Permission Validation:** Playback events (`play`, `pause`, `seek`, `change_video`) are validated against user roles on the backend before being broadcast to room members via `io.to(roomId).emit(...)`.
3. **Loop Prevention:** Clients use event flags (`isProcessingEvent`) to prevent infinite state echo loops when reacting to incoming socket events.

---

## 🛠️ Tech Stack

- **Frontend:** React, React Router, Vite, Socket.io-Client, CSS3
- **Backend:** Node.js, Express, Socket.io
- **State Persistence:** Browser `localStorage` & Server In-Memory Room Management

---

## 🚀 Local Setup & Installation

### 1. Clone the Repository
```bash
git clone [https://github.com/tanisha-works/syncwave.git](https://github.com/tanisha-works/syncwave.git)
cd syncwave

2. Backend Setup
cd backend
npm install
npm start

3. Frontend Setup
cd ../frontend
npm install
npm run dev