const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  entity:        { type: String, required: true }, // 'lead', 'user', 'role', 'permission', 'quotation', 'payment', 'branch'
  entityId:      { type: String, required: true },
  action:        { type: String, required: true }, // 'CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'STATUS_CHANGE', 'PERMISSION_CHANGE', 'EXPORT', 'APPROVE'
  performedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedByName: { type: String, default: 'System' },
  performedByRole: { type: String, default: '' },
  branch:        { type: String, default: '' },
  details:       { type: String, default: '' }, // Human-readable summary
  oldValues:     { type: mongoose.Schema.Types.Mixed },
  newValues:     { type: mongoose.Schema.Types.Mixed },
  ipAddress:     { type: String, default: '' },
  userAgent:     { type: String, default: '' },
}, { timestamps: true });

auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ branch: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
