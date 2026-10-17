const jwt = require("jsonwebtoken");

// Like authenticateUser, but anonymous or expired requests continue without req.user instead of failing.
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      req.user = undefined;
    }
  }

  next();
};

module.exports = optionalAuth;
