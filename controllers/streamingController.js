const StreamingApiService = require('../utils/streamingApi');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get streaming availability for a movie
// @route   GET /api/streaming/movie/:movieId
// @access  Public
exports.getMovieStreamingData = async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const { imdb_id, title } = req.query;

    if (!movieId) {
      return next(new ErrorResponse('Movie ID is required', 400));
    }

    if (!title) {
      return next(new ErrorResponse('Movie title is required', 400));
    }

    console.log(`Getting streaming data for movie ${movieId}: ${title}`);

    const streamingData = await StreamingApiService.getStreamingData(
      movieId, 
      imdb_id, 
      title
    );

    res.status(200).json({
      success: true,
      movieId: Number(movieId),
      title,
      data: streamingData
    });
  } catch (err) {
    console.error('Streaming controller error:', err);
    next(err);
  }
};

// @desc    Get all available streaming services
// @route   GET /api/streaming/services
// @access  Public
exports.getStreamingServices = async (req, res, next) => {
  try {
    const services = StreamingApiService.getAllServices();

    res.status(200).json({
      success: true,
      count: Object.keys(services).length,
      data: services
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Search for streaming availability by title
// @route   GET /api/streaming/search
// @access  Public
exports.searchStreamingByTitle = async (req, res, next) => {
  try {
    const { title, year } = req.query;

    if (!title) {
      return next(new ErrorResponse('Title is required', 400));
    }

    // This would typically involve searching external APIs
    // For now, we'll return mock data
    const searchQuery = year ? `${title} (${year})` : title;
    const streamingData = await StreamingApiService.getStreamingData(
      null, 
      null, 
      searchQuery
    );

    res.status(200).json({
      success: true,
      query: searchQuery,
      data: streamingData
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get popular streaming content
// @route   GET /api/streaming/popular
// @access  Public
exports.getPopularStreamingContent = async (req, res, next) => {
  try {
    const { service, type = 'all', limit = 20 } = req.query;

    // Mock popular content data
    const popularContent = {
      netflix: [
        { title: 'Stranger Things', type: 'series', rating: 8.7 },
        { title: 'The Crown', type: 'series', rating: 8.6 },
        { title: 'Squid Game', type: 'series', rating: 8.0 }
      ],
      amazon_prime: [
        { title: 'The Boys', type: 'series', rating: 8.7 },
        { title: 'The Marvelous Mrs. Maisel', type: 'series', rating: 8.5 },
        { title: 'Jack Ryan', type: 'series', rating: 8.0 }
      ],
      disney_plus: [
        { title: 'The Mandalorian', type: 'series', rating: 8.8 },
        { title: 'WandaVision', type: 'series', rating: 7.9 },
        { title: 'Loki', type: 'series', rating: 8.2 }
      ]
    };

    const result = service ? popularContent[service] || [] : popularContent;

    res.status(200).json({
      success: true,
      service: service || 'all',
      type,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Clear streaming data cache
// @route   DELETE /api/streaming/cache
// @access  Private (Admin only)
exports.clearStreamingCache = async (req, res, next) => {
  try {
    StreamingApiService.clearCache();

    res.status(200).json({
      success: true,
      message: 'Streaming cache cleared successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get streaming statistics
// @route   GET /api/streaming/stats
// @access  Public
exports.getStreamingStats = async (req, res, next) => {
  try {
    const services = StreamingApiService.getAllServices();
    
    const stats = {
      totalServices: Object.keys(services).length,
      servicesByType: {
        subscription: Object.values(services).filter(s => s.type === 'subscription').length,
        rent: Object.values(services).filter(s => s.type === 'rent').length,
        free: Object.values(services).filter(s => s.type === 'free').length
      },
      popularServices: [
        'Netflix',
        'Amazon Prime Video',
        'Disney+',
        'Hulu',
        'HBO Max'
      ]
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
};