const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Budget must belong to a user'],
      index: true
    },
    category: {
      type: String,
      required: [true, 'Please provide a category for the budget'],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Please provide a budget amount limit'],
      min: [0.01, 'Budget amount must be greater than zero']
    },
    month: {
      type: Number,
      required: [true, 'Please provide budget month (1-12)'],
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12']
    },
    year: {
      type: Number,
      required: [true, 'Please provide budget year'],
      min: [2000, 'Year must be a valid 4-digit year'],
      max: [2100, 'Year must be a valid 4-digit year']
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate category budget for the same user in the same month/year
budgetSchema.index({ userId: 1, category: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
