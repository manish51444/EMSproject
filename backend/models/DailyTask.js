import mongoose from 'mongoose';

const dailyTaskSchema = mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    content: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

dailyTaskSchema.index({ projectId: 1, date: -1 });
dailyTaskSchema.index({ projectId: 1, userId: 1, date: 1 }, { unique: true }); // One entry per user per project per day

const DailyTask = mongoose.model('DailyTask', dailyTaskSchema);

export default DailyTask;
