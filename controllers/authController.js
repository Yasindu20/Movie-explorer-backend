const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, name } = req.body;

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      name
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validate username & password
    if (!username || !password) {
      return next(new ErrorResponse('Please provide username and password', 400));
    }

    // Check for user
    const user = await User.findOne({ username }).select('+password');

    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      bio: req.body.bio,
      favoriteGenres: req.body.favoriteGenres
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create demo users (Development only)
// @route   POST /api/auth/create-demo-users
// @access  Public
exports.createDemoUsers = async (req, res, next) => {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return next(new ErrorResponse('Not available in production', 403));
    }

    const demoUsers = [
      {
        username: 'demo_user',
        email: 'demo@movieexplorer.com',
        password: 'password123',
        name: 'Demo User'
      },
      {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'password123',
        name: 'John Doe'
      },
      {
        username: 'jane_smith',
        email: 'jane@example.com',
        password: 'password123',
        name: 'Jane Smith'
      }
    ];

    const createdUsers = [];

    for (const userData of demoUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ 
          $or: [
            { username: userData.username },
            { email: userData.email }
          ]
        });

        if (!existingUser) {
          const user = await User.create(userData);
          createdUsers.push({
            username: user.username,
            email: user.email,
            name: user.name
          });
        }
      } catch (error) {
        // Skip if user already exists (duplicate key error)
        if (error.code !== 11000) {
          console.error(`Error creating user ${userData.username}:`, error);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `${createdUsers.length} demo users created successfully`,
      data: createdUsers
    });
  } catch (err) {
    next(err);
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
};