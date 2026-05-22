import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;
  token = req.cookies.jwt || req.headers.authorization?.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      req.user = await User.findById(decoded.userId).select('-password');
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const ownerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'Owner') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an Owner' });
  }
};
