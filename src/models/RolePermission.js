const mongoose = require('mongoose');

// Permissions defined per module
// Scope: 'all' | 'branch' | 'team' | 'assigned'
const modulePermissionSchema = new mongoose.Schema({
  module:     { type: String, required: true }, // 'leads', 'activities', 'followups', 'quotations', 'documents', 'payments', 'users', 'reports', etc.
  view:       { type: Boolean, default: false },
  create:     { type: Boolean, default: false },
  edit:       { type: Boolean, default: false },
  delete:     { type: Boolean, default: false },
  assign:     { type: Boolean, default: false },
  export:     { type: Boolean, default: false },
  approve:    { type: Boolean, default: false },
  scope:      { type: String, enum: ['all', 'branch', 'team', 'assigned'], default: 'assigned' },
}, { _id: false });

const rolePermissionSchema = new mongoose.Schema({
  role:         { type: String, required: true, unique: true }, // 'Super Admin', 'Admin', 'Branch Admin', 'Sales Executive', or custom
  displayName:  { type: String, required: true },
  description:  { type: String, default: '' },
  isSystemRole: { type: Boolean, default: false }, // System roles cannot be deleted
  modules:      [modulePermissionSchema],
  updatedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('RolePermission', rolePermissionSchema);
