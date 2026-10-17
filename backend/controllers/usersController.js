const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const {
  createUser,
  recoverUser,
  followUser,
  unfollowUser,
  isFollowing,
  fetchUserPreviewByCode,
  followUserByCode,
  unfollowUserByCode,
  fetchFollowing
} = require('../services/userService');

const getUserByCode = async (req, res) => {
  try {
    const user = await fetchUserPreviewByCode({ code: req.params.code, viewerId: req.user?.id });
    res.json({ user });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const postFollowByCode = async (req, res) => {
  try {
    const user = await followUserByCode({
      followerId: req.user.id,
      code: req.params.code,
      mutual: Boolean(req.body?.mutual),
    });
    res.json({ message: "User followed", user });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
};

const deleteFollowByCode = async (req, res) => {
  try {
    const unfollowed = await unfollowUserByCode({ followerId: req.user.id, code: req.params.code });
    res.json({ message: "User unfollowed", unfollowed });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
};

const getMyFollowing = async (req, res) => {
  try {
    res.json({ following: await fetchFollowing(req.user.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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
  postConnectUsers,
  getUserByCode,
  postFollowByCode,
  deleteFollowByCode,
  getMyFollowing
};