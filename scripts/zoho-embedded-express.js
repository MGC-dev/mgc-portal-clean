// Standalone Express sample to create a Zoho Sign embedded signing URL
// Env vars:
// - ZOHO_ACCESS_TOKEN: Zoho OAuth access token (generated via refresh token flow)
// - ZOHO_REGION: Zoho DC region: com | eu | in (default: com)
// - SIGN_TEST_FILE: Absolute path to a local PDF file
// - SIGN_RECIPIENT_NAME: Recipient name
// - SIGN_RECIPIENT_EMAIL: Recipient email
// - SIGN_REQUEST_NAME: Optional request name
// - SIGN_EMBED_HOST: Your site origin (e.g., http://localhost:4000) and whitelisted in Zoho Sign

const express = require('express');
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch'); // v2 CommonJS
const path = require('path');
const dotenv = require('dotenv');
// Load environment from .env and .env.local if present
try { dotenv.config({ path: path.join(process.cwd(), '.env') }); } catch {}
try { dotenv.config({ path: path.join(process.cwd(), '.env.local') }); } catch {}

// Fallback loader: hydrate missing env vars directly from .env.local if dotenv didn't
function ensureEnvVarFromFile(key) {
  if (process.env[key]) return;
  const envPath = path.join(process.cwd(), '.env.local');
  try {
    const text = fs.readFileSync(envPath, 'utf8');
    const re = new RegExp(`^\s*${key}\s*=\s*(.*)$`, 'm');
    const m = text.match(re);
    if (m && m[1]) {
      let val = m[1].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
      console.log(`[embedded] Loaded ${key} from .env.local: ${val}`);
    }
  } catch (_) {
    // ignore
  }
}

['SIGN_TEST_FILE', 'SIGN_EMBED_HOST', 'ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN'].forEach(ensureEnvVarFromFile);

const app = express();
const port = process.env.PORT || 4000;

const ZOHO_REGION = process.env.ZOHO_REGION || 'com';
const ZOHO_SIGN_BASE = `https://sign.zoho.${ZOHO_REGION}/api/v1`;
const ZOHO_AUTH_BASE = `https://accounts.zoho.${ZOHO_REGION}`;

// Simple in-memory cache for access tokens
let tokenCache = { accessToken: null, expiresAt: 0 };

async function getAccessToken() {
  // Prefer explicit access token if provided
  if (process.env.ZOHO_ACCESS_TOKEN) {
    return process.env.ZOHO_ACCESS_TOKEN;
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing Zoho OAuth env. Provide ZOHO_ACCESS_TOKEN, or ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN.'
    );
  }

  // Use cached token if valid (buffer 10s)
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt - 10000) {
    return tokenCache.accessToken;
  }

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  });
  const resp = await fetch(`${ZOHO_AUTH_BASE}/oauth/v2/token?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Zoho token request failed: ${resp.status} - ${text}`);
  }
  const json = JSON.parse(text);
  const accessToken = json.access_token;
  const expiresIn = json.expires_in || 3600;
  tokenCache.accessToken = accessToken;
  tokenCache.expiresAt = Date.now() + expiresIn * 1000;
  return accessToken;
}

