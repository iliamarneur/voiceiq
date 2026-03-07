export interface Transcription {
  id: string;
  filename: string;
  text: string;
  segments: Segment[];
  language: string | null;
  duration: number | null;
  status: string;
  profile: string;
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

export type AnalysisType = string;

export interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_path: string;
  transcription_id: string | null;
  profile: string;
}

export interface ProfileAnalysis {
  type: string;
  label: string;
  enabled: boolean;
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  analyses: ProfileAnalysis[];
  exports: string[];
  default_templates: any[];
}

export interface Stats {
  total: number;
  total_duration: number;
  languages: Record<string, number>;
  total_analyses?: number;
  total_chats?: number;
}

export interface ChatMessage {
  id: number;
  transcription_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string | null;
}

export interface Chapter {
  id: string;
  transcription_id: string;
  title: string;
  start_time: number;
  end_time: number;
  summary: string | null;
}

export interface Template {
  id: string;
  name: string;
  type: string;
  instructions: string;
  created_at: string | null;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface Translation {
  id: string;
  transcription_id: string;
  target_lang: string;
  translated_text: string;
  created_at: string | null;
}
