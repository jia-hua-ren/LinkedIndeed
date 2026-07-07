/**
 * Check whether a URL points to an Indeed job page.
 *
 * Parameters:
 *  - url: URL instance
 * Returns: boolean
 */
function isIndeedJobUrl(url) {
  return (
    url.origin === "https://www.indeed.com" &&
    url.pathname.startsWith("/viewjob")
  );
}

/**
 * Check whether a URL points to a LinkedIn job page.
 *
 * Parameters:
 *  - url: URL instance
 * Returns: boolean
 */
function isLinkedInJobUrl(url) {
  return (
    url.origin === "https://www.linkedin.com" &&
    url.pathname.startsWith("/jobs/view/")
  );
}

/**
 * Check whether a URL is the Greenhouse job-boards host.
 *
 * Parameters:
 *  - url: URL instance
 * Returns: boolean
 */
function isGreenhouseJobUrl(url) {
  return url.hostname === "job-boards.greenhouse.io";
}

/**
 * Check whether a URL points to an Ashby job page.
 *
 * Parameters:
 *  - url: URL instance
 * Returns: boolean
 */
function isAshbyJobUrl(url) {
  return (
    url.hostname === "jobs.ashbyhq.com" &&
    /^\/[A-Za-z0-9-]+\/[A-Za-z0-9-]+(?:\/.*)?$/.test(url.pathname)
  );
}

function isZiprecruiterJobUrl(url) {
  console.log("isZiprecruiterJobUrl", url.origin, url.pathname);
  return (
    url.origin === "https://www.ziprecruiter.com" &&
    url.pathname.startsWith("/jobs/job/")
  );
}

/**
 * Determines which supported site the current page represents based on the
 * location URL. This only returns a valid result if the site is a URL to a
 * specific job post on a supported platform (e.g. if on Indeed homepage only,
 * which has no job info, it would not return 'indeed').
 *
 * Returns one of: 'indeed', 'linkedin', 'greenhouse', 'ashby', 'ziprecruiter' or "" (empty string).
 *
 * Parameter - the URL that needs testing.
 */
function detectJobPageSite(url) {
  const urlObj = new URL(url);

  if (isIndeedJobUrl(urlObj)) return "indeed";

  if (isLinkedInJobUrl(urlObj)) return "linkedin";

  if (isGreenhouseJobUrl(urlObj)) return "greenhouse";

  if (isAshbyJobUrl(urlObj)) return "ashby";

  if (isZiprecruiterJobUrl(urlObj)) return "ziprecruiter";

  return "";
}

/**
 * Looser check to determine if the current origin belongs to a supported
 * site family (used to distinguish unrelated sites from listing pages).
 *
 * Parameters:
 *  - url: URL instance
 * Returns: boolean
 */
function isSupportedJobSite(url) {
  return (
    url.origin === "https://www.indeed.com" ||
    url.origin === "https://www.linkedin.com" ||
    url.hostname.endsWith("greenhouse.io") ||
    url.hostname.endsWith("ashbyhq.com") ||
    url.hostname.endsWith("ziprecruiter.com")
  );
}
