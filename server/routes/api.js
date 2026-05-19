const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Person = require('../models/Person');
const Project = require('../models/Project');

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'orgmap-pfps',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit to prevent large file uploads (DoS risk)
});

// Basic auth middleware (Placeholders for real implementation)
const requireAuth = (req, res, next) => {
  // In a real app, verify JWT here.
  next();
};

const requireAdmin = (req, res, next) => {
  // Prevent unauthorized destructive actions
  if (process.env.NODE_ENV === 'production' && req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  next();
};

// Upload PFP to Cloudinary
router.post('/upload', upload.single('pfp'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  // Cloudinary returns the secure_url in req.file.path
  res.json({ url: req.file.path });
});

// Get all people
router.get('/people', async (req, res) => {
  try {
    const people = await Person.find().populate('projectIds', 'name');
    res.json(people);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a person
router.post('/people', async (req, res) => {
  const personData = { ...req.body };
  if (personData.projectId && !personData.projectIds) {
    personData.projectIds = [personData.projectId];
  }
  const person = new Person(personData);
  try {
    const newPerson = await person.save();
    res.status(201).json(newPerson);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Batch create people
router.post('/people/batch', requireAdmin, async (req, res) => {
  try {
    const newPeople = await Person.insertMany(req.body);
    res.status(201).json(newPeople);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Batch upsert people (Excel Import)
router.post('/people/batch-upsert', requireAuth, async (req, res) => {
  try {
    const peopleData = req.body;
    if (!Array.isArray(peopleData)) {
      return res.status(400).json({ message: 'Payload must be an array' });
    }

    // Prepare default project fallback
    let defaultProject = await Project.findOne({ name: 'Default Project' });
    if (!defaultProject) {
      defaultProject = new Project({ name: 'Default Project' });
      await defaultProject.save();
    }

    const operations = [];

    // Pre-fetch all projects to minimize DB calls
    const existingProjects = await Project.find();
    const projectMap = new Map();
    existingProjects.forEach(p => projectMap.set(p.name.toLowerCase(), p));

    for (const data of peopleData) {
      // Find or assign project
      let assignedProjectId = defaultProject._id;
      let projectName = data.project ? data.project.trim() : '';

      if (projectName) {
        const lowerName = projectName.toLowerCase();
        if (projectMap.has(lowerName)) {
          assignedProjectId = projectMap.get(lowerName)._id;
        } else {
          // Create new project
          const newProject = new Project({ name: projectName });
          await newProject.save();
          projectMap.set(lowerName, newProject);
          assignedProjectId = newProject._id;
        }
      }

      // Build update document
      const updateData = {
        name: data.name,
        role: data.role || 'Member',
        email: data.email,
        bio: data.bio || '',
        category: data.category || 'Other',
        projectId: assignedProjectId,
      };

      // Upsert using email as unique identifier
      // If email isn't provided, we can't reliably upsert, so we might insert or use name as fallback
      const query = data.email ? { email: data.email } : { name: data.name };

      operations.push({
        updateOne: {
          filter: query,
          update: { 
            $set: updateData,
            $addToSet: { projectIds: assignedProjectId }
          },
          upsert: true
        }
      });
    }

    if (operations.length > 0) {
      const result = await Person.bulkWrite(operations);
      res.status(200).json({ message: 'Batch upsert successful', result });
    } else {
      res.status(200).json({ message: 'No data to process' });
    }
  } catch (err) {
    console.error('Batch upsert error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Update a person (e.g. changing managers or position)
router.patch('/people/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`PATCH /people/${id} - Payload:`, JSON.stringify(req.body, null, 2));

    const allowedFields = [
      'name', 'role', 'title', 'department', 'email', 'phone', 'bio', 
      'position', 'pfp', 'pfpUrl', 'tags', 'category', 'managers', 
      'project', 'projectsWorkingOn', 'projectId', 'projectIds', 'isOnCanvas'
    ];

    const updateData = {};
    
    // Use $set for standard field updates to avoid conflicts with other operators
    const setFields = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) setFields[key] = req.body[key];
    }
    
    if (Object.keys(setFields).length > 0) {
      updateData.$set = setFields;
    }
    
    // Handle MongoDB operators for managers (used for connections)
    if (req.body.$addToSet) {
      updateData.$addToSet = req.body.$addToSet;
    }
    if (req.body.$pull) {
      updateData.$pull = req.body.$pull;
    }
    
    const { projectId, removeProjectId } = req.body;
    
    // Handle Project associations
    if (projectId) {
      await Person.findByIdAndUpdate(id, { 
        $addToSet: { projectIds: projectId },
        $set: { projectId: projectId } // Also set primary projectId
      });
    }

    if (removeProjectId) {
      await Person.findByIdAndUpdate(id, { 
        $pull: { projectIds: removeProjectId } 
      });
    }

    console.log(`Applying update to ${id}:`, JSON.stringify(updateData, null, 2));
    const person = await Person.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!person) {
      console.error(`Person ${id} not found`);
      return res.status(404).json({ message: 'Person not found' });
    }

    res.json(person);
  } catch (err) {
    console.error(`Error patching person ${req.params.id}:`, err);
    res.status(400).json({ message: err.message });
  }
});



// Full profile update (PUT)
router.put('/people/:id', requireAuth, async (req, res) => {
  try {
    // Prevent NoSQL Injection: Pick only allowed fields
    const allowedFields = ['name', 'title', 'department', 'email', 'phone', 'bio', 'position', 'pfp', 'tags', 'projectIds'];
    const updateData = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    const person = await Person.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );
    if (!person) return res.status(404).json({ message: 'Person not found' });
    res.json(person);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


// Delete a person
router.delete('/people/:id', async (req, res) => {
  try {
    const person = await Person.findByIdAndDelete(req.params.id);
    if (!person) return res.status(404).json({ message: 'Person not found' });
    res.json({ message: 'Person deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PROJECTS API
// Get all projects
router.get('/projects', async (req, res) => {
  try {
    const projects = await Project.find().sort({ lastSaved: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a project
router.post('/projects', async (req, res) => {
  const project = new Project(req.body);
  try {
    const newProject = await project.save();
    res.status(201).json(newProject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update project details
router.patch('/projects/:id', requireAuth, async (req, res) => {
  try {
    // Prevent NoSQL Injection
    const allowedFields = ['name', 'description'];
    const updateData = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Save/Update project (manually trigger lastSaved update)
router.put('/projects/:id/save', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id, 
      { lastSaved: new Date() }, 
      { new: true }
    );
    res.json(project);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get people for a specific project
router.get('/projects/:id/people', async (req, res) => {
  try {
    const people = await Person.find({ 
      $or: [
        { projectId: req.params.id },
        { projectIds: req.params.id }
      ]
    }).populate('projectIds', 'name');
    res.json(people);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a project and update its people
router.delete('/projects/:id', requireAuth, async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findByIdAndDelete(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Safely remove the project ID from people's projectIds array instead of deleting the people
    const updateResult = await Person.updateMany(
      { projectIds: projectId },
      { $pull: { projectIds: projectId } }
    );
    
    res.json({ message: 'Project deleted and people references updated', modifiedCount: updateResult.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cleanup API - Clear all projects except the default one
router.post('/cleanup-projects', requireAdmin, async (req, res) => {
  try {
    let defaultProject = await Project.findOne({ name: 'Default Project' });
    if (!defaultProject) {
      defaultProject = await Project.findOne().sort({ createdAt: 1 });
    }
    if (!defaultProject) {
      defaultProject = new Project({ name: 'Default Project' });
      await defaultProject.save();
    }

    // Delete all other projects
    await Project.deleteMany({ _id: { $ne: defaultProject._id } });

    // Delete people not in the default project
    await Person.deleteMany({ 
      projectId: { $exists: true, $ne: defaultProject._id, $ne: null } 
    });

    // Assign legacy people to default project
    await Person.updateMany(
      { projectId: { $exists: false } },
      { $set: { projectId: defaultProject._id } }
    );

    res.json({ message: 'Cleanup successful', keptProject: defaultProject });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
