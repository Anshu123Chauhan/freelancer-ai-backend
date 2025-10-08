import mongoose from 'mongoose'

const OrderParentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderNumber: { type: String, required: true, unique: true },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["cod", "card", "upi", "wallet", "netbanking"], default: "cod" },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed", "not_required"], default: "not_required" },
  status: { type: String, enum: ["placed", "paid", "shipped", "delivered", "cancelled"], default: "placed" },
  shippingAddress: {
    label: String,
    recipientName: String,
    phone: String,
    email: String,
    street: String,
    city: String,
    state: String,
    country: String,
    pincode: String
  },
  subOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }]
}, { timestamps: true });

export const OrderParent = mongoose.model("OrderParent", OrderParentSchema);



const OrderItemSchema = new mongoose.Schema({
productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true },
name: String,
qty: Number,
price: Number
}, { _id: false });


const AddressEmbed = new mongoose.Schema({
label: String,
recipientName: String,
phone: String,
street: String,
city: String,
state: String,
country: String,
pincode: String
}, { _id: false });


const OrderSchema = new mongoose.Schema({
parentOrderId: {type: mongoose.Schema.Types.ObjectId, ref: "OrderParent", required: true}, 
orderNumber: { type: String, required: true },
customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true }, //staff/seller
userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // user 
items: [OrderItemSchema],
subtotal: { type: Number, default: 0 },
shippingMethod: { type: String, enum: ['standard','express','same_day'], default: 'standard' },
shippingCost: Number,
shippingAddress: AddressEmbed,
paymentMethod: {type:String,enum: ['card','upi','wallet','netbanking','cod']},
paymentStatus: {type:String,enum: ['pending','paid','failed','not_required'],default: 'pending'},
ourPaymentTransactionId: String,
total: Number,
status: { type: String, enum: ['placed','paid','shipped','delivered','cancelled'], default: 'placed' }
}, { timestamps: true });


export const Order= mongoose.model('Order', OrderSchema);