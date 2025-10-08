import express from "express";
import {
  createCategory,
  listCategories,
  updateCategory,
  restoreCategory,
  softDeleteCategory,
  getCategoryById,
  createSubCategory,
  getAllSubCategory,
  getSubCategoryById,
  updateSubCategory,
  softDeleteSubCategory,
  restoreSubCategory

} from "./controller/index.js";
const router = express.Router();
// import { upload } from "../../middleware/upload.js";

router.post("/", createCategory);
router.get("/", listCategories);
router.get("/:id", getCategoryById)
router.put("/:id", updateCategory);
router.delete("/:id", softDeleteCategory); // soft delete
router.post("/:id/restore", restoreCategory);

// Subcategory
router.post("/sub", createSubCategory);
router.get("/sub/list",getAllSubCategory);
router.get("/sub/:id", getSubCategoryById);
router.put("/sub/:id", updateSubCategory);
router.delete("/sub/:id", softDeleteSubCategory);
router.patch("/sub/:id/restore", restoreSubCategory);
export default router;
