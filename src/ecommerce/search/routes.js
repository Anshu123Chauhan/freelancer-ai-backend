import express from "express";
import { aiGigSearch } from "./controller/index.js";

const router = express.Router();

router.post("/aisearch", aiGigSearch);

export default router;
