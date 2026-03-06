import Attachment from '../models/Attachment.js';
import Issue from '../models/Issue.js';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getPaginationParams, createPaginationResponse } from '../utils/pagination.js';
import { sendErrorResponse } from '../utils/errorResponse.js';
import { FILE_UPLOAD } from '../utils/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// Sanitize filename to prevent path traversal and XSS
const sanitizeFilename = (filename) => {
  // Remove path separators and dangerous characters
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.\./g, '_')
    .substring(0, 255); // Limit length
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const sanitizedOriginalName = sanitizeFilename(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(sanitizedOriginalName);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// Allowed file types
const allowedMimeTypes = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain',
  'text/csv',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
];

const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar)$/i;

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || FILE_UPLOAD.MAX_SIZE,
  },
  fileFilter: (req, file, cb) => {
    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: images, PDF, Office documents, text files, and archives.`));
    }

    // Check file extension
    if (!allowedExtensions.test(file.originalname)) {
      return cb(new Error(`File extension not allowed. Allowed extensions: jpg, jpeg, png, gif, webp, pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv, zip, rar.`));
    }

    cb(null, true);
  },
}).single('file');

// @desc    Get all attachments for a project
// @route   GET /api/projects/:projectId/attachments
// @access  Private
export const getAttachments = async (req, res) => {
  try {
    const { addedBy, attachmentType, dateAdded } = req.query;
    const { page, limit, skip } = getPaginationParams(req);
    const query = { projectId: req.params.projectId };

    if (addedBy) {
      query.uploadedBy = addedBy;
    }

    if (attachmentType) {
      if (attachmentType === 'image') {
        query.mimeType = { $regex: /^image\// };
      } else if (attachmentType === 'document') {
        query.mimeType = { $regex: /^(application|text)\// };
      } else if (attachmentType === 'video') {
        query.mimeType = { $regex: /^video\// };
      }
    }

    if (dateAdded) {
      const date = new Date(dateAdded);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      query.createdAt = { $gte: date, $lt: nextDay };
    }

    const total = await Attachment.countDocuments(query);
    const attachments = await Attachment.find(query)
      .populate('issueId', 'key title')
      .populate('uploadedBy', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(createPaginationResponse(attachments, page, limit, total));
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to fetch attachments', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Get attachments for an issue
// @route   GET /api/issues/:issueId/attachments
// @access  Private
export const getIssueAttachments = async (req, res) => {
  try {
    const attachments = await Attachment.find({ issueId: req.params.issueId })
      .populate('uploadedBy', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json(attachments);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to fetch issue attachments', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Upload attachment
// @route   POST /api/issues/:issueId/attachments
// @access  Private
export const uploadAttachment = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      const issue = await Issue.findById(req.params.issueId);
      if (!issue) {
        // Delete uploaded file if issue doesn't exist
        if (req.file && existsSync(req.file.path)) {
          await fs.unlink(req.file.path);
        }
        return res.status(404).json({ message: 'Issue not found' });
      }

      // Use relative path instead of absolute path for security
      const relativePath = `/api/uploads/${req.file.filename}`;
      const sanitizedOriginalName = sanitizeFilename(req.file.originalname);

      const attachment = await Attachment.create({
        issueId: req.params.issueId,
        projectId: issue.projectId,
        filename: req.file.filename,
        originalName: sanitizedOriginalName,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: relativePath, // Store relative path, not absolute
        uploadedBy: req.user._id,
      });

      const populatedAttachment = await Attachment.findById(attachment._id)
        .populate('issueId', 'key title')
        .populate('uploadedBy', 'name email avatar');

      res.status(201).json(populatedAttachment);
    } catch (error) {
      // Delete uploaded file on error
      if (req.file && existsSync(req.file.path)) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }
      res.status(500).json({ message: error.message });
    }
  });
};

// @desc    Upload project attachment
// @route   POST /api/projects/:projectId/attachments
// @access  Private
export const uploadProjectAttachment = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      // Use relative path instead of absolute path for security
      const relativePath = `/api/uploads/${req.file.filename}`;
      const sanitizedOriginalName = sanitizeFilename(req.file.originalname);

      const attachment = await Attachment.create({
        projectId: req.params.projectId,
        filename: req.file.filename,
        originalName: sanitizedOriginalName,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: relativePath,
        uploadedBy: req.user._id,
      });

      const populatedAttachment = await Attachment.findById(attachment._id)
        .populate('uploadedBy', 'name email avatar');

      res.status(201).json(populatedAttachment);
    } catch (error) {
      // Delete uploaded file on error
      if (req.file && existsSync(req.file.path)) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }
      sendErrorResponse(res, 500, 'Failed to upload project attachment', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
    }
  });
};

// @desc    Download attachment
// @route   GET /api/attachments/:id/download
// @access  Private
export const downloadAttachment = async (req, res) => {
  try {
    const attachment = req.attachment || await Attachment.findById(req.params.id);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Resolve file path - handle both relative and absolute paths
    let filePath;
    if (attachment.path.startsWith('/api/uploads/')) {
      // Relative path - resolve to actual file location
      const filename = attachment.path.replace('/api/uploads/', '');
      filePath = path.join(uploadsDir, filename);
    } else {
      // Absolute path (legacy support)
      filePath = attachment.path;
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Sanitize filename for Content-Disposition header
    const safeFilename = attachment.originalName.replace(/[^a-zA-Z0-9.-]/g, '_');

    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.setHeader('Content-Type', attachment.mimeType);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to download attachment', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Get attachment
// @route   GET /api/attachments/:id
// @access  Private
export const getAttachment = async (req, res) => {
  try {
    let attachment = req.attachment;
    if (!attachment) {
      attachment = await Attachment.findById(req.params.id)
        .populate('issueId', 'key title')
        .populate('uploadedBy', 'name email avatar');
    } else {
      attachment = await Attachment.findById(attachment._id)
        .populate('issueId', 'key title')
        .populate('uploadedBy', 'name email avatar');
    }
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    res.json(attachment);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to fetch attachment', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Delete attachment
// @route   DELETE /api/attachments/:id
// @access  Private
export const deleteAttachment = async (req, res) => {
  try {
    const attachment = req.attachment || await Attachment.findById(req.params.id);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Check if user is the uploader or has admin rights
    if (
      attachment.uploadedBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete file from filesystem
    let filePath;
    if (attachment.path.startsWith('/api/uploads/')) {
      const filename = attachment.path.replace('/api/uploads/', '');
      filePath = path.join(uploadsDir, filename);
    } else {
      filePath = attachment.path;
    }

    if (existsSync(filePath)) {
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
        // Continue with database deletion even if file deletion fails
      }
    }

    await Attachment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Attachment deleted' });
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to delete attachment', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

