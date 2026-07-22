export interface DashboardSummary {
  frameworkCompliance: number | null;
  controlsCompliant: number;
  controlsTotal: number;
  openFindings: number;
}

export type CheckResult = 'passed' | 'failed' | 'not_applicable';

export interface DashboardControlCheck {
  checkId: string;
  title: string;
  os: string;
  result: CheckResult;
}

export interface DashboardControl {
  id: string;
  code: string;
  name: string;
  description: string | null;
  compliance: number | null;
  checksTotal: number;
  checksPassed: number;
  checksFailed: number;
  checksNotApplicable: number;
}
