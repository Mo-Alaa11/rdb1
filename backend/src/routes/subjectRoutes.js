const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');
const handleValidationErrors = require('../middleware/validation');

// All routes are protected
router.use(authenticateToken);

// Validation rules
const createSubjectValidation = [
  body('name').trim().notEmpty().withMessage('Subject name is required'),
  body('code').optional().trim(),
  body('color').optional().isHexColor().withMessage('Invalid color format'),
  body('description').optional().trim(),
  handleValidationErrors
];

const updateSubjectValidation = [
  body('name').optional().trim().notEmpty().withMessage('Subject name cannot be empty'),
  body('code').optional().trim(),
  body('color').optional().isHexColor().withMessage('Invalid color format'),
  body('description').optional().trim(),
  handleValidationErrors
];

// Routes
router.get('/', subjectController.getSubjects);
router.get('/:id', subjectController.getSubjectById);
router.get('/:id/progress', subjectController.getSubjectProgress);
router.post('/', createSubjectValidation, subjectController.createSubject);
router.put('/:id', updateSubjectValidation, subjectController.updateSubject);
router.delete('/:id', subjectController.deleteSubject);

module.exports = router;
