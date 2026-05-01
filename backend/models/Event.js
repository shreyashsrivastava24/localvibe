const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  category: {
    type: String,
    required: true,
    enum: ['Music', 'Food', 'Art', 'Tech', 'Community', 'Other'],
    default: 'Other'
  },
  price: {
    type: Number,
    default: 0
  },
  imageUrl: {
    type: String,
    default: 'https://via.placeholder.com/600x400'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  attendees: {
    type: Number,
    default: 0
  },
  attendeeList: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

// 2dsphere index for geospatial queries
EventSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Event', EventSchema);
