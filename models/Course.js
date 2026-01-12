
// File: backend/models/Course.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  thumbnail_url: {
    type: DataTypes.STRING
  },
  video_embed_url: {
    type: DataTypes.STRING
  },
  access_days: {
    type: DataTypes.INTEGER,
    defaultValue: 365
  },
  teacher_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  timestamps: true
});

module.exports = Course;
