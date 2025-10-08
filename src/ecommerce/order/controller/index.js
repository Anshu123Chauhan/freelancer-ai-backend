// controllers/orderController.js
import { Order } from "../../../models/Order.js";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import {sendMail} from '../../../middleware/sendMail.js'
// import { Cart } from "../../../models/cart.js";
import {gigService} from '../../../models/Gigs.js'

export const placeOrder = async (req, res) => {
  try {
      const { gigId, packageSelected, totalHours } = req.body;
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!token)
      return res.status(401).json({
        sucess: false,
        meaasge: "Token is Missing",
      });
    const userId = decoded._id; // assuming middleware adds user
  const gig = await gigService.findById(gigId)
      .populate({
        path: "sellerId",
        select: "name email role status"
      })
      .populate({
        path: "createdBy",
        select: "name role parent_id parent_type"
      });
    if (!gig) return res.status(404).json({ message: "Gig not found" });

    let price = 0, deliveryDate = null, isHourly = gig.isHourly;

    if (isHourly) {
      price = gig.hourlyRate * totalHours;
    } else {
      const selectedPackage = gig.packages.find(p => p.name === packageSelected);
      if (!selectedPackage) return res.status(400).json({ message: "Invalid package selected" });
      price = selectedPackage.price;
      deliveryDate = new Date(Date.now() + selectedPackage.deliveryTime * 86400000);
    }

    const order = await Order.create({
       gigId,
      customerId:userId,
      sellerId: gig.sellerId,
      packageSelected,
      price,
      isHourly,
      hourlyRate: gig.hourlyRate,
      totalHours,
      totalPrice: price,
      deliveryDate,
      status: "Pending",
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getCustomerOrders = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!token)
      return res.status(401).json({
        sucess: false,
        meaasge: "Token is Missing",
      });

    //Query params
   let { page = 1, limit = 10, search = "", sortBy = "createdAt", order = "desc" } = req.query;
    const customerId = decoded._id; // from token middleware
    page = parseInt(page);
    limit = parseInt(limit);

    // Base query: only this customer's orders
    const baseQuery = { customerId };

    //Search support (by orderNumber or gig title)
    if (search) {
      baseQuery.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "gigId.title": { $regex: search, $options: "i" } }
      ];
    }

    //Count total
    const total = await Order.countDocuments(baseQuery);

    //Fetch orders with population
    const orders = await Order.find(baseQuery)
      .populate({
        path: "gigId",
        select: "title category packages"
      })
      .populate({
        path: "sellerId",
        select: "name email role"
      })
      .populate({
        path: "customerId",
        select: "name email"
      })
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      limit,
      orders
    });
  } catch (err) {
    console.error("Error fetching customer orders:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};