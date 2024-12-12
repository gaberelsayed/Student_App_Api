const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Generate a JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1h" });
};
  
// @desc   Register a new user
// @route  POST /api/auth/register
exports.registerUser = async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    // Check if the email is already registered
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    // Create a new user (no password hashing here, Mongoose pre-save middleware will handle it)
    const newUser = new User({
      username,
      email,
      password, // The password will be hashed by the Mongoose model
      role: role || "user", // Default to 'user' if role is not provided
    });

    // Save the user in the database
    await newUser.save();

    // Generate a token
    const token = generateToken(newUser._id, newUser.role);

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc   Login user/admin
// @route  POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if the entered password matches the hashed password in the database
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate a token
    const token = generateToken(user._id, user.role);

    // Store the token in the session
    req.session.token = `Bearer ${token}`;

    // Send the token and user details as response
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Server error" });
  }
};
