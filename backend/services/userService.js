const db = require('../models');
const { User, Follow, Guess, Movie, sequelize } = db;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { overallScore } = require('./overallScoreService');
const { computeRunPhase } = require('./runPhaseService');
const JWT_SECRET = process.env.JWT_SECRET;

const emptyRivalryRecord = () => ({ you: 0, them: 0, ties: 0 });
const SHARED_POSTER_CAP = 5;

const PHASE_RANK = { finished: 0, tracking: 1, not_opened: 2 };

function releaseTime(movie) {
  if (!movie?.released) return 0;
  const t = new Date(movie.released).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Shared titles + finished head-to-head record (same rules as frontend buildFriendRivalry).
 * Also returns up to SHARED_POSTER_CAP poster paths for a Following-row deck.
 * @param {Map<string, object>} viewerByMovie
 * @param {Map<string, object>} friendByMovie
 * @param {Map<string, object>} movieById
 */
function rivalryBetween(viewerByMovie, friendByMovie, movieById) {
  let shared_count = 0;
  const record = emptyRivalryRecord();
  /** @type {{ poster: string, phaseRank: number, released: number }[]} */
  const sharedMovies = [];

  for (const [movieId, yourGuess] of viewerByMovie) {
    const theirGuess = friendByMovie.get(movieId);
    if (!theirGuess) continue;
    shared_count += 1;

    const movie = movieById.get(movieId);
    if (!movie) continue;

    const phase = movie.runPhase || computeRunPhase(movie, []);
    if (movie.poster) {
      sharedMovies.push({
        poster: movie.poster,
        phaseRank: PHASE_RANK[phase] ?? 2,
        released: releaseTime(movie),
      });
    }

    if (phase !== 'finished') continue;

    const scoreA = overallScore(yourGuess, movie);
    const scoreB = overallScore(theirGuess, movie);
    if (scoreA == null || scoreB == null) continue;
    if (scoreA < scoreB) record.you += 1;
    else if (scoreB < scoreA) record.them += 1;
    else record.ties += 1;
  }

  sharedMovies.sort((a, b) => {
    if (a.phaseRank !== b.phaseRank) return a.phaseRank - b.phaseRank;
    return b.released - a.released;
  });

  const shared_posters = sharedMovies
    .slice(0, SHARED_POSTER_CAP)
    .map((m) => m.poster);

  return { shared_count, record, shared_posters };
}

function guessesByMovieId(guesses) {
  const map = new Map();
  for (const g of guesses) {
    map.set(String(g.movie_id), g);
  }
  return map;
}

async function loadMoviesForGuesses(guessLists) {
  const { Op } = require('sequelize');
  const ids = new Set();
  for (const list of guessLists) {
    for (const g of list) ids.add(String(g.movie_id));
  }
  if (ids.size === 0) return new Map();

  const movies = await Movie.findAll({
    where: { id: { [Op.in]: [...ids] } },
  });
  return new Map(
    movies.map((m) => {
      const plain = m.get ? m.get({ plain: true }) : m;
      return [String(plain.id), plain];
    })
  );
}

function sortFollowingByRivalry(rows) {
  const scored = (r) => r.record.you + r.record.them + r.record.ties;
  return rows.sort((a, b) => {
    const scoreDiff = scored(b) - scored(a);
    if (scoreDiff !== 0) return scoreDiff;
    if (b.shared_count !== a.shared_count) return b.shared_count - a.shared_count;
    const at = a.last_guess_at ? new Date(a.last_guess_at).getTime() : 0;
    const bt = b.last_guess_at ? new Date(b.last_guess_at).getTime() : 0;
    if (bt !== at) return bt - at;
    return a.name.localeCompare(b.name);
  });
}

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
async function followedUserSummary(user, viewerId = null) {
  const [prediction_count, lastGuess, theirGuesses, viewerGuesses] =
    await Promise.all([
      Guess.count({ where: { user_id: user.id } }),
      Guess.findOne({
        where: { user_id: user.id },
        attributes: ["updatedAt"],
        order: [["updatedAt", "DESC"]],
        raw: true,
      }),
      Guess.findAll({ where: { user_id: user.id }, raw: true }),
      viewerId
        ? Guess.findAll({ where: { user_id: viewerId }, raw: true })
        : Promise.resolve([]),
    ]);

  const movieById = await loadMoviesForGuesses([viewerGuesses, theirGuesses]);
  const rivalry =
    viewerId != null
      ? rivalryBetween(
          guessesByMovieId(viewerGuesses),
          guessesByMovieId(theirGuesses),
          movieById
        )
      : { shared_count: 0, record: emptyRivalryRecord(), shared_posters: [] };

  const follows_you =
    viewerId != null
      ? !!(await Follow.findOne({
          where: { follower_id: user.id, following_id: viewerId },
          attributes: ["id"],
        }))
      : false;

  return {
    name: user.name,
    short_id: user.short_id,
    followers_count: user.followers_count ?? 0,
    prediction_count,
    last_guess_at: lastGuess?.updatedAt ?? null,
    shared_count: rivalry.shared_count,
    record: rivalry.record,
    shared_posters: rivalry.shared_posters,
    follows_you,
  };
}

async function followUserByCode({ followerId, code, mutual = false }) {
  const user = await findUserByCode(code);
  await followUser({ followerId, followingId: user.id });
  if (mutual) {
    await followUser({ followerId: user.id, followingId: followerId });
  }
  // Reload so followers_count reflects the new follow edge.
  const fresh = await User.findByPk(user.id);
  return followedUserSummary(fresh || user, followerId);
}

async function unfollowUserByCode({ followerId, code }) {
  const user = await findUserByCode(code);
  return unfollowUser({ followerId, followingId: user.id });
}

async function fetchFollowing(viewerId) {
  const { Op } = require("sequelize");
  const viewer = await User.findByPk(viewerId, {
    include: [
      {
        model: User,
        as: "following",
        attributes: ["id", "name", "short_id", "followers_count"],
        through: { attributes: [] },
      },
    ],
  });
  if (!viewer) return [];
  const following = viewer.following;
  if (following.length === 0) return [];

  const ids = following.map((u) => u.id);
  const [stats, viewerGuesses, friendGuesses, reverseFollows] =
    await Promise.all([
      Guess.findAll({
        attributes: [
          "user_id",
          [sequelize.fn("COUNT", sequelize.col("id")), "prediction_count"],
          [sequelize.fn("MAX", sequelize.col("updatedAt")), "last_guess_at"],
        ],
        where: { user_id: { [Op.in]: ids } },
        group: ["user_id"],
        raw: true,
      }),
      Guess.findAll({ where: { user_id: viewerId }, raw: true }),
      Guess.findAll({
        where: { user_id: { [Op.in]: ids } },
        raw: true,
      }),
      Follow.findAll({
        where: {
          following_id: viewerId,
          follower_id: { [Op.in]: ids },
        },
        attributes: ["follower_id"],
        raw: true,
      }),
    ]);

  const statsByUser = new Map(stats.map((row) => [String(row.user_id), row]));
  const followsYouIds = new Set(
    reverseFollows.map((row) => String(row.follower_id))
  );
  const movieById = await loadMoviesForGuesses([viewerGuesses, friendGuesses]);
  const viewerByMovie = guessesByMovieId(viewerGuesses);

  const friendGuessesByUser = new Map();
  for (const g of friendGuesses) {
    const uid = String(g.user_id);
    if (!friendGuessesByUser.has(uid)) friendGuessesByUser.set(uid, []);
    friendGuessesByUser.get(uid).push(g);
  }

  const rows = following.map((u) => {
    const row = statsByUser.get(String(u.id));
    const rivalry = rivalryBetween(
      viewerByMovie,
      guessesByMovieId(friendGuessesByUser.get(String(u.id)) || []),
      movieById
    );
    return {
      name: u.name,
      short_id: u.short_id,
      followers_count: u.followers_count ?? 0,
      prediction_count: row ? Number(row.prediction_count) : 0,
      last_guess_at: row?.last_guess_at ?? null,
      shared_count: rivalry.shared_count,
      record: rivalry.record,
      shared_posters: rivalry.shared_posters,
      follows_you: followsYouIds.has(String(u.id)),
    };
  });

  return sortFollowingByRivalry(rows);
}

/**
 * People who follow the viewer but the viewer does not follow back yet.
 */
async function fetchFollowBack(viewerId) {
  const { Op } = require("sequelize");
  const viewer = await User.findByPk(viewerId, {
    include: [
      {
        model: User,
        as: "followers",
        attributes: ["id", "name", "short_id"],
        through: { attributes: [] },
      },
    ],
  });
  if (!viewer) return [];
  const followers = viewer.followers || [];
  if (followers.length === 0) return [];

  const followingEdges = await Follow.findAll({
    where: {
      follower_id: viewerId,
      following_id: { [Op.in]: followers.map((u) => u.id) },
    },
    attributes: ["following_id"],
    raw: true,
  });
  const alreadyFollowing = new Set(
    followingEdges.map((row) => String(row.following_id))
  );

  return followers
    .filter((u) => !alreadyFollowing.has(String(u.id)))
    .map((u) => ({
      name: u.name,
      short_id: u.short_id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Following list + pending follow-backs in one payload. */
async function fetchFriendsLists(viewerId) {
  const [following, follow_back] = await Promise.all([
    fetchFollowing(viewerId),
    fetchFollowBack(viewerId),
  ]);
  return { following, follow_back };
}

/**
 * Resolve a friend code for board access. Returns preview always; `allowed` when
 * viewer is self or follows them. Never exposes internal ids to the client.
 */
async function resolveFriendBoardAccess({ code, viewerId }) {
  const user = await findUserByCode(code);
  const preview = await fetchUserPreviewByCode({ code, viewerId });
  return {
    allowed: preview.is_self || preview.is_following,
    preview,
    userId: user.id,
  };
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
  fetchFollowBack,
  fetchFriendsLists,
  resolveFriendBoardAccess,
};
