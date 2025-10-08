import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
  id: { type: Number, unique: true, sparse: true },
  role_name: { type: String, required: true },
  role_type: { type: String, required: true },
  parent_type: { type: String, required: true },
  parent_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  isActive: { type: Boolean, default: true },
  system: { type: Boolean, default: false }
}, { timestamps: true });

RoleSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  try {
    const last = await this.constructor.findOne({}, { code: 1 }, { sort: { code: -1 } });
    this.code = last && last.code ? last.code + 1 : 1;
    next();
  } catch (err) { next(err); }
});

export default mongoose.model('Role', RoleSchema);

