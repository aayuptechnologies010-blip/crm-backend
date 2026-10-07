const router = require('express').Router();
const RolePermission = require('../models/RolePermission');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
const { checkPermission, recordAuditLog, DEFAULT_ROLE_PERMISSIONS } = require('../middleware/rbac');

// GET /api/roles — Get all roles and their permissions matrix
router.get('/', protect, checkPermission('roles', 'view'), async (req, res) => {
  try {
    let roles = await RolePermission.find().sort({ createdAt: 1 });

    // Seed defaults if empty
    if (roles.length === 0) {
      const entries = Object.keys(DEFAULT_ROLE_PERMISSIONS).map(roleName => ({
        role: roleName,
        ...DEFAULT_ROLE_PERMISSIONS[roleName]
      }));
      roles = await RolePermission.insertMany(entries);
    }

    res.json({ success: true, roles });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/roles/:roleName — Update role permissions matrix
router.put('/:roleName', protect, checkPermission('roles', 'edit'), async (req, res) => {
  try {
    const { roleName } = req.params;
    const { modules, displayName, description } = req.body;

    let roleDoc = await RolePermission.findOne({ role: roleName });
    const oldValues = roleDoc ? roleDoc.toJSON() : null;

    if (!roleDoc) {
      roleDoc = new RolePermission({
        role: roleName,
        displayName: displayName || roleName,
        description: description || '',
        modules: modules || []
      });
    } else {
      if (modules) roleDoc.modules = modules;
      if (displayName) roleDoc.displayName = displayName;
      if (description !== undefined) roleDoc.description = description;
      roleDoc.updatedBy = req.user._id || req.user.id;
    }

    await roleDoc.save();

    // Log permission modification in immutable audit trail (PDF Section 9 & 13)
    await recordAuditLog({
      entity: 'permission',
      entityId: roleName,
      action: 'PERMISSION_CHANGE',
      req,
      details: `Updated permissions matrix for role: ${roleName}`,
      oldValues,
      newValues: roleDoc.toJSON()
    });

    res.json({ success: true, role: roleDoc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/roles/audit-logs — Get audit trail
router.get('/audit-logs/list', protect, checkPermission('auditLogs', 'view'), async (req, res) => {
  try {
    const { entity, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (entity) filter.entity = entity;
    if (req.user.role === 'Branch Admin' && req.user.branch) {
      filter.branch = req.user.branch;
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      AuditLog.countDocuments(filter)
    ]);

    res.json({ success: true, logs, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
