const RolePermission = require('../models/RolePermission');
const AuditLog = require('../models/AuditLog');

/**
 * System default roles and their permission matrix as per PDF
 */
const DEFAULT_ROLE_PERMISSIONS = {
  'Super Admin': {
    displayName: 'Super Administrator',
    description: 'Full system control across all branches and users',
    isSystemRole: true,
    modules: [
      { module: 'dashboard', view: true, create: true, edit: true, delete: true, assign: true, export: true, approve: true, scope: 'all' },
      { module: 'leads', view: true, create: true, edit: true, delete: true, assign: true, export: true, approve: true, scope: 'all' },
      { module: 'activities', view: true, create: true, edit: true, delete: false, assign: true, export: true, approve: true, scope: 'all' },
      { module: 'followups', view: true, create: true, edit: true, delete: true, assign: true, export: true, approve: true, scope: 'all' },
      { module: 'quotations', view: true, create: true, edit: true, delete: true, assign: true, export: true, approve: true, scope: 'all' },
      { module: 'documents', view: true, create: true, edit: true, delete: true, assign: true, export: true, approve: true, scope: 'all' },
      { module: 'payments', view: true, create: true, edit: true, delete: true, assign: true, export: true, approve: true, scope: 'all' },
      { module: 'users', view: true, create: true, edit: true, delete: true, assign: true, export: true, approve: true, scope: 'all' },
      { module: 'roles', view: true, create: true, edit: true, delete: true, assign: true, export: true, approve: true, scope: 'all' },
      { module: 'branches', view: true, create: true, edit: true, delete: true, assign: true, export: true, approve: true, scope: 'all' },
      { module: 'auditLogs', view: true, create: false, edit: false, delete: false, assign: false, export: true, approve: false, scope: 'all' },
      { module: 'reports', view: true, create: false, edit: false, delete: false, assign: false, export: true, approve: false, scope: 'all' },
    ]
  },
  'Admin': {
    displayName: 'Organization Admin',
    description: 'Organization-level CRM management with configurable access',
    isSystemRole: true,
    modules: [
      { module: 'dashboard', view: true, create: true, edit: true, delete: false, assign: true, export: true, approve: true, scope: 'all' },
      { module: 'leads', view: true, create: true, edit: true, delete: false, assign: true, export: true, approve: true, scope: 'all' },
      { module: 'activities', view: true, create: true, edit: true, delete: false, assign: true, export: true, approve: true, scope: 'all' },
      { module: 'followups', view: true, create: true, edit: true, delete: true, assign: true, export: true, approve: true, scope: 'all' },
      { module: 'quotations', view: true, create: true, edit: true, delete: false, assign: true, export: true, approve: true, scope: 'all' },
      { module: 'documents', view: true, create: true, edit: true, delete: false, assign: true, export: true, approve: true, scope: 'all' },
      { module: 'payments', view: true, create: true, edit: true, delete: false, assign: true, export: true, approve: true, scope: 'all' },
      { module: 'users', view: true, create: true, edit: true, delete: false, assign: true, export: true, approve: false, scope: 'all' },
      { module: 'roles', view: true, create: false, edit: false, delete: false, assign: false, export: false, approve: false, scope: 'all' },
      { module: 'branches', view: true, create: true, edit: true, delete: false, assign: false, export: true, approve: false, scope: 'all' },
      { module: 'auditLogs', view: true, create: false, edit: false, delete: false, assign: false, export: false, approve: false, scope: 'all' },
      { module: 'reports', view: true, create: false, edit: false, delete: false, assign: false, export: true, approve: false, scope: 'all' },
    ]
  },
  'Branch Admin': {
    displayName: 'Branch Administrator',
    description: 'Manages leads, users, assignments, and workflow for assigned branch',
    isSystemRole: true,
    modules: [
      { module: 'dashboard', view: true, create: false, edit: false, delete: false, assign: false, export: false, approve: false, scope: 'branch' },
      { module: 'leads', view: true, create: true, edit: true, delete: false, assign: true, export: false, approve: true, scope: 'branch' },
      { module: 'activities', view: true, create: true, edit: true, delete: false, assign: true, export: false, approve: false, scope: 'branch' },
      { module: 'followups', view: true, create: true, edit: true, delete: true, assign: true, export: false, approve: false, scope: 'branch' },
      { module: 'quotations', view: true, create: true, edit: true, delete: false, assign: true, export: false, approve: true, scope: 'branch' },
      { module: 'documents', view: true, create: true, edit: true, delete: false, assign: true, export: false, approve: false, scope: 'branch' },
      { module: 'payments', view: true, create: true, edit: true, delete: false, assign: true, export: false, approve: true, scope: 'branch' },
      { module: 'users', view: true, create: true, edit: true, delete: false, assign: true, export: false, approve: false, scope: 'branch' },
      { module: 'roles', view: false, create: false, edit: false, delete: false, assign: false, export: false, approve: false, scope: 'branch' },
      { module: 'branches', view: true, create: false, edit: false, delete: false, assign: false, export: false, approve: false, scope: 'branch' },
      { module: 'auditLogs', view: false, create: false, edit: false, delete: false, assign: false, export: false, approve: false, scope: 'branch' },
      { module: 'reports', view: true, create: false, edit: false, delete: false, assign: false, export: false, approve: false, scope: 'branch' },
    ]
  },
  'Sales Executive': {
    displayName: 'Sales Executive',
    description: 'Works on assigned leads and updates activities and workflow',
    isSystemRole: true,
    modules: [
      { module: 'dashboard', view: true, create: false, edit: false, delete: false, assign: false, export: false, approve: false, scope: 'assigned' },
      { module: 'leads', view: true, create: true, edit: true, delete: false, assign: false, export: false, approve: false, scope: 'assigned' },
      { module: 'activities', view: true, create: true, edit: false, delete: false, assign: false, export: false, approve: false, scope: 'assigned' },
      { module: 'followups', view: true, create: true, edit: true, delete: false, assign: false, export: false, approve: false, scope: 'assigned' },
      { module: 'quotations', view: true, create: true, edit: true, delete: false, assign: false, export: false, approve: false, scope: 'assigned' },
      { module: 'documents', view: true, create: true, edit: false, delete: false, assign: false, export: false, approve: false, scope: 'assigned' },
      { module: 'payments', view: true, create: true, edit: false, delete: false, assign: false, export: false, approve: false, scope: 'assigned' },
      { module: 'users', view: false, create: false, edit: false, delete: false, assign: false, export: false, approve: false, scope: 'assigned' },
      { module: 'roles', view: false, create: false, edit: false, delete: false, assign: false, export: false, approve: false, scope: 'assigned' },
      { module: 'branches', view: false, create: false, edit: false, delete: false, assign: false, export: false, approve: false, scope: 'assigned' },
      { module: 'auditLogs', view: false, create: false, edit: false, delete: false, assign: false, export: false, approve: false, scope: 'assigned' },
      { module: 'reports', view: true, create: false, edit: false, delete: false, assign: false, export: false, approve: false, scope: 'assigned' },
    ]
  }
};

