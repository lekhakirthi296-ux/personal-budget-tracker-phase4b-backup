/**
 * Smart Transaction Import Service
 * Extracts structured financial transaction data from SMS / notification text.
 * Runs duplicate detection against user's transaction history.
 */

const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { isMongoConnected } = require('../config/db');
const memoryStore = require('../config/inMemoryStore');

// Category Keyword Dictionaries
const EXPENSE_CATEGORY_MAP = [
  {
    category: 'Food',
    keywords: [
      'swiggy', 'zomato', 'mcdonald', 'starbucks', 'kfc', 'domino', 'pizza', 'burger',
      'cafe', 'restaurant', 'dining', 'bakery', 'supermarket', 'grocery', 'blinkit',
      'zepto', 'instamart', 'bigbasket', 'dmart', 'food', 'eats', 'chai', 'coffee', 'tea'
    ]
  },
  {
    category: 'Shopping',
    keywords: [
      'amazon', 'flipkart', 'myntra', 'zara', 'h&m', 'ajio', 'meesho', 'nykaa', 'tata cliq',
      'retail', 'mall', 'store', 'cloth', 'apparel', 'fashion', 'electronics', 'purchase',
      'shopping', 'mart', 'market'
    ]
  },
  {
    category: 'Transportation',
    keywords: [
      'uber', 'ola', 'rapido', 'metro', 'fuel', 'petrol', 'diesel', 'hpcl', 'bpcl', 'iocl',
      'indian oil', 'shell', 'parking', 'toll', 'fastag', 'transit', 'cab', 'auto', 'ride'
    ]
  },
  {
    category: 'Entertainment',
    keywords: [
      'netflix', 'spotify', 'hotstar', 'disney', 'prime video', 'movie', 'cinema', 'pvr',
      'inox', 'bookmyshow', 'game', 'playstation', 'steam', 'theatre', 'concert', 'youtube premium'
    ]
  },
  {
    category: 'Utilities',
    keywords: [
      'electricity', 'bescom', 'tneb', 'water', 'broadband', 'wifi', 'airtel', 'jio', 'vi',
      'vodafone', 'bsnl', 'gas', 'cylinder', 'indane', 'hp gas', 'dth', 'tata play'
    ]
  },
  {
    category: 'Healthcare',
    keywords: [
      'pharmacy', 'apollo', 'medplus', '1mg', 'pharmeasy', 'hospital', 'clinic', 'chemist',
      'doctor', 'diagnostic', 'lab', 'dentist', 'health', 'medicine', 'opticals'
    ]
  },
  {
    category: 'Housing',
    keywords: [
      'rent', 'maintenance', 'society', 'landlord', 'apartment', 'nobroker', 'mygate', 'housing'
    ]
  },
  {
    category: 'Education',
    keywords: [
      'fee', 'tuition', 'school', 'college', 'university', 'udemy', 'coursera', 'books',
      'course', 'academy', 'coaching', 'learning'
    ]
  },
  {
    category: 'Personal Care',
    keywords: [
      'salon', 'spa', 'parlour', 'gym', 'fitness', 'cult.fit', 'barber', 'massage', 'cosmetics'
    ]
  },
  {
    category: 'Travel',
    keywords: [
      'flight', 'airline', 'indigo', 'air india', 'spicejet', 'irctc', 'train', 'railway',
      'hotel', 'makemytrip', 'goibibo', 'booking.com', 'airbnb', 'yatra', 'cleartrip', 'stay'
    ]
  },
  {
    category: 'Bills',
    keywords: [
      'bill', 'credit card bill', 'invoice', 'recharge', 'postpaid', 'insurance', 'lic', 'premium'
    ]
  }
];

const INCOME_CATEGORY_MAP = [
  {
    category: 'Salary',
    keywords: ['salary', 'payroll', 'stipend', 'wages', 'compensation', 'monthly pay']
  },
  {
    category: 'Investments',
    keywords: ['dividend', 'interest', 'mutual fund', 'zerodha', 'groww', 'stocks', 'yield', 'shares', 'maturity']
  },
  {
    category: 'Freelance',
    keywords: ['freelance', 'client', 'consulting', 'upwork', 'fiverr', 'contract']
  },
  {
    category: 'Business',
    keywords: ['business', 'sales', 'settlement', 'merchant settlement', 'pos settlement']
  },
  {
    category: 'Refunds',
    keywords: ['refund', 'cashback', 'reversal', 'returned']
  },
  {
    category: 'Gifts',
    keywords: ['gift', 'reward', 'bonus']
  }
];

/**
 * Parse raw text / SMS to extract transaction fields
 */
