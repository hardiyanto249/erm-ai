
export enum RiskCategory {
  Operational = 'Operational',
  Reputation = 'Reputation',
  ShariaCompliance = 'Sharia Compliance',
}

export enum RiskImpact {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

export enum RiskLikelihood {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export enum RiskStatus {
  Open = 'Open',
  Mitigated = 'Mitigated',
  Monitoring = 'Monitoring',
  Closed = 'Closed',
}

export interface RiskItem {
  id: string;
  description: string;
  category: keyof typeof RiskCategory;
  impact: keyof typeof RiskImpact;
  likelihood: keyof typeof RiskLikelihood;
  status: keyof typeof RiskStatus;

  // Mitigation Fields
  mitigation_plan?: string;
  mitigation_status?: string; // e.g. 'Planned', 'In Progress', 'Completed'
  mitigation_progress?: number; // 0-100
  context?: string; // Project/Source
  created_at?: string;
}

export interface Kpi {
  title: string;
  value: string;
  description: string;
  trend: 'up' | 'down' | 'stable';
}

export interface ComplianceItem {
  id: string;
  text: string;
  completed: boolean;
}

/**
 * Utility function to get the display-friendly name of a risk category from its key.
 * @param category The key of the RiskCategory enum (e.g., 'ShariaCompliance')
 * @returns The display string (e.g., 'Sharia Compliance')
 */
export const getCategoryDisplayName = (category: keyof typeof RiskCategory): string => {
  return RiskCategory[category];
};

export interface LazPartner {
  id: number;
  name: string;
  scale: string;
  description: string;
}

export interface User {
  id: number;
  laz_id: number;
  email: string;
  role: string;
}