const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Import routes
const authRoutes = require('./routes/authRoutes');
const discussionRoutes = require('./routes/discussionRoutes');
const blogRoutes = require('./routes/blogRoutes');
const listRoutes = require('./routes/listRoutes');

// Import error middleware
const errorHandler = require('./middleware/error');

// Initialize express app
const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/lists', listRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Movie Explorer API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});