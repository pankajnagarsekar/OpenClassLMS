
/**
 * File: scripts/createAdmin.js
 * Usage: node scripts/createAdmin.js
 */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// 1. Setup CommonJS compatibility for this ESM file
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Load Dependencies and Config
try {
  // Define path to backend .env
  const envPath = path.resolve(__dirname, '../backend/.env');
  
  // Check if .env exists
  if (!fs.existsSync(envPath)) {
    console.error(`\x1b[31m[ERROR] Backend configuration file not found at: ${envPath}\x1b[0m`);
    console.error("Please create the 'backend/.env' file with your database credentials before running this script.");
    process.exit(1);
  }

  // Load dotenv from backend modules and configure it with the specific path
  const dotenv = require('../backend/node_modules/dotenv');
  dotenv.config({ path: envPath });

  // Load backend dependencies
  const bcrypt = require('../backend/node_modules/bcryptjs');
  
  // Load backend models
  const sequelize = require('../backend/config/db.js');
  const User = require('../backend/models/User.js');

  const createFirstAdmin = async () => {
    try {
      console.log('Connecting to database...');
      await sequelize.authenticate();
      console.log('Database connection successful.');

      // Sync tables to ensure they exist
      await sequelize.sync(); 

      const adminEmail = 'admin@openclass.com';
      const adminPassword = 'AdminPassword123!';
      const adminName = 'Master Administrator';

      const existingAdmin = await User.findOne({ where: { email: adminEmail } });
      if (existingAdmin) {
        console.log('\x1b[33mAdmin user already exists.\x1b[0m');
        process.exit(0);
      }

      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        name: adminName,
        email: adminEmail,
        password_hash: hashedPassword,
        role: 'admin',
        is_active: true,
        is_verified: true
      });

      console.log('\x1b[32m==========================================\x1b[0m');
      console.log('\x1b[32m ADMIN USER CREATED SUCCESSFULLY \x1b[0m');
      console.log(` Email:    ${adminEmail}`);
      console.log(` Password: ${adminPassword}`);
      console.log('\x1b[32m==========================================\x1b[0m');
      process.exit(0);

    } catch (error) {
      console.error('\x1b[31mFailed to create admin:\x1b[0m', error.message);
      if (error.original && error.original.code === 'ER_BAD_DB_ERROR') {
         console.error('\x1b[33mHint: Did you create the database "openclass_db" in MySQL?\x1b[0m');
      }
      process.exit(1);
    }
  };

  createFirstAdmin();

} catch (error) {
  console.error('\x1b[31m[ERROR] Failed to load dependencies.\x1b[0m');
  console.error("Ensure you have run 'npm install' inside the 'backend' folder.");
  console.error(error);
  process.exit(1);
}
