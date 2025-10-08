import express from "express";
import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  restoreVariant
} from "./controller/index.js";

const router = express.Router();

router.post("/", createProduct);
router.get("/", getProducts);
router.get("/:id", getProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.patch("/:id/restore", restoreProduct);


router.post("/:id/variants/", addVariant);
router.put("/:id/variants/:variantId", updateVariant);
router.delete("/:id/variants/:variantId", deleteVariant);
router.patch("/:id/:variantId/restore", restoreVariant);

export default router;