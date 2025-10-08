import express from "express";
import { addToCart, getCart, updateCartItem, removeCartItem, clearCart,
} from "./controller/index.js";

const router = express.Router();

router.post("/add", addToCart);
router.get("/list", getCart);
router.put("/update", updateCartItem);
router.delete("/remove", removeCartItem);
router.delete("/clear", clearCart);

export default router;
