const axios = require('axios');
const cheerio = require('cheerio');

class ReviewCollector {
  constructor() {
    this.sources = {
      tmdb: {
        enabled: true,
        rateLimit: 1000, // ms between requests
      },
      reddit: {
        enabled: true,
        rateLimit: 2000,
      },
      letterboxd: {
        enabled: true,
        rateLimit: 3000,
      }
    };
  }

  // 1. TMDb Reviews (Free API)
  async collectTMDbReviews(movieId) {
    try {
      const response = await axios.get(
        `https://api.themoviedb.org/3/movie/${movieId}/reviews`,
        {
          params: {
            api_key: process.env.TMDB_API_KEY,
            language: 'en-US',
            page: 1
          }
        }
      );

      return response.data.results.map(review => ({
        source: 'tmdb',
        author: review.author,
        content: review.content,
        rating: review.author_details.rating || null,
        date: review.created_at,
        url: review.url,
        helpful_votes: null
      }));
    } catch (error) {
      console.error('TMDb reviews error:', error);
      return [];
    }
  }

  // 2. Reddit Reviews (Free API)
  async collectRedditReviews(movieTitle, movieYear) {
    try {
      const searchQuery = `${movieTitle} ${movieYear} review`;
      const subreddits = ['movies', 'MovieReviews', 'flicks', 'TrueFilm'];
      
      let allReviews = [];
      
      for (const subreddit of subreddits) {
        await this.sleep(this.sources.reddit.rateLimit);
        
        const response = await axios.get(
          `https://www.reddit.com/r/${subreddit}/search.json`,
          {
            params: {
              q: searchQuery,
              restrict_sr: 1,
              sort: 'relevance',
              limit: 25
            },
            headers: {
              'User-Agent': 'MovieExplorer/1.0'
            }
          }
        );

        const posts = response.data.data.children;
        
        for (const post of posts) {
          const postData = post.data;
          
          // Filter for actual reviews (longer posts with relevant content)
          if (postData.selftext && 
              postData.selftext.length > 200 && 
              this.isReviewContent(postData.selftext, movieTitle)) {
            
            allReviews.push({
              source: 'reddit',
              author: postData.author,
              content: postData.selftext,
              rating: this.extractRatingFromText(postData.selftext),
              date: new Date(postData.created_utc * 1000).toISOString(),
              url: `https://reddit.com${postData.permalink}`,
              helpful_votes: postData.score
            });
          }
        }
      }
      
      return allReviews;
    } catch (error) {
      console.error('Reddit reviews error:', error);
      return [];
    }
  }

  // 3. Letterboxd Reviews (Web Scraping - be respectful!)
  async collectLetterboxdReviews(movieTitle, movieYear) {
    try {
      // Note: Always check robots.txt and terms of service
      const searchUrl = `https://letterboxd.com/search/${encodeURIComponent(movieTitle)}/`;
      
      await this.sleep(this.sources.letterboxd.rateLimit);
      
      const searchResponse = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MovieExplorer/1.0)'
        }
      });

      const $ = cheerio.load(searchResponse.data);
      const movieLink = $('.film-title-wrapper a').first().attr('href');
      
      if (!movieLink) return [];

      // Get reviews from movie page
      const movieUrl = `https://letterboxd.com${movieLink}reviews/`;
      await this.sleep(this.sources.letterboxd.rateLimit);
      
      const movieResponse = await axios.get(movieUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MovieExplorer/1.0)'
        }
      });

      const movie$ = cheerio.load(movieResponse.data);
      const reviews = [];

      movie$('.film-detail-content .review').each((i, element) => {
        const reviewText = movie$(element).find('.review-text').text().trim();
        const author = movie$(element).find('.review-author').text().trim();
        const rating = movie$(element).find('.rating').length;

        if (reviewText && reviewText.length > 100) {
          reviews.push({
            source: 'letterboxd',
            author: author || 'Anonymous',
            content: reviewText,
            rating: rating || null,
            date: new Date().toISOString(),
            url: movieUrl,
            helpful_votes: null
          });
        }
      });

      return reviews.slice(0, 20); // Limit to be respectful
    } catch (error) {
      console.error('Letterboxd reviews error:', error);
      return [];
    }
  }

  // 4. Your App's Internal Reviews
  async collectInternalReviews(movieId) {
    try {
      // From your discussions collection
      const discussions = await require('../models/Discussion').find({
        movieId: Number(movieId),
        category: 'review'
      }).populate('author', 'username name');

      return discussions.map(discussion => ({
        source: 'internal',
        author: discussion.author.name || discussion.author.username,
        content: discussion.content,
        rating: null, // You might want to add ratings to discussions
        date: discussion.createdAt,
        url: `/discussion/${discussion._id}`,
        helpful_votes: discussion.likes.length
      }));
    } catch (error) {
      console.error('Internal reviews error:', error);
      return [];
    }
  }

  // Utility Methods
  isReviewContent(text, movieTitle) {
    const reviewKeywords = [
      'review', 'rating', 'stars', 'recommend', 'opinion', 
      'thought', 'watched', 'movie', 'film', 'cinema'
    ];
    
    const lowerText = text.toLowerCase();
    const lowerTitle = movieTitle.toLowerCase();
    
    return reviewKeywords.some(keyword => lowerText.includes(keyword)) &&
           lowerText.includes(lowerTitle.split(' ')[0]); // At least movie name
  }

  extractRatingFromText(text) {
    // Look for patterns like "8/10", "4 stars", "9 out of 10"
    const patterns = [
      /(\d+(?:\.\d+)?)\s*\/\s*10/i,
      /(\d+(?:\.\d+)?)\s*\/\s*5/i,
      /(\d+(?:\.\d+)?)\s*stars?/i,
      /(\d+(?:\.\d+)?)\s*out\s*of\s*10/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let rating = parseFloat(match[1]);
        // Normalize to 0-10 scale
        if (text.includes('/5') || text.includes('stars')) {
          rating = (rating / 5) * 10;
        }
        return Math.min(10, Math.max(0, rating));
      }
    }
    
    return null;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Main collection method
  async collectAllReviews(movieId, movieTitle, movieYear) {
    console.log(`Collecting reviews for: ${movieTitle} (${movieYear})`);
    
    const [tmdbReviews, redditReviews, letterboxdReviews, internalReviews] = 
      await Promise.allSettled([
        this.collectTMDbReviews(movieId),
        this.collectRedditReviews(movieTitle, movieYear),
        this.collectLetterboxdReviews(movieTitle, movieYear),
        this.collectInternalReviews(movieId)
      ]);

    const allReviews = [
      ...(tmdbReviews.status === 'fulfilled' ? tmdbReviews.value : []),
      ...(redditReviews.status === 'fulfilled' ? redditReviews.value : []),
      ...(letterboxdReviews.status === 'fulfilled' ? letterboxdReviews.value : []),
      ...(internalReviews.status === 'fulfilled' ? internalReviews.value : [])
    ];

    console.log(`Collected ${allReviews.length} reviews from all sources`);
    return allReviews;
  }
}

module.exports = ReviewCollector;