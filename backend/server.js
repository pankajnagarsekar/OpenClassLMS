
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
const DiscussionTopic = require('./models/DiscussionTopic');
const DiscussionReply = require('./models/DiscussionReply');
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

// 6. Discussions (New)
Course.hasMany(DiscussionTopic, { foreignKey: 'course_id', onDelete: 'CASCADE' });
DiscussionTopic.belongsTo(Course, { foreignKey: 'course_id' });

User.hasMany(DiscussionTopic, { foreignKey: 'user_id' });
DiscussionTopic.belongsTo(User, { foreignKey: 'user_id' });

DiscussionTopic.hasMany(DiscussionReply, { foreignKey: 'topic_id', onDelete: 'CASCADE' });
DiscussionReply.belongsTo(DiscussionTopic, { foreignKey: 'topic_id' });

User.hasMany(DiscussionReply, { foreignKey: 'user_id' });
DiscussionReply.belongsTo(User, { foreignKey: 'user_id' });

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

// ... (Auth and Admin routes remain unchanged) ...

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

// MODIFIED: Enrollment endpoint supporting manual assignment via email
app.post('/api/courses/:id/enroll', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    let userIdToEnroll = req.user.id;

    // Check if Teacher/Admin is trying to enroll someone else by email
    if (req.body.email) {
      if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
         return res.status(403).json({ message: 'Only instructors can manually enroll students.' });
      }
      
      // Teacher ownership check
      if (req.user.role === 'teacher' && course.teacher_id !== req.user.id) {
         return res.status(403).json({ message: 'You can only enroll students in your own courses.' });
      }

      const targetUser = await User.findOne({ where: { email: req.body.email } });
      if (!targetUser) return res.status(404).json({ message: 'Student email not found.' });
      userIdToEnroll = targetUser.id;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + course.access_days);

    const [enrollment, created] = await Enrollment.findOrCreate({
      where: { user_id: userIdToEnroll, course_id: course.id },
      defaults: { expires_at: expiresAt, is_active: true }
    });

    if (!created) {
      enrollment.is_active = true;
      enrollment.expires_at = expiresAt;
      await enrollment.save();
    }
    
    res.json({ message: 'Enrollment successful', enrollment });
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
    const users = await User.findAll({ 
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Course, as: 'TeachingCourses', include: [{ model: Enrollment }] },
        { model: Enrollment, include: [{ model: Course, include: [Lesson] }] },
        { model: Submission },
        { model: AssignmentSubmission }
      ]
    });

    const enrichedUsers = users.map(user => {
      const u = user.toJSON();
      u.stats = {};
      if (user.role === 'teacher' || user.role === 'admin') {
        u.stats.courses_created = user.TeachingCourses.length;
        const studentSet = new Set();
        user.TeachingCourses.forEach(course => {
          course.Enrollments.forEach(en => studentSet.add(en.user_id));
        });
        u.stats.total_students = studentSet.size;
      }
      if (user.role === 'student') {
        u.stats.courses_enrolled = user.Enrollments.length;
        let totalProgress = 0;
        let activeCourses = 0;
        user.Enrollments.forEach(en => {
          if (en.Course && en.Course.Lessons && en.Course.Lessons.length > 0) {
             const completed = (user.Submissions.filter(s => en.Course.Lessons.some(l => l.id === s.lesson_id)).length) + 
                               (user.AssignmentSubmissions.filter(s => en.Course.Lessons.some(l => l.id === s.lesson_id)).length);
             totalProgress += (completed / en.Course.Lessons.length) * 100;
             activeCourses++;
          }
        });
        u.stats.avg_completion = activeCourses > 0 ? Math.round(totalProgress / activeCourses) : 0;
      }
      delete u.TeachingCourses;
      delete u.Enrollments;
      delete u.Submissions;
      delete u.AssignmentSubmissions;
      return u;
    });

    res.json(enrichedUsers);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/admin/users/:id', authenticateToken, adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { name, email, role, password } = req.body;
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

