// LinkedIn-specific extraction helpers for the content script.

/**
 * LinkedIn is a mystery when it comes to class names. They are not human-readable.
 * I basically looked at many LinkedIn job pages and found common patterns like
 * what divs contain what.
 */

class LinkedInScraper extends JobScraper {
  constructor(document, url) {
    super(document, url);
  }

  cleanURL() {
    const match = this.url.pathname.match(/\/jobs\/view\/(\d+)/);
    if (match) return `https://www.linkedin.com/jobs/view/${match[1]}/`;

    const jobId = this.url.searchParams.get("currentJobId");
    if (jobId) return `https://www.linkedin.com/jobs/view/${jobId}/`;

    return "";
  }

  getTitle() {
    return this.extractTitleAndCompanyFromTitleTag().title || null;
  }

  getCompany() {
    return (
      this.extractTitleAndCompanyFromTitleTag().company ||
      this.extractCompanyFromJobPage() ||
      null
    );
  }

  /**
   * The salary of the job is not always present, but if it is present, it is in a <a> element that has
   * an href that directs to the current, same URL to the current job post (weird). So this finds all <a>'s
   * that match the criteria and looks for one whose innerText contains a number.
   */
  getSalary() {
    const currentRawUrl = location.href;
    const salaryLinks = [
      ...this.document.querySelectorAll(`a[href="${currentRawUrl}"]`),
    ].filter((link) => {
      const text = (link.innerText || "").trim();
      return text && /\d/.test(text);
    });

    if (!salaryLinks.length) return null;

    const text = (salaryLinks[0].innerText || "").trim();
    return text || null;
  }

  /** after doing light testing, the p that matches the description is the 5th one,
   * so I am cutting the result array so it doesn't get too big. If there is a bug
   * this can be removed so it can search all.
   */
  getLocation() {
    const p = [...this.document.querySelectorAll("p")]
      .slice(0, 10)
      .find(
        (paragraph) =>
          paragraph.children.length > 0 &&
          [...paragraph.children].every((child) => child.tagName === "SPAN"),
      );

    if (!p) return null;

    const firstSpan = p.querySelector("span");
    if (!firstSpan) return null;

    const text = (firstSpan.innerText || "").trim();
    return text || null;
  }

  /** The specific job site's title will always be a form of Job Title | Company Name | LinkedIn.
   * Therefore, we can extract both from the webpage title tag.
   */

  extractTitleAndCompanyFromTitleTag() {
    const parts = (this.document.title || "")
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length < 3) {
      return { title: null, company: null };
    }

    const lastPart = parts[parts.length - 1];
    if (lastPart !== "LinkedIn") {
      return { title: null, company: null };
    }

    return {
      title: parts[0] || null,
      company: parts[1] || null,
    };
  }

  /** Fallback in case webpage <title> is not present or doesn't match the format,
   * which will almost never happen. But good to remember that the company name is also available
   * in an aria-label attribute. */
  extractCompanyFromJobPage() {
    const companyEl = this.document.querySelector(
      'div[aria-label^="Company, "]',
    );
    if (!companyEl) return null;

    const label = companyEl.getAttribute("aria-label") || "";
    const name = label
      .replace(/^Company,\s*/, "")
      .trim()
      .replace(/\.$/, "");

    return name || null;
  }
}
