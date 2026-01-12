
// File: backend/models/Question.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  question_text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  options: {
    type: DataTypes.TEXT, // Stored as JSON string for maximum compatibility
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('options');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('options', JSON.stringify(value));
    }
  },
  correct_answer: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: true
});

module.exports = Question;
