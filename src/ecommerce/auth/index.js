import jwt from 'jsonwebtoken';
import Customer from '../../models/customer.js';
import { v4 as uuidv4 } from "uuid";

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: 'No token' });
    const customer = jwt.verify(token, process.env.JWT_SECRET);
    const email = customer.email;
    const data = await Customer.findOne({ email });
    if (!data) return res.status(401).json({ error: 'Customer not found' });
    req.user = data;
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const guestSession = async(req, res, next) => {
  const token = req.headers.authorization;
  if(token){
    return await authenticate(req, res, next);
  }
   if (!req.user) {
    let sessionId = req.headers["x-session-id"];
    if (!sessionId) {
        sessionId = uuidv4();
        res.setHeader("x-session-id", sessionId);
    }
    req.sessionId =sessionId;
    }
  next();
};

export const signToken = (customer) => {
  return jwt.sign( customer, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

