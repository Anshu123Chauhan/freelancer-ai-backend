import express from 'express';
import { authenticate } from '../auth/index.js';
import { customerRegister, customerDetail, login, sentOtp, updateForgetPassword, customerPasswordUpdate, verifyOtp,
    addAddress, getAddress, getAddressList, updateAddress, removeAddress } from './controller/index.js';

const router = express.Router();

router.post('/auth/login', login);
router.post('/register', customerRegister);
router.get('/detail/:id', authenticate, customerDetail);
router.post('/update-password', authenticate, customerPasswordUpdate);
router.post('/forget-password', updateForgetPassword);
router.post('/send-otp', sentOtp);
router.post('/verify-otp', verifyOtp);
router.post('/address/add', authenticate, addAddress);
router.get('/address/list', authenticate, getAddressList);
router.get('/address/get/:id', authenticate, getAddress);
router.put('/address/update/:id', authenticate, updateAddress);
router.delete('/address/remove/:id', authenticate, removeAddress);

export default router;