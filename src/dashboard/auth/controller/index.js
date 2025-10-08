import Admin from '../../../models/admin.js';
import { signToken } from '../../../middleware/auth.js';
import Seller from '../../../models/Seller.js';
import User from '../../../models/User.js';
import Permission from '../../../models/Permission.js';
import Role from '../../../models/Role.js';
import mongoose from 'mongoose';
import UserOtp from '../../../models/userOtp.js';
import { sendMail } from '../../../middleware/sendMail.js';

export const login = async (req, res) => {
  try {
    const { email, password, loginType } = req.body;
    const payload = { email, isActive: true, isDeleted: false };
    let user;
    if(loginType == 'Admin'){
      user = await Admin.findOne(payload);
    } else if(loginType == 'Seller'){
      user = await Seller.findOne(payload);
    } else if(loginType == 'User'){
      user = await User.findOne(payload);
    } else {
      res.status(400).json({ success: false, error: "invalid loginType" });
    }

    if (!user) return res.status(400).json({ error: 'Your account status is either pending or deleted. Please contact the administrator' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    user = user.toObject();
    delete user.password;
    user.userType = loginType;
    if(loginType == 'User'){
      const role = await Role.findById(user.role_id).select("-__v");
      const permission = await Permission.find({role_id: new mongoose.Types.ObjectId(role._id)}).select("-__v");
      user.permission = permission;
    }
    const token = signToken(user);    
    res.json({ success: true, token, message: "login successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export const sentOtp = async (req, res) => {
  try {
    const { email, userType } = req.body;
    const payload = { email, isActive: true, isDeleted: false };
    let user;
    if(userType == 'Admin'){
      user = await Admin.findOne(payload);
    } else if(userType == 'Seller'){
      user = await Seller.findOne(payload);
    } else if(userType == 'User'){
      user = await User.findOne(payload);
    } else {
      return res.status(400).json({ success: false, error: "invalid userType" });
    }
    if (!user) {
      return res.status(404).json({ success: false, message: `${userType} may inactive or not found` });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 
    await UserOtp.findOneAndUpdate(
      { userId: user._id }, 
      { otp, expiresAt, verified: false, userType },
      { upsert: true, new: true }
    );
    user.name = user.fullName || user.username;
    const subject = "Your One-Time Password (OTP) for Verification"
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
      <meta charset="UTF-8" />
      <title>Your OTP Code</title>
      <style>
          body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f7;
          margin: 0;
          padding: 0;
          }
          .container {
          max-width: 600px;
          margin: 30px auto;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          padding: 30px;
          }
          .header {
          text-align: center;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
          }
          .header h2 {
          color: #333;
          }
          .content {
          text-align: center;
          padding: 20px 10px;
          }
          .otp-box {
          display: inline-block;
          font-size: 28px;
          font-weight: bold;
          color: #ffffff;
          background: #007bff;
          padding: 12px 25px;
          border-radius: 6px;
          letter-spacing: 5px;
          margin: 20px 0;
          }
          .footer {
          text-align: center;
          font-size: 12px;
          color: #999;
          margin-top: 20px;
          }
      </style>
      </head>
      <body>
      <div class="container">
          <div class="header">
          <h2>OTP Verification</h2>
          </div>
          <div class="content">
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>Use the following OTP to verify your email:</p>
          <div class="otp-box">${otp}</div>
          <p>This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
          </div>
          <div class="footer">
          <p>If you didn’t request this, please ignore this email.</p>
          <p>&copy; ${new Date().getFullYear()} Ens Enterpries Ltd.</p>
          </div>
      </div>
      </body>
      </html>
    `;
    await sendMail(html, subject, email);
    res.status(200).json({
      success: true,
      message: "Otp sent successfully",
    });
  } catch (error) {
    console.error("Error in sent otp API:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp, userType } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }
    const payload = { email, isActive: true, isDeleted: false };
    let user;
    if(userType == 'Admin'){
      user = await Admin.findOne(payload);
    } else if(userType == 'Seller'){
      user = await Seller.findOne(payload);
    } else if(userType == 'User'){
      user = await User.findOne(payload);
    } else {
      return res.status(400).json({ success: false, error: "invalid userType" });
    }
    const otpRecord = await UserOtp.findOne({ userId: user._id, otp, verified: false });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    otpRecord.verified = true;
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: { otpId: otpRecord._id },
    });
  } catch (error) {
    console.error("Error in verifyOtp API:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const updateForgetPassword = async (req, res) => {
  try {
    const { email, password, otpId } = req.body;

    if (!email || !password || !otpId) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and otpId are required",
      });
    }
    
    const verifyOtp = await UserOtp.findByIdAndDelete(otpId);
    if (!verifyOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }
    const userType = verifyOtp.userType;
    const payload = { email, isActive: true, isDeleted: false };
    let user;
    if(userType == 'Admin'){
      user = await Admin.findOne(payload);
    } else if(userType == 'Seller'){
      user = await Seller.findOne(payload);
    } else if(userType == 'User'){
      user = await User.findOne(payload);
    } else {
      return res.status(400).json({ success: false, error: "invalid userType" });
    }
    if (!user) {
      return res.status(404).json({ success: false, message: `${userType} not found` });
    }
    user.password = password;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error in updateForgetPassword API:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};