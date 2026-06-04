// LinkedIn-specific extraction helpers for the content script.

/**
 * LinkedIn is a mystery when it comes to class names. They are not human-readable.
 * I basically looked at many LinkedIn job pages and found common patterns like
 * what divs contain what.
 */

const LinkedInJobSite = {
  cleanURL(url) {
    const match = url.pathname.match(/\/jobs\/view\/(\d+)/);
    if (match) return `https://www.linkedin.com/jobs/view/${match[1]}/`;

    const jobId = url.searchParams.get("currentJobId");
    if (jobId) return `https://www.linkedin.com/jobs/view/${jobId}/`;

    return "";
  },

  extractJobInfo(document) {
    const titleAndCompany = this.extractTitleAndCompanyFromTitleTag(document);

    return {
      title: titleAndCompany.title || null,
      company:
        titleAndCompany.company ||
        this.extractCompanyFromJobPage(document) ||
        null,
      location: this.extractLocation(document),
      salary: this.extractSalary(document),
    };
  },

  /**
   * The salary of the job is not always present, but if it is present, it is in a <a> element that has
   * an href that directs to the current, same URL to the current job post (weird). So this finds all <a>'s
   * that match the criteria and looks for one whose innerText contains a number.
   */

  extractSalary(document) {
    const currentRawUrl = location.href;
    const salaryLinks = [
      ...document.querySelectorAll(`a[href="${currentRawUrl}"]`),
    ].filter((link) => {
      const text = (link.innerText || "").trim();
      return text && /\d/.test(text);
    });

    if (!salaryLinks.length) return null;

    const text = (salaryLinks[0].innerText || "").trim();
    return text || null;
  },

  /** The specific job site's title will always be a form of Job Title | Company Name | LinkedIn.
   * Therefore, we can extract both from the webpage title tag.
   */

  extractTitleAndCompanyFromTitleTag(document) {
    const parts = (document.title || "")
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
  },

  /** Fallback in case webpage <title> is not present or doesn't match the format,
   * which will almost never happen. But good to remember that the company name is also available
   * in an aria-label attribute. */
  extractCompanyFromJobPage(document) {
    const companyEl = document.querySelector('div[aria-label^="Company, "]');
    if (!companyEl) return null;

    const label = companyEl.getAttribute("aria-label") || "";
    const name = label
      .replace(/^Company,\s*/, "")
      .trim()
      .replace(/\.$/, "");

    return name || null;
  },

  /** after doing light testing, the p that matches the description is the 5th one,
   * so I am cutting the result array so it doesn't get too big. If there is a bug
   * this can be removed so it can search all.
   */
  extractLocation(document) {
    const p = [...document.querySelectorAll("p")]
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
  },
};
