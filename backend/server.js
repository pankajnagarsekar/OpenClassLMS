
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { Op } = require('sequelize');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const xlsx = require('xlsx');
require('dotenv').config();

const sequelize = require('./config/db');
const User = require('./models/User');
const Course = require('./models/Course');
const Lesson = require('./models/Lesson');
const Enrollment = require('./models/Enrollment');
const Question = require('./models/Question');
const Submission = require('./models/Submission');
const Announcement = require('./models/Announcement');
const DiscussionTopic = require('./models/DiscussionTopic');
const DiscussionReply = require('./models/DiscussionReply');
const AssignmentSubmission = require('./models/AssignmentSubmission');
const Certificate = require('./models/Certificate');
const SystemSetting = require('./models/SystemSetting');
const CourseFeedback = require('./models/CourseFeedback');
const CalendarTask = require('./models/CalendarTask');
const Notification = require('./models/Notification');
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

// 1. Enrollment Relationship
User.belongsToMany(Course, { through: Enrollment, foreignKey: 'user_id' });
Course.belongsToMany(User, { through: Enrollment, foreignKey: 'course_id' });
Course.hasMany(Enrollment, { foreignKey: 'course_id' });
Enrollment.belongsTo(Course, { foreignKey: 'course_id' });
User.hasMany(Enrollment, { foreignKey: 'user_id' });
Enrollment.belongsTo(User, { foreignKey: 'user_id' });

// 2. Teacher Relationship
Course.belongsTo(User, { foreignKey: 'teacher_id', as: 'Teacher' });
User.hasMany(Course, { foreignKey: 'teacher_id', as: 'TeachingCourses' });

// 3. Course Content
Course.hasMany(Lesson, { foreignKey: 'course_id' });
Lesson.belongsTo(Course, { foreignKey: 'course_id' });
Course.hasMany(Announcement, { foreignKey: 'course_id' });
Announcement.belongsTo(Course, { foreignKey: 'course_id' });
Lesson.hasMany(Question, { foreignKey: 'lesson_id' });
Question.belongsTo(Lesson, { foreignKey: 'lesson_id' });

