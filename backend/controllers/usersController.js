const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const {
  createUser,
} = require('../services/userService');

const saveUser = async (req, res) => {
  console.log("save user", req.body)
    try {
        const savedUser = await createUser(req);
        console.log("savedUser", savedUser)
        res.status(201).json({ message: "User created successfully!", user: savedUser });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
  saveUser
};