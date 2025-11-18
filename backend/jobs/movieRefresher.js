const cron = require("node-cron");
const runMovieRefresh = require("./runMovieRefresh");

console.log("Movie refresher service initialized...");

const scheduleMovieRefresh = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("CRON: Starting daily movie update (midnight)...");
    await runMovieRefresh();
  });
};

module.exports = scheduleMovieRefresh;