app.put('/api/admin/users/:id/toggle-status', authenticateToken, adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (user.id === 1) return res.status(403).json({ message: 'Cannot deactivate the main administrator.' });
    user.is_active = !user.is_active;
    await user.save();
    res.json({ message: `User ${user.is_active ? 'Activated' : 'Deactivated'}`, is_active: user.is_active });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/admin/users/:id', authenticateToken, adminAuth, async (req, res) => {
  try {
    const userToDelete = await User.findByPk(req.params.id);
    if (!userToDelete) return res.status(404).json({ message: 'User not found' });
    if (userToDelete.id === 1 || userToDelete.email === 'admin@openclass.com') {
      return res.status(403).json({ message: 'Cannot delete the main administrator account.' });
    }
    await userToDelete.destroy();
    res.json({ message: 'User deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- TEACHER & COURSE ROUTES ---

app.get('/api/teacher/my-courses', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied: Teachers only' });
    const courses = await Course.findAll({ 
      where: { teacher_id: req.user.id },
      include: [{ model: Enrollment, required: false }, { model: Lesson, required: false }] 
    });
    const data = courses.map(c => ({
      id: c.id,
      title: c.title,
      student_count: c.Enrollments ? c.Enrollments.length : 0,
      lesson_count: c.Lessons ? c.Lessons.length : 0,
      createdAt: c.createdAt
    }));
    res.json(data);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// NEW: Get all students enrolled in Teacher's courses
app.get('/api/teacher/students', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied.' });

    const courses = await Course.findAll({
      where: { teacher_id: req.user.id },
      include: [{
        model: Enrollment,
        include: [{ model: User, attributes: ['name', 'email'] }]
      }]
    });

    const students = [];
    courses.forEach(course => {
      if (course.Enrollments) {
        course.Enrollments.forEach(en => {
          if (en.User) {
            students.push({
              id: en.user_id,
              name: en.User.name,
              email: en.User.email,
              course_title: course.title,
              enrolled_at: en.enrolled_at
            });
          }
        });
      }
    });

    res.json(students);
  } catch (error) { res.status(500).json({ message: error.message }); }
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

// NEW Endpoint to fetch students for a specific course (for scoping)
app.get('/api/courses/:id/students', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [{ 
        model: Enrollment, 
        include: [{ model: User, attributes: ['id', 'name', 'email'] }] 
      }]
    });

    if (!course) return res.status(404).json({ message: 'Course not found' });
    
    // Authorization Check
    if (req.user.role !== 'admin' && course.teacher_id !== req.user.id) {
       return res.status(403).json({ message: 'Unauthorized' });
    }

    const students = course.Enrollments.map(en => en.User).filter(user => user !== null);
    res.json(students);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// NEW: Secure Announcements Endpoint
app.get('/api/courses/:id/announcements', authenticateToken, checkEnrollmentStatus, async (req, res) => {
  try {
    const announcements = await Announcement.findAll({
      where: { course_id: req.params.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(announcements);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/courses/:id/announcements', authenticateToken, async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });
        if (req.user.role !== 'teacher' && req.user.role !== 'admin' && course.teacher_id !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const announcement = await Announcement.create({
            course_id: course.id,
            title: req.body.title,
            message: req.body.message
        });
        res.status(201).json(announcement);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/courses/:id/lessons', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.teacher_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

    const { title, type, content, position, target_students } = req.body;
    let contentUrl = content;
    if (req.file) contentUrl = `/uploads/${req.file.filename}`;
    if (type === 'video') contentUrl = req.body.content; 

    const lesson = await Lesson.create({
      course_id: course.id,
      title,
      type,
      content_url: contentUrl,
      position: position || 0,
      target_students: target_students ? target_students : null
    });

    // Handle Quiz Creation
    if (type === 'quiz' && req.body.questions) {
      const questions = JSON.parse(req.body.questions);
      for (const q of questions) {
        await Question.create({
          lesson_id: lesson.id,
          question_text: q.text,
          options: q.options, // Sequelize setter handles JSON stringification
          correct_answer: q.correctAnswer
        });
      }
    }

    res.status(201).json(lesson);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// NEW: Quiz Retrieval
app.get('/api/lessons/:id/quiz', authenticateToken, async (req, res) => {
  try {
    const questions = await Question.findAll({ where: { lesson_id: req.params.id } });
    res.json(questions);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/courses', async (req, res) => {
  try {
    const publicReg = await getSetting('ENABLE_PUBLIC_REGISTRATION');
    if (!publicReg) {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) return res.status(403).json({ message: 'Access denied: Public catalog is disabled.' });
      try { jwt.verify(token, JWT_SECRET); } catch (err) { return res.status(403).json({ message: 'Access denied: Invalid token.' }); }
    }
    const courses = await Course.findAll({ include: [{ model: User, as: 'Teacher', attributes: ['name'] }] });
    res.json(courses);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/courses/:id', authenticateToken, async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Manual Enrollment Check
    const enrollment = await Enrollment.findOne({
      where: { user_id: userId, course_id: courseId, is_active: true }
    });
    
    const isEnrolled = !!enrollment;
    const hasPrivilege = userRole === 'teacher' || userRole === 'admin';
    const canAccessContent = isEnrolled || hasPrivilege;

    const includeOptions = [
      { model: User, as: 'Teacher', attributes: ['name'] }
    ];

    if (canAccessContent) {
      includeOptions.push({
        model: Lesson,
        include: [
            { model: Submission, where: { user_id: userId }, required: false },
            { model: AssignmentSubmission, where: { user_id: userId }, required: false }
        ],
        order: [['position', 'ASC']]
      });
    }

    const course = await Course.findByPk(courseId, { include: includeOptions });

    if (!course) return res.status(404).json({ message: 'Course not found' });

    const courseData = course.toJSON();
    courseData.is_enrolled = isEnrolled;
    
    if (!canAccessContent) {
        courseData.Lessons = []; 
    }

    res.json(courseData);
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

// --- DISCUSSIONS (New) ---

app.get('/api/courses/:id/discussions', authenticateToken, checkEnrollmentStatus, async (req, res) => {
  try {
    const topics = await DiscussionTopic.findAll({
      where: { course_id: req.params.id },
      include: [
        { model: User, attributes: ['name', 'role'] },
        { model: DiscussionReply } 
      ],
      order: [['createdAt', 'DESC']]
    });
    
    const data = topics.map(t => ({
      id: t.id,
      course_id: t.course_id,
      title: t.title,
      content: t.content,
      createdAt: t.createdAt,
      User: t.User,
      reply_count: t.DiscussionReplies.length
    }));

    res.json(data);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/courses/:id/discussions', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (req.user.role !== 'teacher' && req.user.role !== 'admin' && course.teacher_id !== req.user.id) {
       return res.status(403).json({ message: 'Only instructors can start new discussion topics.' });
    }

    const { title, content } = req.body;
    const topic = await DiscussionTopic.create({
      course_id: course.id,
      user_id: req.user.id,
      title,
      content
    });
    res.status(201).json(topic);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/discussions/:id', authenticateToken, async (req, res) => {
  try {
    const topic = await DiscussionTopic.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['name', 'role'] },
        { model: Course },
        { 
          model: DiscussionReply, 
          include: [{ model: User, attributes: ['name', 'role'] }],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!topic) return res.status(404).json({ message: 'Topic not found' });

    const courseId = topic.Course.id;
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
       const enrollment = await Enrollment.findOne({ where: { user_id: req.user.id, course_id: courseId, is_active: true } });
       if (!enrollment) return res.status(403).json({ message: 'You are not enrolled in the course for this discussion.' });
    }

    res.json(topic);
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
    const reply = await DiscussionReply.create({
      topic_id: topic.id,
      user_id: req.user.id,
      content
    });

    const replyWithUser = await DiscussionReply.findByPk(reply.id, {
      include: [{ model: User, attributes: ['name', 'role'] }]
    });

    res.status(201).json(replyWithUser);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- GRADEBOOK ---

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
      return { student_name: student.name, student_email: student.email, grades };
    }));

    res.json({
      columns: lessons.filter(l => l.type === 'quiz' || l.type === 'assignment').map(l => ({ id: l.id, title: l.title })),
      rows: rows.filter(r => r !== null)
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

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
