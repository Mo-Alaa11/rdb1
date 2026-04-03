const prisma = require('../config/database');

/**
 * Get all notes for the authenticated user
 * GET /api/notes
 */
exports.getNotes = async (req, res) => {
  try {
    const { subjectId, taskId } = req.query;

    const filters = { userId: req.user.id };
    
    if (subjectId) filters.subjectId = subjectId;
    if (taskId) filters.taskId = taskId;

    const notes = await prisma.note.findMany({
      where: filters,
      include: {
        subject: { select: { id: true, name: true, color: true } },
        task: { select: { id: true, title: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ notes });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

/**
 * Get a single note by ID
 * GET /api/notes/:id
 */
exports.getNoteById = async (req, res) => {
  try {
    const { id } = req.params;

    const note = await prisma.note.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true, color: true } },
        task: { select: { id: true, title: true } }
      }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Ensure user owns this note
    if (note.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ note });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
};

/**
 * Create a new note
 * POST /api/notes
 */
exports.createNote = async (req, res) => {
  try {
    const { title, content, subjectId, taskId } = req.body;

    const note = await prisma.note.create({
      data: {
        title,
        content,
        subjectId: subjectId || null,
        taskId: taskId || null,
        userId: req.user.id
      },
      include: {
        subject: { select: { id: true, name: true, color: true } },
        task: { select: { id: true, title: true } }
      }
    });

    res.status(201).json({
      message: 'Note created successfully',
      note
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
};

/**
 * Update a note
 * PUT /api/notes/:id
 */
exports.updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, subjectId, taskId } = req.body;

    // Check if note exists and belongs to user
    const existingNote = await prisma.note.findUnique({
      where: { id }
    });

    if (!existingNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (existingNote.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const note = await prisma.note.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content !== undefined && { content }),
        ...(subjectId !== undefined && { subjectId }),
        ...(taskId !== undefined && { taskId })
      },
      include: {
        subject: { select: { id: true, name: true, color: true } },
        task: { select: { id: true, title: true } }
      }
    });

    res.json({
      message: 'Note updated successfully',
      note
    });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
};

/**
 * Delete a note
 * DELETE /api/notes/:id
 */
exports.deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if note exists and belongs to user
    const existingNote = await prisma.note.findUnique({
      where: { id }
    });

    if (!existingNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (existingNote.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.note.delete({
      where: { id }
    });

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
};
