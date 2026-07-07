const {
  detectJobPageSite,
  isSupportedJobSite,
  isIndeedJobUrl,
  isLinkedInJobUrl,
  isGreenhouseJobUrl,
  isAshbyJobUrl,
  isZiprecruiterJobUrl,
} = require("../urlUtils");

describe("urlUtils", () => {
  test("detects supported job page URLs", () => {
    expect(
      detectJobPageSite("https://www.indeed.com/viewjob?jk=abc123&from=web"),
    ).toBe("indeed");
    expect(
      detectJobPageSite(
        "https://www.linkedin.com/jobs/view/1234567890/?currentJobId=1234567890",
      ),
    ).toBe("linkedin");
    expect(
      detectJobPageSite("https://job-boards.greenhouse.io/acme/jobs/42"),
    ).toBe("greenhouse");
    expect(
      detectJobPageSite("https://jobs.ashbyhq.com/acme/frontend-engineer"),
    ).toBe("ashby");
    expect(
      detectJobPageSite("https://www.ziprecruiter.com/jobs/job/i?lvk=abc"),
    ).toBe("ziprecruiter");
  });

  test("returns an empty string for unsupported pages", () => {
    expect(detectJobPageSite("https://example.com/jobs/123")).toBe("");
  });

  test("identifies supported site families", () => {
    expect(isSupportedJobSite(new URL("https://www.indeed.com/jobs"))).toBe(
      true,
    );
    expect(isSupportedJobSite(new URL("https://www.linkedin.com/feed"))).toBe(
      true,
    );
    expect(isSupportedJobSite(new URL("https://jobs.ashbyhq.com/acme"))).toBe(
      true,
    );
    expect(isSupportedJobSite(new URL("https://example.com"))).toBe(false);
  });

  test("matches specific site URL checks", () => {
    expect(
      isIndeedJobUrl(new URL("https://www.indeed.com/viewjob?jk=abc")),
    ).toBe(true);
    expect(
      isLinkedInJobUrl(new URL("https://www.linkedin.com/jobs/view/123/")),
    ).toBe(true);
    expect(
      isGreenhouseJobUrl(
        new URL("https://job-boards.greenhouse.io/acme/jobs/1"),
      ),
    ).toBe(true);
    expect(
      isAshbyJobUrl(new URL("https://jobs.ashbyhq.com/acme/frontend")),
    ).toBe(true);
    expect(
      isZiprecruiterJobUrl(
        new URL("https://www.ziprecruiter.com/jobs/job/i?lvk=abc"),
      ),
    ).toBe(true);
  });
});
