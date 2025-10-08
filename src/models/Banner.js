import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    description: { type: String, required: true },
    button1: { type: String },
    url1: { type: String },
    button2: { type: String },
    url2: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.model("Banner", bannerSchema);