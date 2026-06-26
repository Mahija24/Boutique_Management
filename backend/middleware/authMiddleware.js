import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.jwt;

  if (authHeader && /^Bearer\s+/i.test(authHeader)) {
    token = authHeader.split(/\s+/)[1];
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.userId).select('-password');
    return next();
  } catch (error) {
    const authTokenPresent = Boolean(authHeader && /^Bearer\s+/i.test(authHeader));
    console.error('JWT verification failed', {
      message: error.message,
      authHeader: authTokenPresent,
      authHeaderLength: authHeader?.split(/\s+/)[1]?.length,
      cookieToken: Boolean(cookieToken),
      cookieTokenLength: cookieToken?.length,
    });

    if (cookieToken && token !== cookieToken) {
      try {
        const decodedCookie = jwt.verify(cookieToken, JWT_SECRET);
        req.user = await User.findById(decodedCookie.userId).select('-password');
        return next();
      } catch (cookieError) {
        console.error('Cookie JWT verification also failed', cookieError.message);
      }
    }

    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const ownerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'Owner') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an Owner' });
  }
};
