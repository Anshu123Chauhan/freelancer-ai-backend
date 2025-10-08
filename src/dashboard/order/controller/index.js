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

    const usertype = decoded.userType;
    let query = {};

    //Role-based filtering
    if (usertype === "Seller") {
      console.log(`checking id ==>  ${decoded._id}`);
      query.customerId = decoded._id;
    }

    // Admin sees all orders
    // console.log(`checking seller id ==>  ${query.customerId}`);
    // Pagination, Sorting, Searching
    let {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    //Search in product name, orderNumber, or user email
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "items.name": { $regex: search, $options: "i" } },
        { "userId.name": { $regex: search, $options: "i" } },
      ];
    }
    // console.log(`checking Query ==>  ${JSON.stringify(query)}`);
    // Count total
    const total = await Order.countDocuments(query);

    //Fetch paginated data
    const orders = await Order.find(query)
     .populate("userId", "username phone")
      .populate("customerId", "name email")
      .populate("items.productId", "name price")
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

     console.log(`checking Order ==>  ${JSON.stringify(orders)}`)
   

    const formattedOrders = orders.map((order) => ({
      
      orderId: order._id,
      totalItems: order.items.length,
      customerName: order.customerId?.name,
      sellerName: order.sellerId?.name,
      paymentMethod:order.paymentMethod,
      paymentStatus: order.paymentStatus,
      shippingMethod: order.shippingMethod,
      orderStatus: order.status,
      total: order.total,
      date: order.createdAt
    }
  )
);

    //Pagination metadata
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      total,
      page,
      totalPages,
      limit,
      count: orders.length,
      orders: formattedOrders,
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
      .populate("userId", "username phone email")
      .populate("parentOrderId", "")
      .populate("customerId", "email")
      .populate("items.productId", "name images price description")
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
