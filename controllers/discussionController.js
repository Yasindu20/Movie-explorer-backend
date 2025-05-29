const Discussion = require('../models/Discussion');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all discussions for a movie
// @route   GET /api/discussions/movie/:movieId
// @access  Public
exports.getMovieDiscussions = async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const { page = 1, limit = 10, category, sort = '-createdAt' } = req.query;

    const query = { movieId: Number(movieId) };
    
    if (category) {
      query.category = category;
    }

    const discussions = await Discussion.find(query)
      .populate('author', 'username name avatar')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Discussion.countDocuments(query);

    res.status(200).json({
      success: true,
      count: discussions.length,
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: Number(page),
      data: discussions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single discussion
// @route   GET /api/discussions/:id
// @access  Public
exports.getDiscussion = async (req, res, next) => {
  try {
    const discussion = await Discussion.findById(req.params.id)
      .populate('author', 'username name avatar')
      .populate('comments.user', 'username name avatar');

    if (!discussion) {
      return next(new ErrorResponse('Discussion not found', 404));
    }

    // Increment view count
    discussion.views += 1;
    await discussion.save();

    res.status(200).json({
      success: true,
      data: discussion
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create discussion
// @route   POST /api/discussions
// @access  Private
exports.createDiscussion = async (req, res, next) => {
  try {
    req.body.author = req.user.id;

    const discussion = await Discussion.create(req.body);

    res.status(201).json({
      success: true,
      data: discussion
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update discussion
// @route   PUT /api/discussions/:id
// @access  Private
exports.updateDiscussion = async (req, res, next) => {
  try {
    let discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return next(new ErrorResponse('Discussion not found', 404));
    }

    // Make sure user is discussion owner
    if (discussion.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this discussion', 401));
    }

    discussion = await Discussion.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: discussion
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete discussion
// @route   DELETE /api/discussions/:id
// @access  Private
exports.deleteDiscussion = async (req, res, next) => {
  try {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return next(new ErrorResponse('Discussion not found', 404));
    }

    // Make sure user is discussion owner or admin
    if (discussion.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to delete this discussion', 401));
    }

    await discussion.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add comment to discussion
// @route   POST /api/discussions/:id/comments
// @access  Private
exports.addComment = async (req, res, next) => {
  try {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return next(new ErrorResponse('Discussion not found', 404));
    }

    if (discussion.isLocked && req.user.role !== 'admin') {
      return next(new ErrorResponse('This discussion is locked', 403));
    }

    const comment = {
      user: req.user.id,
      content: req.body.content
    };

    discussion.comments.push(comment);
    await discussion.save();

    res.status(201).json({
      success: true,
      data: discussion
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Like/Unlike discussion
// @route   PUT /api/discussions/:id/like
// @access  Private
exports.toggleLike = async (req, res, next) => {
  try {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return next(new ErrorResponse('Discussion not found', 404));
    }

    const index = discussion.likes.indexOf(req.user.id);

    if (index === -1) {
      discussion.likes.push(req.user.id);
    } else {
      discussion.likes.splice(index, 1);
    }

    await discussion.save();

    res.status(200).json({
      success: true,
      data: {
        likes: discussion.likes.length,
        isLiked: index === -1
      }
    });
  } catch (err) {
    next(err);
  }
};