
/**
 * File: scripts/createAdmin.js
 * Usage: node scripts/createAdmin.js
 */
const bcrypt = require('bcryptjs');
const sequelize = require('../backend/config/db');
const User = require('../backend/models/User');
require('dotenv').config();

const createFirstAdmin = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    const adminEmail = 'admin@openclass.com';
    const adminPassword = 'AdminPassword123!';
    const adminName = 'Master Administrator';

    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    if (existingAdmin) {
      console.log('Admin already exists.');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await User.create({
      name: adminName,
      email: adminEmail,
      password_hash: hashedPassword,
      role: 'admin'
    });

    console.log('-----------------------------------');
    console.log('Admin User Created Successfully!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('-----------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('Failed to create admin:', error);
    process.exit(1);
  }
};

createFirstAdmin();
