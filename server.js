
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { Op } = require('sequelize');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
require('dotenv').config();

const sequelize = require('./config/db');
const User = require('./models/User');
const Course = require('./models/Course');
const Lesson = require('./models/Lesson');
const Enrollment = require('./models/Enrollment');
const Question = require('./models/Question');
const Submission = require('./models/Submission');
const Announcement = require('./models/Announcement');
const AssignmentSubmission = require('./models/AssignmentSubmission');
const Certificate = require('./models/Certificate');
const upload = require('./middleware/upload');
const adminAuth = require('./middleware/adminAuth');
const { sendVerificationEmail } = require('./utils/emailService');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'openclass_secret_key_123';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Associations
User.belongsToMany(Course, { through: Enrollment, foreignKey: 'user_id' });
Course.belongsToMany(User, { through: Enrollment, foreignKey: 'course_id' });
Course.hasMany(Lesson, { foreignKey: 'course_id' });
Lesson.belongsTo(Course, { foreignKey: 'course_id' });
Course.hasMany(Announcement, { foreignKey: 'course_id' });
Announcement.belongsTo(Course, { foreignKey: 'course_id' });
Lesson.hasMany(Question, { foreignKey: 'lesson_id' });
Question.belongsTo(Lesson, { foreignKey: 'lesson_id' });
User.hasMany(Submission, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Submission.belongsTo(User, { foreignKey: 'user_id' });
Lesson.hasMany(Submission, { foreignKey: 'lesson_id', onDelete: 'CASCADE' });
Submission.belongsTo(Lesson, { foreignKey: 'lesson_id' });
User.hasMany(AssignmentSubmission, { foreignKey: 'user_id', onDelete: 'CASCADE' });
AssignmentSubmission.belongsTo(User, { foreignKey: 'user_id' });
Lesson.hasMany(AssignmentSubmission, { foreignKey: 'lesson_id', onDelete: 'CASCADE' });
AssignmentSubmission.belongsTo(Lesson, { foreignKey: 'lesson_id' });
User.hasMany(Certificate, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Certificate.belongsTo(User, { foreignKey: 'user_id' });
Course.hasMany(Certificate, { foreignKey: 'course_id', onDelete: 'CASCADE' });
Certificate.belongsTo(Course, { foreignKey: 'course_id' });

// --- MIDDLEWARES ---

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied' });
  
  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    
    // Lifecycle Check: User Active
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.is_active) return res.status(403).json({ message: 'Account Deactivated. Contact Support.' });
    
    req.user = user;
    next();
  });
};

const checkEnrollmentStatus = async (req, res, next) => {
  const courseId = req.params.courseId || req.params.id;
  if (!courseId) return next();

  // Teachers and Admins bypass expiration checks
  if (req.user.role === 'teacher' || req.user.role === 'admin') return next();

  const enrollment = await Enrollment.findOne({
    where: { user_id: req.user.id, course_id: courseId }
  });

  if (!enrollment) return res.status(403).json({ message: 'Not enrolled in this course.' });
  if (!enrollment.is_active) return res.status(403).json({ message: 'Enrollment inactive. Contact your instructor.' });
  if (new Date(enrollment.expires_at) < new Date()) return res.status(403).json({ message: 'Course access has expired.' });

  req.enrollment = enrollment;
  next();
};

const checkTeacher = (req, res, next) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  next();
};

// --- AUTH & LIFECYCLE ROUTES ---

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(400).json({ message: 'Invalid credentials' });
    
    if (!user.is_active) return res.status(403).json({ message: 'Your account is currently deactivated.' });
    if (!user.is_verified) return res.status(401).json({ message: 'Please verify your email first.' });

    const expiry = rememberMe ? '30d' : '24h';
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: expiry });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/courses/:id/enroll', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + course.access_days);

    const [enrollment, created] = await Enrollment.findOrCreate({
      where: { user_id: req.user.id, course_id: course.id },
      defaults: { expires_at: expiresAt, is_active: true }
    });

    if (!created) {
      // Re-activate if was inactive
      enrollment.is_active = true;
      enrollment.expires_at = expiresAt;
      await enrollment.save();
    }

    res.json({ message: 'Successfully enrolled', enrollment });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- ADMIN CONTROL ROUTES ---

app.put('/api/admin/users/:id/toggle-status', authenticateToken, adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    user.is_active = !user.is_active;
    await user.save();
    res.json({ message: `User ${user.is_active ? 'Activated' : 'Deactivated'}`, is_active: user.is_active });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/admin/enrollments/:id/extend', authenticateToken, adminAuth, async (req, res) => {
  try {
    const { days } = req.body;
    const enrollment = await Enrollment.findByPk(req.params.id);
    const newExpiry = new Date(enrollment.expires_at);
    newExpiry.setDate(newExpiry.getDate() + parseInt(days));
    enrollment.expires_at = newExpiry;
    await enrollment.save();
    res.json({ message: 'Enrollment extended', expires_at: enrollment.expires_at });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- UPDATED CORE ROUTES ---

app.get('/api/courses/:id', authenticateToken, checkEnrollmentStatus, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id, { 
      include: [
        { model: User, as: 'Teacher', attributes: ['name'] }, 
        { 
          model: Lesson, 
          include: [
            { model: Submission, where: { user_id: req.user.id }, required: false },
            { model: AssignmentSubmission, where: { user_id: req.user.id }, required: false }
          ], 
          order: [['position', 'ASC']] 
        }
      ] 
    });
    res.json(course);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/student/dashboard', authenticateToken, async (req, res) => {
  try {
    const enrollments = await Enrollment.findAll({ 
      where: { user_id: req.user.id },
      include: [{ model: Course, include: [Lesson] }]
    });
    
    const dashboardData = await Promise.all(enrollments.map(async (en) => {
      const course = en.Course;
      const lessonIds = course.Lessons.map(l => l.id);
      const standard = await Submission.count({ where: { user_id: req.user.id, lesson_id: { [Op.in]: lessonIds } } });
      const assignments = await AssignmentSubmission.count({ where: { user_id: req.user.id, lesson_id: { [Op.in]: lessonIds } } });
      const completedCount = standard + assignments;
      const totalLessons = course.Lessons.length;
      
      return { 
        course_id: course.id, 
        title: course.title, 
        thumbnail_url: course.thumbnail_url, 
        total_lessons: totalLessons, 
        completed_lessons: completedCount, 
        progress_percentage: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
        expires_at: en.expires_at,
        is_active: en.is_active
      };
    }));
    res.json(dashboardData);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ===== SERVE REACT FRONTEND =====
//const path = require('path');

// Serve static files from React build (CSS, JS, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle API 404s
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Fallback to React index.html for all other routes (React Router handles them)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
sequelize.sync().then(() => app.listen(PORT, () => console.log(`OpenClass Live on ${PORT}`)));
