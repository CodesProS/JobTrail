// content.js — JobTrail page scraper
// Runs on all job board pages, extracts text for Claude to parse

(function () {
  /**
   * Attempt to get job-relevant text from the page.
   * Strategy: prefer known job board selectors, fall back to full body text.
   */
  function scrapeJobText() {
    const selectors = {
      // LinkedIn Jobs
      linkedin: [
        '.job-view-layout',
        '.jobs-description',
        '.jobs-unified-top-card',
        '.job-details-jobs-unified-top-card__job-title',
        '.jobs-description-content',
      ],
      // Greenhouse
      greenhouse: [
        '#app',
        '.app-body',
        '.job-post',
      ],
      // Lever
      lever: [
        '.content',
        '.posting-header',
        '.posting-description',
      ],
      // Ashby
      ashby: [
        '[data-qa="job-board-job-posting"]',
        '.ashby-job-posting-right-panel',
        'main',
      ],
      // Workday
      workday: [
        '[data-automation-id="jobPostingHeader"]',
        '[data-automation-id="jobPostingDescription"]',
        '[data-automation-id="job-posting-details"]',
      ],
      // Indeed
      indeed: [
        '#jobDescriptionText',
        '.jobsearch-JobComponent',
        '.jobsearch-ViewJobLayout',
      ],
      // Handshake
      handshake: [
        '[data-hook="job-description"]',
        '.style__job-description',
        'main',
      ],
    };

    // Flatten all selectors and try each
    const allSelectors = Object.values(selectors).flat();
    for (const selector of allSelectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.innerText && el.innerText.trim().length > 200) {
          return cleanText(el.innerText);
        }
      } catch (e) {
        // ignore invalid selectors
      }
    }

    // Final fallback: full body text
    return cleanText(document.body.innerText);
  }

  /**
   * Clean up scraped text: collapse whitespace, trim, limit length.
   */
  function cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, 2500); // cap to stay within Groq TPM limits
  }

  /**
   * Get the canonical URL (prefer og:url, fall back to window.location.href)
   */
  function getJobUrl() {
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl && ogUrl.content) return ogUrl.content;
    return window.location.href;
  }

  /**
   * Listen for scrape requests from the popup.
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SCRAPE_JOB') {
      try {
        const text = scrapeJobText();
        const url = getJobUrl();
        const title = document.title || '';
        sendResponse({
          success: true,
          data: { text, url, title },
        });
      } catch (err) {
        sendResponse({
          success: false,
          error: err.message,
        });
      }
      return true; // keep channel open for async response
    }
  });

  // Signal to popup that content script is loaded
  chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' }).catch(() => {
    // popup may not be open yet — that's fine
  });
})();
