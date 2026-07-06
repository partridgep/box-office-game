const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const {
  createUser,
  recoverUser,
  followUser,
  unfollowUser,
  isFollowing
} = require('../services/userService');

const saveUser = async (req, res) => {
  console.log("save user come one", req.body)
    try {
        const savedUserResponse = await createUser(req);
        console.log("savedUser", savedUserResponse)
        res.status(201).json({
          status: 201,
          message: "User created successfully!",
          user: {
            id: savedUserResponse.id,
            name: savedUserResponse.name,
            short_id: savedUserResponse.short_id,
          },
          token: savedUserResponse.token
        });
    } catch (error) {
      console.log(error)
        res.status(500).json({ error: error.message });
    }
};

const recoverAccount = async (req, res) => {
  try {
    const { name, access_key } = req.body;

    const { user, token } = await recoverUser({ name, access_key });
    console.log("recovered user", user)

    res.json({
      message: "Account recovered",
      user: {
        id: user.id,
        name: user.name,
        short_id: user.short_id
      },
      token
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const viewerId = req.user.id;
    const profileId = req.params.id;

    const user = await fetchUserProfile({
      viewerId,
      profileId
    });

    res.json(user);

  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};

const postFollowUser = async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.id;

    const follow = await followUser({ followerId, followingId });

    res.json({
      message: "User followed",
      follow
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteUnfollowUser = async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.id;

    const response = await unfollowUser({ followerId, followingId });

    res.json({
      message: "User unfollowed",
      unfollowed: response
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getIsFollowing = async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.id;

    const response = await isFollowing({ followerId, followingId });

    res.json({
      isFollowing: response
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const postConnectUsers = async (req, res) => {
  console.log("connect users")
  try {
    const { inviterId } = req.body;
    const newUserId = req.user.id;
    console.log({ inviterId })
    console.log({ newUserId })

    await followUser({ followerId: newUserId, followingId: inviterId });
    await followUser({ followerId: inviterId, followingId: newUserId });

    res.json({ success: true });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  saveUser,
  recoverAccount,
  getUserProfile,
  postFollowUser,
  deleteUnfollowUser,
  getIsFollowing,
  postConnectUsers
};