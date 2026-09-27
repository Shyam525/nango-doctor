import { detectStateDivergence }  from './patterns/state-divergence';
import { detectErrorMasking }      from './patterns/error-masking';
import { detectProtocolMismatch }  from './patterns/protocol-mismatch';
import { detectNotificationLoss }  from './patterns/notification-loss';
import { DiagnosisResult }         from './types';

export function diagnose(input: any): DiagnosisResult {
  const results = [
    detectStateDivergence(input),
    detectErrorMasking(input),
    detectProtocolMismatch(input),
    detectNotificationLoss(input),
  ];

  const best = results
    .filter(r => r.detected)
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (best) return best;

  return {
    detected:   false,
    pattern:    'unknown',
    confidence: 0,
    root_cause: 'No known failure pattern matched this input.',
    fix:        'Check Nango GitHub issues or open a new issue with this error log.',
    issue_ref:  '',
    evidence:   [],
  };
}