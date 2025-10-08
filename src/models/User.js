import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  parent_type: { type: String, required: true },
  parent_id: { type: mongoose.Schema.Types.ObjectId },
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  try {
    const last = await this.constructor.findOne({}, { id: 1 }, { sort: { id: -1 } });
    this.id = last && last.id ? last.id + 1 : 1;
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);

