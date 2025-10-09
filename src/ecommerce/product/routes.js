import express from 'express';
import { productsListing, productDetails, categorylsit, categoryByProductList, subcategorylist } from './controller/index.js'
const router = express.Router();

router.post('/listing',productsListing);

router.get('/categorylist',categorylsit)
router.get('/:id', productDetails);
router.get('/subcategory', subcategorylist);
router.get('/categorylist/:id',categoryByProductList)

export default router;