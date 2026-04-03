const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');
const handleValidationErrors = require('../middleware/validation');

// All routes are protected
router.use(authenticateToken);

// Validation rules
const createNoteValidation = [
  body('title').trim().notEmpty().withMessage('Note title is required'),
  body('content').optional(),
  handleValidationErrors
];

const updateNoteValidation = [
  body('title').optional().trim().notEmpty().withMessage('Note title cannot be empty'),
  body('content').optional(),
  handleValidationErrors
];

// Routes
router.get('/', noteController.getNotes);
router.get('/:id', noteController.getNoteById);
router.post('/', createNoteValidation, noteController.createNote);
router.put('/:id', updateNoteValidation, noteController.updateNote);
router.delete('/:id', noteController.deleteNote);

module.exports = router;
