# 📺 SyncWave — Real-Time Watch Party Platform

SyncWave is a full-stack, real-time video watch party application that allows multiple users to stream YouTube videos in sync, chat live, send floating emoji reactions, and manage room roles.

---

## ✨ Features

- 🔄 **Real-Time Video Synchronization**: Synchronized YouTube playback (play, pause, seek, video change) across all connected room participants.
- 💬 **Live Room Chat**: Persistent chat history per room session with system notifications for user joins and role updates.
- 🎈 **Interactive Floating Reactions**: Send floating emoji reactions over the video player in real time.
- 👑 **Role-Based Controls**: Host, Moderator, and Participant roles with capabilities to transfer host, assign roles, or remove users from the room.
- 📋 **Preset Stream Selector**: Quick test presets and custom YouTube link loader.
- 👥 **Participant Management**: Dynamic room member list displaying active roles.

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: React.js, React Router DOM
- **Real-Time Client**: Socket.IO Client
- **Player Integration**: `react-youtube` / YouTube IFrame Stream API
- **Styling**: CSS3 with keyframe animations and custom CSS variables

### **Backend**
- **Runtime**: Node.js, Express.js
- **Real-Time Server**: Socket.IO

---

## 🚀 Getting Started

### **Prerequisites**
- [Node.js](https://nodejs.org/) (v16 or higher)
- npm or yarn package manager

---

### **Installation**

1. **Clone the Repository**
   ```bash
   git clone [https://github.com/your-username/syncwave.git](https://github.com/your-username/syncwave.git)
   cd syncwave