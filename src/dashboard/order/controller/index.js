import { Order } from "../../../models/Order.js";
import jwt from "jsonwebtoken";

export const getOrders = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!token)
      return res.status(401).json({
        sucess: false,
        meaasge: "You Are Unauthorized to Access this module",
      });

    const userType = decoded.userType;
    let query = {};

    //Role-based filtering

    const userId = decoded._id;
    // const parentId = req.user.parent_id; // for staff
    // const parentType = req.user.parent_type;

    let { page = 1, limit = 10, search = "", status = "" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const baseQuery = {};

    // Admin: can see all orders
    if (userType === "Admin") {
      // no filter needed — can see everything
    }

    //Seller: only their own gigs/orders
    else if (userType === "Seller") {
      baseQuery.sellerId = userId;
    }

    //Staff User: see gigs belonging to their parent seller
    // else if (userType === "User" && parentType === "Seller") {
    //   baseQuery.sellerId = parentId;
    // }

    //Optional: Filter by order status
    if (status && status.trim() !== "") {
      baseQuery.status = status;
    }

    //Optional: Search by order number or gig title
    if (search && search.trim() !== "") {
      baseQuery.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "gigId.title": { $regex: search, $options: "i" } },
      ];
    }

    // Count total orders
    const total = await Order.countDocuments(baseQuery);

    // Fetch orders with populated details
    const orders = await Order.find(baseQuery)
      .populate({
        path: "gigId",
        select: "title category packages",
      })
      .populate("customerId", "name email")
      .populate("sellerId", "name email role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      limit,
      orders,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!token)
      return res.status(401).json({
        sucess: false,
        meaasge: "You Are Unauthorized to Access this module",
      });
    const authId = decoded._id;
    const authidType = decoded.userType;
    let QueryData;
    // console.log(`authId==> ${authId}, authidType==> ${authidType}`);
    if (authidType === "Seller") {
      QueryData = { _id: id, customerId: authId };
    }
    if (authidType === "Admin") {
      QueryData = { _id: id };
    }

    //Find the order by ID and populate related fields
    const order = await Order.find(QueryData)
      .populate({
        path: "gigId",
        select: "title category packages",
      })
      .populate("customerId", "name email")
      .populate("sellerId", "name email role")
      .lean(); // Convert Mongoose doc to plain JS object

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
