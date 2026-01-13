
// File: backend/models/SystemSetting.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SystemSetting = sequelize.define('SystemSetting', {
  key: {
    type: DataTypes.STRING,
    primaryKey: true,
    unique: true
  },
  value: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: false
});

module.exports = SystemSetting;
