const natural = require('natural');
const sentiment = require('sentiment');
const axios = require('axios');

class AIReviewAnalyzer {
  constructor() {
    this.sentimentAnalyzer = new sentiment();
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
    
    // Free Hugging Face API (no auth needed for some models)
    this.huggingFaceApi = 'https://api-inference.huggingface.co/models/';
    
    // Common movie review themes/aspects
    this.aspects = {
      plot: ['story', 'plot', 'narrative', 'script', 'storyline', 'writing'],
      acting: ['acting', 'performance', 'actor', 'actress', 'cast', 'character'],
      direction: ['direction', 'director', 'directing', 'filmmaker'],
      visuals: ['visual', 'cinematography', 'effects', 'cgi', 'graphics', 'imagery'],
      audio: ['music', 'soundtrack', 'audio', 'sound', 'score'],
      pacing: ['pace', 'pacing', 'length', 'duration', 'boring', 'slow', 'fast'],
      overall: ['overall', 'general', 'movie', 'film', 'recommend', 'worth']
    };
  }

  // 1. Sentiment Analysis
  analyzeSentiment(reviews) {
    return reviews.map(review => {
      const analysis = this.sentimentAnalyzer.analyze(review.content);
      
      return {
        ...review,
        sentiment: {
          score: analysis.score,
          comparative: analysis.comparative,
          positive: analysis.positive,
          negative: analysis.negative,
          classification: this.classifySentiment(analysis.comparative)
        }
      };
    });
  }

  classifySentiment(comparative) {
    if (comparative >= 0.5) return 'very_positive';
    if (comparative >= 0.1) return 'positive';
    if (comparative >= -0.1) return 'neutral';
    if (comparative >= -0.5) return 'negative';
    return 'very_negative';
  }

  // 2. Aspect-Based Analysis
  analyzeAspects(reviews) {
    const aspectScores = {};
    
    // Initialize aspect scores
    Object.keys(this.aspects).forEach(aspect => {
      aspectScores[aspect] = {
        mentions: 0,
        totalSentiment: 0,
        averageSentiment: 0,
        positiveCount: 0,
        negativeCount: 0,
        keywords: []
      };
    });

    reviews.forEach(review => {
      const tokens = this.tokenizer.tokenize(review.content.toLowerCase());
      const sentences = review.content.split(/[.!?]+/);

      // Analyze each sentence for aspects
      sentences.forEach(sentence => {
        const sentenceSentiment = this.sentimentAnalyzer.analyze(sentence);
        
        Object.keys(this.aspects).forEach(aspect => {
          const keywords = this.aspects[aspect];
          const hasAspect = keywords.some(keyword => 
            sentence.toLowerCase().includes(keyword)
          );

          if (hasAspect) {
            aspectScores[aspect].mentions++;
            aspectScores[aspect].totalSentiment += sentenceSentiment.comparative;
            
            if (sentenceSentiment.comparative > 0) {
              aspectScores[aspect].positiveCount++;
            } else if (sentenceSentiment.comparative < 0) {
              aspectScores[aspect].negativeCount++;
            }

            // Store relevant keywords
            keywords.forEach(keyword => {
              if (sentence.toLowerCase().includes(keyword) && 
                  !aspectScores[aspect].keywords.includes(keyword)) {
                aspectScores[aspect].keywords.push(keyword);
              }
            });
          }
        });
      });
    });

    // Calculate averages
    Object.keys(aspectScores).forEach(aspect => {
      if (aspectScores[aspect].mentions > 0) {
        aspectScores[aspect].averageSentiment = 
          aspectScores[aspect].totalSentiment / aspectScores[aspect].mentions;
      }
    });

    return aspectScores;
  }

  // 3. Key Themes Extraction
  extractKeyThemes(reviews) {
    const allText = reviews.map(r => r.content).join(' ');
    const tokens = this.tokenizer.tokenize(allText.toLowerCase());
    
    // Remove common words and short words
    const stopWords = natural.stopwords;
    const meaningfulTokens = tokens.filter(token => 
      token.length > 3 && 
      !stopWords.includes(token) &&
      isNaN(token)
    );

    // Count frequency
    const frequency = {};
    meaningfulTokens.forEach(token => {
      const stemmed = this.stemmer.stem(token);
      frequency[stemmed] = (frequency[stemmed] || 0) + 1;
    });

    // Get top themes
    const themes = Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([theme, count]) => ({ theme, count }));

