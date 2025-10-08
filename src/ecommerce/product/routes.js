import express from 'express';
import { productsListing, productDetails } from './controller/index.js'
const router = express.Router();

router.post('/listing',productsListing);
router.get('/:id', productDetails);

export default router;