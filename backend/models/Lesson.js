
// File: backend/models/Lesson.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Lesson = sequelize.define('Lesson', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('video', 'pdf', 'text', 'quiz', 'assignment'),
    allowNull: false
  },
  content_url: {
    type: DataTypes.TEXT, // Changed to TEXT to support long instructions or text content
    allowNull: true
  },
  position: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true
});

module.exports = Lesson;
