// src/services/claudeService.js — Claude API integration for job extraction

const https = require('https');
const { CLAUDE_API_KEY, CLAUDE_MODEL } = require('../config/env');

const SYSTEM_PROMPT = `You are a job posting parser. Given raw text from a job board page, extract the following fields and return ONLY a valid JSON object with these exact keys:

{
  "company": "Company name (string)",
  "role": "Job title / role (string)",
  "location": "Location or Remote (string, can be empty)",
  "pay": "Salary / compensation if mentioned (string, can be empty)",
  "url": "Job posting URL if present in text (string, can be empty)",
  "notes": "Key requirements, tech stack, or notable details in 1-2 sentences (string, can be empty)"
}

Rules:
- Return ONLY the JSON object, no markdown, no commentary.
- If a field cannot be found, use an empty string "".
- For pay, include the currency symbol and range if visible (e.g. "$120k–$150k").
- For notes, prioritize tech stack, years of experience required, and team size if mentioned.`;

/**
 * Extract structured job info from raw page text using Claude.
 * @param {string} text  Raw page text (max ~8000 chars)
 * @param {string} url   Page URL (hint for Claude)
 * @param {string} title Page title (hint for Claude)
 * @returns {Promise<object>} Parsed job fields
 */
async function extractJobData(text, url = '', title = '') {
  const userMessage = `URL: ${url}\nPage title: ${title}\n\n--- PAGE TEXT ---\n${text}`;

  const body = JSON.stringify({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = await httpsPost('api.anthropic.com', '/v1/messages', body, {
    'Content-Type': 'application/json',
    'x-api-key': CLAUDE_API_KEY,
    'anthropic-version': '2023-06-01',
  });

  const parsed = JSON.parse(raw);
  if (parsed.error) throw new Error(parsed.error.message || 'Claude API error');

  const content = parsed.content?.[0]?.text || '';
  // Strip any accidental markdown code fences
  const jsonText = content.replace(/```(?:json)?/g, '').trim();

  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error('Claude returned non-JSON response: ' + content.slice(0, 200));
  }
}

/**
 * Simple HTTPS POST helper (no external deps).
 */
function httpsPost(hostname, path, body, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        path,
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { extractJobData };
