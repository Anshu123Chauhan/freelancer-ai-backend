import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
  gigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Gig",
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Seller",
    required: true
  },
  
  // --- For package gigs (fixed price) ---
  packageSelected: String,        // Basic / Standard / Premium
  price: Number,                  // Final agreed price
  deliveryDate: Date,

  // --- For hourly gigs ---
  isHourly: { type: Boolean, default: false },
  hourlyRate: Number,
  totalHours: Number,
  totalPrice: Number,             // hourlyRate * totalHours

  // --- For custom proposals ---
  proposalId: { type: mongoose.Schema.Types.ObjectId, ref: "Proposal" },

  // --- Work delivery ---
  filesDelivered: [String],
  revisionCount: { type: Number, default: 0 },

  // --- Order lifecycle ---
  status: {
    type: String,
    enum: ["Pending", "InProgress", "Delivered", "Completed", "Cancelled"],
    default: "Pending",
  },
  paid: { type: Boolean, default: false },
  paymentMethod: { type: String, enum: ["Escrow", "Direct"], default: "Escrow" },

  // --- Review after completion ---
  review: {
    rating: Number,
    comment: String,
    createdAt: Date,
  }
}, { timestamps: true });



export const Order= mongoose.model('Order', orderSchema);