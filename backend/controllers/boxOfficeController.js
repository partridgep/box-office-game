const { fetchBoxOfficeData } = require('../services/boxOfficeService');

const getBoxOfficeData = async (req, res) => {
    const { id: imdbID } = req.query;
    try {
        const data = await fetchBoxOfficeData(imdbID);
        res.json(data);
    } catch (error) {
        const statusCode = error.message === 'IMDb ID is required' ? 400 : 500;
        res.status(statusCode).json({ error: error.message });
    }
};

module.exports = { getBoxOfficeData };