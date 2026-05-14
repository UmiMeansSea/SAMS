const mongoose = require('mongoose');
require('dotenv').config();
const Person = require('./models/Person');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orgmap')
  .then(async () => {
    console.log('MongoDB connected. Seeding...');
    await Person.deleteMany({}); // clear existing
    
    const p1 = new Person({ name: 'Alice CEO', role: 'Chief Executive Officer', project: 'Global Strategy', position: { x: 400, y: 50 }, category: 'Manager' });
    const p2 = new Person({ name: 'Bob Tech', role: 'CTO', project: 'Engineering', position: { x: 200, y: 250 }, category: 'Manager' });
    const p3 = new Person({ name: 'Charlie Ops', role: 'COO', project: 'Operations', position: { x: 600, y: 250 }, category: 'Manager' });
    const p4 = new Person({ name: 'Dave Dev', role: 'Senior Developer', project: 'Frontend App', position: { x: 100, y: 450 }, category: 'Senior Developer' });

    await p1.save();
    
    p2.managers.push(p1._id);
    await p2.save();
    
    p3.managers.push(p1._id);
    await p3.save();
    
    p4.managers.push(p2._id);
    await p4.save();

    console.log('Database seeded successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
