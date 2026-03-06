export interface Transcription {
  id: string;
  filename: string;
  text: string;
  segments: Segment[];
  language: string | null;
  duration: number | null;
  status: string;
  created_at: string | null;
}

export interface Segment {
  start: number;
  end: number;
  text: string;
}

export interface Analysis {
  id: string;
  type: AnalysisType;
  content: any;
  instructions: string | null;
  created_at: string | null;
}

export type AnalysisType =
  | 'summary' | 'keypoints' | 'actions' | 'flashcards'
  | 'quiz' | 'mindmap' | 'slides' | 'infographic' | 'tables';

export interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_path: string;
  transcription_id: string | null;
}

export interface Stats {
  total: number;
  total_duration: number;
  languages: Record<string, number>;
}
