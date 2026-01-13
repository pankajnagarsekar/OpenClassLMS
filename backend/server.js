
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { Op } = require('sequelize');
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

// Associations
User.belongsToMany(Course, { through: Enrollment, foreignKey: 'user_id' });
Course.belongsToMany(User, { through: Enrollment, foreignKey: 'course_id' });

Course.belongsTo(User, { foreignKey: 'teacher_id', as: 'Teacher' });
User.hasMany(Course, { foreignKey: 'teacher_id', as: 'TeachingCourses' });

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

// --- SETTINGS HELPER ---
const getSetting = async (key) => {
  try {
    const setting = await SystemSetting.findByPk(key);
    return setting ? setting.value : false;
  } catch (err) {
    console.error(`Error fetching setting ${key}:`, err.message);
    return false;
  }
};

// --- AUTH MIDDLEWARE ---
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied' });
  
  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    try {
      const user = await User.findByPk(decoded.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (!user.is_active) return res.status(403).json({ message: 'Account Deactivated.' });
      req.user = user;
      next();
    } catch (dbErr) {
      return res.status(500).json({ message: 'Database error' });
    }
  });
};

// Helper for teacher permissions (Allow Admin to act as Teacher)
const isTeacherOrAdmin = (req) => req.user.role === 'teacher' || req.user.role === 'admin';

const checkEnrollmentStatus = async (req, res, next) => {
  const courseId = req.params.courseId || req.params.id;
  if (!courseId) return next();
  if (isTeacherOrAdmin(req)) return next();

  const enrollment = await Enrollment.findOne({
    where: { user_id: req.user.id, course_id: courseId }
  });

  if (!enrollment) return res.status(403).json({ message: 'Not enrolled in this course.' });
  if (!enrollment.is_active) return res.status(403).json({ message: 'Enrollment inactive.' });
  req.enrollment = enrollment;
  next();
};

// --- SETTINGS ROUTES ---
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

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const publicReg = await getSetting('ENABLE_PUBLIC_REGISTRATION');
    if (!publicReg) return res.status(403).json({ message: 'Public registration disabled.' });

    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ message: 'Email exists' });

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
    res.status(201).json({ message: 'User created.', requireVerification: !skipVerify });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.is_active) return res.status(403).json({ message: 'Account deactivated.' });
    
    const requireVerify = await getSetting('REQUIRE_EMAIL_VERIFICATION');
    if (requireVerify && !user.is_verified) return res.status(401).json({ message: 'Verify email first.' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: rememberMe ? '30d' : '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- ADMIN ROUTES ---
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
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      include: [
        { 
          model: Course, 
          as: 'TeachingCourses', 
          attributes: ['id', 'title'],
          include: [{ model: Enrollment, attributes: ['id'] }] 
        },
        { 
          model: Enrollment, 
          include: [
            { 
              model: Course, 
              attributes: ['id', 'title'],
              include: [{ model: User, as: 'Teacher', attributes: ['name'] }]
            }
          ] 
        }
      ]
    });
    res.json(users);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/admin/users/:id', authenticateToken, adminAuth, async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Safety check: Prevent changing Root Admin role if user isn't Root Admin
    if (user.id === 1 && req.user.id !== 1 && role !== 'admin') {
      return res.status(403).json({ message: 'Cannot demote Root Admin' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    
    if (password && password.trim() !== '') {
      user.password_hash = await bcrypt.hash(password, 10);
    }
    
    await user.save();
    res.json({ message: 'User updated successfully' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/admin/users/:id', authenticateToken, adminAuth, async (req, res) => {
  try {
    if (req.params.id == '1') return res.status(403).json({ message: 'Cannot delete Root Admin' });
    await User.destroy({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- TEACHER & COURSE ROUTES ---
app.get('/api/teacher/my-courses', authenticateToken, async (req, res) => {
  try {
    // FIX: Allow Admin to see courses they created
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ message: 'Teachers only' });
    
    const courses = await Course.findAll({ 
      where: { teacher_id: req.user.id },
      include: [{ model: Enrollment }, { model: Lesson }]
    });
    const data = courses.map(c => ({
      id: c.id,
      title: c.title,
      student_count: c.Enrollments.length,
      lesson_count: c.Lessons.length,
      createdAt: c.createdAt
    }));
    res.json(data);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/courses', authenticateToken, async (req, res) => {
  try {
    // FIX: Allow Admin to create courses
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ message: 'Teachers only' });
    
    const { title, description, thumbnail_url, video_embed_url, access_days } = req.body;
    const course = await Course.create({
      title, description, thumbnail_url, video_embed_url, access_days: access_days || 365, teacher_id: req.user.id
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

// --- LESSONS ---
app.post('/api/courses/:courseId/lessons', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.teacher_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

    const { title, type, content_url, position } = req.body;
    const lesson = await Lesson.create({
      course_id: course.id, title, type, content_url, position: position || 0
    });
    res.status(201).json(lesson);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/lessons/:id', authenticateToken, async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.id, { include: [Course] });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    if (lesson.Course.teacher_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    
    await lesson.destroy();
    res.json({ message: 'Lesson deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- GENERAL COURSE DATA ---
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
        { model: Lesson, 
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

// --- GRADEBOOK & ANNOUNCEMENTS ---
app.get('/api/courses/:id/gradebook', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id, { include: [Lesson] });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (req.user.role !== 'teacher' && req.user.role !== 'admin' && course.teacher_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

    const enrollments = await Enrollment.findAll({ where: { course_id: course.id }, include: [User] });
    const lessons = course.Lessons;

    const rows = await Promise.all(enrollments.map(async (en) => {
      const student = en.User;
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
      rows
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/courses/:id/announcements', authenticateToken, async (req, res) => {
  try {
    const posts = await Announcement.findAll({ where: { course_id: req.params.id }, order: [['createdAt', 'DESC']] });
    res.json(posts);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/courses/:id/announcements', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    await Announcement.create({ ...req.body, course_id: req.params.id });
    res.json({ message: 'Posted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- STUDENT DASHBOARD ---
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
    res.json({ message: 'Enrolled' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// SERVE REACT FRONTEND (FORCE 'dist' FOLDER)
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start Server
sequelize.sync().then(async () => {
  console.log('Database connected.');
  await SystemSetting.findOrCreate({ where: { key: 'ENABLE_PUBLIC_REGISTRATION' }, defaults: { value: true } });
  await SystemSetting.findOrCreate({ where: { key: 'REQUIRE_EMAIL_VERIFICATION' }, defaults: { value: true } });
  app.listen(PORT, () => console.log(`OpenClass Live on ${PORT}`));
}).catch(err => {
  console.error('Database connection failed:', err);
});
