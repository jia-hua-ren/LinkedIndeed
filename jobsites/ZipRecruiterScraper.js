class ZiprecruiterScraper extends JobScraper {
  constructor(document, url) {
    super(document, url);
  }

  cleanURL() {
    const lvk = this.url.searchParams.get("lvk");
    return lvk ? `https://www.ziprecruiter.com/jobs/job/i?lvk=${lvk}` : "";
  }

  getTitle() {
    const parent = this.document.querySelector(".grid.gap-y-8");
    const jobTitleEl = parent?.children[0];
    const jobTitle = jobTitleEl?.innerText.trim();
    return jobTitle ? jobTitle : null;
  }

  getCompany() {
    const parent = this.document.querySelector(".grid.gap-y-8");
    const companyNameEl = parent?.children[1];
    const companyName = companyNameEl?.innerText.trim();
    return companyName ? companyName : null;
  }

  /**
   * Salary for ZipRecruiter
   *
   * There is no convenient class name, so this function matches the SVG's path data to find
   * the child element that contains the salary.
   */
  getSalary() {
    const parent = this.document.querySelector("div.flex.flex-col.gap-y-8");
    if (!parent) return null;

    for (const child of parent.children) {
      const salarySvg = child.querySelector(
        'path[d="M16.18 7.463v2.65m0 11.571V24.5M19.271 11.657c-2.314-2.314-6.319-1.104-6.17 1.542.198 3.539 5.21 1.665 6.17 4.629.572 1.763-.676 3.857-3.857 3.856-2.313 0-3.342-1.543-3.856-2.314"]',
      );

      if (salarySvg) {
        return child.querySelector("p")?.innerText.trim();
      }
    }

    return null;
  }

  getLocation() {
    const parent = this.document.querySelector(".grid.gap-y-8");
    const jobLocationEl = parent?.children[2];
    const jobLocation = jobLocationEl?.innerText.trim();
    return jobLocation ? jobLocation : null;
  }
}
