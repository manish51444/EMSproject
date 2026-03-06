import DailyTask from '../models/DailyTask.js';
import { sendErrorResponse } from '../utils/errorResponse.js';

const startOfDay = (d) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

// @desc    Get daily tasks for a project (MOM-style updates)
// @route   GET /api/projects/:projectId/daily-tasks
// @access  Private
export const getDailyTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { date, from, to } = req.query;

    const query = { projectId };

    if (date) {
      query.date = startOfDay(date);
    } else if (from || to) {
      query.date = {};
      if (from) query.date.$gte = startOfDay(from);
      if (to) query.date.$lte = startOfDay(to);
    }

    const tasks = await DailyTask.find(query)
      .populate('userId', 'name email avatar')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    res.json(tasks);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to fetch daily tasks', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Create my daily task for a date (one per user per project per day; duplicate returns "Already created or exist")
// @route   POST /api/projects/:projectId/daily-tasks
// @access  Private
export const createDailyTask = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { date, title, content } = req.body;

    const taskDate = startOfDay(date || new Date());

    const existing = await DailyTask.findOne({
      projectId,
      userId: req.user._id,
      date: taskDate,
    });

    if (existing) {
      return sendErrorResponse(res, 400, 'Already created or exist', req.id);
    }

    const task = await DailyTask.create({
      projectId,
      userId: req.user._id,
      date: taskDate,
      title: title || '',
      content: content || '',
    });

    const populated = await DailyTask.findById(task._id)
      .populate('userId', 'name email avatar')
      .lean();

    res.status(201).json(populated);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to save daily task', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Update my daily task
// @route   PUT /api/projects/:projectId/daily-tasks/:taskId
// @access  Private
export const updateDailyTask = async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    const { title, content } = req.body;

    const task = await DailyTask.findOne({ _id: taskId, projectId });
    if (!task) {
      return sendErrorResponse(res, 404, 'Daily task not found', req.id);
    }
    if (task.userId.toString() !== req.user._id.toString()) {
      return sendErrorResponse(res, 403, 'You can only update your own daily task', req.id);
    }

    const updated = await DailyTask.findByIdAndUpdate(
      taskId,
      { $set: { title: title !== undefined ? title : task.title, content: content !== undefined ? content : task.content } },
      { new: true, runValidators: true }
    )
      .populate('userId', 'name email avatar')
      .lean();

    res.json(updated);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to update daily task', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Delete my daily task
// @route   DELETE /api/projects/:projectId/daily-tasks/:taskId
// @access  Private
export const deleteDailyTask = async (req, res) => {
  try {
    const { taskId, projectId } = req.params;

    const task = await DailyTask.findOne({ _id: taskId, projectId });
    if (!task) {
      return sendErrorResponse(res, 404, 'Daily task not found', req.id);
    }
    if (task.userId.toString() !== req.user._id.toString()) {
      return sendErrorResponse(res, 403, 'You can only delete your own daily task', req.id);
    }

    await DailyTask.findByIdAndDelete(taskId);
    res.json({ message: 'Daily task removed' });
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to delete daily task', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};
