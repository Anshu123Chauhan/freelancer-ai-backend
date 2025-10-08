import paymentsetting from '../../../models/Paymentgateway.js'
export const createPaymentSetting = async(req, res)=>{
    try {
        const {apikey, secretkey, gatewayname} = req.body;
         const paymentgateway = new paymentsetting({apikey, secretkey, gatewayname});
            await paymentgateway.save();
            res.status(201).json({ success: true, data: paymentgateway })
        
    } catch (error) {
         res.status(400).json({ success: false, error: error.message });
    }
}
export const getPaymentSettings = async (req, res) => {
  try {
    const paymentgateways = await paymentsetting.find().sort({ createdAt: -1 });
    res.json({ success: true, data: paymentgateways });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getPaymentSettingById = async (req, res) => {
  try {
    const paymentgateways = await paymentsetting.findById(req.params.id);
    if (!paymentgateways) return res.status(404).json({ success: false, error: "Payment Gateways Not Found" });
    res.json({ success: true, data: paymentgateways });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updatePaymentSetting = async (req, res) => {
  try {
    const paymentgateways = await paymentsetting.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!paymentgateways) return res.status(404).json({ success: false, error: "Payment Setting not found" });
    res.json({ success: true, data: paymentgateways });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};