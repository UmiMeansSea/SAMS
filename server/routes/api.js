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

const upload = multer({ storage: storage });

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
router.post('/people/batch', async (req, res) => {
  try {
    const newPeople = await Person.insertMany(req.body);
    res.status(201).json(newPeople);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a person (e.g. changing managers or position)
router.patch('/people/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // If projectId is provided, add it to projectIds as well
    if (updateData.projectId) {
      await Person.findByIdAndUpdate(req.params.id, { 
        $addToSet: { projectIds: updateData.projectId } 
      });
    }

    // Support removing from projects
    if (updateData.removeProjectId) {
      await Person.findByIdAndUpdate(req.params.id, { 
        $pull: { projectIds: updateData.removeProjectId } 
      });
      delete updateData.removeProjectId;
    }

    const person = await Person.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!person) return res.status(404).json({ message: 'Person not found' });
    res.json(person);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Full profile update (PUT)
router.put('/people/:id', async (req, res) => {
  try {
    const person = await Person.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
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
router.patch('/projects/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
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

// Delete a project and its people
router.delete('/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findByIdAndDelete(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Delete all people associated with this project
    const deleteResult = await Person.deleteMany({ projectId: projectId });
    
    res.json({ message: 'Project and associated people deleted', deletedPeopleCount: deleteResult.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cleanup API - Clear all projects except the default one
router.post('/cleanup-projects', async (req, res) => {
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
