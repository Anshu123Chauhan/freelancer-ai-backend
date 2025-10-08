import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASS, 
  },
});

export const sendMail = async (html, subject, email) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject,
      html,
    });

    if (info.accepted.length > 0) {
      console.log(`✅ Mail sent successfully to: ${email}`);
    } else {
      console.warn(`⚠️ Mail failed: ${info.rejected}`);
    }
  } catch (err) {
    console.error("❌ Mail error:", err.message || err);
  }
};
