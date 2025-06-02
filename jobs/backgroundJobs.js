const cron = require('node-cron');
const ReviewSynthesisService = require('../services/reviewSynthesisService');

const reviewService = new ReviewSynthesisService();

// Run every 6 hours to update popular movies
cron.schedule('0 */6 * * *', async () => {
  console.log('Starting background review synthesis update...');
  try {
    await reviewService.updatePopularMovies(10);
    console.log('Background update completed');
  } catch (error) {
    console.error('Background update failed:', error);
  }
});

console.log('Background jobs scheduled');