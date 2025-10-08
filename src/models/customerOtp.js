import mongoose from "mongoose";

const customerOtpSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
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

const CustomerOtp = mongoose.model('customerOtp', customerOtpSchema);
export default CustomerOtp