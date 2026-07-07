const root = typeof window !== "undefined" ? window : globalThis;

root.ZiprecruiterJobSite = root.ZiprecruiterJobSite || {
  cleanURL(url) {
    const lvk = url.searchParams.get("lvk");
    return lvk ? `https://www.ziprecruiter.com/jobs/job/i?lvk=${lvk}` : "";
  },

  extractJobInfo(document) {
    const parent = document.querySelector(".grid.gap-y-8");

    let jobTitle = null;
    let companyName = null;
    let jobLocation = null;

    const jobTitleEl = parent.children[0];
    const companyNameEl = parent.children[1];
    const jobLocationEl = parent.children[2];

    jobTitle = jobTitleEl?.innerText.trim();
    companyName = companyNameEl?.innerText.trim();
    jobLocation = jobLocationEl?.innerText.trim();

    return {
      title: jobTitle ? jobTitle : null,
      company: companyName ? companyName : null,
      location: jobLocation ? jobLocation : null,
      salary: this.extractSalary(document),
    };
  },

  /**
   * Salary for ZipRecruiter
   *
   * there is no convenient class name, so this function matches the SVG's path data to find
   * the child element that contains the salary
   */

  extractSalary(document) {
    const parent = document.querySelector("div.flex.flex-col.gap-y-8");

    for (const child of parent.children) {
      const salarySvg = child.querySelector(
        'path[d="M16.18 7.463v2.65m0 11.571V24.5M19.271 11.657c-2.314-2.314-6.319-1.104-6.17 1.542.198 3.539 5.21 1.665 6.17 4.629.572 1.763-.676 3.857-3.857 3.856-2.313 0-3.342-1.543-3.856-2.314"]',
      );

      if (salarySvg) {
        return child.querySelector("p")?.innerText.trim();
      }
    }

    return null;
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = root.ZiprecruiterJobSite;
}