function parseTransactionText(rawText) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return {
      success: false,
      error: 'Please paste a valid transaction text or SMS message',
      confidence: { score: 0, level: 'low', reasons: ['Empty or invalid input provided'] }
    };
  }

  const text = rawText.trim();
  const lowerText = text.toLowerCase();

  let confidenceScore = 0;
  const confidenceReasons = [];

  // 1. Detect Transaction Type
  let type = 'expense';
  const incomeKeywords = ['credited', 'received', 'deposited', 'refunded', 'added to', 'salary', 'cashback', 'inward credit', 'credited with'];
  const expenseKeywords = ['debited', 'spent', 'paid', 'purchase', 'sent', 'withdrawn', 'charge', 'bill paid', 'transferred to', 'vpa', 'swiped', 'used at'];

  const hasIncomeKw = incomeKeywords.some(kw => lowerText.includes(kw));
  const hasExpenseKw = expenseKeywords.some(kw => lowerText.includes(kw));

  if (hasIncomeKw && !hasExpenseKw) {
    type = 'income';
    confidenceScore += 0.25;
    confidenceReasons.push('Identified as Income transaction');
  } else if (hasExpenseKw) {
    type = 'expense';
    confidenceScore += 0.25;
    confidenceReasons.push('Identified as Expense transaction');
  } else {
    // Default to expense if ambiguous
    type = 'expense';
    confidenceScore += 0.1;
    confidenceReasons.push('Defaulted to Expense transaction');
  }

  // 2. Extract Amount
  let amount = null;
  const amountPatterns = [
    /(?:\brs\.?|\binr|₹|\$)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:\bamount|\bamt|\bdebited by|\bspent|\bpaid|\bcredited with|\breceived|\bdeposited)\s+(?:of|is|for|rs\.?|inr|₹|\$)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:\brs\.?|\binr|₹|\$|\bspent|\bdebited|\bcredited)/i,
    /(?:^|\s)([\d,]+\.\d{1,2})(?:\s|$)/
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const rawNum = match[1].replace(/,/g, '');
      const parsedNum = parseFloat(rawNum);
      if (!isNaN(parsedNum) && parsedNum > 0 && parsedNum < 100000000) {
        amount = Math.round(parsedNum * 100) / 100;
        break;
      }
    }
  }

  if (amount !== null) {
    confidenceScore += 0.35;
    confidenceReasons.push(`Extracted amount: ₹${amount}`);
  } else {
    confidenceReasons.push('Unable to reliably detect amount');
  }

  // 3. Extract Payment Method
  let paymentMethod = 'UPI';
  if (/upi|gpay|phonepe|paytm|vpa|bhim|@ok|@axis|@icici|@paytm/i.test(text)) {
    paymentMethod = 'UPI';
    confidenceScore += 0.15;
    confidenceReasons.push('Detected payment method: UPI');
  } else if (/credit\s*card|cc\s*ending|hdfc\s*credit|sbi\s*card|icici\s*card/i.test(text)) {
    paymentMethod = 'Credit Card';
    confidenceScore += 0.15;
    confidenceReasons.push('Detected payment method: Credit Card');
  } else if (/debit\s*card|dc\s*ending|card\s*ending|card\s*xx/i.test(text)) {
    paymentMethod = 'Debit Card';
    confidenceScore += 0.15;
    confidenceReasons.push('Detected payment method: Debit Card');
  } else if (/net\s*banking|netbanking|neft|rtgs|imps/i.test(text)) {
    paymentMethod = 'Net Banking';
    confidenceScore += 0.15;
    confidenceReasons.push('Detected payment method: Net Banking');
  } else if (/bank\s*transfer|transferred\s*from\s*a\/c|a\/c\s*transfer/i.test(text)) {
    paymentMethod = 'Bank Transfer';
    confidenceScore += 0.15;
    confidenceReasons.push('Detected payment method: Bank Transfer');
  } else if (/cash|atm\s*withdrawal/i.test(text)) {
    paymentMethod = 'Cash';
    confidenceScore += 0.15;
    confidenceReasons.push('Detected payment method: Cash');
  } else {
    paymentMethod = 'Other';
    confidenceScore += 0.05;
  }

  // 4. Extract Merchant / Party / Description
  let description = '';
  let extractedMerchant = '';
  const merchantPatterns = [
    /(?:at|to|for|from|towards|info:?)\s+([A-Za-z0-9\s&.'_-]{2,35})(?:\s+via|\s+on|\s+ref|\s+using|\.|$|,|\s+bal|\s+avl|\s+upi|\s+a\/c)/i,
    /(?:vpa|merchant)\s+([A-Za-z0-9\s&.'_-]{2,30})/i
  ];

  for (const pattern of merchantPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim()
        .replace(/(?:bal|avl|lmt|ref|txn|inr|rs|upi|ending|acc|account).*/i, '')
        .trim();
      if (candidate.length >= 2) {
        description = candidate;
        extractedMerchant = candidate;
        confidenceScore += 0.15;
        confidenceReasons.push(`Extracted merchant: ${candidate}`);
        break;
      }
    }
  }

  if (!description) {
    if (type === 'income') {
      description = 'Income Deposit';
    } else {
      description = paymentMethod === 'UPI' ? 'UPI Payment' : 'Store Purchase';
    }
  }

  // 5. Detect Category
  let category = type === 'income' ? 'Other' : 'Other';
  const categoryDict = type === 'income' ? INCOME_CATEGORY_MAP : EXPENSE_CATEGORY_MAP;

  const combinedSearchText = (lowerText + (extractedMerchant ? ' ' + extractedMerchant.toLowerCase() : ''));

  for (const mapping of categoryDict) {
    const matchFound = mapping.keywords.some(kw => combinedSearchText.includes(kw));
    if (matchFound) {
      category = mapping.category;
      confidenceScore += 0.15;
      confidenceReasons.push(`Mapped category to: ${category}`);
      break;
    }
  }

  // 6. Extract Date
  let date = new Date().toISOString().split('T')[0]; // Default to today
  const datePatterns = [
    /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/,
    /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{2,4})?/i,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s*(\d{2,4})?/i
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const parsedCandidate = new Date(match[0]);
      if (!isNaN(parsedCandidate.getTime())) {
        date = parsedCandidate.toISOString().split('T')[0];
        confidenceReasons.push(`Extracted date: ${date}`);
        break;
      }
    }
  }

  // Normalize confidence score between 0 and 1
  const finalScore = Math.min(1.0, Math.max(0.1, Math.round(confidenceScore * 100) / 100));
  let confidenceLevel = 'low';
  if (finalScore >= 0.75 && amount !== null) {
    confidenceLevel = 'high';
  } else if (finalScore >= 0.45 && amount !== null) {
    confidenceLevel = 'medium';
  }

  return {
    success: true,
    detected: {
      type,
      amount: amount || 0,
      category,
      paymentMethod,
      date,
      description,
      source: 'sms'
    },
    confidence: {
      score: finalScore,
      level: confidenceLevel,
      reasons: confidenceReasons
    }
  };
}

