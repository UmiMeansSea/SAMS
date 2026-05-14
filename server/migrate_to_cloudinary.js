const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const Person = require('./models/Person');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orgmap');
    console.log('Connected to MongoDB');

    const people = await Person.find({ pfpUrl: { $regex: /localhost:5005\/uploads\// } });
    console.log(`Found ${people.length} people with local profile pictures.`);

    for (const person of people) {
      const filename = person.pfpUrl.split('/').pop();
      const localPath = path.join(__dirname, 'uploads', filename);

      if (fs.existsSync(localPath)) {
        console.log(`Uploading ${filename} for ${person.name}...`);
        const result = await cloudinary.uploader.upload(localPath, {
          folder: 'orgmap-pfps',
        });
        
        person.pfpUrl = result.secure_url;
        await person.save();
        console.log(`Updated ${person.name} with Cloudinary URL: ${result.secure_url}`);
      } else {
        console.warn(`Local file not found: ${localPath} for ${person.name}`);
      }
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
