const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Transaction must belong to a user'],
      index: true
    },
    type: {
      type: String,
      enum: {
        values: ['income', 'expense'],
        message: 'Transaction type must be either income or expense'
      },
      required: [true, 'Please specify transaction type (income or expense)']
    },
    amount: {
      type: Number,
      required: [true, 'Please provide a transaction amount'],
      min: [0.01, 'Amount must be greater than zero']
    },
    category: {
      type: String,
      required: [true, 'Please specify a category'],
      trim: true
    },
    date: {
      type: Date,
      default: Date.now,
      required: [true, 'Please provide transaction date']
    },
    paymentMethod: {
      type: String,
      required: [true, 'Please specify a payment method'],
      trim: true,
      default: 'Cash'
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    source: {
      type: String,
      enum: {
        values: ['manual', 'sms', 'imported'],
        message: 'Source must be manual, sms, or imported'
      },
      default: 'manual'
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for performant querying and filtering
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
