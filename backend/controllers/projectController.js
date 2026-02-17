import Project from '../models/Project.js';
import User from '../models/User.js';
import { getPaginationParams, createPaginationResponse } from '../utils/pagination.js';
import { getCache, setCache, clearCache } from '../utils/cache.js';
import { sendErrorResponse } from '../utils/errorResponse.js';

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
export const getProjects = async (req, res) => {
  try {
    // Get user's organization
    const user = await User.findById(req.user._id);
    if (!user.organization) {
      return res.status(400).json({ message: 'User must belong to an organization' });
    }

    const { page, limit, skip } = getPaginationParams(req);

    // Create a unique cache key based on user and pagination
    const cacheKey = `projects_${req.user._id}_${page}_${limit}`;
    const cachedData = getCache(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    // Filter projects by organization first
    let query = { organization: user.organization };
    
    // Then filter based on user role within organization
    if (req.user.role === 'admin') {
      // Admin can see all projects in their organization
      // query already filtered by organization
    } else if (req.user.role === 'manager') {
      // Manager sees only projects matching their department within organization
      if (req.user.department) {
        query.department = req.user.department;
      } else {
        // Manager without department sees no projects
        query._id = null; // This will return empty results
      }
    } else {
      // Non-admin/manager users only see projects they're part of within organization
      query.$or = [
        { lead: req.user._id },
        { members: req.user._id },
      ];
    }

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .populate('lead', 'name email avatar department')
      .populate('members', 'name email avatar department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Optimization: Plain JS Objects

    const response = createPaginationResponse(projects, page, limit, total);

    // Cache the response
    setCache(cacheKey, response);

    res.json(response);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to fetch projects', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
export const getProject = async (req, res) => {
  try {
    // Get user's organization
    const user = await User.findById(req.user._id);
    if (!user.organization) {
      return res.status(400).json({ message: 'User must belong to an organization' });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      organization: user.organization,
    })
      .populate('lead', 'name email avatar')
      .populate('members', 'name email avatar')
      .lean(); // Optimization

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to fetch project', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Create project
// @route   POST /api/projects
// @access  Private
export const createProject = async (req, res) => {
  try {
    // Get user's organization
    const user = await User.findById(req.user._id);
    if (!user.organization) {
      return res.status(400).json({ message: 'User must belong to an organization' });
    }

    const { name, key, description, members, department, technologies, clouds } = req.body;

    // Normalize project key for duplicate check and storage
    const keyNormalized = (key || '').toString().toUpperCase().trim();

    const projectExists = await Project.findOne({
      key: keyNormalized,
      organization: user.organization,
    });

    if (projectExists) {
      return res.status(400).json({ message: 'Project key already exists in your organization' });
    }

    // Ensure project creator is always in members array
    const membersArray = Array.isArray(members) && members.length > 0
      ? [...new Set([req.user._id.toString(), ...members.map(m => m.toString())])]
      : [req.user._id.toString()];

    // Auto-assign by creator role: Admin → add a Manager; Manager → add a Developer
    if (user.role === 'admin') {
      const managerQuery = {
        organization: user.organization,
        role: 'manager',
        _id: { $ne: req.user._id },
      };
      if (department) {
        const deptArr = Array.isArray(department) ? department : [department];
        managerQuery.department = { $in: deptArr };
      }
      let managerUser = await User.findOne(managerQuery);
      if (!managerUser && department) {
        managerUser = await User.findOne({
          organization: user.organization,
          role: 'manager',
          _id: { $ne: req.user._id },
        });
      }
      if (managerUser) membersArray.push(managerUser._id.toString());
    } else if (user.role === 'manager') {
      const devQuery = {
        organization: user.organization,
        role: 'developer',
        _id: { $ne: req.user._id },
      };
      if (department) {
        const deptArr = Array.isArray(department) ? department : [department];
        devQuery.department = { $in: deptArr };
      }
      let devUser = await User.findOne(devQuery);
      if (!devUser && department) {
        devUser = await User.findOne({
          organization: user.organization,
          role: 'developer',
          _id: { $ne: req.user._id },
        });
      }
      if (devUser) membersArray.push(devUser._id.toString());
    }

    const uniqueMembersArray = [...new Set(membersArray)];

    const projectData = {
      name,
      key: keyNormalized,
      description,
      lead: req.user._id,
      organization: user.organization,
      members: uniqueMembersArray,
    };

    // Add department and related fields
    if (department) {
      projectData.department = department;
      
      if (department === 'salesforce' && clouds && Array.isArray(clouds)) {
        projectData.clouds = clouds;
      } else if ((department === 'web_development' || department === 'mobile_development') && technologies && Array.isArray(technologies)) {
        projectData.technologies = technologies;
      }
    }

    const project = await Project.create(projectData);

    const populatedProject = await Project.findById(project._id)
      .populate('lead', 'name email avatar department')
      .populate('members', 'name email avatar department');

    // Clear cache for all users who might see this project
    // Clear pattern-based cache for better invalidation
    clearCache(`projects_`);

    res.status(201).json(populatedProject);
  } catch (error) {
    const { sendErrorResponse } = await import('../utils/errorResponse.js');
    sendErrorResponse(res, 500, 'Failed to create project', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
export const updateProject = async (req, res) => {
  try {
    // Get user's organization
    const user = await User.findById(req.user._id);
    if (!user.organization) {
      return res.status(400).json({ message: 'User must belong to an organization' });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      organization: user.organization,
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const updateData = { ...req.body };

    // Handle department and related fields
    if (updateData.department) {
      if (updateData.department === 'salesforce' && updateData.clouds) {
        updateData.clouds = Array.isArray(updateData.clouds) ? updateData.clouds : [];
        updateData.technologies = []; // Clear technologies for Salesforce
      } else if (
        (updateData.department === 'web_development' ||
          updateData.department === 'mobile_development') &&
        updateData.technologies
      ) {
        updateData.technologies = Array.isArray(updateData.technologies) ? updateData.technologies : [];
        updateData.clouds = []; // Clear clouds for web/mobile
      }
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('lead', 'name email avatar department')
      .populate('members', 'name email avatar department')
      .lean();

    // Clear cache for all affected users (pattern-based)
    clearCache(`projects_`);

    res.json(updatedProject);
  } catch (error) {
    const { sendErrorResponse } = await import('../utils/errorResponse.js');
    sendErrorResponse(res, 500, 'Failed to update project', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Check if project key exists
// @route   GET /api/projects/check-key
// @access  Private
export const checkProjectKey = async (req, res) => {
  try {
    // Get user's organization
    const user = await User.findById(req.user._id);
    if (!user.organization) {
      return res.status(400).json({ message: 'User must belong to an organization' });
    }

    const { key } = req.query;
    
    if (!key) {
      return res.status(400).json({ message: 'Project key is required' });
    }

    // Check if project key exists in same organization
    const projectExists = await Project.findOne({ 
      key: key.toUpperCase().trim(), 
      organization: user.organization 
    });

    if (projectExists) {
      return res.json({ 
        exists: true, 
        message: 'Project key already exists in your organization' 
      });
    }

    res.json({ exists: false });
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to check project key', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
export const deleteProject = async (req, res) => {
  try {
    // Get user's organization
    const user = await User.findById(req.user._id);
    if (!user.organization) {
      return res.status(400).json({ message: 'User must belong to an organization' });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      organization: user.organization,
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await Project.findByIdAndDelete(req.params.id);

    // Clear cache for all users (pattern-based)
    clearCache(`projects_`);

    res.json({ message: 'Project removed' });
  } catch (error) {
    const { sendErrorResponse } = await import('../utils/errorResponse.js');
    sendErrorResponse(res, 500, 'Failed to delete project', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};
