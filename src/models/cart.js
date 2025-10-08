import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  image: { type: String },
  variant: { type: Object},
  description: { type: String },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  total: { type: Number, required: true, min: 0 },
  parent_type: { type: String, required: true},
  parent_id: { type: mongoose.Schema.Types.ObjectId, required: true,},
}, { _id:false });

cartItemSchema.pre("validate", function (next) {
  this.total = this.price * this.quantity;
  next();
});

const cartSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: false,
  },
  sessionId: {
    type: String,
    required: false,
  },
  items: [cartItemSchema],
  totalPrice: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: ["active", "ordered", "abandoned"],
    default: "active",
  }
}, { timestamps: true });

cartSchema.pre("save", function (next) {
  this.totalPrice = this.items.reduce((sum, item) => sum + item.total, 0);
  next();
});

const CheckoutSessionSchema = new mongoose.Schema({
userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
cartItems: [cartItemSchema],
subtotal: { type: Number, default: 0 },
shippingMethod: { type: String, enum: ['standard','express','same_day'], default: 'standard' },
shippingCost: { type: Number, default: 0 },
shippingAddress:{
    name: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    pincode: String
  },
paymentMethod: { type: String, enum: ['card','upi','wallet','netbanking','cod'], required: false },
paymentStatus: { type: String, enum: ['pending','paid','failed','not_required'], default: 'pending' },
paymentIntentId: { type: String },
total: { type: Number, default: 0 },
status: { type: String, enum: ['open','completed','cancelled'], default: 'open' },
expiresAt: { type: Date }
}, { timestamps: true });


export const CheckoutSession = mongoose.model('CheckoutSession', CheckoutSessionSchema);

export const Cart = mongoose.model("Cart", cartSchema);
