import { signToken } from '../../../middleware/auth.js';
import { sendMail } from '../../../middleware/sendMail.js';
import { Cart } from '../../../models/cart.js';
import Customer from '../../../models/customer.js';
import CustomerOtp from '../../../models/customerOtp.js';
import mongoose from 'mongoose';
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    let customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(400).json({ error: 'Email not registered with us' });
    }
    const ok = await customer.comparePassword(password);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const customerData = customer.toObject();
    delete customerData.password;
    delete customerData.__v;
    const token = signToken(customerData);
    const sessionId = req.headers["x-session-id"];
    if (sessionId) {
      const guestCart = await Cart.findOne({ sessionId, status: "active" });
      if (guestCart) {
        let customerCart = await Cart.findOne({
          customerId: customer._id,
          status: "active",
        });

        if (!customerCart) {
          guestCart.customerId = customer._id;
          guestCart.sessionId = undefined;
          await guestCart.save();
        } else {
          guestCart.items.forEach((gItem) => {
            const existing = customerCart.items.find(
              (cItem) => cItem.productId.toString() === gItem.productId.toString()
            );
            if (existing) {
              existing.quantity += gItem.quantity;
              existing.total = existing.price * existing.quantity;
            } else {
              customerCart.items.push(gItem);
            }
          });

          await customerCart.save();
          await guestCart.deleteOne();
        }
      }
    }
    res.json({ success: true, token, message: "Login successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const customerRegister =  async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    const existingCustomer = await Customer.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingCustomer) {
      return res
        .status(400)
        .json({ success: false, message: "Customer with this email or phone already exists" });
    }

    const customer = new Customer({
      name,
      email,
      phone,
      password,
    });

    await customer.save();

    res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      data: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error) {
    console.error("Error in register API:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
export const customerDetail =  async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id).select("-__v -password");

    res.status(200).json({
      success: true,
      message: "Customer fetch successfully",
      customer,
    });
  } catch (error) {
    console.error("Error in register API:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const customerPasswordUpdate = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Password is required" });
    }
    const ok = await customer.comparePassword(oldPassword);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid old password' });
    }
    customer.password = newPassword; 
    await customer.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error in password update API:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export const sentOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const customer = await Customer.findOne({email});
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 
    await CustomerOtp.findOneAndUpdate(
      { customerId: customer._id }, 
      { otp, expiresAt, verified: false },
      { upsert: true, new: true }
    );
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
          <p>Hi <strong>${customer.name}</strong>,</p>
          <p>Use the following OTP to verify your email:</p>
          <div class="otp-box">${otp}</div>
          <p>This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
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
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const verifyOtp = await CustomerOtp.findOneAndUpdate(
      { customerId: customer._id, otp, verified: false },
      { $set: { verified: true } },
      { new: true }
    );

    if (!verifyOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: { otpId: verifyOtp._id },
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

    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const verifyOtp = await CustomerOtp.findOneAndDelete({_id: new mongoose.Types.ObjectId(otpId) ,customerId: customer._id});
    if (!verifyOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }
    customer.password = password;
    await customer.save();

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

export const addAddress = async (req, res) => {
  try {
    const { street, city, state, postalCode, country, name, phone, address, landmark } = req.body;

    const customer = await Customer.findById(req.user._id);
    if (!customer) return res.status(404).json({ success: false, error: "Customer not found" });

    customer.addresses.push({ street, city, state, postalCode, country, name, phone, address, landmark });
    await customer.save();

    res.json({ success: true, message: "Address added successfully", addresses: customer.address });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getAddressList = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id);

    if (!customer) return res.status(404).json({ success: false, error: "Customer not found" });

    res.json({ success: true, message: "Address fetch successfully", addresses: customer.addresses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
export const getAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const addressId = new mongoose.Types.ObjectId(id);
    const customer = await Customer.findOne(
      { _id: new mongoose.Types.ObjectId(req.user._id), "addresses._id": addressId }
    );

    if (!customer) return res.status(404).json({ success: false, error: "Customer or Address not found" });

    res.json({ success: true, message: "Address updated successfully", addresses: customer.addresses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
export const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const customerId = new mongoose.Types.ObjectId(req.user._id);
    const addressId = new mongoose.Types.ObjectId(id);

    const setObj = {};
    for (const [key, value] of Object.entries(updates)) {
      setObj[`addresses.$.${key}`] = value;
    }
    setObj["addresses.$.updatedAt"] = new Date();

    const customer = await Customer.findOneAndUpdate(
      { _id: customerId, "addresses._id": addressId },
      { $set: setObj },
      { new: true, runValidators: true }
    );

    if (!customer) return res.status(404).json({ success: false, error: "Customer or Address not found" });

    res.json({ success: true, message: "Address updated successfully", addresses: customer.addresses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Remove Address
export const removeAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const addressId = new mongoose.Types.ObjectId(id);
    const customer = await Customer.findByIdAndUpdate(
      req.user._id,
      { $pull: { addresses: { _id: addressId } } },
      { new: true }
    );

    if (!customer) return res.status(404).json({ success: false, error: "Customer or Address not found" });

    res.json({ success: true, message: "Address removed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
