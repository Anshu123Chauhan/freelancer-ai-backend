import express from 'express';
import {createFreelancerProfile} from './controller/index.js'

const router = express.Router();

router.post("/", createFreelancerProfile);

export default router
