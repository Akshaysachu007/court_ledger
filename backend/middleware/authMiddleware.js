const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "No token, authorization denied"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({
      message: "Token is not valid"
    });
  }
};

const isAdmin = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied. Admins only."
      });
    }

    next();
  });
};

module.exports = { authenticateToken, isAdmin };