import { DiagnosisResult, notDetected } from '../types';

export function detectProtocolMismatch(input: any): DiagnosisResult {
  const pkce = detectPKCEIncomplete(input);
  if (pkce.detected) return pkce;

  const enc = detectOAuth1Encoding(input);
  if (enc.detected) return enc;

  return notDetected('protocol-mismatch');
}

function detectPKCEIncomplete(input: any): DiagnosisResult {
  const oauth = input?.oauth_details;
  const error = input?.error;

  const pkceOn          = oauth?.pkce_enabled === true;
  const challengeSent   = oauth?.code_challenge_sent === true;
  const verifierMissing = oauth?.code_verifier_sent === false;

  if (!pkceOn || !challengeSent || !verifierMissing) {
    return notDetected('protocol-mismatch');
  }

  const is400 = error?.http_status === 400;
  const providerMsg: string = error?.provider_response?.error_description ?? '';
  const msgMentionsVerifier = providerMsg.toLowerCase().includes('verifier');

  let confidence = 0.80;
  if (is400)               confidence += 0.10;
  if (msgMentionsVerifier) confidence += 0.05;
  confidence = Math.min(confidence, 0.97);

  return {
    detected: true,
    pattern: 'protocol-mismatch',
    confidence: Math.round(confidence * 100) / 100,
    root_cause:
      'PKCE handshake is incomplete. code_challenge was sent during /authorize ' +
      'but code_verifier was never included in the token exchange request. ' +
      'Per RFC 7636 §4.6, once a challenge is sent the verifier is mandatory.',
    fix:
      'Pass code_verifier in the token exchange for this provider. ' +
      'See how attio-mcp and facebook pass codeVerifier in the same dispatch method.',
    issue_ref: '#6825',
    evidence: [
      'pkce_enabled: true — code_challenge was generated',
      'code_challenge_sent: true — sent during /authorize',
      'code_verifier_sent: false — MISSING from token exchange (causes the 400)',
      is400 ? `Provider returned 400: "${providerMsg}"` : '',
    ].filter(Boolean),
  };
}

function detectOAuth1Encoding(input: any): DiagnosisResult {
  const req   = input?.request_details;
  const error = input?.error;

  const isOAuth1       = input?.auth_mode === 'OAUTH1';
  const is401          = error?.http_status === 401;
  const paramsAsObject = req?.params_type === 'object';
  const encodedAsPlus  = typeof req?.encoded_as === 'string' &&
                         req.encoded_as.includes('+');

  if (!isOAuth1 || !is401) return notDetected('protocol-mismatch');
  if (!paramsAsObject && !encodedAsPlus) return notDetected('protocol-mismatch');

  let confidence = 0.75;
  if (paramsAsObject) confidence += 0.10;
  if (encodedAsPlus)  confidence += 0.08;
  confidence = Math.min(confidence, 0.93);

  return {
    detected: true,
    pattern: 'protocol-mismatch',
    confidence: Math.round(confidence * 100) / 100,
    root_cause:
      'OAuth1 signature mismatch: spaces in query params are encoded as "+" ' +
      '(HTML form encoding) but the oauth-1.0a signing library does not decode ' +
      '"+" back to a space. It signs literal "+" as "%2B". Provider expects "%20".',
    fix:
      'Pre-serialize params as a string using RFC 3986 encoding: ' +
      'use params: "q=ai%20music" instead of params: { q: "ai music" }.',
    issue_ref: '#7098',
    evidence: [
      'auth_mode: OAUTH1 — request must be signed with matching encoding',
      'HTTP 401 — signature verification failed',
      paramsAsObject ? 'params passed as object → URLSearchParams encodes spaces as "+"' : '',
      encodedAsPlus ? `encoded_as includes "+" — should be "%20"` : '',
    ].filter(Boolean),
  };
}