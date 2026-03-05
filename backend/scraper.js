const cheerio = require("cheerio");

/**
 * Scrapes Box Office Mojo for box office data of a movie.
 * @param {string} imdbID - The IDMb ID of the movie.
 * @returns {Promise<Object>} - The box office data.
 */

async function scrapeBoxOffice(imdbID) {
  if (!imdbID) {
    throw new Error("IMDb ID is required");
  }

  // Construct the Box Office Mojo URL using the IMDb ID
  const url = `https://www.boxofficemojo.com/title/${imdbID}/`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  if (!res.ok) {
    throw new Error("Failed to load Box Office Mojo page");
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  function parseMoney(value) {
    if (!value) return 0;
    return Number(value.replace(/[$,]/g, ""));
  }

  // Select the performance summary table
  const performanceTable = $(".mojo-performance-summary-table");

  const getMoneyByLabel = (label) => {
    const span = performanceTable
      .find("span.a-size-small")
      .filter((i, el) =>
        $(el).text().includes(label)
      )
      .first();

    return span
      .closest("div")
      .find("span.money")
      .text()
      .trim() || null;
  };

  const domesticGross = getMoneyByLabel("Domestic");
  const internationalGross = getMoneyByLabel("International");
  const worldwideGross = getMoneyByLabel("Worldwide");

  const summaryValues = $(".mojo-summary-values");

  const domesticOpening = summaryValues
    .find("div")
    .filter((i, el) =>
      $(el).find("span").first().text().trim() === "Domestic Opening"
    )
    .find("span.money")
    .text()
    .trim() || null;

  let internationalOpeningTotal = 0;

  const internationalRegions = [
    "Europe, Middle East, and Africa",
    "Latin America",
    "Asia Pacific",
    "China"
  ];

  $("h3").each((i, el) => {
    const header = $(el).text().trim();

    if (!internationalRegions.includes(header)) return;

    const table = $(el).next();

    table.find("tbody tr").each((i, row) => {
      const moneyText = $(row)
        .find("td:nth-child(3) span.money")
        .text()
        .trim();

      internationalOpeningTotal += parseMoney(moneyText);
    });
  });

  const internationalOpening =
    internationalOpeningTotal > 0
      ? `$${internationalOpeningTotal.toLocaleString()}`
      : null;

  return {
    domesticGross,
    internationalGross,
    worldwideGross,
    domesticOpening,
    internationalOpening,
  };
}

async function scrapeRottenTomatoesScore(title, releaseYear) {

    const slug = generateRTSlug(title);

    const baseUrl = `https://www.rottentomatoes.com/m/${slug}`;
    console.log("Trying slug:", slug);

    let html = await fetchPage(baseUrl);
    if (!html) {
        console.log("Slug failed, searching...");
        return await fallbackSearch(title, releaseYear);
    }

    const year = await extractReleaseYear(html);
    console.log("year:", year)

    if (year !== releaseYear) {
        console.log("Year mismatch:", year, releaseYear);
        return await fallbackSearch(title, releaseYear);
    }

    const score = await extractScore(html);

    console.log("RT Score:", score);

    return score;
}

// ROTTEN TOMATOES HELPER FUNCTIONS

function generateRTSlug(title) {

  return title

    // Normalize accents
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

    // Lowercase
    .toLowerCase()

    // Special replacements
    .replace(/&/g, "and")
    .replace(/'/g, "")

    // Convert separators to spaces
    .replace(/[:\-–—]/g, " ")

    // Remove punctuation
    .replace(/[^a-z0-9 ]/g, "")

    // Collapse spaces
    .trim()
    .replace(/\s+/g, "_")

    // Collapse multiple underscores
    .replace(/_+/g, "_")

    // Remove edges
    .replace(/^_+|_+$/g, "");
}


async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
  });

  if (!res.ok) {
    return null;
  }

  return await res.text();
}

async function extractReleaseYear(html) {

  const $ = cheerio.load(html);

  let releaseYear = null;

  $(".category-wrap").each((i, el) => {

    const key =
      $(el).find("dt.key").text().trim();

    if (key === "Release Date (Theaters)") {

      const text =
        $(el)
          .find("rt-text[data-qa='item-value']")
          .text();

      const match =
        text.match(/\b(19|20)\d{2}\b/);

      if (match) {
        releaseYear = Number(match[0]);
      }
    }

  });

  return releaseYear;
}

async function extractScore(html) {

  const $ = cheerio.load(html);

  const score =
    $("rt-text[slot='critics-score']")
      .text()
      .trim();

  if (!score) return null;

  return score.includes("%")
    ? score
    : score + "%";
}


async function fallbackSearch(
  title,
  releaseYear
) {

  const searchUrl =
    `https://www.rottentomatoes.com/search?search=${encodeURIComponent(title)}`;

  const html =
    await fetchPage(searchUrl);

  if (!html) return null;

  const $ = cheerio.load(html);

  let result = null;

  $("search-page-media-row").each((i, el) => {

    const year =
      Number(
        $(el).attr("release-year")
      );

      console.log(year)
      console.log($(el).attr("cast"))

    if (year === releaseYear) {

      const score =
        $(el)
          .attr("tomatometer-score");

      if (score) {
        result = score + "%";
      }

    }

  });

  console.log("Fallback score:", result);

  return result;
}

module.exports = {
    scrapeBoxOffice,
    scrapeRottenTomatoesScore
};
