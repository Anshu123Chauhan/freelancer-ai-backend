import mongoose from "mongoose";
import bcrypt from 'bcrypt';

const addressSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    minlength: [2, "Name must be at least 2 characters long"],
    maxlength: [50, "Name cannot exceed 50 characters"],
  },
  phone: {
    type: String,
    required: [true, "Phone number is required"],
    unique: true,
    match: [
      /^[6-9]{1}[0-9]{9}$/,
      "Phone number must be a valid 10-digit number",
    ],
  },
  address: {
    type: String,
    required: [true, "Street is required"],
    trim: true,
    minlength: [3, "Street must be at least 3 characters long"],
    maxlength: [100, "Street cannot exceed 100 characters"],
  },
  street: {
    type: String,
    trim: true
  },
  landmark: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    required: [true, "City is required"],
    trim: true,
    minlength: [2, "City must be at least 2 characters long"],
    maxlength: [50, "City cannot exceed 50 characters"],
  },
  state: {
    type: String,
    required: [true, "State is required"],
    trim: true,
    minlength: [2, "State must be at least 2 characters long"],
    maxlength: [50, "State cannot exceed 50 characters"],
  },
  postalCode: {
    type: String,
    required: [true, "Postal code is required"],
    match: [/^\d{5,6}$/, "Postal code must be 5 or 6 digits"],
  },
  country: {
    type: String,
    required: [true, "Country is required"],
    trim: true,
    minlength: [2, "Country must be at least 2 characters long"],
    maxlength: [50, "Country cannot exceed 50 characters"],
  },
}, { timestamps: true });

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        "Please enter a valid email address",
      ],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      match: [
        /^[6-9]{1}[0-9]{9}$/,
        "Phone number must be a valid 10-digit number",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      validate: {
        validator: function (v) {
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/.test(v);
        },
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      },
    },
   addresses: [addressSchema],
  },
  { timestamps: true }
);

customerSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  try {
    const last = await this.constructor.findOne({}, { id: 1 }, { sort: { id: -1 } });
    this.id = last && last.id ? last.id + 1 : 1;
    next();
  } catch (err) {
    next(err);
  }
});

customerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

customerSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Customer = mongoose.model("Customer", customerSchema);
export default Customer;