/**
 * Check permission middleware factory
 * @param {string} moduleName - 'leads', 'quotations', 'payments', etc.
 * @param {string} action - 'view' | 'create' | 'edit' | 'delete' | 'assign' | 'export' | 'approve'
 */
const checkPermission = (moduleName, action = 'view') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const userRole = req.user.role;

      // Super Admin bypasses with full access
      if (userRole === 'Super Admin') {
        req.permissionScope = 'all';
        return next();
      }

      // Check DB for customized role permissions
      let roleConfig = await RolePermission.findOne({ role: userRole });
      
      // Fallback to default matrix if not yet stored in DB
      let moduleConfig = null;
      if (roleConfig && roleConfig.modules) {
        moduleConfig = roleConfig.modules.find(m => m.module === moduleName);
      } else if (DEFAULT_ROLE_PERMISSIONS[userRole]) {
        moduleConfig = DEFAULT_ROLE_PERMISSIONS[userRole].modules.find(m => m.module === moduleName);
      }

      if (!moduleConfig || !moduleConfig[action]) {
        return res.status(403).json({ 
          message: `Forbidden: You do not have '${action}' permission for '${moduleName}'` 
        });
      }

      // Attach resolved data scope to request object ('all' | 'branch' | 'team' | 'assigned')
      req.permissionScope = moduleConfig.scope || 'assigned';
      next();
    } catch (err) {
      console.error('Permission check error:', err);
      res.status(500).json({ message: 'Internal authorization error' });
    }
  };
};

/**
 * Helper to build mongoose filter based on user's permission scope
 * @param {Object} req - Express request
 * @param {Object} baseFilter - initial filter
 * @returns {Object} query filter respecting branch/assigned boundaries
 */
const applyDataScope = (req, baseFilter = {}) => {
  const scope = req.permissionScope || 'assigned';
  const filter = { ...baseFilter };

  if (req.user.role === 'Super Admin' || scope === 'all') {
    return filter; // unrestricted
  }

  if (scope === 'branch') {
    // If user has an assigned branch, constrain by branch
    if (req.user.branch) {
      filter.branch = req.user.branch;
    }
    return filter;
  }

  if (scope === 'team') {
    if (req.user.team && req.user.team !== '-') {
      filter.team = req.user.team;
    }
    return filter;
  }

  // 'assigned' scope (default for Sales Executive)
  filter.$or = [
    { assignedTo: req.user.name },
    { assignedToUser: req.user._id || req.user.id }
  ];

  return filter;
};

/**
 * Helper function to record audit logs
 */
const recordAuditLog = async ({
  entity,
  entityId,
  action,
  req,
  details,
  oldValues,
  newValues
}) => {
  try {
    await AuditLog.create({
      entity,
      entityId: String(entityId),
      action,
      performedBy: req?.user?._id || req?.user?.id,
      performedByName: req?.user?.name || 'System',
      performedByRole: req?.user?.role || '',
      branch: req?.user?.branch || '',
      details: details || `${action} on ${entity}`,
      oldValues,
      newValues,
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || '',
      userAgent: req?.headers?.['user-agent'] || '',
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
};

module.exports = {
  checkPermission,
  applyDataScope,
  recordAuditLog,
  DEFAULT_ROLE_PERMISSIONS,
};
