const cheerio = require("cheerio");

/**
 * Scrapes Box Office Mojo for box office data of a movie.
 * @param {string} imdbID - The IDMb ID of the movie.
 * @returns {Promise<Object>} - The box office data.
 */

const BOM_ORIGIN = "https://www.boxofficemojo.com";

const INTERNATIONAL_REGIONS = [
  "Europe, Middle East, and Africa",
  "Latin America",
  "Asia Pacific",
  "China",
];

function parseMoney(value) {
  if (!value) return 0;
  const n = Number(value.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function getOpeningCellText($, row) {
  const cell = $(row).find("td:nth-child(3)");
  return cell.find("span.money").text().trim() || cell.text().trim();
}

/**
 * Sums international opening weekend totals from either:
 * - title-page region tables under matching <h3> headers, or
 * - release-group tables (table.releases-by-region) with matching <th> headers
 */
function sumInternationalOpenings($) {
  let total = 0;

  $("h3").each((_, el) => {
    const header = $(el).text().trim();
    if (!INTERNATIONAL_REGIONS.includes(header)) return;

    $(el)
      .next("table")
      .find("tr")
      .each((_, row) => {
        total += parseMoney(getOpeningCellText($, row));
      });
  });

  if (total > 0) return total;

  $("table.releases-by-region").each((_, table) => {
    const header = $(table).find('th[colspan="4"]').first().text().trim();
    if (!INTERNATIONAL_REGIONS.includes(header)) return;

    $(table)
      .find("tr")
      .each((_, row) => {
        if ($(row).find("td").length === 0) return;
        total += parseMoney(getOpeningCellText($, row));
      });
  });

  return total;
}

function findOriginalReleaseHref($) {
  const original = $("a")
    .filter((_, el) => $(el).text().trim() === "Original Release")
    .first()
    .attr("href");

  if (original) return original;

  // Fallback: first release-group link in the By Release table
  return $("h3")
    .filter((_, el) => $(el).text().trim() === "By Release")
    .first()
    .next("table")
    .find('a[href*="/releasegroup/"]')
    .first()
    .attr("href");
}

async function fetchBomPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to load Box Office Mojo page: ${url}`);
  }

  return cheerio.load(await res.text());
}

async function scrapeBoxOffice(imdbID) {
  if (!imdbID) {
    throw new Error("IMDb ID is required");
  }

  const url = `${BOM_ORIGIN}/title/${imdbID}/`;
  const $ = await fetchBomPage(url);

  // Select the performance summary table
  const performanceTable = $(".mojo-performance-summary-table");

  const getMoneyByLabel = (label) => {
    const span = performanceTable
      .find("span.a-size-small")
      .filter((i, el) => $(el).text().includes(label))
      .first();

    return (
      span.closest("div").find("span.money").text().trim() || null
    );
  };

  const domesticGross = getMoneyByLabel("Domestic");
  const internationalGross = getMoneyByLabel("International");
  const worldwideGross = getMoneyByLabel("Worldwide");

  const summaryValues = $(".mojo-summary-values");

  const domesticOpening =
    summaryValues
      .find("div")
      .filter(
        (i, el) =>
          $(el).find("span").first().text().trim() === "Domestic Opening"
      )
      .find("span.money")
      .text()
      .trim() || null;

  let internationalOpeningTotal = sumInternationalOpenings($);

  // Re-release title pages only show aggregates; openings live on Original Release
  if (internationalOpeningTotal === 0) {
    const releaseHref = findOriginalReleaseHref($);
    if (releaseHref) {
      const releaseUrl = new URL(releaseHref, BOM_ORIGIN).toString();
      const $release = await fetchBomPage(releaseUrl);
      internationalOpeningTotal = sumInternationalOpenings($release);
    }
  }

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
