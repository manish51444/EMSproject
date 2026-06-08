import mongoose from 'mongoose';

const organizationSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add an organization name'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    settings: {
      allowPublicSignup: {
        type: Boolean,
        default: false,
      },
      requireEmailVerification: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
organizationSchema.index({ slug: 1 });
organizationSchema.index({ domain: 1 });
organizationSchema.index({ owner: 1 });
organizationSchema.index({ members: 1 });

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;

