# SyncTalk - Real-Time Chat Application

SyncTalk is a modern, real-time chat application built with the MERN stack (MongoDB, Express.js, React, Node.js). It features real-time messaging, user authentication, and a beautiful UI using Tailwind CSS and DaisyUI.

## 🌟 Features

- **Real-time Messaging**: Instant message delivery using Socket.IO
- **User Authentication**: Secure login and signup with JWT
- **Profile Management**: Update profile pictures and user information
- **Online Status**: See who's online in real-time
- **Image Sharing**: Share images in conversations
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Modern UI**: Beautiful interface with Tailwind CSS and DaisyUI
- **Dark/Light Mode**: Toggle between dark and light themes

## 🚀 Tech Stack

### Frontend
- React.js
- Vite
- Tailwind CSS
- DaisyUI
- Socket.IO Client
- Zustand (State Management)
- Axios
- React Router DOM

### Backend
- Node.js
- Express.js
- MongoDB
- Socket.IO
- JWT Authentication
- Cloudinary (Image Storage)
- Express Rate Limiter
- Helmet (Security)

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/synctalk.git
cd synctalk
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Create `.env` files:

Backend (.env):
```env
PORT=5001
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Frontend (.env):
```env
VITE_API_URL=http://localhost:5001/api
```

## 🚀 Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

3. Build for production:
```bash
cd frontend
npm run build
```

## 🔒 Security Features

- JWT Authentication
- Password Hashing with bcrypt
- Rate Limiting
- CORS Protection
- Helmet Security Headers
- Secure Cookie Settings
- Input Validation
- XSS Protection

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check` - Check authentication status
- `PUT /api/auth/update-profile` - Update user profile

### Messages
- `GET /api/messages/users` - Get all users for sidebar
- `GET /api/messages/chat/:id` - Get chat messages
- `POST /api/messages/send/:id` - Send a message

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Socket.IO for real-time communication
- Tailwind CSS for styling
- DaisyUI for beautiful components
- MongoDB for database
- Cloudinary for image storage 