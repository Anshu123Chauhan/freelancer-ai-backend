import mongoose from "mongoose";
import slugify from "slugify";
import { getCurrentDateTimeIST } from "../utils/datetime.js";

// const ImageSchema = new mongoose.Schema(
//   {
//     url: { type: String, trim: true },
//     alt: { type: String, trim: true },
//     width: Number,
//     height: Number,
//     mimeType: String,
//     createdAt: {
//       type: Date,
//       defaultValue: getCurrentDateTimeIST,
//     },
//     updatedAt: {
//       type: Date,
//     },
//   },
//   { _id: false }
// );

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, index: true, unique: true },
    description: { type: String, trim: true },
    // Optional image/banner
    image: { type: String },
    // Active / Inactive
    isActive: { type: Boolean, default: true },
    // Soft delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },

    // Any extra metadata
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

// auto-generate slug from name if not provided
CategorySchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    // keep slug lowercase and url-safe
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Default: exclude deleted documents from find queries
function excludeDeletedMiddleware(next) {
  if (!this.getQuery) return next();
  const q = this.getQuery();
  // only add condition if user didn't explicitly ask for isDeleted
  if (typeof q.isDeleted === "undefined") {
    this.where({ isDeleted: false });
  }
  next();
}
CategorySchema.pre("find", excludeDeletedMiddleware);
CategorySchema.pre("findOne", excludeDeletedMiddleware);
CategorySchema.pre("findOneAndUpdate", excludeDeletedMiddleware);
CategorySchema.pre("count", excludeDeletedMiddleware);
CategorySchema.pre("countDocuments", excludeDeletedMiddleware);
CategorySchema.pre("aggregate", function (next) {
  // For aggregate, push a $match at front if not asking for deleted explicitly.
  // We assume user may add { $match: { isDeleted: { $exists: true } } } to override.
  const firstStage = this.pipeline()[0] || {};
  const explicitlyHasDeleted = JSON.stringify(this.pipeline()).includes(
    '"isDeleted"'
  );

  if (!explicitlyHasDeleted) {
    this.pipeline().unshift({ $match: { isDeleted: false } });
  }
  next();
});

// instance method: soft delete
CategorySchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = getCurrentDateTimeIST;
  return this.save();
};

// static method: restore
CategorySchema.statics.restoreById = function (id) {
  return this.findByIdAndUpdate(
    id,
    { isDeleted: false, deletedAt: null },
    { new: true }
  );
};

const SubcategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, index: true,unique: true},
    description: { type: String, trim: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    image: { type: String },

    isActive: { type: Boolean, default: true },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },

    meta: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

SubcategorySchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Reuse same excludeDeleted middleware approach
SubcategorySchema.pre("find", excludeDeletedMiddleware);
SubcategorySchema.pre("findOne", excludeDeletedMiddleware);
SubcategorySchema.pre("findOneAndUpdate", excludeDeletedMiddleware);
SubcategorySchema.pre("count", excludeDeletedMiddleware);
SubcategorySchema.pre("countDocuments", excludeDeletedMiddleware);
SubcategorySchema.pre("aggregate", function (next) {
  const explicitlyHasDeleted = JSON.stringify(this.pipeline()).includes(
    '"isDeleted"'
  );
  if (!explicitlyHasDeleted) {
    this.pipeline().unshift({ $match: { isDeleted: false } });
  }
  next();
});

SubcategorySchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = getCurrentDateTimeIST;
  return this.save();
};
SubcategorySchema.statics.restoreById = function (id) {
  return this.findByIdAndUpdate(
    id,
    { isDeleted: false, deletedAt: null },
    { new: true }
  );
};

export const Category = mongoose.model("Category", CategorySchema);
export const Subcategory = mongoose.model("Subcategory", SubcategorySchema);
