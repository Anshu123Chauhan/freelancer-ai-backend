import { gigService } from "../../../models/Gigs.js";
import jwt, { decode } from "jsonwebtoken";
import mongoose from "mongoose";
import { generateSlug } from "../../../utils/slugify.js";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
dotenv.config();

export const createGig = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subcategory,
      tags,
      packages,
      isHourly,
      hourlyRate,
      images,
    } = req.body;
   
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!token)
      return res.status(401).json({
        sucess: false,
        meaasge: "You Are Unauthorized to Access this module",
      });

     const userType = decoded.userType;// assuming auth middleware attaches user
     let sellerId = decoded._id

  if (userType === "Seller" || userType==="Admin") {
      sellerId = decoded._id;
      console.log(`sellerId ${sellerId}`)
      
    } else if (userType === "User" && user.parent_type === "Seller") {
      sellerId = decoded.parent_id; // link to main seller
      console.log(`sellerId ${sellerId}`)
    } else {
      return res.status(403).json({ message: "Unauthorized: Only Seller or their Staff can create gigs" });
    }
     

    const gig = await gigService.create({
      sellerId,
      createdBy: decode._id,
      title,
      description,
      category,
      subcategory,
      tags,
      packages,
      isHourly,
      hourlyRate,
      images,
    });

    res.status(201).json({ success: true, gig });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Get all gigs (public)
 * @route GET /api/gigs
 */
export const getAllGigs = async (req, res) => {
  try {
    const { search = "", category, page = 1, limit = 10 } = req.query;
    const query = { status: "Active" };

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }
    if (category) query.category = category;

    const gigs = await gigService
      .find(query)
      .populate("freelancerId", "title rating")
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await gigService.countDocuments(query);

    res.json({ success: true, total, gigs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Get single gig details
 * @route GET /api/gigs/:id
 */
export const getGigById = async (req, res) => {
  try {
    const gig = await gigService
      .findById(req.params.id)
      .populate("freelancerId", "title bio rating");

    if (!gig) return res.status(404).json({ message: "Gig not found" });

    res.json({ success: true, gig });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Update gig
 * @route PUT /api/gigs/:id
 * @access Freelancer only
 */
export const updateGig = async (req, res) => {
  try {
    const gig = await gigService.findById(req.params.id);
    if (!gig) return res.status(404).json({ message: "Gig not found" });

    // Check ownership
    if (gig.freelancerId.toString() !== req.user.freelancerProfile)
      return res
        .status(403)
        .json({ message: "You can only update your own gigs" });

    Object.assign(gig, req.body);
    await gig.save();

    res.json({ success: true, gig });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Delete gig
 * @route DELETE /api/gigs/:id
 * @access Freelancer only
 */
export const deleteGig = async (req, res) => {
  try {
    const gig = await gigService.findById(req.params.id);
    if (!gig) return res.status(404).json({ message: "Gig not found" });

    if (gig.freelancerId.toString() !== req.user.freelancerProfile)
      return res.status(403).json({ message: "Unauthorized" });

    await gig.deleteOne();
    res.json({ success: true, message: "Gig deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
