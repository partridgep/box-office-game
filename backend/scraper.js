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

function getMoneyCellText(cell) {
  return cell.find("span.money").text().trim() || cell.text().trim();
}

/**
 * Lists every international territory release (market, release ID, release
 * date, opening, current gross) from either the title-page region tables or
 * release-group tables. Domestic is excluded.
 */
function parseTerritories($) {
  const territories = new Map();

  const addRow = (row) => {
    const cells = $(row).find("td");
    if (cells.length < 4) return;

    const market = cells.eq(0).text().trim();
    const href = cells.eq(0).find('a[href*="/release/rl"]').first().attr("href");
    const releaseId = href?.match(/\/release\/(rl\d+)/)?.[1];
    if (!releaseId || market === "Domestic" || territories.has(releaseId)) return;

    territories.set(releaseId, {
      market,
      releaseId,
      releaseDate: parseLongDate(cells.eq(1).text().trim()),
      opening: parseMoney(getMoneyCellText(cells.eq(2))) || null,
      gross: parseMoney(getMoneyCellText(cells.eq(3))) || null,
    });
  };

  $("h3").each((_, el) => {
    if (!INTERNATIONAL_REGIONS.includes($(el).text().trim())) return;
    $(el).next("table").find("tr").each((_, row) => addRow(row));
  });

  if (territories.size === 0) {
    $("table.releases-by-region").each((_, table) => {
      const header = $(table).find('th[colspan="4"]').first().text().trim();
      if (!INTERNATIONAL_REGIONS.includes(header)) return;
      $(table).find("tr").each((_, row) => addRow(row));
    });
  }

  return [...territories.values()];
}

function findDomesticReleaseId($) {
  const href = $('a[href*="/release/rl"]')
    .filter((_, el) => $(el).text().trim() === "Domestic")
    .first()
    .attr("href");

  const match = href?.match(/\/release\/(rl\d+)/);
  return match ? match[1] : null;
}

async function fetchBomPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept-Language": "en-US,en;q=0.9",
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
  let bomReleaseId = null;
  let territories;

  // Re-release title pages only show aggregates, and their "Domestic" link can
  // point at a re-release; openings and the original releases live on the
  // Original Release group page.
  const releaseHref = findOriginalReleaseHref($);
  if (releaseHref) {
    const releaseUrl = new URL(releaseHref, BOM_ORIGIN).toString();
    const $release = await fetchBomPage(releaseUrl);
    bomReleaseId = findDomesticReleaseId($release);
    territories = parseTerritories($release);
    if (internationalOpeningTotal === 0) {
      internationalOpeningTotal = sumInternationalOpenings($release);
    }
  } else {
    bomReleaseId = findDomesticReleaseId($);
    territories = parseTerritories($);
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
    bomReleaseId,
    territories,
  };
}

const MONTHS = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const PERIOD_COLUMN_TITLES = {
  weekly: { gross: "Weekly Gross", number: "Week" },
  weekend: { gross: "Weekend Gross", number: "Weekend" },
};

function parseInteger(value) {
  if (!value) return null;
  const n = Number(value.replace(/[,+]/g, ""));
  return Number.isInteger(n) ? n : null;
}

function toIsoDate(year, month, day) {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

/** Parses "Jul 17, 2026" or "2026 Jul 17" (BOM varies by locale); null for blanks. */
function parseLongDate(label) {
  const text = label?.replace(/\s+/g, " ").trim();
  if (!text) return null;

  const monthFirst = text.match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/);
  const yearFirst = text.match(/^(\d{4}) ([A-Z][a-z]{2}) (\d{1,2})$/);
  const [monthName, day, year] = monthFirst
    ? [monthFirst[1], monthFirst[2], monthFirst[3]]
    : yearFirst
      ? [yearFirst[2], yearFirst[3], yearFirst[1]]
      : [];

  if (MONTHS[monthName] == null) return null;
  return toIsoDate(Number(year), MONTHS[monthName], Number(day));
}

/**
 * Parses BOM date labels like "Jul 17-23", "Jul 31-Aug 6", or
 * "Dec 26-Jan 1, 1998". The start year comes from the row link
 * (/weekly/2026W29/) since labels usually omit it.
 */
function parsePeriodDates(label, year) {
  const match = label.match(
    /^([A-Z][a-z]{2}) (\d{1,2})-(?:([A-Z][a-z]{2}) )?(\d{1,2})(?:, (\d{4}))?$/
  );
  if (!match) return null;

  const [, startMonthName, startDay, endMonthName, endDay, endYearText] = match;
  const startMonth = MONTHS[startMonthName];
  const endMonth = endMonthName ? MONTHS[endMonthName] : startMonth;
  if (startMonth == null || endMonth == null) return null;

  const endYear = endYearText
    ? Number(endYearText)
    : endMonth < startMonth ? year + 1 : year;
  return {
    startDate: toIsoDate(year, startMonth, Number(startDay)),
    endDate: toIsoDate(endYear, endMonth, Number(endDay)),
  };
}

/**
 * Scrapes a BOM release's weekly or weekend table. Territory (non-domestic)
 * releases only have a weekend table; their rows carry the market's area code.
 * @param {string} releaseId - The BOM release ID (e.g. "rl170295297").
 * @param {"weekly"|"weekend"} periodType
 * @returns {Promise<Object[]>} - One entry per period, holiday rows excluded.
 */
async function scrapeReleasePeriods(releaseId, periodType) {
  const titles = PERIOD_COLUMN_TITLES[periodType];
  if (!releaseId || !titles) {
    throw new Error("Release ID and a valid period type are required");
  }

  const $ = await fetchBomPage(`${BOM_ORIGIN}/release/${releaseId}/${periodType}/`);
  const table = $("table.mojo-body-table").first();
  const rows = table.find("tr");

  const columnIndex = {};
  rows.first().find("th").each((i, th) => {
    const title = $(th).find("[title]").first().attr("title");
    if (title) columnIndex[title] = i;
  });

  const required = ["Date", titles.gross, "Gross To Date"];
  if (required.some((t) => columnIndex[t] == null)) {
    throw new Error(`Unexpected BOM ${periodType} table layout for ${releaseId}`);
  }

  const periods = [];

  rows.slice(1).each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length === 0) return;

    const cellText = (title) =>
      columnIndex[title] == null ? "" : cells.eq(columnIndex[title]).text().trim();

    const dateLink = cells.eq(columnIndex.Date).find("a").first();
    const href = dateLink.attr("href") || "";
    if (href.includes("/occasion/")) return;

    const yearMatch = href.match(/\/(\d{4})W\d+\//);
    if (!yearMatch) return;

    const dates = parsePeriodDates(dateLink.text().trim(), Number(yearMatch[1]));
    if (!dates) return;

    const gross = parseMoney(cellText(titles.gross));
    const grossToDate = parseMoney(cellText("Gross To Date"));

    periods.push({
      area: href.match(/[?&]area=([A-Z0-9]+)/)?.[1] ?? null,
      periodNumber: parseInteger(cellText(titles.number)),
      startDate: dates.startDate,
      endDate: dates.endDate,
      gross: gross || null,
      grossToDate: grossToDate || null,
      rank: parseInteger(cellText("Rank")),
      theaters: parseInteger(cellText("Number of Theaters")),
      isEstimate: cellText("Estimated") === "true",
    });
  });

  return periods;
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
      .first()
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
    scrapeReleasePeriods,
    scrapeRottenTomatoesScore
};
