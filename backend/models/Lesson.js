
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
  },
  target_students: {
    type: DataTypes.TEXT, // JSON string of user IDs
    allowNull: true,
    comment: 'JSON array of user IDs allowed to view this lesson'
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Lesson;
