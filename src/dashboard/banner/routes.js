import express from 'express'
import {
  createBanner,
  getBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
} from "./controller/index.js";
const router = express.Router();

router.post("/", createBanner);       // Create
router.get("/", getBanners);          // Get All
router.get("/:id", getBannerById);    // Get One
router.put("/:id", updateBanner);     // Update
router.delete("/:id", deleteBanner);  // Delete

export default router

