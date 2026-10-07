const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

async function fixPasswords() {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find({ email: { $regex: '@crm.com' } });
  for (const u of users) {
    u.password = 'password123';
    await u.save(); // pre('save') hashes u.password with bcrypt!
    console.log(`Password reset for ${u.email} (${u.role})`);
  }
  process.exit(0);
}

fixPasswords();
