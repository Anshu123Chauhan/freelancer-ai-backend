import mongoose from 'mongoose'

const freelancerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // Professional Info
  title: String, // e.g. "Full Stack Developer"
  bio: String,
  skills: [String],
  languages: [String],
  experienceLevel: {
    type: String,
    enum: ["Beginner", "Intermediate", "Expert"],
    default: "Beginner"
  },
  hourlyRate: Number,
  
  // Portfolio
  portfolio: [{
    title: String,
    image: String,
    link: String,
    description: String,
  }],

  // Stats
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  completedOrders: { type: Number, default: 0 },

  // Verification
  verified: { type: Boolean, default: false },
  identityDocs: [String],

  // Availability
  isAvailable: { type: Boolean, default: true },

  // Social / Links
  website: String,
  linkedin: String,
  github: String,

  // Status
  status: { type: String, enum: ["Active", "Suspended"], default: "Active" },
}, { timestamps: true });

export const freelancer = mongoose.model("Freelancer", freelancerSchema);