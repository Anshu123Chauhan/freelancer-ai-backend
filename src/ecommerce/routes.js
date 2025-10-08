import express from 'express';
import customer from './customer/routes.js';
import product from './product/routes.js'
import cart from './cart/routes.js'
import { guestSession } from "./auth/index.js";
import Banner from '../models/Banner.js'
import order from './order/routes.js'
import wishlist from './wishlist/routes.js';
const router = express.Router();

router.use('/customer', customer);
router.use('/product', product);
router.use('/cart', guestSession, cart);
router.use('/wishlist', wishlist);
router.get('/banners',async(req,res)=>{
  try {
    const banners = await Banner.find({status:'active'}).sort({ createdAt: -1 });
    res.json({ success: true, data: banners });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }

})
router.use("/order", order);



export default router;