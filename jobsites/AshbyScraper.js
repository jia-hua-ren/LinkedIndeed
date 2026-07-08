// Ashby-specific extraction helpers for the content script.

class AshbyScraper extends JobScraper {
  constructor(document, url) {
    super(document, url);
  }

  cleanURL() {
    const match = this.url.pathname.match(
      /^\/([A-Za-z0-9-]+)\/([A-Za-z0-9-]+)(?:\/.*)?$/,
    );
    return match ? `${this.url.origin}/${match[1]}/${match[2]}` : "";
  }

  getTitle() {
    return (
      this.document
        .querySelector("h1.ashby-job-posting-heading")
        ?.innerText.trim() || null
    );
  }

  getCompany() {
    return this.extractCompanyFromURL() || null;
  }

  getSalary() {
    const leftPane = this.document.querySelector(
      ".ashby-job-posting-left-pane",
    );
    if (!leftPane) return null;

    const heading = [...leftPane.querySelectorAll("h2")].find(
      (h2) => h2.innerText.trim().toLowerCase() === "compensation",
    );
    return (
      heading?.parentElement?.querySelector("ul")?.innerText.trim() || null
    );
  }

  getLocation() {
    const leftPane = this.document.querySelector(
      ".ashby-job-posting-left-pane",
    );
    if (!leftPane) return null;

    const heading = [...leftPane.querySelectorAll("h2")].find(
      (h2) => h2.innerText.trim().toLowerCase() === "location",
    );

    return heading?.parentElement?.querySelector("p")?.innerText.trim() || null;
  }

  extractCompanyFromURL() {
    const match = this.url.pathname.match(
      /^\/([A-Za-z0-9-]+)\/([A-Za-z0-9-]+)\/?$/,
    );
    if (!match) return null;

    return decodeURIComponent(match[1]).replace(/-/g, " ");
  }
}
