# 📺 SyncWave — Real-Time Watch Party App

SyncWave is a real-time collaborative watch party web application built with **React**, **Node.js**, **Express**, and **Socket.io**. It enables users to create synchronized room environments where everyone can watch YouTube videos together, chat live, send floating emoji reactions, and manage host/participant permissions with seamless refresh recovery.

---

## ✨ Features

- 🎥 **Synchronized Playback:** Real-time play, pause, seek, and video swapping synced across all users in a room.
- 👑 **Role & Permission Management:** 
  - **Host:** Full playback control, assign roles, kick users, and transfer host rights.
  - **Moderators:** Can play/pause/seek and update video streams.
  - **Participants:** Enjoy synchronized watching and chat interaction.
- 🔄 **Refresh & Reconnection Resilience:** Browser refresh (`F5`) retains room access, video time sync, chat history, and Host/Moderator status using persistent user IDs (`localStorage`) and server-side disconnect grace periods.
- 💬 **Live Room Chat:** Real-time messaging with system notifications for user joins, leaves, and role changes.
- 🍿 **Interactive Floating Emoji Reactions:** Send floating emojis across the screen in real time.
- 🎯 **Presets & Custom Links:** Quick-play preset videos or paste any valid YouTube video URL or ID.

---

## 🛠️ Tech Stack

- **Frontend:** React, React Router, Vite, Socket.io-Client, CSS3
- **Backend:** Node.js, Express, Socket.io
- **State Persistence:** Browser `localStorage` & Server In-Memory Room Management

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- `npm` or `yarn`

---

### 2. Clone the Repository
```bash
git clone [https://github.com/your-username/syncwave.git](https://github.com/your-username/syncwave.git)
cd syncwave