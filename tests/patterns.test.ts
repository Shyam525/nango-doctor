import { detectStateDivergence } from '../src/patterns/state-divergence';
import fixture6136 from './fixtures/issue-6136.json';

describe('State divergence — issue #6136', () => {

  test('detects frozen userCredentials pattern', () => {
    const result = detectStateDivergence(fixture6136.input);
    expect(result.detected).toBe(true);
    expect(result.pattern).toBe('state-divergence');
    expect(result.confidence).toBeGreaterThanOrEqual(
      fixture6136.expected.confidence_min
    );
    expect(result.issue_ref).toBe('#6136');
  });

  test('returns evidence with the stale credential gap', () => {
    const result = detectStateDivergence(fixture6136.input);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.fix).not.toBe('');
  });

  test('does NOT fire on clean connection (no userCredentials)', () => {
    const clean = { connection_state: { credentials: { updated_at: '2026-09-01T00:00:00Z' } } };
    const result = detectStateDivergence(clean);
    expect(result.detected).toBe(false);
  });

});