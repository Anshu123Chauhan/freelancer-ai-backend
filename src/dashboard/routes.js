import express from 'express';
import auth from './auth/routes.js';
import admin from './admin/routes.js';
import seller from './seller/routes.js';
import { authenticate } from '../middleware/auth.js';
import category from './category/routers.js'
import brand from './brand/routes.js'
import product from './product/routes.js'
import ecommerce from '../ecommerce/routes.js'
import banner from './banner/routes.js'
import paymentsetting from './paygateway/routes.js'
import order from './order/routes.js';
const router = express.Router();
router.use('/auth', auth);
router.use('/ecommerce', ecommerce);
router.use('/admin', authenticate, admin);
router.use('/seller', seller);
router.use('/admin/category', authenticate, category)
router.use('/admin/brand', authenticate, brand)
router.use('/admin/product',authenticate, product)
router.use('/admin/banner',authenticate,banner)
router.use('/admin/paymentsetting', authenticate, paymentsetting)
router.use('/admin/order',authenticate, order)




export default router;