/**
 * Check if the detected transaction might be a duplicate of an existing record
 */
async function checkDuplicateTransaction(userId, detectedData) {
  if (!detectedData || !detectedData.amount) {
    return { isDuplicate: false, duplicateWarning: null, matchingTransaction: null };
  }

  const { amount, type, category, date } = detectedData;
  const targetDate = date ? new Date(date) : new Date();

  // Search window: ±3 days around transaction date
  const windowStart = new Date(targetDate);
  windowStart.setDate(windowStart.getDate() - 3);
  windowStart.setHours(0, 0, 0, 0);

  const windowEnd = new Date(targetDate);
  windowEnd.setDate(windowEnd.getDate() + 3);
  windowEnd.setHours(23, 59, 59, 999);

  let matches = [];

  if (isMongoConnected()) {
    matches = await Transaction.find({
      userId,
      amount: { $gte: amount - 0.01, $lte: amount + 0.01 },
      type,
      date: { $gte: windowStart, $lte: windowEnd }
    }).limit(1);
  } else {
    matches = memoryStore.transactions.filter(t => {
      const matchUserId = String(t.userId) === String(userId);
      const matchAmount = Math.abs(t.amount - amount) < 0.01;
      const matchType = t.type === type;
      const tDate = new Date(t.date);
      const matchDate = tDate >= windowStart && tDate <= windowEnd;
      return matchUserId && matchAmount && matchType && matchDate;
    }).slice(0, 1);
  }

  if (matches && matches.length > 0) {
    const match = matches[0];
    return {
      isDuplicate: true,
      duplicateWarning: 'Possible duplicate transaction detected with matching amount and recent date.',
      matchingTransaction: {
        _id: match._id,
        amount: match.amount,
        type: match.type,
        category: match.category,
        paymentMethod: match.paymentMethod,
        date: match.date,
        description: match.description,
        source: match.source || 'manual'
      }
    };
  }

  return {
    isDuplicate: false,
    duplicateWarning: null,
    matchingTransaction: null
  };
}

module.exports = {
  parseTransactionText,
  checkDuplicateTransaction
};
