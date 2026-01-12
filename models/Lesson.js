
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
    type: DataTypes.STRING,
    allowNull: true // Assignments/Quizzes might not have a direct file URL
  },
  position: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true
});

module.exports = Lesson;
