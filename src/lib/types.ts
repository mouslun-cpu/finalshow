export interface GameState {
  currentPitchGroupId: string;
  targetAmount: number;
  phase: 'waiting' | 'pitching' | 'ended';
  pitchGroupName: string;
  riceEnabled?: boolean;
}

export interface Investor {
  remainingBudget: number;
  groupName: string;
  hasVotedCurrentPitch: boolean;
}

export interface PitchData {
  totalRaised: number;
  riceScores: {
    R_total: number;
    I_total: number;
    C_total: number;
    E_total: number;
    voteCount: number;
  };
  groupName: string;
  description: string;
  targetAmount?: number;
  completed?: boolean;
}

export interface Transaction {
  id: string;
  investorGroupId: string;
  pitchGroupId: string;
  amount: number;
  riceR: number;
  riceI: number;
  riceC: number;
  riceE: number;
  timestamp: number;
  animated: boolean;
}

export interface RiceScore {
  R: number;
  I: number;
  C: number;
  E: number;
}

export interface GroupConfig {
  name: string;
  topic: string;
}

export interface Presence {
  lastSeen: number;
  groupId: string;
}
