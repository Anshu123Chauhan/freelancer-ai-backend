import {Cart} from "../../../models/cart.js";
import { Product } from "../../../models/Product.js";

const getCartByOwner = async (req) => {
  if (req.user) {
    return await Cart.findOne({ customerId: req.user._id, status: "active" });
  } else if (req.sessionId) {
    return await Cart.findOne({ sessionId: req.sessionId, status: "active" });
  }
  throw new Error("No customerId or sessionId provided");
};

export const addToCart = async (req, res) => {
  try {
    const { productId, name, price, quantity, variant, description, image } = req.body;
    let cart = await getCartByOwner(req);
    const productDetail = await Product.findById(productId);
    if (!cart) {
      cart = new Cart({
        customerId: req.user ? req.user._id : undefined,
        sessionId: req.sessionId || undefined,
        items: [],
      });
    }

    const isSameVariant = (v1, v2) => {
      if (!v1 && !v2) return true;
      if (!v1 || !v2) return false;
      if (!Array.isArray(v1.attributes) || !Array.isArray(v2.attributes)) return false;

      if (v1.attributes.length !== v2.attributes.length) return false;

      return v1.attributes.every(attr1 =>
        v2.attributes.some(attr2 => attr1.type === attr2.type && attr1.value === attr2.value)
      );
    };

    const existingItem = cart.items.find(item => {
      return (
        item.productId.toString() === productId &&
        isSameVariant(item.variant, variant)
      );
    });

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.total = existingItem.price * existingItem.quantity;
    } else {
      cart.items.push({
        productId,
        name,
        price,
        quantity,
        variant: variant || null,
        image: image || null,
        description,
        total: price * quantity,
        parent_type: productDetail.parent_type,
        parent_id: productDetail.parent_id
      });
    }

    await cart.save();
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getCart = async (req, res) => {
  try {
    const cart = await getCartByOwner(req);
    if (!cart) return res.json({ success: true, cart: { items: [] } });
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { productId, quantity, variant } = req.body;
    let cart = await getCartByOwner(req);

    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const isSameVariant = (v1, v2) => {
      if (!v1 && !v2) return true;
      if (!v1 || !v2) return false;
      if (!Array.isArray(v1.attributes) || !Array.isArray(v2.attributes)) return false;
      if (v1.attributes.length !== v2.attributes.length) return false;

      return v1.attributes.every(attr1 =>
        v2.attributes.some(attr2 => attr1.type === attr2.type && attr1.value === attr2.value)
      );
    };

    const item = cart.items.find(i => {
      return (
        i.productId.toString() === productId &&
        isSameVariant(i.variant, variant)
      );
    });

    if (!item) return res.status(404).json({ error: "Item not found in cart" });

    if (quantity <= 0) {
      cart.items = cart.items.filter(i => {
        return !(
          i.productId.toString() === productId &&
          isSameVariant(i.variant, variant)
        );
      });
    } else {
      item.quantity = quantity;
      item.total = item.price * quantity;
    }

    await cart.save();
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const removeCartItem = async (req, res) => {
  try {
    const { productId, variant } = req.body;
    let cart = await getCartByOwner(req);

    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const isSameVariant = (v1, v2) => {
      if (!v1 && !v2) return true;
      if (!v1 || !v2) return false;
      if (!Array.isArray(v1.attributes) || !Array.isArray(v2.attributes)) return false;
      if (v1.attributes.length !== v2.attributes.length) return false;

      return v1.attributes.every(attr1 =>
        v2.attributes.some(attr2 => attr1.type === attr2.type && attr1.value === attr2.value)
      );
    };

    cart.items = cart.items.filter(i => {
      return !(
        i.productId.toString() === productId &&
        isSameVariant(i.variant, variant)
      );
    });

    await cart.save();
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const clearCart = async (req, res) => {
  try {
    let cart = await getCartByOwner(req);

    if (!cart) return res.status(404).json({ error: "Cart not found" });

    cart.items = [];
    await cart.save();
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
