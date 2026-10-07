const router = require('express').Router();
const Branch = require('../models/Branch');
const { protect } = require('../middleware/auth');
const { checkPermission, recordAuditLog } = require('../middleware/rbac');

// GET /api/branches — List branches
router.get('/', protect, checkPermission('branches', 'view'), async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'Branch Admin' && req.user.branch) {
      filter.name = req.user.branch;
    }
    const branches = await Branch.find(filter).populate('manager', 'name email').sort({ name: 1 });
    res.json({ success: true, branches });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/branches — Create branch
router.post('/', protect, checkPermission('branches', 'create'), async (req, res) => {
  try {
    const { name, code, city, state, address, phone, email, manager } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: 'Name and Code are required' });
    }

    const branch = await Branch.create({
      name,
      code,
      city,
      state,
      address,
      phone,
      email,
      manager: manager || null,
      createdBy: req.user._id || req.user.id
    });

    await recordAuditLog({
      entity: 'branch',
      entityId: branch._id,
      action: 'CREATE',
      req,
      details: `Created branch ${branch.name} (${branch.code})`,
      newValues: branch.toJSON()
    });

    res.status(201).json({ success: true, branch });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/branches/:id — Update branch
router.put('/:id', protect, checkPermission('branches', 'edit'), async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    const oldValues = branch.toJSON();
    Object.assign(branch, req.body);
    await branch.save();

    await recordAuditLog({
      entity: 'branch',
      entityId: branch._id,
      action: 'UPDATE',
      req,
      details: `Updated branch ${branch.name}`,
      oldValues,
      newValues: branch.toJSON()
    });

    res.json({ success: true, branch });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/branches/:id — Delete branch
router.delete('/:id', protect, checkPermission('branches', 'delete'), async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    await branch.deleteOne();

    await recordAuditLog({
      entity: 'branch',
      entityId: req.params.id,
      action: 'DELETE',
      req,
      details: `Deleted branch ${branch.name}`,
      oldValues: branch.toJSON()
    });

    res.json({ success: true, message: 'Branch deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
