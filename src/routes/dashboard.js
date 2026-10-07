const router = require('express').Router();
const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const Activity = require('../models/Activity');
const WorkflowActivity = require('../models/WorkflowActivity');
const User = require('../models/User');
const Branch = require('../models/Branch');
const { protect } = require('../middleware/auth');
const { applyDataScope } = require('../middleware/rbac');

// GET /api/dashboard — Comprehensive KPIs as per PDF Section 12
router.get('/', protect, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayStart = new Date(todayStr);

    const isSalesExec = req.user.role === 'Sales Executive';
    const isBranchAdmin = req.user.role === 'Branch Admin';
    const isAdmin = req.user.role === 'Super Admin' || req.user.role === 'Admin';

    // Base filter scoped to current user
    let baseFilter = {};
    if (isSalesExec) {
      baseFilter.$or = [{ assignedTo: req.user.name }, { assignedToUser: req.user._id }];
    } else if (isBranchAdmin && req.user.branch) {
      baseFilter.branch = req.user.branch;
    }

    // Overdue Follow-ups filter
    const overdueFollowUpFilter = {
      ...baseFilter,
      date: { $lt: todayStr },
      status: 'Pending'
    };

    // Today's Follow-ups filter
    const todayFollowUpFilter = {
      ...baseFilter,
      date: todayStr,
      status: 'Pending'
    };

    // Parallel count queries for all KPIs (PDF Section 12)
    const [
      totalLeads,
      newLeads,
      unassignedLeads,
      assignedLeads,
      todayFollowUpsCount,
      overdueFollowUpsCount,
      meetingsScheduled,
      quotationsSent,
      negotiations,
      wonDeals,
      lostLeads,
      stageWiseCounts,
      todayFollowUpsList,
      recentTimelineActivities
    ] = await Promise.all([
      Lead.countDocuments(baseFilter),
      Lead.countDocuments({ ...baseFilter, status: 'New Lead' }),
      Lead.countDocuments({ ...baseFilter, $or: [{ assignedTo: '' }, { assignedTo: null }, { assignedTo: { $exists: false } }] }),
      Lead.countDocuments({ ...baseFilter, assignedTo: { $nin: ['', null] } }),
      FollowUp.countDocuments(todayFollowUpFilter),
      FollowUp.countDocuments(overdueFollowUpFilter),
      Lead.countDocuments({ ...baseFilter, status: 'Meeting / Demo' }),
      Lead.countDocuments({ ...baseFilter, status: 'Quotation Sent' }),
      Lead.countDocuments({ ...baseFilter, status: 'Negotiation' }),
      Lead.countDocuments({ ...baseFilter, status: { $in: ['Closed / Won', 'Won'] } }),
      Lead.countDocuments({ ...baseFilter, status: { $in: ['Lost / Closed Lost', 'Not Interested', 'Lost'] } }),
      Lead.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      FollowUp.find(todayFollowUpFilter).limit(6).lean(),
      WorkflowActivity.find().sort({ createdAt: -1 }).limit(10).lean()
    ]);

    // Conversion Rate
    const conversionRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;

    // Executive-wise Performance
    let executivePerformance = [];
    if (!isSalesExec) {
      let execQuery = { role: 'Sales Executive' };
      if (isBranchAdmin && req.user.branch) execQuery.branch = req.user.branch;

      const salesExecs = await User.find(execQuery).select('name branch').lean();
      executivePerformance = await Promise.all(
        salesExecs.map(async (exec) => {
          const [assigned, won] = await Promise.all([
            Lead.countDocuments({ assignedTo: exec.name }),
            Lead.countDocuments({ assignedTo: exec.name, status: { $in: ['Closed / Won', 'Won'] } })
          ]);
          return {
            name: exec.name,
            branch: exec.branch || 'Main',
            assigned,
            won,
            conversion: assigned > 0 ? Math.round((won / assigned) * 100) : 0
          };
        })
      );
    }

    // Branch-wise Performance (Super Admin / Admin only)
    let branchPerformance = [];
    if (isAdmin) {
      const branches = await Branch.find().select('name code').lean();
      branchPerformance = await Promise.all(
        branches.map(async (b) => {
          const [leadsCount, wonCount] = await Promise.all([
            Lead.countDocuments({ branch: b.name }),
            Lead.countDocuments({ branch: b.name, status: { $in: ['Closed / Won', 'Won'] } })
          ]);
          return {
            branch: b.name,
            code: b.code,
            totalLeads: leadsCount,
            wonDeals: wonCount
          };
        })
      );
    }

    res.json({
      success: true,
      kpis: {
        totalLeads,
        newLeads,
        unassignedLeads,
        assignedLeads,
        todayFollowUps: todayFollowUpsCount,
        overdueFollowUps: overdueFollowUpsCount,
        meetingsScheduled,
        quotationsSent,
        negotiations,
        wonDeals,
        lostLeads,
        conversionRate,
      },
      stageWiseCounts,
      todayFollowUps: todayFollowUpsList,
      recentTimelineActivities,
      executivePerformance,
      branchPerformance
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
