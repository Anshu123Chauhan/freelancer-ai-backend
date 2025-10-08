// models/Product.js
import mongoose from "mongoose";

const VariantSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      // Note: unique in subdocuments isn't reliably enforced by MongoDB indexes,
      // consider validating uniqueness in app logic if needed.
    },
    price: {
      type: Number,
      required: true,
    },
    mrp: { type: Number },
    stock: {
      type: Number,
      default: 0,
    },
    images: {
      type: [String], // <-- multiple image URL strings for each variant
      default: [],
    },
   attributes: [
  {
    type: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
  },
],

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // Title / Name
    description: { type: String },
    images: {
      type: [String], // <-- multiple image URL strings for the product
      default: [],
    },
    status: { type: String, default: "draft" }, // e.g. draft/active
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Subcategory" },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
    sellingPrice: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    sku: { type: String }, // optional product-level SKU
    inventory: { type: Number, default: 0 }, // optional aggregated stock
    tags: { type: [String], default: [] },
    vendor: { type: mongoose.Schema.Types.ObjectId },
    variants: [VariantSchema], // embedded variants (each variant has its own images)
    isDeleted: { type: Boolean, default: false },
    usertype: { type: String },
    slug: { type: String, trim: true, index: true, unique: true },
    parent_id: { type: mongoose.Schema.Types.ObjectId },
    parent_type: { type: String, required: true },
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", ProductSchema);
