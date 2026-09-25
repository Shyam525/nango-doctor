import { detectStateDivergence }  from '../src/patterns/state-divergence';
import { detectErrorMasking }      from '../src/patterns/error-masking';
import { detectProtocolMismatch }  from '../src/patterns/protocol-mismatch';

import fixture6136 from './fixtures/issue-6136.json';
import fixture6416 from './fixtures/issue-6416.json';
import fixture6825 from './fixtures/issue-6825.json';
import fixture7098 from './fixtures/issue-7098.json';

// ── #6136 State Divergence ──────────────────────────────────────────────────
describe('State divergence (#6136)', () => {

  test('detects frozen userCredentials pattern', () => {
    const r = detectStateDivergence(fixture6136.input);
    expect(r.detected).toBe(true);
    expect(r.pattern).toBe('state-divergence');
    expect(r.confidence).toBeGreaterThanOrEqual(fixture6136.expected.confidence_min);
    expect(r.issue_ref).toBe('#6136');
  });

  test('returns evidence and a non-empty fix', () => {
    const r = detectStateDivergence(fixture6136.input);
    expect(r.evidence.length).toBeGreaterThan(0);
    expect(r.fix).not.toBe('');
  });

  test('does NOT fire on clean connection', () => {
    const clean = { connection_state: { credentials: { updated_at: '2026-09-01T00:00:00Z' } } };
    expect(detectStateDivergence(clean).detected).toBe(false);
  });

});

// ── #6416 Error Masking ─────────────────────────────────────────────────────
describe('Error masking (#6416)', () => {

  test('detects unhandled_ prefix + empty payload', () => {
    const r = detectErrorMasking(fixture6416.input);
    expect(r.detected).toBe(true);
    expect(r.pattern).toBe('error-masking');
    expect(r.confidence).toBeGreaterThanOrEqual(fixture6416.expected.confidence_min);
    expect(r.issue_ref).toBe('#6416');
  });

  test('root cause mentions error registry, fix mentions providers.yaml', () => {
    const r = detectErrorMasking(fixture6416.input);
    expect(r.root_cause).toContain('registry');
    expect(r.fix).toContain('providers.yaml');
  });

  test('does NOT fire on normal error with real payload', () => {
    const clean = { error: { code: 'auth_error', payload: { message: 'bad creds' } } };
    expect(detectErrorMasking(clean).detected).toBe(false);
  });

});

// ── #6825 Protocol Mismatch (PKCE) ─────────────────────────────────────────
describe('Protocol mismatch — PKCE (#6825)', () => {

  test('detects verifier missing from token exchange', () => {
    const r = detectProtocolMismatch(fixture6825.input);
    expect(r.detected).toBe(true);
    expect(r.pattern).toBe('protocol-mismatch');
    expect(r.confidence).toBeGreaterThanOrEqual(fixture6825.expected.confidence_min);
    expect(r.issue_ref).toBe('#6825');
  });

  test('root cause cites RFC 7636', () => {
    const r = detectProtocolMismatch(fixture6825.input);
    expect(r.root_cause).toContain('RFC 7636');
  });

  test('does NOT fire when verifier is sent correctly', () => {
    const ok = {
      ...fixture6825.input,
      oauth_details: {
        pkce_enabled: true,
        code_challenge_sent: true,
        code_verifier_sent: true,
      },
    };
    expect(detectProtocolMismatch(ok).detected).toBe(false);
  });

});

// ── #7098 Protocol Mismatch (OAuth1 Encoding) ──────────────────────────────
describe('Protocol mismatch — OAuth1 encoding (#7098)', () => {

  test('detects + encoding on OAuth1 object params', () => {
    const r = detectProtocolMismatch(fixture7098.input);
    expect(r.detected).toBe(true);
    expect(r.pattern).toBe('protocol-mismatch');
    expect(r.confidence).toBeGreaterThanOrEqual(fixture7098.expected.confidence_min);
    expect(r.issue_ref).toBe('#7098');
  });

  test('fix tells developer to use %20 not +', () => {
    const r = detectProtocolMismatch(fixture7098.input);
    expect(r.fix).toContain('%20');
  });

});