    return themes;
  }

  // 4. Free Text Summarization using Hugging Face
  async summarizeReviews(reviews, maxLength = 500) {
    try {
      // Combine reviews intelligently
      const combinedText = this.combineReviewsForSummary(reviews);
      
      if (combinedText.length < 100) {
        return "Not enough review content for meaningful summary.";
      }

      // Use free Hugging Face summarization
      const response = await axios.post(
        this.huggingFaceApi + 'facebook/bart-large-cnn',
        {
          inputs: combinedText.substring(0, 1024), // API limit
          parameters: {
            max_length: maxLength,
            min_length: 50,
            do_sample: false
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return response.data[0]?.summary_text || this.fallbackSummary(reviews);
    } catch (error) {
      console.error('Summarization error:', error);
      return this.fallbackSummary(reviews);
    }
  }

  combineReviewsForSummary(reviews) {
    // Prioritize longer, higher-quality reviews
    const sortedReviews = reviews
      .filter(r => r.content.length > 100)
      .sort((a, b) => {
        const scoreA = (a.helpful_votes || 0) + (a.content.length / 100);
        const scoreB = (b.helpful_votes || 0) + (b.content.length / 100);
        return scoreB - scoreA;
      })
      .slice(0, 5); // Top 5 reviews

    return sortedReviews.map(r => r.content).join(' ');
  }

  fallbackSummary(reviews) {
    if (reviews.length === 0) return "No reviews available.";

    const sentimentCounts = {
      very_positive: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      very_negative: 0
    };

    reviews.forEach(review => {
      if (review.sentiment) {
        sentimentCounts[review.sentiment.classification]++;
      }
    });

    const totalReviews = reviews.length;
    const positivePercentage = Math.round(
      ((sentimentCounts.very_positive + sentimentCounts.positive) / totalReviews) * 100
    );

    return `Based on ${totalReviews} reviews analyzed, ${positivePercentage}% of viewers had a positive opinion. ` +
           `The most commonly mentioned aspects include story, acting, and visual effects. ` +
           `Reviews highlight both strengths and areas for improvement in various aspects of the film.`;
  }

  // 5. Generate Rating Breakdown
  generateRatingBreakdown(reviews) {
    const ratings = reviews
      .filter(r => r.rating !== null && r.rating !== undefined)
      .map(r => r.rating);

    if (ratings.length === 0) {
      return {
        average: null,
        distribution: {},
        totalRatings: 0
      };
    }

    const distribution = {
      '9-10': 0,
      '7-8': 0,
      '5-6': 0,
      '3-4': 0,
      '1-2': 0
    };

    ratings.forEach(rating => {
      if (rating >= 9) distribution['9-10']++;
      else if (rating >= 7) distribution['7-8']++;
      else if (rating >= 5) distribution['5-6']++;
      else if (rating >= 3) distribution['3-4']++;
      else distribution['1-2']++;
    });

    const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;

    return {
      average: Math.round(average * 10) / 10,
      distribution,
      totalRatings: ratings.length
    };
  }

  // 6. Main Analysis Method
  async analyzeReviews(reviews) {
    console.log(`Analyzing ${reviews.length} reviews...`);

    if (reviews.length === 0) {
      return {
        summary: "No reviews available for analysis.",
        sentiment: { overall: 'neutral', breakdown: {} },
        aspects: {},
        themes: [],
        ratings: { average: null, distribution: {}, totalRatings: 0 },
        reviewCount: 0,
        lastUpdated: new Date().toISOString()
      };
    }

    // Run all analyses
    const [
      reviewsWithSentiment,
      aspectAnalysis,
      themes,
      summary,
      ratingBreakdown
    ] = await Promise.all([
      Promise.resolve(this.analyzeSentiment(reviews)),
      Promise.resolve(this.analyzeAspects(reviews)),
      Promise.resolve(this.extractKeyThemes(reviews)),
      this.summarizeReviews(reviews),
      Promise.resolve(this.generateRatingBreakdown(reviews))
    ]);

    // Calculate overall sentiment
    const overallSentiment = this.calculateOverallSentiment(reviewsWithSentiment);

    return {
      summary,
      sentiment: {
        overall: overallSentiment.classification,
        score: overallSentiment.score,
        breakdown: this.getSentimentBreakdown(reviewsWithSentiment)
      },
      aspects: aspectAnalysis,
      themes,
      ratings: ratingBreakdown,
      reviewCount: reviews.length,
      sources: this.getSourceBreakdown(reviews),
      lastUpdated: new Date().toISOString(),
      rawReviews: reviewsWithSentiment.slice(0, 10) // Store top 10 for display
    };
  }

  calculateOverallSentiment(reviews) {
    const totalScore = reviews.reduce((sum, review) => 
      sum + (review.sentiment?.comparative || 0), 0
    );
    const averageScore = totalScore / reviews.length;
    
    return {
      score: Math.round(averageScore * 1000) / 1000,
      classification: this.classifySentiment(averageScore)
    };
  }

  getSentimentBreakdown(reviews) {
    const breakdown = {
      very_positive: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      very_negative: 0
    };

    reviews.forEach(review => {
      if (review.sentiment) {
        breakdown[review.sentiment.classification]++;
      }
    });

    return breakdown;
  }

  getSourceBreakdown(reviews) {
    const sources = {};
    reviews.forEach(review => {
      sources[review.source] = (sources[review.source] || 0) + 1;
    });
    return sources;
  }
}

module.exports = AIReviewAnalyzer;