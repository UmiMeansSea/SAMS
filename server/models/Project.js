const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  lastSaved: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
