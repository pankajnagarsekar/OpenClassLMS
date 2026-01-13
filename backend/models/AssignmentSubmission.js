
// File: backend/models/AssignmentSubmission.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AssignmentSubmission = sequelize.define('AssignmentSubmission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  lesson_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: false
  },
  grade: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  submitted_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false
});

module.exports = AssignmentSubmission;
