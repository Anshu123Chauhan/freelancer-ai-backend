import express from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist
} from "./controller/index.js";
import { authenticate } from "../auth/index.js";

const router = express.Router();

router.get("/", authenticate, getWishlist);
router.post("/add", authenticate, addToWishlist);
router.post("/remove", authenticate, removeFromWishlist);
router.delete("/clear", authenticate, clearWishlist);

export default router;
