const mongoose = require('mongoose');
const Person = require('./models/Person');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/orgmap';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB...');
    const result = await Person.updateMany({}, { project: 'OrgMap' });
    console.log(`Successfully updated ${result.modifiedCount} people to project 'OrgMap'.`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Update failed:', err);
    process.exit(1);
  });
