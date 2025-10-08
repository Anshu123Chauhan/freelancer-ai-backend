import express from "express";
import {
  createBrand,
  getAllBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
  restoreBrand
} from "./controller/index.js";

const router = express.Router();

router.post("/", createBrand);     // Create
router.get("/", getAllBrands);        // Get All
router.get("/:id", getBrandById);  // Get One
router.put("/:id", updateBrand);   // Update
router.delete("/:id", deleteBrand); // Soft Delete
router.patch("/:id/restore", restoreBrand); // restore

export default router;
