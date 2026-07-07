// content.js — Linked, Indeed! content script
// Runs on supported job sites and extracts job info + cleans URLs

(function () {
  if (window.linkedIndeedInitialized) {
    return;
  }
  window.linkedIndeedInitialized = true;

  const site = detectJobPageSite(location.href);

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "getJobInfo") {
      const info = extractJobInfo();
      sendResponse(info);
    }
    return true;
  });

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
      case "": {
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
      case "ashby": {
        return AshbyJobSite.cleanURL(url);
        break;
      }
      case "ziprecruiter": {
        return ZiprecruiterJobSite.cleanURL(url);
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

      case "ashby":
        jobInfo = AshbyJobSite.extractJobInfo(document);
        break;

      case "ziprecruiter":
        jobInfo = ZiprecruiterJobSite.extractJobInfo(document);
        break;

      case "":
        return {
          site,
          title: null,
          company: null,
          location: null,
          salary: null,
          cleanUrl: "",
        };
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
