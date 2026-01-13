
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
const SystemSetting = require('./models/SystemSetting');
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

// --- ASSOCIATIONS ---

// 1. Enrollment Relationship (Many-to-Many & Direct Access)
User.belongsToMany(Course, { through: Enrollment, foreignKey: 'user_id' });
Course.belongsToMany(User, { through: Enrollment, foreignKey: 'course_id' });

// Fix: Add direct associations to allow querying Enrollment table directly and including it in Course queries
Course.hasMany(Enrollment, { foreignKey: 'course_id' });
Enrollment.belongsTo(Course, { foreignKey: 'course_id' });
User.hasMany(Enrollment, { foreignKey: 'user_id' });
Enrollment.belongsTo(User, { foreignKey: 'user_id' });

// 2. Teacher Relationship (One-to-Many)
Course.belongsTo(User, { foreignKey: 'teacher_id', as: 'Teacher' });
User.hasMany(Course, { foreignKey: 'teacher_id', as: 'TeachingCourses' });

// 3. Course Content Relationships
Course.hasMany(Lesson, { foreignKey: 'course_id' });
Lesson.belongsTo(Course, { foreignKey: 'course_id' });
Course.hasMany(Announcement, { foreignKey: 'course_id' });
Announcement.belongsTo(Course, { foreignKey: 'course_id' });
Lesson.hasMany(Question, { foreignKey: 'lesson_id' });
Question.belongsTo(Lesson, { foreignKey: 'lesson_id' });

// 4. Submission & Progress Relationships
User.hasMany(Submission, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Submission.belongsTo(User, { foreignKey: 'user_id' });
Lesson.hasMany(Submission, { foreignKey: 'lesson_id', onDelete: 'CASCADE' });
Submission.belongsTo(Lesson, { foreignKey: 'lesson_id' });

User.hasMany(AssignmentSubmission, { foreignKey: 'user_id', onDelete: 'CASCADE' });
AssignmentSubmission.belongsTo(User, { foreignKey: 'user_id' });
Lesson.hasMany(AssignmentSubmission, { foreignKey: 'lesson_id', onDelete: 'CASCADE' });
AssignmentSubmission.belongsTo(Lesson, { foreignKey: 'lesson_id' });

// 5. Certificate Relationships
User.hasMany(Certificate, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Certificate.belongsTo(User, { foreignKey: 'user_id' });
Course.hasMany(Certificate, { foreignKey: 'course_id', onDelete: 'CASCADE' });
Certificate.belongsTo(Course, { foreignKey: 'course_id' });

// --- SETTINGS HELPER ---
const getSetting = async (key) => {
  const setting = await SystemSetting.findByPk(key);
  return setting ? setting.value : false;
};

// --- MIDDLEWARES ---

const checkMaintenance = async (req, res, next) => {
  if (req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/settings')) {
    return next();
  }
  const isMaintenance = await getSetting('MAINTENANCE_MODE');
  if (!isMaintenance) return next();

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role === 'admin') return next();
    } catch (e) {}
  }
  return res.status(503).json({ message: 'System is currently under maintenance.' });
};

app.use('/api', checkMaintenance);

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied' });
  
  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
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

