const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const generateToken = require("../config/generateToken");


//@description     Get or Search all users
//@route           GET /api/user?search=sajal 
//@access          Public
const allUsers = asyncHandler(async (req, res) => {
  // if any query variable is passed then only search using or otherwise do nothing 
  const keyword = req.query.search ? {
        $or: [
          // if search variable matches with name it returns true
          { 
            name: { 
              $regex: req.query.search, 
              $options: "i" 
            } 
          },
          { 
            email: { 
              $regex: req.query.search, 
              $options: "i" 
            } 
        },
        ],
      } : {};
      // console.log(req.query);
  // we use second find bcz we do not want that current user is searching himself we want that current users search other users in db so first find gives all users with keyword as options and second find filters from these users whose id is not equal to current user id 
  const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
  res.send(users);
});

//@description     Register new user
//@route           POST /api/user/
//@access          Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, pic } = req.body;

  // if (!name || !email || !password) {
  //   res.status(400);
  //   throw new Error("Please Enter all the Feilds");
  // }

  if (!name) {
    res.status(400);
    throw new Error("Please Enter You name");
  }

  if (!email) {
    res.status(400);
    throw new Error("Please Enter Your e-mail");
  }

  if (!password) {
    res.status(400);
    throw new Error("Please Enter Your Password");
  }

  

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error("A account already exists with this e-mail please procedd to login");
  }

  const user = await User.create({
    name,
    email,
    password,
    pic,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      pic: user.pic,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Failed to create user please try again after some time ");
  }
});

//@description     Auth the user
//@route           POST /api/users/login
//@access          Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      pic: user.pic,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("No Account Exists with this email and password ");
  }
});

module.exports = { allUsers, registerUser, authUser };
