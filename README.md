# PingMe - Secure Real-Time Chat Application

![PingMe Cover](https://ui-avatars.com/api/?name=Ping+Me&background=7C3AED&color=fff&bold=true&size=400)

**PingMe** is a premium, real-time messaging application designed with modern aesthetics, speed, and privacy in mind. Built on the MERN stack with highly optimized Socket.io communication, it provides a seamless chat experience identical to native apps.

## 🌟 Key Features

### 💬 Messaging & Real-Time Sync
* **Instant Delivery**: Messages are sent, delivered, and marked with live ticks (✓ / ✓✓) instantaneously via Socket.io.
* **Typing Indicators**: Live "User is typing..." indicators keep conversations alive.
* **Unread Badges**: Real-time unread conversation badges tracking active chats.

### 🖼️ Rich Media & Attachments 
* **HD Photo & Video Sharing**: Upload images, compressed on the client-side for ultra-fast transfers.
* **Voice Recording**: Integrated microphone API to record, review, and send voice notes inline.
* **Document Handling**: Send PDFs, code, and documents up to 10MB seamlessly.

### 🔒 Privacy First
* **Chat Locks**: Hide and encrypt specific private chats behind a custom PIN.
* **End-to-End Style Protection**: Focus on secure data handling, with passwords salted via bcrypt and auth handled through secure JWTs.

### 🎨 State-of-the-Art UX
* **Custom Themes**: Togglable Dark/Light mode and fluid CSS variables injected globally.
* **Custom Chat Wallpapers**: Upload your own backgrounds or choose from curated PingMe themes (Midnight, Ocean, Forest).
* **Framer Motion Transitions**: Smooth cross-fades when changing contexts, tabs, and interacting with core UI modals.
* **Responsive Design**: Full desktop experience combined with a highly mobile-optimized UI.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|-------|-------------------|
| **Frontend** | React (Vite), Tailwind CSS concepts via Vanilla CSS, Framer Motion, Axios |
| **Backend** | Node.js, Express.js |
| **Real-Time** | Socket.io (WebSocket) |
| **Database** | MongoDB (Mongoose) |
| **Auth & Security**| JSON Web Tokens (JWT), Bcrypt.js, Nodemailer (OTP Verification) |
| **Media Host** | Render/Cloudinary integration support |

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites
* [Node.js](https://nodejs.org/en) (v18+)
* [MongoDB](https://www.mongodb.com/) (Local or Atlas Atlas)
* [Git](https://git-scm.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Remmalapudijaswanthi/RealTime-Chat-Application.git
   cd RealTime-Chat-Application
   ```

2. **Backend Setup**
   ```bash
   cd server
   npm install
   ```

3. **Frontend Setup**
   ```bash
   cd ../client
   npm install
   ```

4. **Environment Variables Config**
   Create a `.env` file in the `server` directory and add the following:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_specific_password
   CLIENT_URL=http://localhost:5173
   ```

5. **Start the Application**

   *Terminal 1 (Server):*
   ```bash
   cd server
   npm run dev
   ```

   *Terminal 2 (Client):*
   ```bash
   cd client
   npm run dev
   ```

6. **Open in Browser**
   Access `http://localhost:5173` to view the application locally.

---

## 🎨 Design Philosophy
The PingMe interface is heavily customized with a dedicated `index.css` orchestrating global CSS variables. The goal was to avoid bootstrap-clone interfaces and provide a truly native-feeling app featuring:
* Custom pulse animations
* Sticky blur-backdrop filter navigations
* Dedicated UI skeletons for perceived performance

## 🤝 Contributing
Contributions, issues, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

*For support or any queries, please open an issue in the repository.*
