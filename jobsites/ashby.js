// Ashby-specific extraction helpers for the content script.

const root = typeof window !== "undefined" ? window : globalThis;

root.AshbyJobSite = root.AshbyJobSite || {
  cleanURL(url) {
    const match = url.pathname.match(
      /^\/([A-Za-z0-9-]+)\/([A-Za-z0-9-]+)(?:\/.*)?$/,
    );
    return match ? `${url.origin}/${match[1]}/${match[2]}` : "";
  },

  extractJobInfo(document) {
    const leftPane = document.querySelector(".ashby-job-posting-left-pane");

    return {
      title:
        document
          .querySelector("h1.ashby-job-posting-heading")
          ?.innerText.trim() || null,

      company: this.extractCompanyFromURL(location),

      location: this.extractLocation(leftPane),

      salary: this.extractSalary(leftPane),
    };
  },

  extractCompanyFromURL(url) {
    const match = url.pathname.match(/^\/([A-Za-z0-9-]+)\/[A-Za-z0-9-]+\/?$/);
    if (!match) return null;

    return decodeURIComponent(match[1]).replace(/-/g, " ");
  },

  extractSalary(leftPane) {
    const heading = [...leftPane.querySelectorAll("h2")].find(
      (h2) => h2.innerText.trim().toLowerCase() === "compensation",
    );
    return (
      heading?.parentElement?.querySelector("ul")?.innerText.trim() || null
    );
  },

  extractLocation(leftPane) {
    const heading = [...leftPane.querySelectorAll("h2")].find(
      (h2) => h2.innerText.trim().toLowerCase() === "location",
    );

    return heading?.parentElement?.querySelector("p")?.innerText.trim() || null;
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = root.AshbyJobSite;
}
