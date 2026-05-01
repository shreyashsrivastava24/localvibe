const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const eventRoutes = require('./routes/eventRoutes');
const { syncExternalEvents } = require('./utils/externalEvents');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json());
app.use('/api/events', eventRoutes);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    // Auto-sync real events for Ghaziabad/Delhi NCR on startup.
    // Coordinates: Gaur City, Ghaziabad.
    const DEFAULT_LAT = 28.4359;
    const DEFAULT_LNG = 77.3294;
    await syncExternalEvents(DEFAULT_LAT, DEFAULT_LNG);
  })
  .catch(err => console.error('Failed to connect to MongoDB:', err));
