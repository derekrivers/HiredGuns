export const STAGES = ['mapping', 'reference', 'rules', 'playable', 'integration', 'recovery', 'acceptance', 'hardware'] as const;
export type Stage = typeof STAGES[number];
export type State = 'open' | 'partial' | 'covered';
export const LEVEL_GROUPS = ['training', 'campaign', 'action'] as const;
export const SCENARIO_KINDS = ['original', 'authored', 'diagnostic'] as const;
export interface EvidenceLink { path: string; label: string; scope: string }
export interface Mechanic {
  id: string; title: string; family: string; baseline: string; original: string;
  source: string; mappingScope: string; stages: Record<Stage, State>;
  evidence: EvidenceLink[]; tests: EvidenceLink[]; implementation: EvidenceLink[];
  scenarios: string[]; gaps: string[]; next: string;
}
export interface Interaction {
  mechanic: string;
  classification: 'required' | 'reachable-optional' | 'inactive' | 'present-unverified' | 'unknown';
  basis: string;
}
export interface LevelCase {
  id: string; title: string; group: typeof LEVEL_GROUPS[number];
  archivePath: string; sha256: string; revision: string; firstAcceptance: boolean;
  audit: string; acceptance: 'open'; interactions: Interaction[]; blockers: string[];
}
export interface Scenario {
  id: string; title: string; kind: typeof SCENARIO_KINDS[number];
  path: string; instructions: string; scope: string;
}
export interface AcceptanceCheck {
  id: string; title: string; state: State; evidence: string[]; requirement: string;
}
export interface MechanicsRegister {
  dashboards: Dashboard[]; acceptedProofs: AcceptedProof[];
  schemaVersion: 1; assessedOn: string; reviewedHead: string; acceptedThrough: number; title: string;
  baseline: { id: string; label: string; description: string; evidence: string[]; sourcePins: { file: string; sha256: string }[] };
  scope: string; limitations: string[]; scenarios: Scenario[];
  mechanics: Mechanic[]; levels: LevelCase[]; acceptanceChecks: AcceptanceCheck[];
  commands: { label: string; command: string; scope: string }[];
}

export const MILESTONE_STATUSES = ['playable', 'partial', 'open', 'deferred'] as const;
export interface AcceptedProof {
  id: string; pr: number; merge: string; head: string; reviewSha256: string;
  ci: string[]; automatic: string; receipt: string;
  receiptKind: 'separate-receipt-comment' | 'actual-summary-state-completed-exact-no-findings;no separate receipt comment observed';
  // Required only for accepted118/120 source-versus-union identity records.
  tree?: string; reviewedTree?: string; sourceProofBase?: string;
}
export interface Milestone {
  id: string; title: string; status: typeof MILESTONE_STATUSES[number]; scope: string;
  lineage: string[]; scenario: string; evidence: EvidenceLink[]; missing: string; proofs: string[];
}
export interface Dashboard {
  id: 'testbed-capability' | 'training43-software'; title: string; scope: string; milestones: Milestone[];
}
