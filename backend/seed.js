const mongoose = require('mongoose');
const User = require('./models/User');
const Event = require('./models/Event');
const { syncExternalEvents } = require('./utils/externalEvents');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/localvibe';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    // Reset users and events, then fetch live events.
    await Event.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing users and events');

    const user1 = new User({
      name: 'Shreyash Srivastava',
      email: 'shreyashsrivastava744@gmail.com',
      role: 'student',
      interestedCategories: ['Music', 'Tech', 'Art', 'Community']
    });
    const user2 = new User({ name: 'Alice Johnson', email: 'alice@example.com', role: 'student' });
    const user3 = new User({ name: 'Bob Smith', email: 'bob@example.com', role: 'student' });

    await Promise.all([user1.save(), user2.save(), user3.save()]);

    // Shreyash follows Alice and Bob
    user1.followedUsers = [user2._id, user3._id];
    await user1.save();

    const seedLocations = [
      { lat: 28.4359, lng: 77.3294 }, // Ghaziabad / NCR
      { lat: 40.7128, lng: -74.0060 }, // New York
      { lat: 51.5072, lng: -0.1276 }, // London
    ];

    let totalSynced = 0;
    for (const loc of seedLocations) {
      const count = await syncExternalEvents(loc.lat, loc.lng);
      totalSynced += Number(count || 0);
    }

    console.log(`Seed complete: 3 users created, ${totalSynced} live events synced.`);
    mongoose.connection.close();
  })
  .catch(err => console.error('Seed error:', err));
