import express from 'express';
import { sellerRegister, sellerListing, customerListing, userRegister, customerGet, assignRoleAndPermission, adminRegister, userGet, userList,
    userUpdate, userDelete, getRoleAndPermissions, getRoleAndPermission, updateRoleAndPermission, deleteRoleAndPermission, updatePassword } from './controller/index.js';

const router = express.Router();

router.post('/register',adminRegister);
router.post('/seller-register', sellerRegister);
router.get('/seller-List', sellerListing);
router.get('/customer-List', customerListing);
router.post('/user-register', userRegister);
router.get('/customer-get/:id', customerGet);
router.get('/user-get/:id', userGet);
router.get('/user-list', userList);
router.put('/user-update/:id', userUpdate);
router.delete('/user-delete/:id', userDelete);
router.post('/role-permission', assignRoleAndPermission);
router.get('/role-permission', getRoleAndPermissions);
router.get('/role-permission/:id', getRoleAndPermission);
router.put('/role-permission/:id', updateRoleAndPermission);
router.delete('/role-permission/:id', deleteRoleAndPermission);
router.put('/updatepassword',updatePassword)

export default router;

