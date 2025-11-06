const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./controllers/auth');
const emailRoutes = require('./controllers/email');
const taskRoutes = require('./controllers/tasks');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/email', emailRoutes);
app.use('/tasks', taskRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Email Todo API running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
