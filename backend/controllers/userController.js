import User from '../models/User.js';
import Organization from '../models/Organization.js';
import WorkLog from '../models/WorkLog.js';
import { sendErrorResponse } from '../utils/errorResponse.js';
import { generateResetToken } from '../utils/generateResetToken.js';
import { sendWelcomeEmail } from '../utils/emailService.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private
export const getUsers = async (req, res) => {
  try {
    // Get user's organization
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!currentUser.organization) {
      return res.status(400).json({ message: 'User must belong to an organization' });
    }

    const { department, role } = req.query;
    const query = {
      organization: currentUser.organization,
    };

    // Filter by department if provided (support both single value and array)
    if (department) {
      query.department = { $in: Array.isArray(department) ? department : [department] };
    }

    // Filter by role if provided
    if (role) {
      query.role = role;
    }

    const users = await User.find(query).select('-password').sort({ name: 1 });
    res.json(users);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to fetch users', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to fetch user', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Create user (Admin only)
// @route   POST /api/users
// @access  Private (Admin only)
export const createUser = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create users' });
    }

    // Get admin's organization
    const admin = await User.findById(req.user._id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin user not found' });
    }
    if (!admin.organization) {
      return res.status(400).json({ message: 'Admin must belong to an organization' });
    }

    const { name, email, password, role, department } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Lowercase email for consistent lookup
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists (globally or in same organization)
    const existingUser = await User.findOne({ 
      email: normalizedEmail,
      organization: admin.organization 
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists in your organization' });
    }

    // Generate password reset token for welcome email
    const { resetToken, hashedToken } = generateResetToken();
    const resetPasswordExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Create user in same organization as admin
    // Handle department as array or single value for backward compatibility
    const departmentArray = department 
      ? (Array.isArray(department) ? department : [department])
      : [];

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: role || 'developer',
      department: departmentArray,
      organization: admin.organization,
      resetPasswordToken: hashedToken,
      resetPasswordExpire,
    });

    // Add user to organization members if not already there
    const organization = await Organization.findById(admin.organization);
    if (organization && !organization.members.includes(user._id)) {
      organization.members.push(user._id);
      await organization.save();
    }

    // Send welcome email with password reset link (don't block if email fails)
    sendWelcomeEmail(user, resetToken).catch((error) => {
      console.error('Failed to send welcome email:', error);
    });

    const createdUser = await User.findById(user._id)
      .select('-password')
      .populate('organization', 'name slug');

    if (!createdUser) {
      return res.status(500).json({ message: 'User created but could not be retrieved' });
    }

    res.status(201).json({
      ...createdUser.toObject(),
      resetToken, // Return reset token so admin can share it or user can use email link
      message: 'User created successfully. Welcome email sent.',
    });
  } catch (error) {
    console.error('Create user error:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      if (field === 'email') {
        return res.status(400).json({ 
          message: 'A user with this email already exists. Please use a different email address.' 
        });
      }
      return res.status(400).json({ 
        message: 'Duplicate entry. This record already exists.' 
      });
    }
    
    sendErrorResponse(res, 500, 'Failed to create user', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Update user (Admin only)
// @route   PUT /api/users/:id
// @access  Private (Admin only)
export const updateUser = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update users' });
    }

    // Get admin's organization
    const admin = await User.findById(req.user._id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    const { name, email, role, department, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure user belongs to same organization as admin
    if (user.organization.toString() !== admin.organization.toString()) {
      return res.status(403).json({ message: 'Cannot update user from different organization' });
    }

    // Update fields
    if (name) user.name = name;
    if (email) {
      const normalizedEmail = email.toLowerCase();
      // Check if email already exists (excluding current user)
      const existingUser = await User.findOne({
        email: normalizedEmail,
        organization: admin.organization,
        _id: { $ne: user._id }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists in your organization' });
      }
      user.email = normalizedEmail;
    }
    if (role) user.role = role;
    if (department !== undefined) {
      // Handle both array and single value for backward compatibility
      user.department = Array.isArray(department) ? department : (department ? [department] : []);
    }
    if (password) {
      user.password = password; // Will be hashed by pre-save hook
    }

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('organization', 'name slug');

    res.json({
      ...updatedUser.toObject(),
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      if (field === 'email') {
        return res.status(400).json({ 
          message: 'A user with this email already exists.' 
        });
      }
    }
    
    sendErrorResponse(res, 500, 'Failed to update user', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Get current user's statistics (working time, time per project)
// @route   GET /api/users/me/stats
// @access  Private
export const getMyStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { from, to } = req.query;

    const matchStage = { userId: userId };
    if (from || to) {
      matchStage.started = {};
      if (from) matchStage.started.$gte = new Date(from);
      if (to) matchStage.started.$lte = new Date(to);
    }

    const byProject = await WorkLog.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'issues',
          localField: 'issueId',
          foreignField: '_id',
          as: 'issue',
        },
      },
      { $unwind: { path: '$issue', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$issue.projectId',
          timeSpentMinutes: { $sum: '$timeSpent' },
        },
      },
      {
        $lookup: {
          from: 'projects',
          localField: '_id',
          foreignField: '_id',
          as: 'project',
        },
      },
      { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          projectId: '$_id',
          projectName: { $ifNull: ['$project.name', 'Unknown'] },
          timeSpentMinutes: 1,
          timeSpentHours: { $round: [{ $divide: ['$timeSpentMinutes', 60] }, 2] },
          _id: 0,
        },
      },
      { $sort: { timeSpentMinutes: -1 } },
    ]);

    const totalResult = await WorkLog.aggregate([
      { $match: matchStage },
      { $group: { _id: null, totalTimeSpentMinutes: { $sum: '$timeSpent' } } },
    ]);

    const totalTimeSpentMinutes = totalResult[0]?.totalTimeSpentMinutes ?? 0;
    const totalTimeSpentHours = Math.round((totalTimeSpentMinutes / 60) * 100) / 100;

    res.json({
      totalTimeSpentMinutes,
      totalTimeSpentHours,
      workingTimeHours: totalTimeSpentHours,
      byProject,
    });
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to fetch user statistics', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

