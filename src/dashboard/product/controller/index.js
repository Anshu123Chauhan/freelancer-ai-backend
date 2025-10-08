import { Product } from "../../../models/Product.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { generateSlug } from "../../../utils/slugify.js";
import dotenv from "dotenv";
dotenv.config();

export const createProduct = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!token)
      return res.status(401).json({
        sucess: false,
        meaasge: "You Are Unauthorized to Access this module",
      });
    const usertype = decoded.userType;
    let parent_type = usertype;
    //==============
    let parentId = decoded.parent_id || decoded._id;
    if (usertype === "User") {
      parentId = decoded.parent_id;
      parent_type = decoded.parent_type;
    }
    const vendorid = usertype === "User" ? decoded._id : decoded._id;
    //===============
    // console.log(`vendorID==>${vendorid},usertype==>${usertype},parent_type==>${parent_type}, parent_Id==>${parentId}`)
    const {
      name,
      description,
      images = [],
      status,
      category,
      subCategory,
      brand,
      sellingPrice,
      mrp,
      sku,
      inventory,
      tags = [],
      variants = [],
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(category) ||
      !mongoose.Types.ObjectId.isValid(subCategory) ||
      !mongoose.Types.ObjectId.isValid(brand)
    ) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }
    const slug = generateSlug(name);
    const product = await Product.create({
      name,
      description,
      images,
      status,
      category,
      subCategory,
      brand,
      sellingPrice,
      mrp,
      sku,
      inventory,
      tags,
      vendor: vendorid,
      variants,
      usertype,
      slug,
      parent_id: parentId,
      parent_type,
    });

    res.status(201).json({ sucess: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getProducts = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      order = "desc",
    } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!token)
      return res.status(401).json({
        sucess: false,
        meaasge: "You Are Unauthorized to Access this module",
      });
    const vendor = decoded._id;
    const usertype = decoded.userType;

    const baseQuery = { isDeleted: false };
    // If seller → restrict by vendor
    if (usertype === "Seller") {
      baseQuery.vendor = vendor;
    }
    if (usertype === "User") {
      // staff should see their seller's products
      baseQuery.vendor = decoded.parent_id;
      // baseQuery.vendor = decoded._id; // staff belongs to seller
    }
    // else{
    //   baseQuery.vendor =  decoded.parent_id;
    // }
    if (search) {
      baseQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { "variants.sku": { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Product.countDocuments(baseQuery);
    const data = await Product.find(baseQuery)
      .populate("category", "name")
      .populate("subCategory", "name")
      .populate("brand", "name")
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ total, page, limit, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isDeleted: false,
    })
      .populate("category", "name")
      .populate("subCategory", "name")
      .populate("brand", "name");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      images, // optional: new array replaces existing product.images
      status,
      category,
      subCategory,
      brand,
      sellingPrice,
      mrp,
      sku,
      inventory,
      tags,
      vendor,
      variants,
      usertype, // optional: array to replace variants
    } = req.body;

    const product = await Product.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    const slug = generateSlug(name);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (name !== undefined) {
      product.name = name;
      product.slug = slug;
    }
    if (description !== undefined) product.description = description;
    if (images !== undefined)
      product.images = Array.isArray(images) ? images : product.images;
    if (status !== undefined) product.status = status;
    if (category !== undefined) product.category = category;
    if (subCategory !== undefined) product.subCategory = subCategory;
    if (brand !== undefined) product.brand = brand;
    if (sellingPrice !== undefined) product.sellingPrice = sellingPrice;
    if (mrp !== undefined) product.mrp = mrp;
    if (sku !== undefined) product.sku = sku;
    if (inventory !== undefined) product.inventory = inventory;
    if (tags !== undefined)
      product.tags = Array.isArray(tags) ? tags : product.tags;
    if (vendor !== undefined) product.vendor = vendor;
    if (usertype !== undefined) product.usertype = usertype;

    if (variants !== undefined) {
      product.variants = Array.isArray(variants) ? variants : product.variants;
    }
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Soft-delete
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    product.isDeleted = true;
    await product.save();
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//Restore Product
export const restoreProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ _id: id, isDeleted: true });
    if (!product)
      return res
        .status(404)
        .json({ message: "Product not found or not deleted" });

    product.isDeleted = false;
    await product.save();

    res.json({ message: "Product restored successfully", product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addVariant = async (req, res) => {
  try {
    const { id } = req.params; // product id
    const { sku, price, mrp, stock, images = [], attributes = {} } = req.body;

    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const newVariant = {
      sku,
      price,
      mrp,
      stock,
      images,
      attributes,
    };

    product.variants.push(newVariant);
    await product.save();

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//Update a Variant
export const updateVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params;

    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    // update only provided fields
    const { sku, price, mrp, stock, images, attributes } = req.body;
    if (sku !== undefined) variant.sku = sku;
    if (price !== undefined) variant.price = price;
    if (mrp !== undefined) variant.mrp = mrp;
    if (stock !== undefined) variant.stock = stock;
    if (images !== undefined) variant.images = images;
    if (attributes !== undefined) variant.attributes = attributes;

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//Soft Delete Variant
export const deleteVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params;

    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    variant.isDeleted = true; // soft delete flag
    await product.save();

    res.json({ message: "Variant deleted successfully", product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Restore Variant
export const restoreVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params;

    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(variantId);
    if (!variant || variant.isDeleted === false)
      return res
        .status(404)
        .json({ message: "Variant not found or not deleted" });

    variant.isDeleted = false;
    await product.save();

    res.json({ message: "Variant restored successfully", product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
