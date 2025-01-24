const { fetchBoxOfficeData } = require('../services/boxOfficeService');

const getMovieSearch = async (req, res) => {
    const { search } = req.query;

    if (!search) {
        return res.status(400).json({ error: 'Search parameter is required' });
    }

    try {
        const response = await fetch(`http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&s=${encodeURIComponent(search)}&type=movie`);
        const data = await response.json();

        if (data.Response === 'False') {
            return res.status(404).json({ error: data.Error });
            
        }

        const movies = data.Search;

        res.json(movies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch movies from OMDb API' });
    }
};

const getMovieDetails = async (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'id parameter is required' });
    }

    try {
        // Fetch detailed movie data from OMDb
        const omdbResponse = await fetch(`http://www.omdbapi.com/?i=${id}&apikey=${process.env.OMDB_API_KEY}`);
        const omdbData = await omdbResponse.json();

        if (omdbData.Response === 'False') {
            return res.status(404).json({ error: omdbData.Error });
        }

        // Fetch box office data directly using the service
        const boxOfficeData = await fetchBoxOfficeData(id);

        // Combine the data
        const combinedData = {
            ...omdbData,
            boxOffice: boxOfficeData,
        };

        res.json(combinedData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch movie details' });
    }
};

module.exports = { getMovieSearch, getMovieDetails };