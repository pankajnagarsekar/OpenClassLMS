
// File: backend/middleware/adminAuth.js
const adminAuth = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Requires Admin privileges' });
  }
};

module.exports = adminAuth;
