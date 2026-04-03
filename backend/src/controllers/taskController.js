const prisma = require('../config/database');

/**
 * Get all tasks for the authenticated user
 * GET /api/tasks
 */
exports.getTasks = async (req, res) => {
  try {
    const { status, priority, subjectId, dueDate } = req.query;

    // Build filter object
    const filters = { userId: req.user.id };
    
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (subjectId) filters.subjectId = subjectId;
    
    // Due date filtering
    if (dueDate === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filters.dueDate = { gte: today, lt: tomorrow };
    } else if (dueDate === 'week') {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      filters.dueDate = { gte: weekStart, lte: weekEnd };
    }

    const tasks = await prisma.task.findMany({
      where: filters,
      include: {
        subject: { select: { id: true, name: true, color: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

/**
 * Get a single task by ID
 * GET /api/tasks/:id
 */
exports.getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true, color: true } },
        notes: { select: { id: true, title: true, createdAt: true } }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Ensure user owns this task
    if (task.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

/**
 * Create a new task
 * POST /api/tasks
 */
exports.createTask = async (req, res) => {
  try {
    const { title, description, priority, status, dueDate, estimatedMinutes, subjectId } = req.body;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        status: status || 'PENDING',
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedMinutes,
        subjectId: subjectId || null,
        userId: req.user.id
      },
      include: {
        subject: { select: { id: true, name: true, color: true } }
      }
    });

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

/**
 * Update a task
 * PUT /api/tasks/:id
 */
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, dueDate, estimatedMinutes, actualMinutes, subjectId } = req.body;

    // Check if task exists and belongs to user
    const existingTask = await prisma.task.findUnique({
      where: { id }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (existingTask.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Handle completedAt timestamp when status changes to COMPLETED
    let completedAt = existingTask.completedAt;
    if (status === 'COMPLETED' && existingTask.status !== 'COMPLETED') {
      completedAt = new Date();
    } else if (status !== 'COMPLETED') {
      completedAt = null;
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(priority && { priority }),
        ...(status && { status, completedAt }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(estimatedMinutes !== undefined && { estimatedMinutes }),
        ...(actualMinutes !== undefined && { actualMinutes }),
        ...(subjectId !== undefined && { subjectId })
      },
      include: {
        subject: { select: { id: true, name: true, color: true } }
      }
    });

    res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

/**
 * Delete a task
 * DELETE /api/tasks/:id
 */
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if task exists and belongs to user
    const existingTask = await prisma.task.findUnique({
      where: { id }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (existingTask.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.task.delete({
      where: { id }
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

/**
 * Get dashboard statistics
 * GET /api/tasks/dashboard
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get task counts by status
    const pendingCount = await prisma.task.count({
      where: { userId, status: 'PENDING' }
    });

    const inProgressCount = await prisma.task.count({
      where: { userId, status: 'IN_PROGRESS' }
    });

    const completedCount = await prisma.task.count({
      where: { userId, status: 'COMPLETED' }
    });

    // Get overdue tasks
    const overdueCount = await prisma.task.count({
      where: {
        userId,
        status: { not: 'COMPLETED' },
        dueDate: { lt: new Date() }
      }
    });

    // Get today's tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayTasks = await prisma.task.findMany({
      where: {
        userId,
        dueDate: { gte: today, lt: tomorrow }
      },
      select: { id: true, title: true, priority: true, status: true }
    });

    // Get recent completed tasks
    const recentCompleted = await prisma.task.findMany({
      where: { userId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, completedAt: true }
    });

    res.json({
      stats: {
        pending: pendingCount,
        inProgress: inProgressCount,
        completed: completedCount,
        overdue: overdueCount,
        total: pendingCount + inProgressCount + completedCount
      },
      todayTasks,
      recentCompleted
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
