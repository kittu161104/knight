export interface Contest {
  id: string;
  title: string;
  description: string;
  prize: string;
  entry_fee: string;
  deadline: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  banner_url?: string;
  created_at: string;
  participant_count: number;
  guidelines?: {
    genre?: string;
    wordLimit?: {
      min: number;
      max: number;
    };
    timeLimit?: {
      value: number;
      unit: string;
    };
    languages?: string[];
    batchSize?: {
      size: number;
    };
    numberOfBatches?: number;
    submissionFormat?: string[];
  };
}