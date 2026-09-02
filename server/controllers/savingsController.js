const mongoose = require('mongoose');
const SavingsGoal = require('../models/SavingsGoal');
const memoryStore = require('../config/inMemoryStore');
const { isMongoConnected } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const notificationService = require('../services/notificationService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Enrich a raw savings goal document with computed progress metrics.
 * 
 * - progressPercentage: percentage of target saved (0 - 100), capped at 100.
 * - remainingAmount: amount left to reach target (>= 0).
 * - status: 'COMPLETED' if currentAmount >= targetAmount, otherwise 'IN_PROGRESS'.
 * - isCompleted: boolean indicating if target is reached.
 */
const enrichSavingsGoal = (goal) => {
  const targetAmount = Math.round(Number(goal.targetAmount) * 100) / 100;
  const currentAmount = Math.round(Number(goal.currentAmount || 0) * 100) / 100;
  const remainingAmount = Math.max(0, Math.round((targetAmount - currentAmount) * 100) / 100);

  const rawPercentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
  const progressPercentage = Math.min(100, Math.round(rawPercentage * 100) / 100);

  const isCompleted = currentAmount >= targetAmount;
  const status = isCompleted ? 'COMPLETED' : 'IN_PROGRESS';

  const goalObj = typeof goal.toObject === 'function' ? goal.toObject() : { ...goal };

  return {
    ...goalObj,
    targetAmount,
    currentAmount,
    remainingAmount,
    progressPercentage,
    status,
    isCompleted
  };
};

// ---------------------------------------------------------------------------
// Controller Actions
// ---------------------------------------------------------------------------

/**
 * @desc   Create a new savings goal for the authenticated user
 * @route  POST /api/savings
 * @access Private
 */
const createSavingsGoal = async (req, res, next) => {
  try {
    const { name, targetAmount, currentAmount, targetDate } = req.body;

    // 1. Validate Name
    if (!name || typeof name !== 'string' || !name.trim()) {
      return sendError(res, 'Please provide a valid savings goal name', null, 400);
    }
    if (name.trim().length > 100) {
      return sendError(res, 'Savings goal name cannot exceed 100 characters', null, 400);
    }

    // 2. Validate Target Amount
    const numericTarget = Number(targetAmount);
    if (
      targetAmount === undefined ||
      targetAmount === null ||
      isNaN(numericTarget) ||
      !isFinite(numericTarget) ||
      numericTarget <= 0
    ) {
      return sendError(
        res,
        'Target amount must be a positive number greater than zero',
        null,
        400
      );
    }

    // 3. Validate Current Amount (Optional on create, default 0)
    let numericCurrent = 0;
    if (currentAmount !== undefined && currentAmount !== null && currentAmount !== '') {
      numericCurrent = Number(currentAmount);
      if (isNaN(numericCurrent) || !isFinite(numericCurrent) || numericCurrent < 0) {
        return sendError(res, 'Current amount cannot be negative', null, 400);
      }
    }

    // 4. Validate Target Date (Optional)
    let parsedTargetDate;
    if (targetDate !== undefined && targetDate !== null && targetDate !== '') {
      const d = new Date(targetDate);
      if (isNaN(d.getTime())) {
        return sendError(res, 'Please provide a valid target date', null, 400);
      }
      if (d <= new Date()) {
        return sendError(res, 'Target date must be a future date', null, 400);
      }
      parsedTargetDate = d;
    }

    const goalData = {
      userId: req.user._id,
      name: name.trim(),
      targetAmount: Math.round(numericTarget * 100) / 100,
      currentAmount: Math.round(numericCurrent * 100) / 100,
      targetDate: parsedTargetDate
    };

    let goal;
    if (isMongoConnected()) {
      goal = await SavingsGoal.create(goalData);
    } else {
      goal = await memoryStore.createSavingsGoal(goalData);
    }

    const enriched = enrichSavingsGoal(goal);
    return sendSuccess(res, 'Savings goal created successfully', { savingsGoal: enriched }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get all savings goals for the authenticated user
 * @route  GET /api/savings
 * @access Private
 */
const getSavingsGoals = async (req, res, next) => {
  try {
    let goals;
    if (isMongoConnected()) {
      goals = await SavingsGoal.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    } else {
      goals = await memoryStore.findSavingsGoals(req.user._id);
    }

    const enrichedGoals = goals.map(enrichSavingsGoal);

    return sendSuccess(
      res,
      'Savings goals retrieved successfully',
      {
        savingsGoals: enrichedGoals,
        count: enrichedGoals.length
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get a single savings goal by ID for the authenticated user
 * @route  GET /api/savings/:id
 * @access Private
 */
const getSavingsGoalById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) && typeof id !== 'string') {
      return sendError(res, 'Invalid savings goal ID', null, 400);
    }
    if (mongoose.Types.ObjectId.isValid(id) === false && (!id || id.length !== 24)) {
      return sendError(res, 'Invalid savings goal ID', null, 400);
    }

    let goal;
    if (isMongoConnected()) {
      goal = await SavingsGoal.findOne({ _id: id, userId: req.user._id }).lean();
    } else {
      goal = await memoryStore.findSavingsGoalById(id, req.user._id);
    }

    if (!goal) {
      return sendError(res, 'Savings goal not found or unauthorized', null, 404);
    }

    const enriched = enrichSavingsGoal(goal);
    return sendSuccess(res, 'Savings goal retrieved successfully', { savingsGoal: enriched }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update a savings goal owned by the authenticated user
 * @route  PUT /api/savings/:id
 * @access Private
 */
const updateSavingsGoal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, targetAmount, currentAmount, targetDate } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) && (!id || id.length !== 24)) {
      return sendError(res, 'Invalid savings goal ID', null, 400);
    }

    // Check ownership
    let goal;
    if (isMongoConnected()) {
      goal = await SavingsGoal.findOne({ _id: id, userId: req.user._id });
    } else {
      goal = await memoryStore.findSavingsGoalById(id, req.user._id);
    }

    if (!goal) {
      return sendError(res, 'Savings goal not found or unauthorized', null, 404);
    }

    const updates = {};

    // Validate Name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return sendError(res, 'Please provide a valid savings goal name', null, 400);
      }
      if (name.trim().length > 100) {
        return sendError(res, 'Savings goal name cannot exceed 100 characters', null, 400);
      }
      updates.name = name.trim();
    }

    // Validate Target Amount if provided
    if (targetAmount !== undefined) {
      const numericTarget = Number(targetAmount);
      if (
        targetAmount === null ||
        isNaN(numericTarget) ||
        !isFinite(numericTarget) ||
        numericTarget <= 0
      ) {
        return sendError(
          res,
          'Target amount must be a positive number greater than zero',
          null,
          400
        );
      }
      updates.targetAmount = Math.round(numericTarget * 100) / 100;
    }

    // Validate Current Amount if provided
    if (currentAmount !== undefined) {
      const numericCurrent = Number(currentAmount);
      if (
        currentAmount === null ||
        isNaN(numericCurrent) ||
        !isFinite(numericCurrent) ||
        numericCurrent < 0
      ) {
        return sendError(res, 'Current amount cannot be negative', null, 400);
      }
      updates.currentAmount = Math.round(numericCurrent * 100) / 100;
    }

    // Validate Target Date if provided
    if (targetDate !== undefined) {
      if (targetDate === null || targetDate === '') {
        updates.targetDate = undefined;
      } else {
        const d = new Date(targetDate);
        if (isNaN(d.getTime())) {
          return sendError(res, 'Please provide a valid target date', null, 400);
        }
        if (d <= new Date()) {
          return sendError(res, 'Target date must be a future date', null, 400);
        }
        updates.targetDate = d;
      }
    }

    let updatedGoal;
    if (isMongoConnected()) {
      Object.assign(goal, updates);
      await goal.save();
      updatedGoal = goal;
    } else {
      updatedGoal = await memoryStore.updateSavingsGoal(id, req.user._id, updates);
    }

    const enriched = enrichSavingsGoal(updatedGoal);
    return sendSuccess(res, 'Savings goal updated successfully', { savingsGoal: enriched }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Add contribution / deposit to a savings goal owned by the authenticated user
 * @route  PATCH /api/savings/:id/contribute
 * @access Private
 */
const addContribution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const contributionValue = req.body.amount !== undefined ? req.body.amount : req.body.contribution;

    if (!mongoose.Types.ObjectId.isValid(id) && (!id || id.length !== 24)) {
      return sendError(res, 'Invalid savings goal ID', null, 400);
    }

    // Validate Contribution Amount
    const numericContribution = Number(contributionValue);
    if (
      contributionValue === undefined ||
      contributionValue === null ||
      isNaN(numericContribution) ||
      !isFinite(numericContribution) ||
      numericContribution <= 0
    ) {
      return sendError(
        res,
        'Contribution amount must be a positive number greater than zero',
        null,
        400
      );
    }

    // Find goal ensuring ownership
    let goal;
    if (isMongoConnected()) {
      goal = await SavingsGoal.findOne({ _id: id, userId: req.user._id });
    } else {
      goal = await memoryStore.findSavingsGoalById(id, req.user._id);
    }

    if (!goal) {
      return sendError(res, 'Savings goal not found or unauthorized', null, 404);
    }

    const newCurrentAmount = Math.round(((Number(goal.currentAmount) || 0) + numericContribution) * 100) / 100;

    let updatedGoal;
    if (isMongoConnected()) {
      goal.currentAmount = newCurrentAmount;
      await goal.save();
      updatedGoal = goal;
    } else {
      updatedGoal = await memoryStore.addContribution(id, req.user._id, numericContribution);
    }

    // Trigger notification asynchronously for contribution & completion
    try {
      await notificationService.notifySavingsContribution(
        req.user._id,
        goal.name,
        numericContribution,
        newCurrentAmount,
        goal.targetAmount
      );
    } catch (notifErr) {
      console.warn('Failed to send contribution notification:', notifErr.message);
    }

    const enriched = enrichSavingsGoal(updatedGoal);
    return sendSuccess(
      res,
      'Contribution added successfully',
      {
        savingsGoal: enriched,
        contributionAmount: Math.round(numericContribution * 100) / 100
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Delete a savings goal owned by the authenticated user
 * @route  DELETE /api/savings/:id
 * @access Private
 */
const deleteSavingsGoal = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) && (!id || id.length !== 24)) {
      return sendError(res, 'Invalid savings goal ID', null, 400);
    }

    let deleted = false;
    if (isMongoConnected()) {
      const result = await SavingsGoal.findOneAndDelete({ _id: id, userId: req.user._id });
      deleted = !!result;
    } else {
      deleted = await memoryStore.deleteSavingsGoal(id, req.user._id);
    }

    if (!deleted) {
      return sendError(res, 'Savings goal not found or unauthorized', null, 404);
    }

    return sendSuccess(res, 'Savings goal deleted successfully', null, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  enrichSavingsGoal,
  createSavingsGoal,
  getSavingsGoals,
  getSavingsGoalById,
  updateSavingsGoal,
  addContribution,
  deleteSavingsGoal
};
