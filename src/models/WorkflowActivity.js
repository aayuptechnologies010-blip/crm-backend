const mongoose = require('mongoose');

// Chronological Activity Timeline Event Schema
const workflowActivitySchema = new mongoose.Schema({
  lead:             { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
  activityType:     { 
    type: String, 
    enum: [
      'Call', 
      'WhatsApp', 
      'Email', 
      'Meeting', 
      'Site Visit', 
      'Requirement', 
      'Quotation', 
      'Payment', 
      'Follow-up', 
      'Status Change', 
      'Note', 
      'Document Upload', 
      'Assignment',
      'Other'
    ], 
    required: true 
  },
  performedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedByName:  { type: String, required: true },
  performedByRole:  { type: String, default: '' },
  
  previousStatus:   { type: String, default: '' },
  newStatus:        { type: String, default: '' },
  
  assignedFrom:     { type: String, default: '' },
  assignedTo:       { type: String, default: '' },

  remark:           { type: String, default: '' },
  nextAction:       { type: String, default: '' },
  nextFollowUpDate: { type: Date },
  
  attachments:      [{
    name: { type: String },
    url:  { type: String },
    size: { type: Number },
    type: { type: String }
  }],

  systemGenerated:  { type: Boolean, default: false }
}, { timestamps: true });

workflowActivitySchema.index({ lead: 1, createdAt: -1 });

module.exports = mongoose.model('WorkflowActivity', workflowActivitySchema);
