import express from 'express';
import {createPaymentSetting,getPaymentSettings,getPaymentSettingById,updatePaymentSetting} from './controller/index.js'
const router = express.Router();

router.post('/',createPaymentSetting)
router.get('/',getPaymentSettings)
router.get('/:id',getPaymentSettingById)
router.put('/:id',updatePaymentSetting)

export default router

