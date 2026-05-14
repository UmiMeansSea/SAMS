const mongoose = require('mongoose');

const PersonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  email: { type: String },
  bio: { type: String, default: '' },
  projectsWorkingOn: [{ type: String }],
  project: { type: String, default: '' },
  pfpUrl: { type: String, default: '' },
  category: { 
    type: String, 
    default: 'Other' 
  },
  // Multi-project support
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  projectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  isOnCanvas: { type: Boolean, default: false },
  // For the DAG/spanning tree, a person can report to multiple managers
  managers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Person' }],
  // Visual positions on the canvas (optional, could be calculated)
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Person', PersonSchema);
