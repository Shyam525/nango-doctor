export interface DiagnosisResult {
  detected: boolean;
  pattern: string;
  confidence: number;
  root_cause: string;
  fix: string;
  issue_ref: string;
  evidence: string[];
}

export function notDetected(pattern: string): DiagnosisResult {
  return {
    detected: false,
    pattern,
    confidence: 0,
    root_cause: '',
    fix: '',
    issue_ref: '',
    evidence: [],
  };
}