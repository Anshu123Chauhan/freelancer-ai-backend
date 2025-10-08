import mongoose from "mongoose";

const userOtpSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    userType: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true,
        minlength: 4,
        maxlength: 8
    },
    expiresAt: {
        type: Date,
        required: true
    },
    verified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const UserOtp = mongoose.model('userOtp', userOtpSchema);
export default UserOtp