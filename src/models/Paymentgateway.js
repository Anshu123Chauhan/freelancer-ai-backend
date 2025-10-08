import mongoose from "mongoose";

const paymentsettingSchema = new mongoose.Schema(
  {
    apikey: { type: String, required: true },
    secretkey: { type: String, required: true },
    gatewayname: { type: String, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.model("paymentsetting", paymentsettingSchema);