const db = require('../models');
const { User } = db;
const bcrypt = require('bcrypt');

const createUser = async (req) => {
  console.log(req.body)
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

    console.log("new user hashed: ", newUser)

    return newUser;
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
      return user;
    }
  }

  throw new Error("Invalid access key");
};

module.exports = {
  createUser,
  recoverUser
};
