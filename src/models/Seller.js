import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const sellerSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true },

    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },

    fullName: { type: String },
    businessName: { type: String },
    businessAddress: { type: String },

    phone: { type: String },
    identityProof: { type: String },
    identityProofNumber: { type: String },
    gstNumber: { type: String },

    accountHolder: { type: String },
    ifscCode: { type: String },
    bankAccount: { type: String },
    commission : { type: String },

    addressProof: { type: String },
  },
  { timestamps: true }
);

sellerSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  try {
    const last = await this.constructor.findOne({}, { id: 1 }, { sort: { id: -1 } });
    this.id = last && last.id ? last.id + 1 : 1;
    next();
  } catch (err) {
    next(err);
  }
});

sellerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

sellerSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
export default mongoose.model('Seller', sellerSchema);
