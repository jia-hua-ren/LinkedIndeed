// Indeed-specific extraction helpers for the content script.

window.IndeedJobSite = window.IndeedJobSite || {
  cleanURL(url) {
    const jk = url.searchParams.get("jk");
    return jk ? `https://www.indeed.com/viewjob?jk=${jk}` : "";
  },

  extractJobInfo(document) {
    const titleEl =
      document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]') ||
      document.querySelector(".jobsearch-JobInfoHeader-title");

    const companyEl =
      document.querySelector('[data-testid="inlineHeader-companyName"]') ||
      document.querySelector('[data-company-name="true"]');

    const locationEl = document.querySelector(
      '[data-testid="inlineHeader-companyLocation"]',
    );

    return {
      title: titleEl ? titleEl.innerText.trim() : null,
      company: companyEl ? companyEl.innerText.trim() : null,
      location: locationEl ? locationEl.innerText.trim() : null,
      salary: this.extractSalary(document),
    };
  },

  extractSalary(document) {
    const salaryEl = document.querySelector("#salaryInfoAndJobType span");
    return salaryEl ? salaryEl.innerText.trim() : null;
  },
};
