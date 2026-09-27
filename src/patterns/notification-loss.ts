import { DiagnosisResult, notDetected } from '../types';

export function detectNotificationLoss(input: any): DiagnosisResult {
  const modal = input?.modal_state;
  const ws    = input?.websocket;
  const db    = input?.database;

  if (!db?.connection_exists)      return notDetected('notification-loss');
  if (modal?.status !== 'pending') return notDetected('notification-loss');
  if (ws?.close_reason !== 'idle_timeout') return notDetected('notification-loss');

  const wsClosedAt  = ws?.closed_at             ? new Date(ws.closed_at).getTime()             : 0;
  const connCreated = db?.connection_created_at  ? new Date(db.connection_created_at).getTime() : 0;

  const successAfterClose = connCreated > 0 && wsClosedAt > 0 && connCreated > wsClosedAt;
  const timeoutSecs: number = ws?.timeout_seconds ?? 0;

  let confidence = 0.78;
  if (successAfterClose) confidence += 0.13;
  if (timeoutSecs > 0)   confidence += 0.04;
  confidence = Math.min(confidence, 0.95);

  const gapSecs = successAfterClose
    ? Math.round((connCreated - wsClosedAt) / 1000)
    : 0;

  return {
    detected:   true,
    pattern:    'notification-loss',
    confidence: Math.round(confidence * 100) / 100,
    root_cause:
      'WebSocket idle timeout fired before the user finished the OAuth flow. ' +
      'The connection was created successfully in the database, but the success ' +
      'message was sent to a now-closed socket and never delivered. ' +
      'The frontend has no fallback polling — the modal waits forever.',
    fix:
      '1. The connection IS active — do not retry or delete it. ' +
      '2. Poll GET /connection/{id} after modal closes instead of relying on WebSocket alone. ' +
      '3. Increase WebSocket idle timeout beyond 120s for OAuth flows.',
    issue_ref: '#5849',
    evidence: [
      `modal_state.status: "pending" — frontend never received success event`,
      `websocket.close_reason: "idle_timeout" after ${timeoutSecs}s`,
      `database.connection_exists: true — OAuth DID succeed`,
      successAfterClose
        ? `Connection created ${gapSecs}s AFTER WebSocket closed — success message was lost`
        : '',
    ].filter(Boolean),
  };
}