import mongoose from "mongoose";

const VariantSchema = new mongoose.Schema({
  attributes: [
    {
      type: { type: String, required: true },  
      value: { type: String, required: true } 
    }
  ]
}, { _id: false });

const WishlistItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Product" },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String },
  description: { type: String },
  variant: { type: VariantSchema, default: null }
}, { _id: false });

const WishlistSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Customer" },
  items: [WishlistItemSchema]
}, { timestamps: true });

export default mongoose.model("Wishlist", WishlistSchema);
