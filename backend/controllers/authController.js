import User from '../models/User.js';
import Organization from '../models/Organization.js';
import MicrosoftIntegration from '../models/MicrosoftIntegration.js';
import { generateToken } from '../utils/generateToken.js';
import { generateResetToken } from '../utils/generateResetToken.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../utils/emailService.js';
import { sendErrorResponse } from '../utils/errorResponse.js';
import crypto from 'crypto';

// Helper function to generate slug
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password, role, department, organizationName, organizationDomain } = req.body;

    // Lowercase email for consistent lookup
    const normalizedEmail = email.toLowerCase();

    // Organization name is required
    if (!organizationName || organizationName.trim().length === 0) {
      return sendErrorResponse(res, 400, 'Organization name is required', req.id);
    }

    // Generate slug from organization name
    const slug = generateSlug(organizationName);

    // Check if organization slug exists
    const orgExists = await Organization.findOne({ slug });
    if (orgExists) {
      return sendErrorResponse(res, 400, 'Organization name already taken. Please choose a different name.', req.id);
    }

    // Check if user exists with this email (globally)
    // Note: With compound index (email + organization), same email can exist in different organizations
    // But we check globally first to prevent duplicate accounts
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return sendErrorResponse(res, 400, 'User with this email already exists', req.id);
    }

    // Create organization first
    const organization = await Organization.create({
      name: organizationName.trim(),
      slug,
      domain: organizationDomain ? organizationDomain.toLowerCase().trim() : null,
      owner: null, // Will be set after user creation
      members: [],
    });

    // Generate password reset token for welcome email
    const { resetToken, hashedToken } = generateResetToken();
    const resetPasswordExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Create user with organization
    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: role || 'developer',
      department: department ? [department] : [], // Convert single department to array
      organization: organization._id,
      resetPasswordToken: hashedToken,
      resetPasswordExpire,
    });

    // Update organization with owner and member
    organization.owner = user._id;
    organization.members = [user._id];
    await organization.save();

    const token = generateToken(user._id);

    // Auto-create Microsoft Integration with default settings
    try {
      await MicrosoftIntegration.create({
        userId: user._id,
        integrationType: 'outlook', // Default to outlook, can be changed later
        outlook: {
          isConnected: false, // Will be connected when user authenticates
          email: normalizedEmail,
        },
        settings: {
          sendEmailNotifications: true,
          sendTeamsNotifications: true,
          notifyOnIssueCreate: true,
          notifyOnIssueUpdate: true,
          notifyOnComment: true,
          notifyOnStatusChange: true,
          notifyOnAssignment: true,
        },
      });
    } catch (integrationError) {
      console.error('Failed to create Microsoft Integration:', integrationError);
      // Don't fail registration if integration creation fails
    }

    // Send welcome email with password reset link (don't block registration if email fails)
    sendWelcomeEmail(user, resetToken).catch((error) => {
      console.error('Failed to send welcome email:', error);
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      department: user.department,
      organization: {
        _id: organization._id,
        name: organization.name,
        slug: organization.slug,
      },
      resetToken, // Return reset token so frontend can redirect to reset password page
      message: 'Registration successful. Please set your password.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    sendErrorResponse(res, 500, 'Failed to register user', req.id, process.env.NODE_ENV === 'development' ? { error: error.message, stack: error.stack } : null);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Lowercase email for consistent lookup (emails are stored lowercase)
    const normalizedEmail = email.toLowerCase();
    
    const user = await User.findOne({ email: normalizedEmail });

    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user._id);
      const userWithOrg = await User.findById(user._id)
        .select('-password')
        .populate('organization', 'name slug domain');
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      res.json({
        ...userWithOrg.toObject(),
        token,
      });
    } else {
      return sendErrorResponse(res, 401, 'Invalid email or password', req.id);
    }
  } catch (error) {
    // Log error without exposing sensitive details
    if (process.env.NODE_ENV !== 'production') {
      console.error('Login error:', error);
    }
    sendErrorResponse(res, 500, 'Failed to login', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Logout - clear auth cookie
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  res.cookie('token', '', { httpOnly: true, maxAge: 0 });
  res.json({ message: 'Logged out' });
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('organization', 'name slug domain');
    res.json(user);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to fetch user', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Forgot password - send reset email
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists for security
      return res.json({ 
        message: 'If that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const { resetToken, hashedToken } = generateResetToken();
    const resetPasswordExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = resetPasswordExpire;
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetEmail(user, resetToken);
      
      res.json({ 
        message: 'Password reset email sent. Please check your inbox.' 
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      
      return sendErrorResponse(res, 500, 'Email could not be sent. Please try again later.', req.id);
    }
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to process password reset request', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash the token to compare with stored token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return sendErrorResponse(res, 400, 'Invalid or expired reset token', req.id);
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Don't return token - user needs to login manually after password reset
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      department: user.department,
      message: 'Password reset successful. Please login with your new password.',
    });
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to reset password', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

