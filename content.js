// content.js — Linked, Indeed! content script
// ONLY runs on supported platforms' specific job pages, extracts job info + cleans URLs

(function () {
  // Once set, as long as the page is alive, it will always be true. Used to prevent re-intialization
  window.linkedIndeedInitialized = true;

  const site = detectJobPageSite(location.href);

  /**
   * Create the correct Scraper object based on the current site.
   */
  let jobScraper = null;

  switch (site) {
    case "indeed":
      jobScraper = new IndeedScraper(document, location.href);
      break;
    case "linkedin":
      jobScraper = new LinkedInScraper(document, location.href);
      break;
    case "greenhouse":
      jobScraper = new GreenhouseScraper(document, location.href);
      break;
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "getInitialized") {
      sendResponse(window.linkedIndeedInitialized);
    } else if (msg.action === "getJobInfo") {
      const info = jobScraper.getJobInfo();
      sendResponse(info);
    }
    return true;
  });
})();
