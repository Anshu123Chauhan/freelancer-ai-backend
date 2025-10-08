import Brand from "../../../models/Brand.js";
import { generateSlug } from "../../../utils/slugify.js";

// Create Brand
export const createBrand = async (req, res, next) => {
  try {
    const { name, description, image } = req.body;

    const brand = new Brand({
      name,
      description,
      image,
      slug: generateSlug(name),
    });

    await brand.save();

    res.status(201).json({ success: true, data: brand });
  } catch (err) {
    next(err);
  }
};

// Get All Brands 
export const getAllBrands = async (req, res, next) => {
  try {
    // Query params (defaults applied)
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      order = "desc",
      includeDeleted = "false"
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    // --- Build filter ---
    const filter = {};
    if (includeDeleted !== "true") {
      filter.isDeleted = false; // only active brands by default
    }
    if (search) {
      filter.name = { $regex: search, $options: "i" }; // case-insensitive search by name
    }

    // --- Query DB ---
    const brands = await Brand.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(parseInt(limit) === 0 ? 0 : skip) // if limit=0, return all
      .limit(parseInt(limit) === 0 ? 0 : parseInt(limit));

    const total = await Brand.countDocuments(filter);
    const totalPages = limit === "0" ? 1 : Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: brands,
      pagination: {
        total,
        page: parseInt(page),
        totalPages,
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    next(err);
  }
};


// Get Single Brand
export const getBrandById = async (req, res, next) => {
  try {
    const brand = await Brand.findOne({ _id: req.params.id, isDeleted: false });
    if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

    res.json({ success: true, data: brand });
  } catch (err) {
    next(err);
  }
};

//Update Brand
export const updateBrand = async (req, res, next) => {
  try {
    const id = req.params.id;
    const update = { ...req.body };

    delete update.isDeleted; // prevent direct deletion

    if (update.name) {
      update.slug = generateSlug(update.name);
    }

    const brand = await Brand.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

    res.json({ success: true, data: brand });
  } catch (err) {
    next(err);
  }
};

//Soft Delete Brand
export const deleteBrand = async (req, res, next) => {
  try {
    const brand = await Brand.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

    res.json({ success: true, message: "Brand deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// Restore Brand
export const restoreBrand = async (req, res, next) => {
  try {
    const brand = await Brand.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });
    res.json({ success: true, message: "Brand restored successfully", data: brand });
  } catch (err) {
    next(err);
  }
};
