import Brand from '../../../models/Brand.js';
import {Category,Subcategory} from '../../../models/Category.js';
import {gigService} from '../../../models/Gigs.js';

export const productsListing = async (req, res) => {
  try {
   let {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      order = "desc",
      category
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    // Always filter only active gigs
    const baseQuery = { status: "Active" };

    //Add category filter only if provided
    if (category && category.trim() !== "") {
      baseQuery.category = category;
    }

    //Add search filter only if provided
    if (search && search.trim() !== "") {
      baseQuery.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } }
      ];
    }

    //Count total results for pagination
    const total = await gigService.countDocuments(baseQuery);

    //Fetch gigs with populate & pagination
    console.log(`baseQuery==> ${JSON.stringify(baseQuery)}`)
    const gigs = await gigService.find(baseQuery)
      .populate("sellerId", "name email")
      .select("title description category rating images packages")
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      limit,
      gigs,
    });
  } catch (err) {
    console.error("Error in productsListing:", err);
    res.status(500).json({ error: err.message });
  }
};

export const productDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const gig = await gigService.findById(id)
      .populate("sellerId", "name email ")
      .populate("createdBy", "name");

    if (!gig || !gig.status) {
      return res.status(404).json({ success: false, message: "Gig not found" });
    }

    res.status(200).json({
      success: true,
      gig,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
