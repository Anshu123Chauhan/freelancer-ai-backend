import express from "express";
import { placeOrder, getCustomerOrders } from "./controller/index.js";


const router = express.Router();

router.post("/place", placeOrder);
router.get("/list",getCustomerOrders)

export default router;