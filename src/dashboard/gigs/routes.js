import express from "express";
import {
createGig,
getAllGigs,
getGigById,
updateGig,
deleteGig
} from "./controller/index.js";

const router = express.Router();

router.post("/", createGig);
router.get("/", getAllGigs);
router.get("/:id", getGigById);
router.put("/:id", updateGig);
router.delete("/:id", deleteGig);

export default router;