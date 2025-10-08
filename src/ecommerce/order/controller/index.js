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
  const gig = await gigService.findById(gigId);
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
      customerId,
      sellerId: gig.sellerId,
      clientId,
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
    const userId = decoded._id; // assuming middleware adds user

    //Query params
    let {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      order = "desc"
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    //Base query (only customer’s orders)
    const query = { userId };

    //Searching
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { paymentMethod: { $regex: search, $options: "i" } },
        { paymentStatus: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } }
      ];
    }

    //Count total
    const total = await OrderParent.countDocuments(query);

    //Fetch data
    const orders = await OrderParent.find(query)
      .populate({
        path: "Order",
        populate: [
          // { path: "customerId", select: "storeName email" },
          { path: "items.productId", select: "name image price" }
        ]
      })
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    //Pagination metadata
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      total,
      totalPages,
      page,
      limit,
      count: orders.length,
      orders
    });
  } catch (err) {
    console.error("Error fetching customer orders:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};