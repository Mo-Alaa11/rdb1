const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken } = require('../middleware/auth');
const { body, query, param } = require('express-validator');
const handleValidationErrors = require('../middleware/validation');

// All routes are protected
router.use(authenticateToken);

// Validation rules
const createTaskValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional().trim(),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Invalid priority'),
  body('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),
  body('dueDate').optional().isISO8601().withMessage('Invalid date format'),
  body('estimatedMinutes').optional().isInt({ min: 1 }).withMessage('Estimated minutes must be positive'),
  handleValidationErrors
];

const updateTaskValidation = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().trim(),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Invalid priority'),
  body('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),
  body('dueDate').optional().isISO8601().withMessage('Invalid date format'),
  handleValidationErrors
];

// Routes
router.get('/', taskController.getTasks);
router.get('/dashboard', taskController.getDashboardStats);
router.get('/:id', taskController.getTaskById);
router.post('/', createTaskValidation, taskController.createTask);
router.put('/:id', updateTaskValidation, taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
