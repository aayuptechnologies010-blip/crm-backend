const router = require('express').Router();
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const FollowUp = require('../models/FollowUp');
const WorkflowActivity = require('../models/WorkflowActivity');
const { protect } = require('../middleware/auth');
const { checkPermission, applyDataScope, recordAuditLog } = require('../middleware/rbac');

// Helper — legacy activity log
const log = (user, action, lead, type) =>
  Activity.create({ user, action, lead, type, time: new Date().toLocaleTimeString() });

// GET /api/leads - With dynamic RBAC scope filter
router.get('/', protect, checkPermission('leads', 'view'), async (req, res) => {
  try {
    const { search, status, assignedTo, branch, priority, page, limit } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (branch) filter.branch = branch;
    if (priority) filter.priority = priority;

    if (search) {
      filter.$or = [
        { name:    { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email:   { $regex: search, $options: 'i' } },
        { phone:   { $regex: search, $options: 'i' } },
      ];
    }

    // Apply data scope (Super Admin -> all, Branch Admin -> branch, Sales Exec -> assigned)
    filter = applyDataScope(req, filter);

    const pageNum  = Math.max(1, Number(page) || 1);
    const limitNum = limit !== undefined ? Number(limit) : 2000;

    let query = Lead.find(filter)
      .select('name email phone company source status priority branch leadType assignedTo followUpDate nextAction nextFollowUpDate value createdAt notes contactPerson pinCode typeOfCare hospitalZone tpaName course college year trainingType projectType techStack timeline budget location requirementDetails quotations documents payments')
      .sort({ createdAt: -1 })
      .lean();

    if (limitNum > 0) {
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const [leads, total] = await Promise.all([
      query.exec(),
      Lead.countDocuments(filter),
    ]);

    res.json({ leads, total, page: pageNum });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/leads/:id
router.get('/:id', protect, checkPermission('leads', 'view'), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).lean();
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    // Validate scope for Sales Exec & Branch Admin
    if (req.user.role === 'Sales Executive' && lead.assignedTo && lead.assignedTo !== req.user.name) {
      return res.status(403).json({ message: 'You do not have access to view this lead' });
    }
    if (req.user.role === 'Branch Admin' && req.user.branch && lead.branch && lead.branch !== req.user.branch) {
      return res.status(403).json({ message: 'Lead does not belong to your branch' });
    }

    res.json(lead);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/leads - Create lead
router.post('/', protect, checkPermission('leads', 'create'), async (req, res) => {
  try {
    const leadData = {
      ...req.body,
      createdBy: req.user._id || req.user.id,
      branch: req.body.branch || req.user.branch || '',
      status: req.body.status || 'New Lead'
    };

    const lead = await Lead.create(leadData);
    
    // Auto-create initial Workflow Activity
    await WorkflowActivity.create({
      lead: lead._id,
      activityType: 'Status Change',
      performedBy: req.user._id || req.user.id,
      performedByName: req.user.name,
      performedByRole: req.user.role,
      newStatus: lead.status,
      remark: `Lead created from source: ${lead.source || 'Direct'}`,
      systemGenerated: true
    });

    await recordAuditLog({
      entity: 'lead',
      entityId: lead._id,
      action: 'CREATE',
      req,
      details: `Created lead ${lead.name}`,
      newValues: lead.toJSON()
    });

    await log(req.user.name, `New lead added: ${lead.name}`, lead.name, 'add');
    res.status(201).json(lead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/leads/:id - Update lead & auto-record timeline/audit
router.patch('/:id', protect, checkPermission('leads', 'edit'), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    // Check scope if Sales Executive
    if (req.user.role === 'Sales Executive' && lead.assignedTo && lead.assignedTo !== req.user.name) {
      return res.status(403).json({ message: 'You can only edit your assigned leads' });
    }

    const oldValues = lead.toJSON();
    const oldStatus = lead.status;
    const oldAssignedTo = lead.assignedTo;

    // Apply updates
    Object.assign(lead, req.body);
    await lead.save();

    // 1. If Status changed -> Log in Workflow Timeline
    if (req.body.status && req.body.status !== oldStatus) {
      await WorkflowActivity.create({
        lead: lead._id,
        activityType: 'Status Change',
        performedBy: req.user._id || req.user.id,
        performedByName: req.user.name,
        performedByRole: req.user.role,
        previousStatus: oldStatus,
        newStatus: req.body.status,
        remark: req.body.statusRemark || `Status transitioned from ${oldStatus} to ${req.body.status}`,
        systemGenerated: true
      });
      await log(req.user.name, `Status changed from "${oldStatus}" to "${req.body.status}" for ${lead.name}`, lead.name, 'edit');
    }

    // 2. If Lead Assigned / Reassigned -> Log in Workflow Timeline
    if (req.body.assignedTo && req.body.assignedTo !== oldAssignedTo) {
      await WorkflowActivity.create({
        lead: lead._id,
        activityType: 'Assignment',
        performedBy: req.user._id || req.user.id,
        performedByName: req.user.name,
        performedByRole: req.user.role,
        assignedFrom: oldAssignedTo || 'Unassigned',
        assignedTo: req.body.assignedTo,
        remark: `Assigned to ${req.body.assignedTo}`,
        systemGenerated: true
      });
    }

    // Audit Log entry
    await recordAuditLog({
      entity: 'lead',
      entityId: lead._id,
      action: 'UPDATE',
      req,
      details: `Updated lead ${lead.name}`,
      oldValues,
      newValues: lead.toJSON()
    });

    res.json(lead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/leads/assign/bulk - Bulk assign with timeline audit
router.patch('/assign/bulk', protect, checkPermission('leads', 'assign'), async (req, res) => {
  try {
    const { ids, assignedTo, followUpDate } = req.body;
    if (!ids?.length || !assignedTo) return res.status(400).json({ message: 'ids and assignedTo required' });

    const eligibleLeads = await Lead.find({ _id: { $in: ids } });
    if (!eligibleLeads.length) return res.status(400).json({ message: 'No matching leads found' });

    const eligibleIds = eligibleLeads.map(l => l._id);
    const updateData = { assignedTo, status: 'Lead Assigned' };
    if (followUpDate) updateData.followUpDate = followUpDate;

    await Lead.updateMany({ _id: { $in: eligibleIds } }, updateData);

    // Create workflow activities for each assigned lead
    const timelineEvents = eligibleLeads.map(l => ({
      lead: l._id,
      activityType: 'Assignment',
      performedBy: req.user._id || req.user.id,
      performedByName: req.user.name,
      performedByRole: req.user.role,
      assignedFrom: l.assignedTo || 'Unassigned',
      assignedTo,
      newStatus: 'Lead Assigned',
      remark: `Lead assigned to ${assignedTo}`,
      systemGenerated: true
    }));
    await WorkflowActivity.insertMany(timelineEvents);

    if (followUpDate) {
      const followUpsToCreate = eligibleLeads.map(l => ({
        lead: l.name, company: l.company || '', date: followUpDate,
        time: '10:00', assignedTo, priority: 'Medium', status: 'Pending',
        leadRef: l._id, createdBy: req.user._id || req.user.id
      }));
      if (followUpsToCreate.length > 0) await FollowUp.insertMany(followUpsToCreate);
    }

    await log(req.user.name, `${eligibleIds.length} lead(s) assigned to ${assignedTo}`, assignedTo, 'assign');

    const io = req.app.get('io');
    if (io) {
      io.emit('lead_assigned', {
        assignedTo,
        assignedBy: req.user.name,
        count: eligibleIds.length,
        leadNames: eligibleLeads.map(l => l.name).slice(0, 3),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }

    res.json({ message: `${eligibleIds.length} leads assigned to ${assignedTo}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/leads - Delete leads with audit
router.delete('/', protect, checkPermission('leads', 'delete'), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ message: 'ids required' });

    await Lead.deleteMany({ _id: { $in: ids } });

    await recordAuditLog({
      entity: 'lead',
      entityId: ids.join(','),
      action: 'DELETE',
      req,
      details: `Deleted ${ids.length} leads`
    });

    res.json({ message: `${ids.length} lead(s) deleted` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/leads/:id/notes
router.patch('/:id/notes', protect, checkPermission('activities', 'create'), async (req, res) => {
  try {
    const { text } = req.body;
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { $push: { notes: { $each: [{ text, time: new Date().toLocaleString(), user: req.user.name }], $position: 0 } } },
      { new: true }
    );

    // Also push to chronological timeline
    await WorkflowActivity.create({
      lead: req.params.id,
      activityType: 'Note',
      performedBy: req.user._id || req.user.id,
      performedByName: req.user.name,
      performedByRole: req.user.role,
      remark: text,
      systemGenerated: false
    });

    await log(req.user.name, `Note added on lead: ${lead.name}`, lead.name, 'edit');
    res.json(lead.notes);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
