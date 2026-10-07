const router = require('express').Router();
const Lead = require('../models/Lead');
const WorkflowActivity = require('../models/WorkflowActivity');
const FollowUp = require('../models/FollowUp');
const { protect } = require('../middleware/auth');
const { checkPermission, recordAuditLog } = require('../middleware/rbac');

// GET /api/leads/:id/timeline — Get complete chronological activity history
router.get('/:id/timeline', protect, checkPermission('activities', 'view'), async (req, res) => {
  try {
    const activities = await WorkflowActivity.find({ lead: req.params.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, activities });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/leads/:id/timeline — Add manual activity (Call, WhatsApp, Meeting, Note, etc.)
router.post('/:id/timeline', protect, checkPermission('activities', 'create'), async (req, res) => {
  try {
    const { activityType, remark, nextAction, nextFollowUpDate, attachments } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const activity = await WorkflowActivity.create({
      lead: lead._id,
      activityType: activityType || 'Note',
      performedBy: req.user._id || req.user.id,
      performedByName: req.user.name,
      performedByRole: req.user.role,
      remark: remark || '',
      nextAction: nextAction || '',
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : undefined,
      attachments: attachments || []
    });

    // If next follow-up is scheduled, create FollowUp item
    if (nextFollowUpDate) {
      lead.nextFollowUpDate = new Date(nextFollowUpDate);
      lead.nextAction = nextAction || 'Follow-up';
      await lead.save();

      await FollowUp.create({
        lead: lead.name,
        company: lead.company || '',
        date: new Date(nextFollowUpDate).toISOString().split('T')[0],
        time: new Date(nextFollowUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        assignedTo: lead.assignedTo || req.user.name,
        priority: lead.priority || 'Medium',
        status: 'Pending',
        leadRef: lead._id,
        createdBy: req.user._id || req.user.id
      });
    }

    res.status(201).json({ success: true, activity });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/leads/:id/quotations — Add quotation record to lead
router.post('/:id/quotations', protect, checkPermission('quotations', 'create'), async (req, res) => {
  try {
    const { quotationNumber, amount, fileUrl, fileName, status } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const quoteItem = {
      quotationNumber: quotationNumber || `QT-${Date.now().toString().slice(-6)}`,
      amount: Number(amount) || 0,
      fileUrl: fileUrl || '',
      fileName: fileName || 'Quotation.pdf',
      status: status || 'Sent',
      sentDate: new Date(),
      createdBy: req.user._id || req.user.id
    };

    lead.quotations.push(quoteItem);
    // If not already in quotation/later stage, update stage to Quotation Sent
    if (lead.status === 'New Lead' || lead.status === 'Meeting / Demo' || lead.status === 'Requirement Collected') {
      lead.status = 'Quotation Sent';
    }
    await lead.save();

    // Log in timeline
    await WorkflowActivity.create({
      lead: lead._id,
      activityType: 'Quotation',
      performedBy: req.user._id || req.user.id,
      performedByName: req.user.name,
      performedByRole: req.user.role,
      remark: `Quotation #${quoteItem.quotationNumber} of ₹${quoteItem.amount} sent`,
      attachments: fileUrl ? [{ name: fileName, url: fileUrl }] : [],
      systemGenerated: true
    });

    res.status(201).json({ success: true, quotations: lead.quotations });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/leads/:id/payments — Add advance/payment record to lead
router.post('/:id/payments', protect, checkPermission('payments', 'create'), async (req, res) => {
  try {
    const { amount, type, paymentMode, transactionId, notes } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const paymentItem = {
      amount: Number(amount) || 0,
      type: type || 'Advance',
      paymentMode: paymentMode || 'UPI',
      transactionId: transactionId || '',
      notes: notes || '',
      recordedBy: req.user._id || req.user.id,
      paymentDate: new Date()
    };

    lead.payments.push(paymentItem);
    // If advance received, can transition to Payment / Advance stage
    if (type === 'Advance' && lead.status !== 'Closed / Won') {
      lead.status = 'Payment / Advance';
    }
    await lead.save();

    // Log timeline
    await WorkflowActivity.create({
      lead: lead._id,
      activityType: 'Payment',
      performedBy: req.user._id || req.user.id,
      performedByName: req.user.name,
      performedByRole: req.user.role,
      remark: `${paymentItem.type} payment of ₹${paymentItem.amount} recorded (${paymentItem.paymentMode})`,
      systemGenerated: true
    });

    res.status(201).json({ success: true, payments: lead.payments });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/leads/:id/documents — Add verified document
router.post('/:id/documents', protect, checkPermission('documents', 'create'), async (req, res) => {
  try {
    const { title, documentType, fileUrl } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.documents.push({
      title: title || 'Document',
      documentType: documentType || 'Other',
      fileUrl: fileUrl || '',
      uploadedBy: req.user._id || req.user.id,
      uploadedAt: new Date()
    });

    await lead.save();

    await WorkflowActivity.create({
      lead: lead._id,
      activityType: 'Document Upload',
      performedBy: req.user._id || req.user.id,
      performedByName: req.user.name,
      performedByRole: req.user.role,
      remark: `Uploaded document: ${title} (${documentType})`,
      attachments: fileUrl ? [{ name: title, url: fileUrl }] : [],
      systemGenerated: true
    });

    res.status(201).json({ success: true, documents: lead.documents });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
