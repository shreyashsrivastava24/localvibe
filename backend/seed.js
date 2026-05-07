const mongoose = require('mongoose');
const User = require('./models/User');
const Event = require('./models/Event');
const { syncExternalEvents } = require('./utils/externalEvents');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/localvibe';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    // wipe everything so we start fresh
    await Event.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing data');

    // create a few test users
    const user1 = new User({
      name: 'Shreyash Srivastava',
      email: 'shreyashsrivastava744@gmail.com',
      role: 'student',
      interestedCategories: ['Music', 'Tech', 'Art', 'Community']
    });
    const user2 = new User({ name: 'Alice Johnson', email: 'alice@example.com', role: 'student' });
    const user3 = new User({ name: 'Bob Smith', email: 'bob@example.com', role: 'student' });

    await Promise.all([user1.save(), user2.save(), user3.save()]);

    // set up follow relationships so the "friends attending" feature works
    user1.followedUsers = [user2._id, user3._id];
    await user1.save();

    // fetch real events from Google for a few major cities
    const cities = [
      { lat: 28.4359, lng: 77.3294 },  // Greater Noida / NCR
      { lat: 40.7128, lng: -74.0060 },  // New York
      { lat: 51.5072, lng: -0.1276 },   // London
    ];

    let totalSynced = 0;
    for (const loc of cities) {
      const count = await syncExternalEvents(loc.lat, loc.lng);
      totalSynced += Number(count || 0);
    }

    console.log(`Done — 3 users + ${totalSynced} live events seeded.`);
    mongoose.connection.close();
  })
  .catch(err => console.error('Seed error:', err));
