import Brand from '../../../models/Brand.js';
import {Category,Subcategory} from '../../../models/Category.js';
import {Product} from '../../../models/Product.js';

export const productsListing = async (req, res) => {
  try {
    const { minPrice, maxPrice, page = 1, limit = 10 } = req.query;
    const { brand, category, subcategory, attributes } = req.body;

    const filter = { isDeleted: false, status: "active" };
    if (brand) filter.brand = brand;
    if (category) filter.category = category;
    if (subcategory) filter.subCategory = subcategory;

    if (minPrice || maxPrice) {
      filter["variants.price"] = {};
      if (minPrice) filter["variants.price"].$gte = Number(minPrice);
      if (maxPrice) filter["variants.price"].$lte = Number(maxPrice);
    }

    if (attributes && Array.isArray(attributes) && attributes.length > 0) {
      filter["$and"] = attributes.map(attr => ({
        "variants.attributes": {
          $elemMatch: { type: attr.type, value: attr.value }
        }
      }));
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let products = await Product.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    products = products.map((p) => {
      if (p.variants && p.variants.length > 0) {
        const minVariantPrice = Math.min(...p.variants.map(v => v.price));
        const maxVariantPrice = Math.max(...p.variants.map(v => v.price));
        return { ...p, price: { min: minVariantPrice, max: maxVariantPrice } };
      } else {
        return { ...p, price: { min: p.sellingPrice, max: p.sellingPrice } };
      }
    });

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      products,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error in productsListing:", err);
    res.status(500).json({ error: err.message });
  }
};

export const productDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).lean()
      .populate("brand category subCategory vendor");
    if (!product || product.isDeleted) {
      return res.status(404).json({ error: "Product not found" });
    }
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: id },
      isDeleted: false
    }).limit(6);

    res.json({
      ...product,
      relatedProducts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
