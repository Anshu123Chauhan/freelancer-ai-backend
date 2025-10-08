import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { sellerRegister, updateSeller, getSeller, deleteSeller} from './controller/index.js';

const router = express.Router();

router.post('/register', sellerRegister)
router.put('/update/:id',authenticate, updateSeller)
router.get('/get/:id',authenticate, getSeller)
router.delete('/delete/:id',authenticate, deleteSeller)

export default router;

