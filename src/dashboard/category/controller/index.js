import { Category, Subcategory } from '../../../models/Category.js'
import mongoose from 'mongoose'
import { generateSlug } from "../../../utils/slugify.js";

/**
 * Create category
 */
export const createCategory = async (req, res, next) => {
  try {
    const payload = {
      name: req.body.name,
      description: req.body.description,
      image: req.body.image || null,// expect { url, alt, ... } or null
      meta: req.body.meta
    };
    const cat = new Category(payload);
    await cat.save();
    res.status(201).json({ success: true, data: cat });
  } catch (err) { next(err); }
};

/**
 * Update category
 */
export const updateCategory = async (req, res, next) => {
  try {
    const id = req.params.id;
    const update = { ...req.body };
    // Do not allow direct isDeleted changes here; use dedicated endpoints
    delete update.isDeleted;
    if (update.name) {
      update.slug = generateSlug(update.name); // ✅ use update.name
    }
    const cat = await Category.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: cat });
  } catch (err) { next(err); }
};

/**
 * List categories (with pagination & filters)
 * Query params:
 *  - page, limit, q(name search), isActive (true/false), includeDeleted=true
 */
export const listCategories = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(100, parseInt(req.query.limit || 20));
    const skip = (page - 1) * limit;

    const q = {};
    if (req.query.q) q.name = { $regex: req.query.q, $options: 'i' };
    if (typeof req.query.isActive !== 'undefined') q.isActive = req.query.isActive === 'true';

    // includeDeleted explicit override
    if (req.query.includeDeleted === 'true') {
      // we need to bypass the default middleware; use Model.find().setOptions({}) ?
      // easiest: use Category.find(q).where() with explicit isDeleted
      // set q.isDeleted = { $in: [true, false] } -> won't filter; so remove field
      // but the pre-find middleware only adds condition if isDeleted not present. so put isDeleted: { $in: [true, false] } to bypass
      q.isDeleted = { $in: [true, false] };
    }

    const [data, total] = await Promise.all([
      Category.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Category.countDocuments(q.isDeleted ? { ...q } : q)
    ]);

    res.json({ success: true, data, meta: { total, page, limit } });
  } catch (err) { next(err); }
};

/**
 * Soft delete category (and optionally soft-delete its subcategories)
 */
export const softDeleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID"
      });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    category.isDeleted = true;
    category.deletedAt = new Date();
    await category.save();

    res.json({
      success: true,
      message: "Category soft deleted successfully",
      category
    });

  } catch (err) {
    next(err);
  }
};


/**
 * Restore category
 */
export const restoreCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID"
      });
    }

    // Find only deleted category
    const category = await Category.findOne({ _id: id, isDeleted: true });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found or already active"
      });
    }
    category.isDeleted = false;
    category.deletedAt = null;
    await category.save();
    res.json({
      success: true,
      message: "Category restored successfully",
      data: category
    });
  } catch (err) {
    next(err);
  }
};
export const getCategoryById = async (req, res, next) => {

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Category ID" });
    }

    const category = await Category.findOne({ _id: id, isDeleted: false })

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// Create SubCategory
export const createSubCategory = async (req, res, next) => {
  try {
    const payload = {
      name: req.body.name,
      description: req.body.description,
      image: req.body.image || null,// expect { url, alt, ... } or null
      meta: req.body.meta,
      category: req.body.category
    };
    if (!mongoose.Types.ObjectId.isValid(payload.category)) {
      return res.status(400).json({ success: false, message: "Invalid category ID" });
    }
    const subCategory = new Subcategory(payload);

    await subCategory.save();
    res.status(201).json({ success: true, data: subCategory });
  } catch (err) {
    next(err);
  }
};

// Get all SubCategories
export const getAllSubCategory = async (req, res, next) => {

  try {
    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(100, parseInt(req.query.limit || 20));
    const skip = (page - 1) * limit;

    const q = { isDeleted: false };

    // Search by name
    if (req.query.q) {
      q.name = { $regex: req.query.q, $options: "i" };
    }

    // Filter by active/inactive
    if (typeof req.query.isActive !== "undefined") {
      q.isActive = req.query.isActive === "true";
    }

    // Filter by category (optional)
    if (req.query.category && mongoose.Types.ObjectId.isValid(req.query.category)) {
      q.category = req.query.category;
    }

    // includeDeleted explicit override
    if (req.query.includeDeleted === "true") {
      q.isDeleted = { $in: [true, false] };
    }

    const [data, total] = await Promise.all([
      Subcategory.find(q)
        .populate("category", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Subcategory.countDocuments(q.isDeleted ? { ...q } : q),
    ]);

    res.json({
      success: true,
      data,
      meta: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
};

// Get single SubCategory
export const getSubCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid subcategory ID" });
    }

    const subCategory = await Subcategory.findOne({ _id: id, isDeleted: false })
      .populate("category", "name slug");

    if (!subCategory) {
      return res.status(404).json({ success: false, message: "SubCategory not found" });
    }

    res.json({ success: true, data: subCategory });
  } catch (err) {
    next(err);
  }
};

// Update SubCategory
export const updateSubCategory = async (req, res, next) => {
  try {
    const id = req.params.id;
    const update = { ...req.body };
    // Do not allow direct isDeleted changes here; use dedicated endpoints
    delete update.isDeleted;
    if (update.name) {
      update.slug = generateSlug(update.name); // ✅ use update.name
    }
    const subcat = await Subcategory.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!subcat) return res.status(404).json({ success: false, message: 'Subcategory not found' });
    res.json({ success: true, data: subcat });
  } catch (err) { next(err); }
};

// Soft Delete SubCategory
export const softDeleteSubCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid subcategory ID" });
    }

    const subCategory = await Subcategory.findById(id);
    console.log("subCategory==>", subCategory, id)

    if (!subCategory) {
      return res.status(404).json({ success: false, message: "SubCategory not found" });
    }

    subCategory.isDeleted = true;
    subCategory.deletedAt = new Date();
    await subCategory.save();

    res.json({ success: true, message: "SubCategory soft deleted", data: subCategory });
  } catch (err) {
    next(err);
  }
};

// Restore SubCategory
export const restoreSubCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid subcategory ID" });
    }

    const subCategory = await Subcategory.findOne({ _id: id, isDeleted: true });

    if (!subCategory) {
      return res.status(404).json({ success: false, message: "SubCategory not found or already active" });
    }

    subCategory.isDeleted = false;
    subCategory.deletedAt = null;
    await subCategory.save();

    res.json({ success: true, message: "SubCategory restored", data: subCategory });
  } catch (err) {
    next(err);
  }
};
