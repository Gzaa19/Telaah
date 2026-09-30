/**
 * Type definitions for UC-04: Template-Based Paper Outline Generation
 * Aligned with contracts/outline-api.md and data-model.md
 */

export type OutlineLanguage = "en_ieee" | "id_formal";
export type OutlineLanguageEnum = OutlineLanguage;

export type GenerationStatus =
  | "preparing"
  | "reading"
  | "generating"
  | "validating"
  | "ready"
  | "failed";
export type GenerationStatusEnum = GenerationStatus;

export type ApprovalStatus = "draft" | "approved";
export type ApprovalStatusEnum = ApprovalStatus;

export type SectionStatus = "filled" | "needs_input" | "edited";
export type SectionStatusEnum = SectionStatus;

export interface SourceReference {
  chunk_id: string;
  page_number: number | null;
  excerpt_text: string;
}

export interface SectionField {
  field_id: string;
  field_key: string;
  field_label: string;
  content: string;
  is_needs_input: boolean;
  is_edited: boolean;
  order_index: number;
  source_refs: SourceReference[];
}

export interface OutlineSection {
  section_id: string;
  section_key: string;
  title: string;
  order_index: number;
  is_required: boolean;
  section_status: SectionStatus;
  fields: SectionField[];
}

export type SourceRefDTO = SourceReference;
export type FieldDTO = SectionField;
export type SectionDTO = OutlineSection;


export interface GenerateOutlineRequest {
  document_id: string;
  template_id?: string;
  language?: OutlineLanguage;
}

export interface GenerateOutlineResponse {
  outline_id: string;
  status: GenerationStatus;
}

export interface OutlineStatusResponse {
  outline_id: string;
  generation_status: GenerationStatus;
  approval_status: ApprovalStatus;
  version_number: number;
  progress_label: string;
  failure_reason: string | null;
}

export interface OutlineDetailResponse {
  outline_id: string;
  template_id: string;
  version_number: number;
  language_choice: OutlineLanguage;
  generation_status: GenerationStatus;
  approval_status: ApprovalStatus;
  approved_at: string | null;
  sections: OutlineSection[];
}

export interface UpdateFieldRequest {
  content: string;
}

export interface SectionFieldResponse {
  field_id: string;
  content: string;
  is_edited: boolean;
  is_needs_input: boolean;
}

export interface RegenerateOutlineRequest {
  reset_all_sections?: boolean;
}

export interface RegenerateOutlineResponse {
  outline_id: string;
  version_number: number;
}

export interface RegenerateSectionResponse {
  section_id: string;
  status: string;
}

export interface ApproveOutlineResponse {
  outline_id: string;
  approval_status: ApprovalStatus;
  approved_at: string;
  unresolved_needs_input_count: number;
}

export interface OutlineVersionItem {
  outline_id: string;
  version_number: number;
  approval_status: ApprovalStatus;
  generation_status: GenerationStatus;
  created_at: string;
  approved_at: string | null;
  trigger: "initial" | "regeneration";
}

export interface VersionListResponse {
  versions: OutlineVersionItem[];
}