// --- ROUTES ---

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await SystemSetting.findAll();
    const settingsMap = {};
    settings.forEach(s => settingsMap[s.key] = s.value);
    res.json(settingsMap);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/settings', authenticateToken, adminAuth, async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await SystemSetting.upsert({ key, value });
    }
    res.json({ message: 'Settings updated' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const publicReg = await getSetting('ENABLE_PUBLIC_REGISTRATION');
    if (!publicReg) return res.status(403).json({ message: 'Public registration is currently disabled.' });

    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const userRole = role === 'teacher' ? 'teacher' : 'student';
    const skipVerify = process.env.SKIP_EMAIL_VERIFICATION === 'true';

    await User.create({
      name, email, password_hash: hashedPassword, role: userRole,
      verification_token: skipVerify ? null : verificationToken,
      is_verified: skipVerify
    });

    if (!skipVerify) await sendVerificationEmail(email, verificationToken);
    res.status(201).json({ 
      message: skipVerify ? 'Registration successful.' : 'User created. Please check email for verification.',
      requireVerification: !skipVerify
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.is_active) return res.status(403).json({ message: 'Your account is currently deactivated.' });
    
    const requireVerify = await getSetting('REQUIRE_EMAIL_VERIFICATION');
    if (requireVerify && !user.is_verified) return res.status(401).json({ message: 'Please verify your email first.' });

    const expiry = rememberMe ? '30d' : '24h';
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: expiry });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/auth/verify', async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({ where: { verification_token: token } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });
    user.is_verified = true;
    user.verification_token = null;
    await user.save();
    res.json({ message: 'Email verified successfully.' });
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
      enrollment.is_active = true;
      enrollment.expires_at = expiresAt;
      await enrollment.save();
    }
    res.json({ message: 'Successfully enrolled', enrollment });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/admin/stats', authenticateToken, adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalCourses = await Course.count();
    const totalSubmissions = (await Submission.count()) + (await AssignmentSubmission.count());
    res.json({ totalUsers, totalCourses, totalSubmissions });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/admin/users', authenticateToken, adminAuth, async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password_hash'] } });
    res.json(users);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/admin/users/:id/toggle-status', authenticateToken, adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    user.is_active = !user.is_active;
    await user.save();
    res.json({ message: `User ${user.is_active ? 'Activated' : 'Deactivated'}`, is_active: user.is_active });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/admin/users/:id', authenticateToken, adminAuth, async (req, res) => {
  try {
    await User.destroy({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/admin/users/:id/reset-password', authenticateToken, adminAuth, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.update({ password_hash: hashedPassword }, { where: { id: req.params.id } });
    res.json({ message: 'Password reset successful' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- TEACHER & COURSE ROUTES ---

app.get('/api/teacher/my-courses', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied: Teachers only' });
    
    // Explicitly include Enrollment and Lesson.
    // Use required: false for Enrollments (LEFT JOIN) so courses with 0 students are still returned.
    const courses = await Course.findAll({ 
      where: { teacher_id: req.user.id },
      include: [
        { model: Enrollment, required: false }, 
        { model: Lesson, required: false } 
      ]
    });
    
    const data = courses.map(c => ({
      id: c.id,
      title: c.title,
      student_count: c.Enrollments ? c.Enrollments.length : 0,
      lesson_count: c.Lessons ? c.Lessons.length : 0,
      createdAt: c.createdAt
    }));

    res.json(data);
  } catch (error) { 
    console.error("Error fetching teacher courses:", error);
    res.status(500).json({ message: error.message }); 
  }
});

app.post('/api/courses', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied: Teachers only' });
    
    const { title, description, thumbnail_url, video_embed_url, access_days } = req.body;
    
    const course = await Course.create({
      title, description, thumbnail_url, video_embed_url,
      access_days: access_days || 365,
      teacher_id: req.user.id
    });

    res.status(201).json(course);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/courses/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.teacher_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    await course.update(req.body);
    res.json(course);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.findAll({ include: [{ model: User, as: 'Teacher', attributes: ['name'] }] });
    res.json(courses);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

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
        course_id: course.id, title: course.title, thumbnail_url: course.thumbnail_url, 
        total_lessons: totalLessons, completed_lessons: completedCount, 
        progress_percentage: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
        expires_at: en.expires_at, is_active: en.is_active
      };
    }));
    res.json(dashboardData);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- GRADEBOOK & MISC ---

app.get('/api/courses/:id/gradebook', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id, { include: [Lesson] });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (req.user.role !== 'teacher' && req.user.role !== 'admin' && course.teacher_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

    // Requires Enrollment.belongsTo(User).
    const enrollments = await Enrollment.findAll({ where: { course_id: course.id }, include: [User] });
    const lessons = course.Lessons;

    const rows = await Promise.all(enrollments.map(async (en) => {
      const student = en.User;
      // Handle edge case where student user might have been deleted but enrollment remains
      if (!student) return null;
      
      const grades = {};
      for (const lesson of lessons) {
        if (lesson.type === 'quiz') {
          const sub = await Submission.findOne({ where: { user_id: student.id, lesson_id: lesson.id }, order: [['score', 'DESC']] });
          if (sub) grades[lesson.id] = sub.score;
        } else if (lesson.type === 'assignment') {
          const sub = await AssignmentSubmission.findOne({ where: { user_id: student.id, lesson_id: lesson.id } });
          if (sub && sub.grade !== null) grades[lesson.id] = sub.grade;
        }
      }
      return { student_name: student.name, student_email: student.email, grades };
    }));

    res.json({
      columns: lessons.filter(l => l.type === 'quiz' || l.type === 'assignment').map(l => ({ id: l.id, title: l.title })),
      rows: rows.filter(r => r !== null)
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ... (Rest of existing routes like announcements, uploads, certificate logic - unchanged) ...

const seedSettings = async () => {
  const defaults = [
    { key: 'ENABLE_PUBLIC_REGISTRATION', value: true, description: 'Allow new users to register.' },
    { key: 'REQUIRE_EMAIL_VERIFICATION', value: true, description: 'Users must verify email before login.' },
    { key: 'MAINTENANCE_MODE', value: false, description: 'Block access for non-admins.' },
    { key: 'ENABLE_CERTIFICATES', value: true, description: 'Allow certificate downloads.' },
    { key: 'ENABLE_STUDENT_UPLOADS', value: true, description: 'Allow file uploads for assignments.' },
    { key: 'SHOW_COURSE_ANNOUNCEMENTS', value: true, description: 'Show news tab in course player.' },
    { key: 'SHOW_FEATURED_COURSES', value: true, description: 'Show featured list on home page.' },
    { key: 'ENABLE_DARK_MODE', value: false, description: 'Enable dark theme globally.' }
  ];
  for (const setting of defaults) {
    await SystemSetting.findOrCreate({ where: { key: setting.key }, defaults: setting });
  }
};

sequelize.sync().then(async () => {
  await seedSettings();
  app.listen(PORT, () => console.log(`OpenClass Live on ${PORT}`));
});
