const mongoose = require('mongoose');

// Complete 16 Workflow Stages + Alternate Closed Lost Stages as per PDF
const LEAD_STAGES = [
  'New Lead',
  'Lead Assigned',
  'First Contact',
  'Contacted',
  'Requirement Collected',
  'Meeting / Demo',
  'Quotation Sent',
  'Follow-up',
  'Negotiation',
  'Project Confirmed',
  'Documentation',
  'Payment / Advance',
  'Project Started',
  'Project In Progress',
  'Project Completed',
  'Closed / Won',
  // Alternate / Drop-off statuses
  'Not Interested',
  'Lost / Closed Lost',
  // Legacy backward-compatibility statuses
  'New', 'Qualified', 'Proposal', 'Won', 'Lost', 'No Response', 'Interested'
];

const leadSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, trim: true, lowercase: true },
  phone:        { type: String, trim: true, default: '' },
  company:      { type: String, trim: true },
  value:        { type: String, default: '' },
  source:       { type: String, enum: ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Campaign', 'Conference', 'Other'], default: 'Website' },
  
  // 16 Stages Flow
  status:       { type: String, enum: LEAD_STAGES, default: 'New Lead' },
  priority:     { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  branch:       { type: String, default: '', index: true },
  branchId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

  leadType:     { type: String, enum: ['Client Project', 'Student Training'], default: 'Client Project' },
  
  // Detailed Requirement fields (PDF Section 3 & 14)
  budget:        { type: String, default: '' },
  location:      { type: String, default: '' },
  requirementDetails: { type: String, default: '' },

  // Student Training details
  course:       { type: String, default: '' },
  college:      { type: String, default: '' },
  year:         { type: String, default: '' },
  trainingType: { type: String, default: '' },

  // Client Project details
  projectType:   { type: String, default: '' },
  techStack:     { type: String, default: '' },
  timeline:      { type: String, default: '' },

  // Client-specific contact & business details
  contactPerson: { type: String, default: '' },
  pinCode:       { type: String, default: '' },
  typeOfCare:    { type: String, default: '' },
  hospitalZone:  { type: String, default: '' },
  tpaName:       { type: String, default: '' },

  // Assignment & Ownership
  assignedTo:     { type: String, default: '' }, // user name
  assignedToUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAt:     { type: Date },

  // Next actions & Follow-ups
  nextAction:       { type: String, default: '' },
  nextFollowUpDate: { type: Date },
  followUpDate:     { type: String, default: '' }, // legacy string
  
  // Quotations and Documents attachments metadata
  quotations: [{
    quotationNumber: { type: String },
    amount:          { type: Number },
    status:          { type: String, enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Negotiation'], default: 'Draft' },
    fileUrl:         { type: String },
    fileName:        { type: String },
    sentDate:        { type: Date },
    createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt:       { type: Date, default: Date.now }
  }],

  documents: [{
    title:      { type: String },
    documentType:{ type: String, enum: ['KYC', 'Agreement', 'Proposal', 'Requirement', 'Invoice', 'Other'], default: 'Other' },
    fileUrl:    { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],

  payments: [{
    amount:        { type: Number, required: true },
    type:          { type: String, enum: ['Advance', 'Part Payment', 'Final Settlement'], default: 'Advance' },
    paymentMode:   { type: String, enum: ['Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Credit Card'], default: 'UPI' },
    transactionId: { type: String, default: '' },
    paymentDate:   { type: Date, default: Date.now },
    recordedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes:         { type: String, default: '' }
  }],

  notes:        [{ text: String, time: String, user: String }],
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Indexes for fast searching & role scoping
leadSchema.index({ createdAt: -1 });
leadSchema.index({ assignedTo: 1, createdAt: -1 });
leadSchema.index({ branch: 1, createdAt: -1 });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ name: 'text', company: 'text', email: 'text' });

module.exports = mongoose.model('Lead', leadSchema);
module.exports.LEAD_STAGES = LEAD_STAGES;
