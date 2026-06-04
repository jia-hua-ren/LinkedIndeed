// content.js — Linked, Indeed! content script
// Runs on supported job sites and extracts job info + cleans URLs

(function () {
  if (window.linkedIndeedInitialized) {
    return;
  }
  window.linkedIndeedInitialized = true;

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
   * Returns: Object {site, title, company, location, salary, cleanUrl}
   */
  function extractJobInfo() {
    let title = null,
      company = null,
      jobLocation = null,
      salary = null;

    let jobInfo = null;

    switch (site) {
      case "indeed":
        jobInfo = IndeedJobSite.extractJobInfo(document);
        break;

      /* LinkedIn is the worst for this because they don't have real class names */
      case "linkedin":
        jobInfo = LinkedInJobSite.extractJobInfo(document);
        break;

      case "greenhouse":
        jobInfo = GreenhouseJobSite.extractJobInfo(document);
        break;
    }

    title = jobInfo.title;
    company = jobInfo.company;
    jobLocation = jobInfo.location;
    salary = jobInfo.salary;

    return {
      site,
      title: title || null,
      company: company || null,
      location: jobLocation || null,
      salary: salary || null,
      cleanUrl: cleanURL(),
    };
  }
})();
