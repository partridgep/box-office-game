const db = require('../models');
const { User } = db;

const createUser = async (req) => {
  console.log(req.body)
  try {
    const { id, name, short_id, access_key } = req.body;
    
    const newUser = await User.create({
      id,
      name,
      short_id,
      access_key
    });
    console.log("in user service", newUser)

    return newUser;
  } catch (error) {
    throw new Error("Error creating user: " + error.message);
  }
};

module.exports = {
  createUser
};
