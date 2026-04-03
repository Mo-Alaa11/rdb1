const prisma = require('../config/database');

/**
 * Start a study session
 * POST /api/analytics/session/start
 */
exports.startSession = async (req, res) => {
  try {
    const { subjectId, taskId } = req.body;

    const session = await prisma.studySession.create({
      data: {
        startTime: new Date(),
        subjectId: subjectId || null,
        taskId: taskId || null,
        userId: req.user.id
      }
    });

    res.json({
      message: 'Study session started',
      session
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Failed to start study session' });
  }
};

/**
 * End a study session
 * POST /api/analytics/session/end/:id
 */
exports.endSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { durationMinutes } = req.body;

    const session = await prisma.studySession.findUnique({
      where: { id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate duration if not provided
    const endTime = new Date();
    const calculatedDuration = Math.round(
      (endTime.getTime() - new Date(session.startTime).getTime()) / 60000
    );

    const updatedSession = await prisma.studySession.update({
      where: { id },
      data: {
        endTime,
        durationMinutes: durationMinutes || calculatedDuration
      }
    });

    res.json({
      message: 'Study session ended',
      session: updatedSession
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Failed to end study session' });
  }
};

/**
 * Get analytics dashboard data
 * GET /api/analytics/dashboard
 */
exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period } = req.query; // 'week', 'month', 'all'

    // Determine date range
    let startDate = new Date(2000, 0, 1); // Default to all time
    const now = new Date();

    if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // Get total study time
    const sessions = await prisma.studySession.findMany({
      where: {
        userId,
        startTime: { gte: startDate },
        durationMinutes: { not: null }
      },
      select: {
        durationMinutes: true,
        subjectId: true,
        startTime: true
      }
    });

    const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    
    // Group by subject
    const bySubject = {};
    sessions.forEach(session => {
      if (session.subjectId) {
        if (!bySubject[session.subjectId]) {
          bySubject[session.subjectId] = 0;
        }
        bySubject[session.subjectId] += session.durationMinutes || 0;
      }
    });

    // Get task completion rate
    const totalTasks = await prisma.task.count({
      where: { userId }
    });

    const completedTasks = await prisma.task.count({
      where: { userId, status: 'COMPLETED' }
    });

    const completionRate = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;

    // Get tasks completed in period
    const tasksCompletedInPeriod = await prisma.task.count({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: { gte: startDate }
      }
    });

    // Get daily activity for the past 7 days
    const dailyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const daySessions = sessions.filter(
        s => s.startTime >= dayStart && s.startTime <= dayEnd
      );
      
      const dayMinutes = daySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

      dailyActivity.push({
        date: dayStart.toISOString().split('T')[0],
        minutes: dayMinutes
      });
    }

    res.json({
      analytics: {
        totalStudyTime: totalMinutes,
        totalStudyTimeHours: Math.round(totalMinutes / 60 * 10) / 10,
        bySubject,
        taskCompletionRate: completionRate,
        tasksCompletedInPeriod,
        dailyActivity
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

/**
 * Get weekly productivity report
 * GET /api/analytics/weekly-report
 */
exports.getWeeklyReport = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get start of current week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Get sessions this week
    const sessions = await prisma.studySession.findMany({
      where: {
        userId,
        startTime: { gte: weekStart },
        durationMinutes: { not: null }
      },
      include: {
        subject: { select: { name: true, color: true } }
      }
    });

    const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    
    // Group by subject with names
    const bySubject = {};
    sessions.forEach(session => {
      if (session.subject && session.subject.name) {
        const name = session.subject.name;
        if (!bySubject[name]) {
          bySubject[name] = { minutes: 0, color: session.subject.color };
        }
        bySubject[name].minutes += session.durationMinutes || 0;
      }
    });

    // Get tasks completed this week
    const tasksCompleted = await prisma.task.count({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: { gte: weekStart }
      }
    });

    // Get pending tasks
    const pendingTasks = await prisma.task.count({
      where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] } }
    });

    res.json({
      report: {
        weekStart: weekStart.toISOString(),
        totalStudyTime: totalMinutes,
        totalStudyTimeHours: Math.round(totalMinutes / 60 * 10) / 10,
        bySubject,
        tasksCompleted,
        pendingTasks,
        averageDailyStudy: Math.round(totalMinutes / 7)
      }
    });
  } catch (error) {
    console.error('Get weekly report error:', error);
    res.status(500).json({ error: 'Failed to fetch weekly report' });
  }
};
