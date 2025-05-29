const MovieList = require('../models/MovieList');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all public lists
// @route   GET /api/lists
// @access  Public
exports.getLists = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, tag, sort = '-followers' } = req.query;

    const query = { isPublic: true };
    
    if (category) query.category = category;
    if (tag) query.tags = tag;

    const lists = await MovieList.find(query)
      .populate('creator', 'username name avatar')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await MovieList.countDocuments(query);

    res.status(200).json({
      success: true,
      count: lists.length,
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: Number(page),
      data: lists
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single list
// @route   GET /api/lists/:id
// @access  Public
exports.getList = async (req, res, next) => {
  try {
    const list = await MovieList.findById(req.params.id)
      .populate('creator', 'username name avatar')
      .populate('movies.addedBy', 'username name')
      .populate('collaborators.user', 'username name avatar');

    if (!list) {
      return next(new ErrorResponse('List not found', 404));
    }

    // Check if list is private and user is not authorized
    if (!list.isPublic && 
        (!req.user || 
         (list.creator.toString() !== req.user.id && 
          !list.collaborators.some(c => c.user.toString() === req.user.id)))) {
      return next(new ErrorResponse('Not authorized to view this list', 401));
    }

    // Increment view count
    list.views += 1;
    await list.save();

    res.status(200).json({
      success: true,
      data: list
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create list
// @route   POST /api/lists
// @access  Private
exports.createList = async (req, res, next) => {
  try {
    req.body.creator = req.user.id;

    const list = await MovieList.create(req.body);

    res.status(201).json({
      success: true,
      data: list
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update list
// @route   PUT /api/lists/:id
// @access  Private
exports.updateList = async (req, res, next) => {
  try {
    let list = await MovieList.findById(req.params.id);

    if (!list) {
      return next(new ErrorResponse('List not found', 404));
    }

    // Check if user is authorized to update
    const isCreator = list.creator.toString() === req.user.id;
    const isCollaborator = list.collaborators.some(
      c => c.user.toString() === req.user.id && c.role === 'editor'
    );

    if (!isCreator && !isCollaborator && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this list', 401));
    }

    list = await MovieList.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: list
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete list
// @route   DELETE /api/lists/:id
// @access  Private
exports.deleteList = async (req, res, next) => {
  try {
    const list = await MovieList.findById(req.params.id);

    if (!list) {
      return next(new ErrorResponse('List not found', 404));
    }

    // Only creator or admin can delete
    if (list.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to delete this list', 401));
    }

    await list.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add movie to list
// @route   POST /api/lists/:id/movies
// @access  Private
exports.addMovieToList = async (req, res, next) => {
  try {
    const list = await MovieList.findById(req.params.id);

    if (!list) {
      return next(new ErrorResponse('List not found', 404));
    }

    // Check if user can add movies
    const isCreator = list.creator.toString() === req.user.id;
    const isCollaborator = list.isCollaborative || 
      list.collaborators.some(c => c.user.toString() === req.user.id && c.role === 'editor');

    if (!isCreator && !isCollaborator) {
      return next(new ErrorResponse('Not authorized to add movies to this list', 401));
    }

    // Check if movie already in list
    const movieExists = list.movies.some(m => m.movieId === req.body.movieId);
    if (movieExists) {
      return next(new ErrorResponse('Movie already in list', 400));
    }

    const movie = {
      ...req.body,
      addedBy: req.user.id
    };

    list.movies.push(movie);
    await list.save();

    res.status(201).json({
      success: true,
      data: list
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Remove movie from list
// @route   DELETE /api/lists/:id/movies/:movieId
// @access  Private
exports.removeMovieFromList = async (req, res, next) => {
  try {
    const list = await MovieList.findById(req.params.id);

    if (!list) {
      return next(new ErrorResponse('List not found', 404));
    }

    // Check if user can remove movies
    const isCreator = list.creator.toString() === req.user.id;
    const isCollaborator = list.collaborators.some(
      c => c.user.toString() === req.user.id && c.role === 'editor'
    );

    if (!isCreator && !isCollaborator && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to remove movies from this list', 401));
    }

    list.movies = list.movies.filter(
      m => m.movieId !== Number(req.params.movieId)
    );

    await list.save();

    res.status(200).json({
      success: true,
      data: list
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Follow/Unfollow list
// @route   PUT /api/lists/:id/follow
// @access  Private
exports.toggleFollowList = async (req, res, next) => {
  try {
    const list = await MovieList.findById(req.params.id);

    if (!list) {
      return next(new ErrorResponse('List not found', 404));
    }

    const index = list.followers.indexOf(req.user.id);
    let isFollowing;

    if (index === -1) {
      list.followers.push(req.user.id);
      isFollowing = true;
      
      // Add list to user's followedLists
      await User.findByIdAndUpdate(req.user.id, {
        $push: { followedLists: list._id }
      });
    } else {
      list.followers.splice(index, 1);
      isFollowing = false;
      
      // Remove list from user's followedLists
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { followedLists: list._id }
      });
    }

    await list.save();

    res.status(200).json({
      success: true,
      data: {
        followers: list.followers.length,
        isFollowing
      }
    });
  } catch (err) {
    next(err);
  }
};