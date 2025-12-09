const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const {
  createUser,
  recoverUser
} = require('../services/userService');

const saveUser = async (req, res) => {
  console.log("save user", req.body)
    try {
        const savedUser = await createUser(req);
        console.log("savedUser", savedUser)
        res.status(201).json({
          status: 201,
          message: "User created successfully!",
          user: {
            id: savedUser.id,
            name: savedUser.name,
            short_id: savedUser.short_id,
          }
        });
    } catch (error) {
      console.log(error)
        res.status(500).json({ error: error.message });
    }
};

const recoverAccount = async (req, res) => {
  try {
    const { name, access_key } = req.body;

    const user = await recoverUser({ name, access_key });

    res.json({
      message: "Account recovered",
      user: {
        id: user.id,
        name: user.name,
        short_id: user.short_id
      }
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

module.exports = {
  saveUser,
  recoverAccount
};