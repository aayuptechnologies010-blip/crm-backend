const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, unique: true },
  code:        { type: String, required: true, trim: true, uppercase: true, unique: true },
  city:        { type: String, trim: true, default: '' },
  state:       { type: String, trim: true, default: '' },
  address:     { type: String, trim: true, default: '' },
  phone:       { type: String, trim: true, default: '' },
  email:       { type: String, trim: true, lowercase: true, default: '' },
  manager:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:      { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Branch', branchSchema);
