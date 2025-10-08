import express from 'express';
import { login, updateForgetPassword, sentOtp, verifyOtp } from './controller/index.js';

const router = express.Router();

router.post('/login', login);
router.post('/send-otp', sentOtp);
router.post('/verify-otp', verifyOtp);
router.post('/forget-password', updateForgetPassword);
export default router;

