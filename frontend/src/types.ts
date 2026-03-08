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
  status: 'pending' | 'processing' | 'transcribed' | 'completed' | 'failed';
  file_path: string;
  transcription_id: string | null;
  profile: string;
  priority: string;
  estimated_seconds: number | null;
  error_message: string | null;
  preset_id: string | null;
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

export interface SpeakerLabel {
  id: string;
  transcription_id: string;
  speaker_id: string;
  display_name: string;
}

export interface UserDictionary {
  id: string;
  name: string;
  description: string | null;
  entries: DictionaryEntry[];
  created_at: string | null;
}

export interface DictionaryEntry {
  id: string;
  dictionary_id: string;
  term: string;
  replacement: string;
  category: string;
}

export interface AudioPreset {
  id: string;
  name: string;
  description: string | null;
  profile_id: string;
  audio_type: string | null;
  vad_sensitivity: string;
  min_silence_ms: number;
  dictionary_id: string | null;
  created_at: string | null;
}

export interface QueueItem {
  id: string;
  filename: string;
  status: string;
  priority: string;
  profile: string;
  estimated_seconds: number | null;
  queue_position: number;
  created_at: string | null;
}

// v5.x types
export interface UserPreferences {
  id: string;
  summary_detail: 'short' | 'balanced' | 'detailed';
  summary_tone: 'formal' | 'neutral' | 'friendly';
  default_profile: string;
  default_priority: string;
  default_preset_id: string | null;
}

export interface KeyMoment {
  index: number;
  start: number;
  end: number;
  text: string;
  reason: string;
}

export interface ConfidenceInfo {
  scores: number[];
  micro_tip: string | null;
}

// v7 types
export interface PlanInfo {
  id: string;
  name: string;
  price_cents: number;
  minutes_included: number;
  features: string[];
  max_dictionaries: number;
  max_workspaces: number;
  priority_default: string;
}

export interface SubscriptionInfo {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  minutes_used: number;
  minutes_included: number;
  minutes_remaining: number;
  extra_minutes_balance: number;
}

export interface UsageSummary {
  plan_id: string;
  plan_name: string;
  minutes_included: number;
  minutes_used: number;
  minutes_remaining: number;
  extra_minutes_balance: number;
  total_transcriptions: number;
  total_audio_minutes: number;
  by_source: Record<string, number>;
  by_profile: Record<string, number>;
}

export interface OneshotTier {
  tier: string;
  max_duration_minutes: number;
  price_cents: number;
  includes: string[];
}

export interface ExtraPack {
  pack: string;
  minutes: number;
  price_cents: number;
}

// v6 types
export interface DictationSession {
  id: string;
  status: 'active' | 'paused' | 'completed';
  profile: string;
  language: string | null;
  current_text: string;
  chunk_count: number;
  total_duration: number;
  transcription_id: string | null;
  created_at: string | null;
}
