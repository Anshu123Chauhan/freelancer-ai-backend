import {freelancer} from '../../../models/Freelancer.js'

export const createFreelancerProfile = async (req, res) => {
  try {
    const { title, bio, skills, hourlyRate } = req.body;
    const userId = req.user._id;

    const freelancer = await freelancer.create({
      userId,
      title,
      bio,
      skills,
      hourlyRate,
    });

    // Link back to User
    await User.findByIdAndUpdate(userId, {
      freelancerProfile: freelancer._id,
      role: "Freelancer"
    });

    res.status(201).json({ success: true, freelancer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};