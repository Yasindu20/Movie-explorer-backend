// migrations/createReviewSynthesisIndexes.js
const mongoose = require('mongoose');
require('dotenv').config();

async function createIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Get the ReviewSynthesis collection
    const db = mongoose.connection.db;
    const collection = db.collection('reviewsyntheses');

    console.log('🔧 Creating indexes...');

    // Create indexes
    const indexes = [
      { movieId: 1 },
      { status: 1 },
      { needsUpdate: 1 },
      { popularityScore: -1 },
      // Compound indexes for better query performance
      { status: 1, needsUpdate: 1 },
      { popularityScore: -1, lastUpdated: 1 }
    ];

    for (const index of indexes) {
      try {
        const result = await collection.createIndex(index);
        console.log(`✅ Created index: ${result} for`, index);
      } catch (error) {
        if (error.code === 85) {
          console.log(`⚠️  Index already exists for`, index);
        } else {
          console.error(`❌ Failed to create index for`, index, error.message);
        }
      }
    }

    // List all indexes to verify
    console.log('\n📋 Current indexes:');
    const allIndexes = await collection.indexes();
    allIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, index.key);
    });

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the migration
createIndexes();