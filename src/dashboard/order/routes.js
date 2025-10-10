import express from 'express'
import {getOrders,getOrderById, updateOrder} from './controller/index.js'
const router = express.Router();

router.get('/',getOrders);
router.get('/:id',getOrderById);
router.put('/:id',updateOrder);


export default router