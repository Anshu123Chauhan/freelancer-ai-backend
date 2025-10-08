import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  tab_name: { type: String, required: true },
  p_read: { type: Boolean, default: false },
  p_write: { type: Boolean, default: false },
  p_update: { type: Boolean, default: false },
  p_delete: { type: Boolean, default: false }
}, { timestamps: true });

permissionSchema.index({ role_id: 1, tab_name: 1 }, { unique: true });

export default mongoose.model('Permission', permissionSchema);

