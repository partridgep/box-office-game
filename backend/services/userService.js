const db = require('../models');
const { User, Follow, Guess, sequelize } = db;
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
  // Same normalization as createUser (collapsed spaces), plus a no-space
  // variant so older accounts recovered before that was consistent still match.
  const name_normalized = name.trim().toLowerCase().replace(/\s+/g, " ");
  const name_compact = name_normalized.replace(/\s+/g, "");

  const { Op } = require("sequelize");
  const users = await User.findAll({
    where: {
      [Op.or]: [
        { name_normalized },
        ...(name_compact !== name_normalized
          ? [{ name_normalized: name_compact }]
          : []),
      ],
    },
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

const normalizeCode = (code) => String(code ?? "").trim().toUpperCase();

async function findUserByCode(code) {
  const user = await User.findOne({ where: { short_id: normalizeCode(code) } });
  if (!user) {
    const err = new Error("No player with that code");
    err.status = 404;
    throw err;
  }
  return user;
}

/** Public preview for a friend code; never exposes the internal id or access key hash. */
async function fetchUserPreviewByCode({ code, viewerId }) {
  const user = await findUserByCode(code);
  const is_self = viewerId != null && String(user.id) === String(viewerId);

  const [prediction_count, theirFollowing, viewerFollowing] = await Promise.all([
    Guess.count({ where: { user_id: user.id } }),
    Follow.findAll({ where: { follower_id: user.id }, attributes: ["following_id"], raw: true }),
    viewerId && !is_self
      ? Follow.findAll({ where: { follower_id: viewerId }, attributes: ["following_id"], raw: true })
      : [],
  ]);

  const viewerFollowingIds = new Set(viewerFollowing.map((f) => String(f.following_id)));
  const friends_in_common = theirFollowing.filter((f) =>
    viewerFollowingIds.has(String(f.following_id))
  ).length;

  return {
    name: user.name,
    short_id: user.short_id,
    followers_count: user.followers_count,
    prediction_count,
    friends_in_common,
    is_self,
    is_following: viewerFollowingIds.has(String(user.id)),
  };
}

/**
 * `mutual` is for invite links: the person who shared the link has already opted in to following back.
 * Typed codes only follow one way, so nobody can add themselves to someone else's friends list.
 */
async function followUserByCode({ followerId, code, mutual = false }) {
  const user = await findUserByCode(code);
  await followUser({ followerId, followingId: user.id });
  if (mutual) {
    await followUser({ followerId: user.id, followingId: followerId });
  }
  return { name: user.name, short_id: user.short_id };
}

async function unfollowUserByCode({ followerId, code }) {
  const user = await findUserByCode(code);
  return unfollowUser({ followerId, followingId: user.id });
}

async function fetchFollowing(viewerId) {
  const viewer = await User.findByPk(viewerId, {
    include: [
      {
        model: User,
        as: "following",
        attributes: ["name", "short_id"],
        through: { attributes: [] },
      },
    ],
  });
  if (!viewer) return [];
  return viewer.following
    .map((u) => ({ name: u.name, short_id: u.short_id }))
    .sort((a, b) => a.name.localeCompare(b.name));
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
  fetchUserPreviewByCode,
  followUserByCode,
  unfollowUserByCode,
  fetchFollowing,
};
