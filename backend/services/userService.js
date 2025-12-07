const db = require('../models');
const { User } = db;
const bcrypt = require('bcrypt');

const createUser = async (req) => {
  console.log(req.body)
  try {
    const { id, name, short_id, access_key } = req.body;

    const access_key_hash = await bcrypt.hash(access_key, 12);
    
    const newUser = await User.create({
      id,
      name,
      short_id,
      access_key_hash
    });

    console.log("new user hashed: ", newUser)

    return newUser;
  } catch (error) {
    throw new Error("Error creating user: " + error.message);
  }
};

module.exports = {
  createUser
};