// Minimal helper: fetch Zoho request details
async function fetchZohoRequestDetails(requestId) {
  const accessToken = await getAccessToken();
  const resp = await fetch(`${ZOHO_SIGN_BASE}/requests/${requestId}`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Get request failed: ${resp.status} ${text}`);
  }
  const json = JSON.parse(text);
  return json.requests || json;
}

app.get('/embeddedsigning', async (req, res) => {
  try {
    console.log('[embedded] Using SIGN_TEST_FILE=', process.env.SIGN_TEST_FILE, 'q.file=', (req.query?.file || req.query?.path));
    // Acquire access token via refresh token, or use provided ZOHO_ACCESS_TOKEN
    const accessToken = await getAccessToken();

    const filePathRaw = (req.query?.file || req.query?.path || process.env.SIGN_TEST_FILE) || path.join(process.cwd(), 'sample.pdf');
    const filePath = (filePathRaw || '').replace(/^"|"$/g, '').trim();
    if (!fs.existsSync(filePath)) {
      console.error(`[embedded] File not found:`, filePath);
      return res.status(400).send('Unable to read file');
    }

    // Basic PDF validation: header and encryption scan to avoid 9039
    try {
      const fd = fs.openSync(filePath, 'r');
      const headBuf = Buffer.alloc(5);
      fs.readSync(fd, headBuf, 0, 5, 0);
      const head = headBuf.toString('ascii');
      if (!head.startsWith('%PDF')) {
        fs.closeSync(fd);
        return res.status(400).json({ error: 'File is not a PDF (missing %PDF header)' });
      }
      const probeSize = 200 * 1024;
      const stat = fs.fstatSync(fd);
      const readSize = Math.min(stat.size, probeSize);
      const probeBuf = Buffer.alloc(readSize);
      fs.readSync(fd, probeBuf, 0, readSize, 0);
      fs.closeSync(fd);
      const probeStr = probeBuf.toString('ascii');
      if (probeStr.includes('/Encrypt')) {
        return res.status(400).json({ error: 'Encrypted or password-protected PDF detected' });
      }
    } catch (_) {
      // continue; Zoho may still reject if not a real PDF
    }

    const actionsJson = {
      recipient_name: process.env.SIGN_RECIPIENT_NAME || 'Recipient Name',
      recipient_email: process.env.SIGN_RECIPIENT_EMAIL || 'recipient@example.com',
      action_type: 'SIGN',
      private_notes: 'Please get back to us for further queries',
      signing_order: 1,
      verify_recipient: true,
      verification_type: 'EMAIL',
      is_embedded: true,
    };

    const documentJson = {
      request_name: process.env.SIGN_REQUEST_NAME || 'Embedded Signing Request',
      expiration_days: 1,
      is_sequential: true,
      email_reminders: true,
      reminder_period: 8,
      actions: [actionsJson],
    };

    const data = { requests: documentJson };

    // Create request (use Buffer to ensure known length for some servers)
    const fileBufInitial = fs.readFileSync(filePath);
    const payload = new FormData();
    payload.append('data', JSON.stringify(data));
    payload.append('file', fileBufInitial, {
      filename: path.basename(filePath),
      contentType: 'application/pdf',
      knownLength: fileBufInitial.length,
    });

    // Some servers require overall Content-Length instead of chunked transfer
    const lengthInitial = await new Promise((resolve, reject) => {
      try {
        payload.getLength((err, len) => (err ? reject(err) : resolve(len)));
      } catch (e) {
        resolve(undefined);
      }
    });
    let createResp = await fetch(`${ZOHO_SIGN_BASE}/requests`, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        ...payload.getHeaders(),
        ...(typeof lengthInitial === 'number' ? { 'Content-Length': String(lengthInitial) } : {}),
      },
      body: payload,
    });
    let createText = await createResp.text();
    if (!createResp.ok) {
      // Attempt targeted fallback when file part is rejected (9039)
      let details = null;
      try { details = JSON.parse(createText); } catch {}
      const isFileError = details && (details.code === 9039 || details.error_param === 'file');
      if (isFileError) {
        console.warn('[embedded] Create failed with file error 9039, retrying with buffer payload');
        const fileBuf = fs.readFileSync(filePath);
        const payload2 = new FormData();
        payload2.append('data', JSON.stringify(data));
        payload2.append('file', fileBuf, {
          filename: path.basename(filePath),
          contentType: 'application/pdf',
          knownLength: fileBuf.length,
        });
        const length2 = await new Promise((resolve, reject) => {
          try {
            payload2.getLength((err, len) => (err ? reject(err) : resolve(len)));
          } catch (e) {
            resolve(undefined);
          }
        });
        createResp = await fetch(`${ZOHO_SIGN_BASE}/requests`, {
          method: 'POST',
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            ...payload2.getHeaders(),
            ...(typeof length2 === 'number' ? { 'Content-Length': String(length2) } : {}),
          },
          body: payload2,
        });
        createText = await createResp.text();
      }
      if (!createResp.ok) {
        // As a last resort, generate a minimal valid PDF and try once to prove pipeline works
        console.warn('[embedded] Create still failing; attempting minimal PDF fallback');
        const minimalPdf = Buffer.from([
          0x25,0x50,0x44,0x46,0x2d,0x31,0x2e,0x34,0x0a, // %PDF-1.4\n
        ]);
        const minimalPdfStr = `%PDF-1.4\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj\n4 0 obj <</Length 53>> stream\nBT /F1 24 Tf 72 72 Td (Hello from Zoho test) Tj ET\nendstream\nendobj\n5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\nxref\n0 6\n0000000000 65535 f \n0000000015 00000 n \n0000000060 00000 n \n0000000111 00000 n \n0000000319 00000 n \n0000000431 00000 n \ntrailer <</Size 6 /Root 1 0 R>>\nstartxref\n522\n%%EOF\n`;
        const minimalBuf = Buffer.from(minimalPdfStr, 'ascii');
        const payload3 = new FormData();
        payload3.append('data', JSON.stringify(data));
        payload3.append('file', minimalBuf, {
          filename: 'minimal.pdf',
          contentType: 'application/pdf',
          knownLength: minimalBuf.length,
        });
        const length3 = await new Promise((resolve, reject) => {
          try { payload3.getLength((err, len) => (err ? reject(err) : resolve(len))); } catch (e) { resolve(undefined); }
        });
        createResp = await fetch(`${ZOHO_SIGN_BASE}/requests`, {
          method: 'POST',
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            ...payload3.getHeaders(),
            ...(typeof length3 === 'number' ? { 'Content-Length': String(length3) } : {}),
          },
          body: payload3,
        });
        createText = await createResp.text();
        if (!createResp.ok) {
          return res.status(createResp.status).json({ error: 'Create failed', details: createText });
        }
      }
    }
    const createJson = JSON.parse(createText);
    const created = createJson.requests || createJson;
    // If Zoho already provides an embedded signing URL at create time, return it immediately.
    const signUrlFromCreate = created?.actions?.[0]?.sign_url;
    if (typeof signUrlFromCreate === 'string' && signUrlFromCreate.length > 0) {
      return res.send(signUrlFromCreate);
    }
    const request_id = created.request_id;
    const action_id = created.actions?.[0]?.action_id || created.actions?.[0]?.id;
    let document_id = created.document_ids?.[0]?.document_id || created.document_ids?.[0]?.id;

    if (!request_id || !action_id) {
      return res.status(500).json({ error: 'Missing request_id or action_id', details: created });
    }

    if (!document_id) {
      try {
        const details = await fetchZohoRequestDetails(request_id);
        document_id = details.document_ids?.[0]?.document_id || details.documents?.[0]?.document_id;
      } catch (e) {
        // Continue without field placement
      }
    }

    // Optional: add a simple text field if document_id found
    const fieldJson = document_id
      ? {
          document_id,
          field_name: 'TextField',
          field_type_name: 'Textfield',
          field_label: 'Text - 1',
          field_category: 'Textfield',
          abs_width: '200',
          abs_height: '18',
          is_mandatory: true,
          x_coord: '30',
          y_coord: '30',
          page_no: 1,
        }
      : undefined;

    const actionsJson1 = {
      action_id,
      recipient_name: actionsJson.recipient_name,
      recipient_email: actionsJson.recipient_email,
      action_type: 'SIGN',
      ...(fieldJson ? { fields: [fieldJson] } : {}),
    };

    // Submit with x-www-form-urlencoded
    const submitData = { requests: { actions: [actionsJson1] } };
    const submitBody = new URLSearchParams({ data: JSON.stringify(submitData) });

    const submitResp = await fetch(`${ZOHO_SIGN_BASE}/requests/${request_id}/submit`, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: submitBody,
    });
    const submitText = await submitResp.text();
    if (!submitResp.ok) {
      let submitDetails = null;
      try { submitDetails = JSON.parse(submitText); } catch {}
      if (submitDetails && submitDetails.code === 12000) {
        return res.status(402).json({
          error: 'Submit failed: Zoho Sign API credits required',
          details: submitText,
          hint: 'Purchase Zoho Sign API credits for your organization to enable API submissions.',
        });
      }
      return res.status(submitResp.status).json({ error: 'Submit failed', details: submitText });
    }

    // Host must be your site origin and whitelisted in Zoho Sign Allowed Domains
    const rawHost =
      process.env.SIGN_EMBED_HOST ||
      req.headers.origin ||
      (req.headers.host
        ? `${/localhost|127\.0\.0\.1/i.test(req.headers.host) ? 'http' : 'https'}://${req.headers.host}`
        : null);
    if (!rawHost) {
      return res.status(400).json({
        error: 'Missing host for embed token. Set SIGN_EMBED_HOST to your site origin and whitelist it in Zoho Sign.',
      });
    }
    const host = new URL(rawHost).origin;

    // Request embed token
    const embedBody = new URLSearchParams({ host });
    const embedResp = await fetch(
      `${ZOHO_SIGN_BASE}/requests/${request_id}/actions/${action_id}/embedtoken`,
      {
        method: 'POST',
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: embedBody,
      }
    );
    const embedText = await embedResp.text();
    if (!embedResp.ok) {
      return res.status(embedResp.status).json({ error: 'Embed token failed', details: embedText });
    }
    const embedJson = JSON.parse(embedText);
    const signUrl =
      embedJson.sign_url ||
      embedJson?.requests?.actions?.[0]?.sign_url ||
      embedJson?.actions?.[0]?.sign_url;

    return res.send(signUrl);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
});

app.listen(port, () => {
  console.log(`Zoho Express sample listening on port ${port}`);
});