const BlogPost = require('../models/BlogPost');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all blog posts
// @route   GET /api/blogs
// @access  Public
exports.getBlogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, tag, status = 'published' } = req.query;

    const query = { status };
    
    if (category) query.category = category;
    if (tag) query.tags = tag;

    const blogs = await BlogPost.find(query)
      .populate('author', 'username name avatar')
      .sort('-publishedAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await BlogPost.countDocuments(query);

    res.status(200).json({
      success: true,
      count: blogs.length,
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: Number(page),
      data: blogs
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single blog post
// @route   GET /api/blogs/:slug
// @access  Public
exports.getBlog = async (req, res, next) => {
  try {
    const blog = await BlogPost.findOne({ slug: req.params.slug })
      .populate('author', 'username name avatar bio')
      .populate('comments.user', 'username name avatar');

    if (!blog) {
      return next(new ErrorResponse('Blog post not found', 404));
    }

    // Increment view count
    blog.views += 1;
    await blog.save();

    res.status(200).json({
      success: true,
      data: blog
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create blog post
// @route   POST /api/blogs
// @access  Private
exports.createBlog = async (req, res, next) => {
  try {
    req.body.author = req.user.id;

    const blog = await BlogPost.create(req.body);

    res.status(201).json({
      success: true,
      data: blog
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update blog post
// @route   PUT /api/blogs/:id
// @access  Private
exports.updateBlog = async (req, res, next) => {
  try {
    let blog = await BlogPost.findById(req.params.id);

    if (!blog) {
      return next(new ErrorResponse('Blog post not found', 404));
    }

    // Make sure user is blog owner
    if (blog.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this blog post', 401));
    }

    blog = await BlogPost.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: blog
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete blog post
// @route   DELETE /api/blogs/:id
// @access  Private
exports.deleteBlog = async (req, res, next) => {
  try {
    const blog = await BlogPost.findById(req.params.id);

    if (!blog) {
      return next(new ErrorResponse('Blog post not found', 404));
    }

    // Make sure user is blog owner or admin
    if (blog.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to delete this blog post', 401));
    }

    await blog.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Like/Unlike blog post
// @route   PUT /api/blogs/:id/like
// @access  Private
exports.toggleBlogLike = async (req, res, next) => {
  try {
    const blog = await BlogPost.findById(req.params.id);

    if (!blog) {
      return next(new ErrorResponse('Blog post not found', 404));
    }

    const index = blog.likes.indexOf(req.user.id);

    if (index === -1) {
      blog.likes.push(req.user.id);
    } else {
      blog.likes.splice(index, 1);
    }

    await blog.save();

    res.status(200).json({
      success: true,
      data: {
        likes: blog.likes.length,
        isLiked: index === -1
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add comment to blog
// @route   POST /api/blogs/:id/comments
// @access  Private
exports.addBlogComment = async (req, res, next) => {
  try {
    const blog = await BlogPost.findById(req.params.id);

    if (!blog) {
      return next(new ErrorResponse('Blog post not found', 404));
    }

    const comment = {
      user: req.user.id,
      content: req.body.content
    };

    blog.comments.push(comment);
    await blog.save();

    res.status(201).json({
      success: true,
      data: blog
    });
  } catch (err) {
    next(err);
  }
};
