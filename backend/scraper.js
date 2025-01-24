const puppeteer = require('puppeteer');

/**
 * Scrapes Box Office Mojo for box office data of a movie.
 * @param {string} imdbID - The IDMb ID of the movie.
 * @returns {Promise<Object>} - The box office data.
 */
async function scrapeBoxOffice(imdbID) {
    if (!imdbID) {
        throw new Error('IMDb ID is required');
    }

    // Construct the Box Office Mojo URL using the IMDb ID
    const url = `https://www.boxofficemojo.com/title/${imdbID}/`;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Scrape box office data
        const boxOfficeData = await page.evaluate(() => {
            const title = document.querySelector('h1')?.textContent.trim();
        
            // Select the performance summary table
            const performanceTable = document.querySelector('.mojo-performance-summary-table');
        
            // Extract Domestic Gross
            const domesticGross = Array.from(performanceTable?.querySelectorAll('span.a-size-small') || [])
                .find((span) => span.textContent.includes('Domestic'))
                ?.closest('div')
                ?.querySelector('span.money')
                ?.textContent.trim();

            // Extract International Gross
            const internationalGross = Array.from(performanceTable?.querySelectorAll('span.a-size-small') || [])
                .find((span) => span.textContent.includes('International'))
                ?.closest('div')
                ?.querySelector('span.money')
                ?.textContent.trim();
        
            // Extract Worldwide Gross
            const worldwideGross = Array.from(performanceTable?.querySelectorAll('span.a-size-small') || [])
                ?.find((span) => span.textContent.includes('Worldwide')) // Find the Worldwide label
                ?.closest('div') // Get the parent div
                ?.querySelector('span.money') // Find the money span
                ?.textContent.trim();

            // Select the summary values container
            const summaryValues = document.querySelector('.mojo-summary-values');

            // Extract Domestic Opening
            const domesticOpening = Array.from(summaryValues?.querySelectorAll('div') || [])
                .find((div) => div.querySelector('span')?.textContent.trim() === 'Domestic Opening')
                ?.querySelector('span.money')
                ?.textContent.trim();

            // Extract Budget
            const budget = Array.from(summaryValues?.querySelectorAll('div') || [])
                .find((div) => div.querySelector('span')?.textContent.trim() === 'Budget')
                ?.querySelector('span.money')
                ?.textContent.trim();
        
            return {
                title,
                domesticGross,
                internationalGross,
                worldwideGross,
                domesticOpening,
                budget
            };
        });        

        return boxOfficeData;
    } catch (error) {
        console.error('Error scraping data:', error);
        return { error: 'Failed to scrape box office data.' };
    } finally {
        await browser.close();
    }
}

module.exports = scrapeBoxOffice;
