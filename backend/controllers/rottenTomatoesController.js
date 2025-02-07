const { fetchRottenTomatoesData } = require('../services/rottenTomatoesService');

const getRottenTomatoesScore = async (req, res) => {
    const { id: imdbID } = req.query;
    try {
        const data = await fetchRottenTomatoesData(imdbID);
        res.json(data);
    } catch (error) {
        const statusCode = error.message === 'Title is required' ? 400 : 500;
        res.status(statusCode).json({ error: error.message });
    }
};

module.exports = { getRottenTomatoesScore };