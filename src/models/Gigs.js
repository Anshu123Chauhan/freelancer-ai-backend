// support multiple packages and optional hourly gigs
import mongoose from "mongoose";

const gigSchema = new mongoose.Schema(
  {
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Seller", // or "User" if Seller stored in User model
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Staff or seller who created
  },
    title: { type: String, required: true },
    description: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Subcategory" },
    tags: { type: [String], default: [] },
    packages: [
      {
        name: { type: String }, // Basic / Standard / Premium
        price: { type: Number },
        deliveryTime: { type: Number }, // days
        revisions: { type: Number },
        details: { type: String },
      },
    ],

    // --- Optional hourly gigs (for long-term projects) ---
    isHourly: { type: Boolean, default: false },
    hourlyRate: { type: Number }, // used when isHourly = true

    // --- Media ---
    images: [String],
    video: String,

    // --- Stats ---
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },

    // --- Status ---
    status: { type: String, enum: ["Active", "Paused"], default: "Active" },
  },
  { timestamps: true }
);

export const gigService = mongoose.model("gig", gigSchema);
