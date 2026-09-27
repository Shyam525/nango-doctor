import { DiagnosisResult, notDetected } from '../types';

export function detectErrorMasking(input: any): DiagnosisResult {
  const error = input?.error;
  if (!error) return notDetected('error-masking');

  const code: string = error.code ?? '';
  const payload = error.payload;

  const isUnhandled = code.startsWith('unhandled_');
  if (!isUnhandled) return notDetected('error-masking');

  const hasEmptyPayload =
    payload !== null &&
    typeof payload === 'object' &&
    Object.keys(payload).length === 0;

  const isCCMode = input?.auth_mode === 'OAUTH2_CC';

  let confidence = 0.72;
  if (hasEmptyPayload) confidence += 0.15;
  if (isCCMode)        confidence += 0.08;
  confidence = Math.min(confidence, 0.95);

  const rawType = code.replace('unhandled_', '');

  return {
    detected: true,
    pattern: 'error-masking',
    confidence: Math.round(confidence * 100) / 100,
    root_cause:
      `The error type "${rawType}" was never registered in Nango's error registry. ` +
      `It fell through to the generic handler which strips the payload. ` +
      `The provider's actual rejection message is in server logs only.`,
    fix:
      `1. Register "${rawType}" as a valid error type in Nango. ` +
      `2. Forward the provider's HTTP response body to the caller. ` +
      `3. Check providers.yaml for missing scope (Vanta needs "vanta-api.all:read").`,
    issue_ref: '#6416',
    evidence: [
      `Error code: "${code}" — "unhandled_" prefix confirms unregistered type`,
      hasEmptyPayload ? 'payload: {} — real provider error was stripped before response' : '',
      isCCMode ? 'auth_mode: OAUTH2_CC — check providers.yaml for missing scope' : '',
    ].filter(Boolean),
  };
}