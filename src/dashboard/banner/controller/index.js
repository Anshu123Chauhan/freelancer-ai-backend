import Banner from "../../../models/Banner.js";

// Create Banner
export const createBanner = async (req, res) => {
  try {
    const {image,description,button1,url1,button2,url2} = req.body
    const banner = new Banner({image,description,button1,url1,button2,url2});
    await banner.save();
    res.status(201).json({ success: true, data: banner });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Get All Banners
export const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.json({ success: true, data: banners });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get Single Banner
export const getBannerById = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ success: false, error: "Banner not found" });
    res.json({ success: true, data: banner });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update Banner
export const updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!banner) return res.status(404).json({ success: false, error: "Banner not found" });
    res.json({ success: true, data: banner });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Delete Banner
export const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ success: false, error: "Banner not found" });
    res.json({ success: true, message: "Banner deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
