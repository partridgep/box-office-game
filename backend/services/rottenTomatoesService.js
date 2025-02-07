const { scrapeRottenTomatoesScore } = require('../scraper');

const fetchRottenTomatoesData = async (title, releaseYear) => {

    if (!title) {
        throw new Error('Title is required');
    }
    if (!releaseYear) {
        throw new Error('Release year is required');
    }

    const data = await scrapeRottenTomatoesScore(title, releaseYear);
    console.log("fetched rotten tomatoes:", data);

    return data;
};

module.exports = { fetchRottenTomatoesData };