// 4. Submissions
User.hasMany(Submission, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Submission.belongsTo(User, { foreignKey: 'user_id' });
Lesson.hasMany(Submission, { foreignKey: 'lesson_id', onDelete: 'CASCADE' });
Submission.belongsTo(Lesson, { foreignKey: 'lesson_id' });

User.hasMany(AssignmentSubmission, { foreignKey: 'user_id', onDelete: 'CASCADE' });
AssignmentSubmission.belongsTo(User, { foreignKey: 'user_id' });
Lesson.hasMany(AssignmentSubmission, { foreignKey: 'lesson_id', onDelete: 'CASCADE' });
AssignmentSubmission.belongsTo(Lesson, { foreignKey: 'lesson_id' });

// 5. Certificates
User.hasMany(Certificate, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Certificate.belongsTo(User, { foreignKey: 'user_id' });
Course.hasMany(Certificate, { foreignKey: 'course_id', onDelete: 'CASCADE' });
Certificate.belongsTo(Course, { foreignKey: 'course_id' });

// 6. Discussions
Course.hasMany(DiscussionTopic, { foreignKey: 'course_id', onDelete: 'CASCADE' });
DiscussionTopic.belongsTo(Course, { foreignKey: 'course_id' });

User.hasMany(DiscussionTopic, { foreignKey: 'user_id' });
DiscussionTopic.belongsTo(User, { foreignKey: 'user_id' });

DiscussionTopic.hasMany(DiscussionReply, { foreignKey: 'topic_id', onDelete: 'CASCADE' });
DiscussionReply.belongsTo(DiscussionTopic, { foreignKey: 'topic_id' });

User.hasMany(DiscussionReply, { foreignKey: 'user_id' });
DiscussionReply.belongsTo(User, { foreignKey: 'user_id' });

// 7. Course Feedback
Course.hasMany(CourseFeedback, { foreignKey: 'course_id', onDelete: 'CASCADE' });
CourseFeedback.belongsTo(Course, { foreignKey: 'course_id' });
User.hasMany(CourseFeedback, { foreignKey: 'user_id' });
CourseFeedback.belongsTo(User, { foreignKey: 'user_id' });

// 8. Productivity & Notifications
User.hasMany(CalendarTask, { foreignKey: 'user_id', onDelete: 'CASCADE' });
CalendarTask.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Notification, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

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

// ... (Auth, Admin, Settings routes remain unchanged) ...

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

// ... (Enrollment logic) ...

app.post('/api/courses/:id/enroll', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
       return res.status(403).json({ message: 'Only instructors can manually enroll students.' });
    }
    if (req.user.role === 'teacher' && course.teacher_id !== req.user.id) {
       return res.status(403).json({ message: 'You can only enroll students in your own courses.' });
    }

    let emailsToEnroll = [];
    if (req.body.emails && Array.isArray(req.body.emails)) {
        emailsToEnroll = req.body.emails;
    } else if (req.body.email) {
        emailsToEnroll = [req.body.email];
    } else {
        return res.status(400).json({ message: 'No email provided.' });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + course.access_days);

    let successCount = 0;
    let notFoundCount = 0;

    for (const email of emailsToEnroll) {
        const targetUser = await User.findOne({ where: { email } });
        if (!targetUser) {
            notFoundCount++;
            continue;
        }
        const [enrollment, created] = await Enrollment.findOrCreate({
            where: { user_id: targetUser.id, course_id: course.id },
            defaults: { expires_at: expiresAt, is_active: true }
        });
        if (!created) {
            enrollment.is_active = true;
            enrollment.expires_at = expiresAt;
            await enrollment.save();
        }
        successCount++;
    }
    
    res.json({ message: `Processed enrollment. Success: ${successCount}, Not Found: ${notFoundCount}`, successCount });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ENROLLMENT LIFECYCLE MANAGEMENT

app.put('/api/enrollments/:id/note', authenticateToken, async (req, res) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id, { include: [Course] });
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    if (req.user.role !== 'admin' && enrollment.Course.teacher_id !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
    }
    enrollment.teacher_notes = req.body.note;
    await enrollment.save();
    res.json({ message: 'Note updated' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/enrollments/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id, { include: [Course] });
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    if (req.user.role !== 'admin' && enrollment.Course.teacher_id !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
    }
    enrollment.is_active = !enrollment.is_active;
    await enrollment.save();
    res.json({ message: 'Status toggled', is_active: enrollment.is_active });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/enrollments/:id', authenticateToken, async (req, res) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id, { include: [Course] });
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    if (req.user.role !== 'admin' && enrollment.Course.teacher_id !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
    }
    await enrollment.destroy();
    res.json({ message: 'Student removed from course' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- TEACHER SPECIFIC ROUTES ---

app.get('/api/teacher/my-courses', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const courses = await Course.findAll({
      where: { teacher_id: req.user.id },
      include: [
        { model: Enrollment, attributes: ['id'] },
        { model: Lesson, attributes: ['id'] }
      ]
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

app.get('/api/teacher/students', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Find all courses by this teacher
    const myCourses = await Course.findAll({ where: { teacher_id: req.user.id }, attributes: ['id', 'title'] });
    const courseIds = myCourses.map(c => c.id);
    
    // Find enrollments for these courses
    const enrollments = await Enrollment.findAll({
      where: { course_id: { [Op.in]: courseIds } },
      include: [
        { model: User, attributes: ['name', 'email'] },
        { model: Course, attributes: ['title'] }
      ]
    });
    
    const data = enrollments.map(e => ({
      name: e.User.name,
      email: e.User.email,
      course_title: e.Course.title,
      enrolled_at: e.enrolled_at
    }));
    
    res.json(data);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/teacher/candidates', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        const students = await User.findAll({ 
            where: { role: 'student' },
            attributes: ['id', 'name', 'email'] 
        });
        res.json(students);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// ... (Rest of existing endpoints) ...

app.get('/api/admin/users', authenticateToken, adminAuth, async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password_hash'] }, include: [{ model: Course, as: 'TeachingCourses', include: [{ model: Enrollment }] }, { model: Enrollment, include: [{ model: Course, include: [Lesson] }] }, { model: Submission }, { model: AssignmentSubmission }] });
    res.json(users);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/teacher/calendar', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const lessons = await Lesson.findAll({
      where: { due_date: { [Op.ne]: null }, type: { [Op.in]: ['quiz', 'assignment'] } },
      include: [{ model: Course, where: { teacher_id: req.user.id }, attributes: ['title'] }]
    });
    const courseEvents = lessons.map(l => ({ id: `lesson-${l.id}`, title: `${l.Course.title}: ${l.title}`, date: l.due_date, type: l.type === 'quiz' ? 'quiz' : 'assignment', link: `#/course/${l.course_id}` }));
    const tasks = await CalendarTask.findAll({ where: { user_id: req.user.id } });
    const taskEvents = tasks.map(t => ({ id: `task-${t.id}`, title: t.title, date: t.date, type: 'personal', description: t.description }));
    res.json([...courseEvents, ...taskEvents]);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ... (Calendar/Task/Discussion routes remain same) ...

app.post('/api/teacher/calendar/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, date, description } = req.body;
    const task = await CalendarTask.create({ user_id: req.user.id, title, date, description });
    res.status(201).json(task);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/teacher/calendar/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const rawId = req.params.id.replace('task-', '');
    const task = await CalendarTask.findOne({ where: { id: rawId, user_id: req.user.id } });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    await task.destroy();
    res.json({ message: 'Task deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/teacher/discussions/all', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const search = req.query.search || '';
    const myCourses = await Course.findAll({ where: { teacher_id: req.user.id }, attributes: ['id'] });
    const courseIds = myCourses.map(c => c.id);
    const topics = await DiscussionTopic.findAll({
      where: { course_id: { [Op.in]: courseIds }, title: { [Op.like]: `%${search}%` } },
      include: [{ model: User, attributes: ['name'] }, { model: Course, attributes: ['title'] }, { model: DiscussionReply }],
      order: [['createdAt', 'DESC']]
    });
    const data = topics.map(t => ({ id: t.id, title: t.title, course_title: t.Course.title, author: t.User.name, reply_count: t.DiscussionReplies.length, createdAt: t.createdAt }));
    res.json(data);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.findAll({ where: { user_id: req.user.id, is_read: false }, order: [['createdAt', 'DESC']] });
    res.json(notifications);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notif = await Notification.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (notif) { notif.is_read = true; await notif.save(); }
    res.json({ message: 'Marked read' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/lessons/:id/submit', authenticateToken, upload.single('assignmentFile'), async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.id, { include: [Course] });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    if (lesson.type === 'quiz') {
      const { answers } = req.body;
      const questions = await Question.findAll({ where: { lesson_id: lesson.id } });
      let correctCount = 0;
      questions.forEach(q => { if (answers[q.id] === q.correct_answer) correctCount++; });
      const score = Math.round((correctCount / questions.length) * 100);
      await Submission.create({ user_id: req.user.id, lesson_id: lesson.id, score });
      await Notification.create({ user_id: lesson.Course.teacher_id, message: `${req.user.name} completed quiz: ${lesson.title}`, type: 'submission', link: `#/gradebook/${lesson.course_id}` });
      return res.json({ score, totalQuestions: questions.length, correctCount });
    } 
    if (lesson.type === 'assignment') {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
      const existing = await AssignmentSubmission.findOne({ where: { user_id: req.user.id, lesson_id: lesson.id } });
      if (existing) { existing.file_path = `/uploads/${req.file.filename}`; existing.submitted_at = new Date(); await existing.save(); }
      else { await AssignmentSubmission.create({ user_id: req.user.id, lesson_id: lesson.id, file_path: `/uploads/${req.file.filename}` }); }
      await Notification.create({ user_id: lesson.Course.teacher_id, message: `${req.user.name} submitted assignment: ${lesson.title}`, type: 'submission', link: `#/gradebook/${lesson.course_id}` });
      return res.json({ message: 'Assignment submitted successfully' });
    }
    await Submission.create({ user_id: req.user.id, lesson_id: lesson.id, score: 100 });
    res.json({ message: 'Marked complete' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/lessons/:id/complete', authenticateToken, async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const exists = await Submission.findOne({ where: { user_id: req.user.id, lesson_id: lesson.id } });
    if (!exists) { await Submission.create({ user_id: req.user.id, lesson_id: lesson.id, score: 100 }); }
    res.json({ message: 'Completed' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/discussions/:id/replies', authenticateToken, async (req, res) => {
  try {
    const topic = await DiscussionTopic.findByPk(req.params.id, { include: [Course] });
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
       const enrollment = await Enrollment.findOne({ where: { user_id: req.user.id, course_id: topic.Course.id, is_active: true } });
       if (!enrollment) return res.status(403).json({ message: 'You are not enrolled in this course.' });
    }
    const { content } = req.body;
    const reply = await DiscussionReply.create({ topic_id: topic.id, user_id: req.user.id, content });
    if (topic.user_id !== req.user.id) {
      await Notification.create({ user_id: topic.user_id, message: `${req.user.name} replied to your topic: ${topic.title}`, type: 'reply', link: `#/course/${topic.course_id}` });
    }
    const replyWithUser = await DiscussionReply.findByPk(reply.id, { include: [{ model: User, attributes: ['name', 'role'] }] });
    res.status(201).json(replyWithUser);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// MODIFIED: Include enrollment details in gradebook
app.get('/api/courses/:id/gradebook', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id, { include: [Lesson] });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (req.user.role !== 'teacher' && req.user.role !== 'admin' && course.teacher_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
    const enrollments = await Enrollment.findAll({ where: { course_id: course.id }, include: [User] });
    const lessons = course.Lessons;
    const rows = await Promise.all(enrollments.map(async (en) => {
      const student = en.User;
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
      return { 
        student_name: student.name, 
        student_email: student.email, 
        enrollment_id: en.id,
        is_active: en.is_active,
        teacher_notes: en.teacher_notes,
        grades 
      };
    }));
    res.json({
      columns: lessons.filter(l => l.type === 'quiz' || l.type === 'assignment').map(l => ({ id: l.id, title: l.title })),
      rows: rows.filter(r => r !== null)
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ... (Course CRUD, etc.) ...

app.post('/api/courses/:id/lessons', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.teacher_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    const { title, type, content, position, target_students, due_date } = req.body;
    let contentUrl = content;
    if (req.file) contentUrl = `/uploads/${req.file.filename}`;
    if (type === 'video') contentUrl = req.body.content; 
    const lesson = await Lesson.create({ course_id: course.id, title, type, content_url: contentUrl, position: position || 0, target_students: target_students ? target_students : null, due_date: due_date ? due_date : null });
    if (type === 'quiz' && req.body.questions) {
      const questions = JSON.parse(req.body.questions);
      for (const q of questions) {
        await Question.create({ lesson_id: lesson.id, question_text: q.text, options: q.options, correct_answer: q.correctAnswer });
      }
    }
    res.status(201).json(lesson);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

const seedSettings = async () => {};

// FIX: Enable ALTER to automatically add missing columns (like teacher_notes)
sequelize.sync({ alter: true }).then(async () => {
  app.listen(PORT, () => console.log(`OpenClass Live on ${PORT}`));
});
