import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import admin from '../models/admin.js';
import Seller from '../models/Seller.js';

export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const token = header.split(' ')[1];
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const email = user.email;
    const loginType = user.userType;
    let data;
    if(loginType == 'Admin'){
      data = await admin.findOne({ email });
    } else if(loginType == 'Seller'){
      data = await Seller.findOne({ email });
    } else if(loginType == 'User'){
      data = await User.findOne({ email });
    } else {
      res.status(400).json({ success: false, error: "invalid loginType" });
    }
    if (!data) return res.status(401).json({ error: 'User not found' });
    req.user = {...data.toObject(), userType: loginType};
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const signToken = (user) => {
  return jwt.sign( user, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

