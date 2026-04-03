const prisma = require('../config/database');

/**
 * Get all subjects for the authenticated user
 * GET /api/subjects
 */
exports.getSubjects = async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { userId: req.user.id },
      include: {
        _count: {
          select: { tasks: true, notes: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ subjects });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

/**
 * Get a single subject by ID
 * GET /api/subjects/:id
 */
exports.getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true
          }
        },
        notes: {
          select: {
            id: true,
            title: true,
            createdAt: true
          }
        }
      }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Ensure user owns this subject
    if (subject.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ subject });
  } catch (error) {
    console.error('Get subject error:', error);
    res.status(500).json({ error: 'Failed to fetch subject' });
  }
};

/**
 * Create a new subject
 * POST /api/subjects
 */
exports.createSubject = async (req, res) => {
  try {
    const { name, code, color, description } = req.body;

    const subject = await prisma.subject.create({
      data: {
        name,
        code,
        color: color || '#3B82F6',
        description,
        userId: req.user.id
      },
      include: {
        _count: {
          select: { tasks: true, notes: true }
        }
      }
    });

    res.status(201).json({
      message: 'Subject created successfully',
      subject
    });
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
};

/**
 * Update a subject
 * PUT /api/subjects/:id
 */
exports.updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, color, description } = req.body;

    // Check if subject exists and belongs to user
    const existingSubject = await prisma.subject.findUnique({
      where: { id }
    });

    if (!existingSubject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    if (existingSubject.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code !== undefined && { code }),
        ...(color && { color }),
        ...(description !== undefined && { description })
      },
      include: {
        _count: {
          select: { tasks: true, notes: true }
        }
      }
    });

    res.json({
      message: 'Subject updated successfully',
      subject
    });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
};

/**
 * Delete a subject
 * DELETE /api/subjects/:id
 */
exports.deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if subject exists and belongs to user
    const existingSubject = await prisma.subject.findUnique({
      where: { id }
    });

    if (!existingSubject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    if (existingSubject.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.subject.delete({
      where: { id }
    });

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
};

/**
 * Get subject progress statistics
 * GET /api/subjects/:id/progress
 */
exports.getSubjectProgress = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        tasks: {
          select: { status: true }
        }
      }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    if (subject.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const totalTasks = subject.tasks.length;
    const completedTasks = subject.tasks.filter(t => t.status === 'COMPLETED').length;
    const inProgressTasks = subject.tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const pendingTasks = subject.tasks.filter(t => t.status === 'PENDING').length;

    const completionRate = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;

    res.json({
      progress: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        completionRate
      }
    });
  } catch (error) {
    console.error('Get subject progress error:', error);
    res.status(500).json({ error: 'Failed to fetch subject progress' });
  }
};
