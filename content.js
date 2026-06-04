// content.js — Linked, Indeed! content script
// Runs on supported job sites and extracts job info + cleans URLs

(function () {
  const site = detectSite();

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "getJobInfo") {
      const info = extractJobInfo();
      sendResponse(info);
    }
    return true;
  });

  /**
   * Determines which supported site the current page represents based on the
   * location URL. This only returns a valid result if the site is a URL to a
   * specific job post on a supported platform (e.g. if on Indeed homepage only,
   * which has no job info, it would not return 'indeed').
   *
   * Returns one of: 'indeed', 'linkedin', 'greenhouse', or 'unknown'.
   *
   * No parameters — reads `location.href`.
   */
  function detectSite() {
    const url = new URL(location.href);

    if (
      url.origin === "https://www.indeed.com" &&
      url.pathname.startsWith("/viewjob")
    )
      return "indeed";

    if (
      url.origin === "https://www.linkedin.com" &&
      url.pathname.startsWith("/jobs/view/")
    )
      return "linkedin";

    if (url.hostname === "job-boards.greenhouse.io") return "greenhouse";

    return "unknown";
  }

  /**
   * Shortens the URL to the job post page by stripping unnecessary query
   * parameters, keeping only the necessary one (often some form of
   * jobkey or jobid)
   *
   * No parameters - reads `location.href` and `site` variable.
   *
   * Returns a string containing the canonical URL, or an empty string when no
   * canonical form can be determined.
   */
  function cleanURL() {
    const url = new URL(location.href);

    switch (site) {
      case "unknown": {
        return "";
      }
      case "indeed": {
        return IndeedJobSite.cleanURL(url);
        break;
      }
      case "linkedin": {
        return LinkedInJobSite.cleanURL(url);
        break;
      }
      case "greenhouse": {
        return GreenhouseJobSite.cleanURL(url);
        break;
      }
      // other sites fall through to the generic fallback
    }

    // If site is not specially handled above, return an empty string
    // (we only produce cleaned URLs for known sites)
    return "";
  }

  /**
   * Attempt to extract visible job fields from the page DOM. Each site has
   * its own heuristics and fallbacks. The function returns an object with
   * fields `{ site, title, company, location, salary, cleanUrl }` where
   * missing fields are `null`.
   *
   * No parameters — reads `site` variable and the DOM.
   *
   * TODO: make each job site extraction independent functions for easier maintenance and testing.
   * TODO: fix linkedin extraction
   * Returns: Object {site, title, company, location, salary, cleanUrl}
   */
  function extractJobInfo() {
    let title = null,
      company = null,
      jobLocation = null,
      salary = null;

    switch (site) {
      case "indeed":
        const indeedInfo = IndeedJobSite.extractJobInfo(document);
        title = indeedInfo.title;
        company = indeedInfo.company;
        jobLocation = indeedInfo.location;
        salary = indeedInfo.salary;

        break;

      /* LinkedIn is the worst for this because they don't have real class names */
      case "linkedin":
        const linkedinInfo = LinkedInJobSite.extractJobInfo(document);
        title = linkedinInfo.title;
        company = linkedinInfo.company;
        jobLocation = linkedinInfo.location;
        salary = linkedinInfo.salary;

        break;

      case "greenhouse":
        const greenhouseInfo = GreenhouseJobSite.extractJobInfo(document);
        title = greenhouseInfo.title;
        company = greenhouseInfo.company;
        jobLocation = greenhouseInfo.location;
        salary = greenhouseInfo.salary;

        break;
    }

    return {
      site,
      title: title || document.title || null,
      company: company || null,
      location: jobLocation || null,
      salary: salary || null,
      cleanUrl: cleanURL(),
    };
  }
})();
