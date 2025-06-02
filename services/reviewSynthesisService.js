const ReviewSynthesis = require('../models/ReviewSynthesis');
const ReviewCollector = require('../utils/reviewCollector');
const AIReviewAnalyzer = require('../utils/aiReviewAnalyzer');
const { fetchMovieDetails } = require('../utils/tmdbApi');

class ReviewSynthesisService {
  constructor() {
    this.collector = new ReviewCollector();
    this.analyzer = new AIReviewAnalyzer();
    this.isProcessing = new Set(); // Prevent duplicate processing
  }

  // Main method to generate synthesis for a movie
  async generateSynthesis(movieId, forceUpdate = false) {
    try {
      // Check if already processing
      if (this.isProcessing.has(movieId)) {
        console.log(`Movie ${movieId} already being processed`);
        return null;
      }

      // Check existing synthesis
      let synthesis = await ReviewSynthesis.findOne({ movieId });
      
      if (synthesis && !forceUpdate && !synthesis.needsRefresh()) {
        console.log(`Using cached synthesis for movie ${movieId}`);
        return synthesis;
      }

      this.isProcessing.add(movieId);

      // Get movie details from TMDb
      const movieDetails = await fetchMovieDetails(movieId);
      if (!movieDetails) {
        throw new Error('Movie not found');
      }

      // Update or create synthesis record
      if (!synthesis) {
        synthesis = new ReviewSynthesis({
          movieId,
          movieTitle: movieDetails.title,
          movieYear: movieDetails.release_date ? 
            new Date(movieDetails.release_date).getFullYear() : null
        });
      }

      synthesis.status = 'processing';
      synthesis.processingLog.push({
        step: 'started',
        status: 'info',
        message: 'Started review synthesis process'
      });
      
      await synthesis.save();

      console.log(`Starting synthesis for: ${movieDetails.title}`);

      // Step 1: Collect reviews
      synthesis.processingLog.push({
        step: 'collection',
        status: 'info',
        message: 'Collecting reviews from sources'
      });
      await synthesis.save();

      const reviews = await this.collector.collectAllReviews(
        movieId, 
        movieDetails.title, 
        synthesis.movieYear
      );

      if (reviews.length === 0) {
        synthesis.status = 'completed';
        synthesis.summary = "No reviews found for this movie yet.";
        synthesis.reviewCount = 0;
        synthesis.processingLog.push({
          step: 'collection',
          status: 'warning',
          message: 'No reviews found from any source'
        });
        await synthesis.save();
        this.isProcessing.delete(movieId);
        return synthesis;
      }

      // Step 2: AI Analysis
      synthesis.processingLog.push({
        step: 'analysis',
        status: 'info',
        message: `Analyzing ${reviews.length} reviews`
      });
      await synthesis.save();

      const analysis = await this.analyzer.analyzeReviews(reviews);

      // Step 3: Update synthesis with results
      Object.assign(synthesis, {
        summary: analysis.summary,
        sentiment: analysis.sentiment,
        aspects: analysis.aspects,
        themes: analysis.themes,
        ratings: analysis.ratings,
        reviewCount: analysis.reviewCount,
        sources: analysis.sources,
        featuredReviews: this.selectFeaturedReviews(analysis.rawReviews),
        status: 'completed',
        lastUpdated: new Date(),
        needsUpdate: false,
        popularityScore: this.calculatePopularityScore(movieDetails, reviews.length)
      });

      synthesis.processingLog.push({
        step: 'completed',
        status: 'success',
        message: `Successfully processed ${reviews.length} reviews`
      });

      await synthesis.save();
      this.isProcessing.delete(movieId);

      console.log(`Completed synthesis for: ${movieDetails.title}`);
      return synthesis;

    } catch (error) {
      console.error(`Error generating synthesis for movie ${movieId}:`, error);
      
      // Update with error status
      if (this.isProcessing.has(movieId)) {
        try {
          const synthesis = await ReviewSynthesis.findOne({ movieId });
          if (synthesis) {
            synthesis.status = 'failed';
            synthesis.processingLog.push({
              step: 'error',
              status: 'error',
              message: error.message
            });
            await synthesis.save();
          }
        } catch (saveError) {
          console.error('Error saving failed status:', saveError);
        }
        
        this.isProcessing.delete(movieId);
      }
      
      throw error;
    }
  }

  // Select best reviews to feature
  selectFeaturedReviews(reviews, count = 3) {
    if (!reviews || reviews.length === 0) return [];

    return reviews
      .filter(review => review.content.length > 100)
      .sort((a, b) => {
        // Sort by helpfulness and content quality
        const scoreA = (a.helpful_votes || 0) + (a.content.length / 100);
        const scoreB = (b.helpful_votes || 0) + (b.content.length / 100);
        return scoreB - scoreA;
      })
      .slice(0, count)
      .map(review => ({
        source: review.source,
        author: review.author,
        content: review.content.substring(0, 300) + '...',
        sentiment: review.sentiment?.classification || 'neutral',
        rating: review.rating,
        helpful_votes: review.helpful_votes
      }));
  }

  // Calculate popularity score for prioritization
  calculatePopularityScore(movieDetails, reviewCount) {
    const voteAverage = movieDetails.vote_average || 0;
    const voteCount = movieDetails.vote_count || 0;
    const popularity = movieDetails.popularity || 0;
    
    // Weighted score combining different factors
    return Math.round(
      (voteAverage * 0.3) + 
      (Math.log10(voteCount + 1) * 0.3) + 
      (Math.log10(popularity + 1) * 0.2) + 
      (Math.log10(reviewCount + 1) * 0.2)
    );
  }

  // Get synthesis (from cache or generate)
  async getSynthesis(movieId) {
    try {
      let synthesis = await ReviewSynthesis.findOne({ movieId });
      
      if (!synthesis || synthesis.needsRefresh()) {
        // Generate in background if possible, return existing if available
        if (synthesis && synthesis.status === 'completed') {
          // Mark for background update
          synthesis.needsUpdate = true;
          await synthesis.save();
          
          // Start background process (don't await)
          this.generateSynthesis(movieId, true).catch(console.error);
          
          return synthesis;
        } else {
          // Generate immediately
          synthesis = await this.generateSynthesis(movieId);
        }
      }
      
      return synthesis;
    } catch (error) {
      console.error(`Error getting synthesis for movie ${movieId}:`, error);
      return null;
    }
  }

  // Background job to update popular movies
  async updatePopularMovies(limit = 5) {
    try {
      const moviesToUpdate = await ReviewSynthesis.findMoviesNeedingUpdate(limit);
      
      console.log(`Found ${moviesToUpdate.length} movies needing update`);
      
      for (const movie of moviesToUpdate) {
        try {
          await this.generateSynthesis(movie.movieId, true);
          // Small delay between processing
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Failed to update movie ${movie.movieId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in background update job:', error);
    }
  }

  // Mark movie for update (when new reviews are added)
  async markForUpdate(movieId) {
    try {
      await ReviewSynthesis.updateOne(
        { movieId },
        { $set: { needsUpdate: true } }
      );
    } catch (error) {
      console.error(`Error marking movie ${movieId} for update:`, error);
    }
  }
}

module.exports = ReviewSynthesisService;