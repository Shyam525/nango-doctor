// src/patterns/state-divergence.ts

export interface DiagnosisResult {
  detected: boolean;
  pattern: string;
  confidence: number;
  root_cause: string;
  fix: string;
  issue_ref: string;
  evidence: string[];
}

export function detectStateDivergence(input: any): DiagnosisResult {
  const creds = input?.connection_state?.credentials;
  const userCreds = input?.connection_state?.connection_config?.userCredentials;

  // If no userCredentials → not CUSTOM auth mode → not this pattern
  if (!userCreds) {
    return notDetected();
  }

  // THE KEY SIGNAL: credentials updated more recently than userCredentials
  const credsTime = creds?.updated_at ? new Date(creds.updated_at).getTime() : 0;
  const userCredsTime = userCreds?.updated_at ? new Date(userCreds.updated_at).getTime() : 0;

  if (credsTime <= userCredsTime) {
    return notDetected();
  }

  // SMOKING GUN: refresh tokens are different (userCredentials has the old one)
  const refreshTokensDiffer =
    creds?.refresh_token &&
    userCreds?.refresh_token &&
    creds.refresh_token !== userCreds.refresh_token;

  const isHttp500 = input?.error?.http_status === 500;

  // Build confidence score
  let confidence = 0.70;
  if (refreshTokensDiffer) confidence += 0.22;
  if (isHttp500)           confidence += 0.05;
  confidence = Math.min(confidence, 0.97);

  const gapHours = ((credsTime - userCredsTime) / (1000 * 60 * 60)).toFixed(1);

  return {
    detected: true,
    pattern: "state-divergence",
    confidence: Math.round(confidence * 100) / 100,
    root_cause:
      "connection_config.userCredentials is frozen at original OAuth time. " +
      "Token refreshes update credentials but NOT userCredentials. " +
      "On 2nd refresh, stale refresh_token is read → provider rejects it.",
    fix: "After every token refresh, mirror the new tokens to connection_config.userCredentials.",
    issue_ref: "#6136",
    evidence: [
      `credentials.updated_at:      ${creds?.updated_at}`,
      `userCredentials.updated_at:  ${userCreds?.updated_at}`,
      `Gap: ${gapHours} hours — userCredentials is stale`,
      refreshTokensDiffer
        ? "Refresh tokens DIFFER — userCredentials has already-rotated token"
        : "",
    ].filter(Boolean),
  };
}

function notDetected(): DiagnosisResult {
  return {
    detected: false,
    pattern: "state-divergence",
    confidence: 0,
    root_cause: "",
    fix: "",
    issue_ref: "#6136",
    evidence: [],
  };
}