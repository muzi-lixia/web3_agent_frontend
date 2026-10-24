export interface RagMetadata {
  kb_id?: string;
  title: string;
  source_url?: string;
  chain_id: number | null;
  protocol_id: string | null;
  doc_category: string;
  version: string;
  reviewed: boolean;
  valid_from: string;
  valid_until: string | null;
}
export interface RagJob {
  kb_id: string;
  job_id: string;
  filename: string;
  metadata: RagMetadata;
  status: 'queued' | 'processing' | 'succeeded' | 'failed';
  stage: string;
  attempts: number;
  total_chunks: number;
  embedded_chunks: number;
  document_id: string | null;
  error: { code: string; message: string } | null;
  created_at: string;
  updated_at: string;
}
export interface RagDocument extends Omit<RagMetadata, 'reviewed'> {
  kb_id: string;
  embedding_provider: string;
  embedding_model: string;
  embedding_dimension: number;
  embedding_version: string;
  document_id: string;
  status: 'active' | 'superseded' | 'disabled';
  chunks: number;
  updated_at: string;
}
export interface RagHit {
  kb_id: string;
  token_count: number;
  token_count_method: string;
  char_start: number | null;
  char_end: number | null;
  page_number: number | null;
  page_end: number | null;
  metadata: Record<string, unknown>;
  id: string;
  chunk_id: string;
  title: string;
  section: string;
  content: string;
  source_url: string;
  version: string;
  chain_id: number | null;
  protocol_id: string | null;
  doc_category: string;
  updated_at: string;
  distance: number | null; // lexical-only hit has no vector distance
}
export interface RagSearch {
  kb_id?: string;
  query_str: string;
  chain_id?: number | null;
  protocol_id?: string | null;
  doc_category?: string | null;
  top_k?: number;
}
export interface RagSearchResult {
  status: 'success' | 'empty' | 'invalid';
  message?: string;
  hits: RagHit[];
}
export interface RagPage<T> { items: T[]; has_more: boolean }

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'disabled';
  embedding_provider: string;
  embedding_model: string;
  embedding_dimension: number;
  embedding_version: string;
  created_at: string;
  updated_at: string;
}
