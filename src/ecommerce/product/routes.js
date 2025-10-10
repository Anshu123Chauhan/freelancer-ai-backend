import express from 'express';
import { productsListing, productDetails, categorylsit, categoryByProductList, subcategorylist,subcategorydetails } from './controller/index.js'
const router = express.Router();

router.post('/listing',productsListing);

router.get('/categorylist',categorylsit)
router.get('/:id', productDetails);
router.get('/category/subcategory', subcategorylist);
router.get('/categorylist/:id',categoryByProductList)
router.get('/category/subcategory/:id', subcategorydetails);

export default router;