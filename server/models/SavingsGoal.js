const mongoose = require('mongoose');

const savingsGoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Savings goal must belong to a user']
    },
    name: {
      type: String,
      required: [true, 'Please provide a savings goal name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    targetAmount: {
      type: Number,
      required: [true, 'Please provide a target savings amount'],
      min: [1, 'Target amount must be greater than zero']
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Current amount cannot be negative']
    },
    targetDate: {
      type: Date
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

savingsGoalSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('SavingsGoal', savingsGoalSchema);
