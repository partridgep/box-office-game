const scrapeBoxOffice = require('../scraper');

const fetchBoxOfficeData = async (id) => {

    if (!id) {
        throw new Error('IMDb ID is required');
    }

    const data = await scrapeBoxOffice(id);
    console.log("fetched box office:", data);

    if (!data) {
        throw new Error('No box office data found');
    }

    return data;
};

module.exports = { fetchBoxOfficeData };
