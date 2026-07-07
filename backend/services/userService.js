const db = require('../models');
const { User, Follow, sequelize } = db;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const createUser = async (req) => {
  console.log("creating user", req.body)
  try {
    const { id, name, short_id, access_key } = req.body;

    const access_key_hash = await bcrypt.hash(access_key, 12);
    const name_normalized = name.trim().toLowerCase().replace(/\s+/g, " ");
    
    const newUser = await User.create({
      id,
      name,
      name_normalized,
      short_id,
      access_key_hash
    });
    console.log("new User")
    const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
    const newUserPlain = newUser.get({ plain: true });

    console.log("new user hashed: ", newUserPlain)

    return { newUser: newUserPlain, token };
  } catch (error) {
    throw new Error("Error creating user: " + error.message);
  }
};

const recoverUser = async ({ name, access_key }) => {
  const name_normalized = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  // Get all users with this normalized name
  const users = await User.findAll({
    where: { name_normalized }
  });

  if (!users.length) {
    throw new Error("User not found");
  }

  // Check each user's access key
  for (const user of users) {
    const isMatch = await bcrypt.compare(access_key, user.access_key_hash);
    if (isMatch) {
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
      const userPlain = user.get({ plain: true });
      console.log({ user: userPlain, token })
      return { user: userPlain, token };
    }
  }

  throw new Error("Invalid access key");
};

async function fetchUserProfile({ viewerId, profileId }) {
  const user = await User.findByPk(profileId);

  if (!user) {
    throw new Error("User not found");
  }

  const follow = await Follow.findOne({
    where: {
      follower_id: viewerId,
      following_id: profileId
    }
  });

  console.log()

  return {
    ...user.toJSON(),
    is_following: !!follow
  };
}

async function followUser({ followerId, followingId }) {
  if (followerId === followingId) {
    throw new Error("You cannot follow yourself");
  }

  return sequelize.transaction(async (t) => {

    const [follow, created] = await Follow.findOrCreate({
      where: {
        follower_id: followerId,
        following_id: followingId
      },
      transaction: t
    });

    if (!created) return follow;

    await User.increment(
      { following_count: 1 },
      { where: { id: followerId }, transaction: t }
    );

    await User.increment(
      { followers_count: 1 },
      { where: { id: followingId }, transaction: t }
    );

    return follow;
  });
}

async function unfollowUser({ followerId, followingId }) {

  return sequelize.transaction(async (t) => {

    const deleted = await Follow.destroy({
      where: {
        follower_id: followerId,
        following_id: followingId
      },
      transaction: t
    });

    // If nothing was deleted, no relationship existed
    if (!deleted) return false;

    await User.decrement(
      { following_count: 1 },
      { where: { id: followerId }, transaction: t }
    );

    await User.decrement(
      { followers_count: 1 },
      { where: { id: followingId }, transaction: t }
    );

    return true;
  });
}

async function isFollowing(followerId, followingId) {
  return !!(await Follow.findOne({
    where: {
      follower_id: followerId,
      following_id: followingId
    }
  }));
}

module.exports = {
  createUser,
  recoverUser,
  fetchUserProfile,
  followUser,
  unfollowUser,
  isFollowing,
};
