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

    console.log("test box office mojo")

    try {
        page.on('console', msg => {
            console.log('[PAGE]', msg.text());
        });
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        console.log("loaded BOM")

        // Scrape box office data
        const boxOfficeData = await page.evaluate(() => {

            function parseMoney(value) {
                if (!value) return 0;
                return Number(value.replace(/[$,]/g, ""));
            }
            const title = document.querySelector('h1')?.textContent.trim();
            console.log(title)
        
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

            // Extract International Opening
            let internationalOpeningTotal = 0;

            const internationalRegions = [
                "Europe, Middle East, and Africa",
                "Latin America",
                "Asia Pacific",
                "China",
            ];

            // console.log("scraping international opening!")
            const regionHeaders = Array.from(document.querySelectorAll("h3"));
            
            // console.log(
            // "region headers:",
            // regionHeaders.map(h => h.textContent?.trim()).join("', '")
            // );

            regionHeaders.forEach((header) => {
                console.log(internationalRegions.includes(header.textContent.trim()))
                if (!internationalRegions.includes(header.textContent.trim())) return;

                // console.log("has header for", header.textContent.trim())

                // The table is usually right after the header
                // console.log("What is next element sibling?", header.nextElementSibling?.tagName, header.nextElementSibling?.className)
                const table = header.nextElementSibling;
                if (!table) return;

                // console.log("has data table")

                const rows = table.querySelectorAll("tbody tr");
                // console.log("rows", rows)

                rows.forEach((row) => {
                    const moneySpan = row.querySelector("td:nth-child(3) span.money");
                    // console.log("moneySpan: ", moneySpan?.textContent)
                    const amount = parseMoney(moneySpan?.textContent?.trim());
                    // console.log("amount: ", amount)
                    internationalOpeningTotal += amount;
                });
            });

            const internationalOpening =
                internationalOpeningTotal > 0
                    ? `$${internationalOpeningTotal.toLocaleString()}`
                    : null;

            // Extract Budget
            const budget = Array.from(summaryValues?.querySelectorAll('div') || [])
                .find((div) => div.querySelector('span')?.textContent.trim() === 'Budget')
                ?.querySelector('span.money')
                ?.textContent.trim();
        
            return {
                domesticGross,
                internationalGross,
                worldwideGross,
                domesticOpening,
                internationalOpening,
                budget
            };
        });        

        return boxOfficeData;
    } catch (error) {
        console.error('Error scraping data:', error.stack || error);
        return { error: 'Failed to scrape box office data.' };
    } finally {
        await browser.close();
    }
};

const scrapeRottenTomatoesScore = async (movieTitle, releaseYear) => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const searchUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(movieTitle)}`;

    try {
        console.log("scraping RT")
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
        let tomatometer = null;

        const score = await page.$eval('search-page-media-row', el => el.getAttribute('tomatometerscore'));
        const year = await page.$eval('search-page-media-row', el => el.getAttribute('releaseyear'));
        if (year == releaseYear && score != null && score.length > 0) {
            console.log('Tomatometer Score:', score);
            tomatometer = score + '%';
        }
        return tomatometer;

    } catch (error) {
        console.error('Error scraping Rotten Tomatoes:', error);
        await browser.close();
        return null;
    }
};


module.exports = {
    scrapeBoxOffice,
    scrapeRottenTomatoesScore
};
