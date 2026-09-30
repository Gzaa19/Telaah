import {
  GenerateOutlineRequest,
  GenerateOutlineResponse,
  OutlineStatusResponse,
  OutlineDetailResponse,
  UpdateFieldRequest,
  SectionFieldResponse,
  RegenerateOutlineRequest,
  RegenerateOutlineResponse,
  RegenerateSectionResponse,
  ApproveOutlineResponse,
  VersionListResponse,
} from "@/types/outlines";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function generateOutline(
  payload: GenerateOutlineRequest
): Promise<GenerateOutlineResponse> {
  const res = await fetch(`${BACKEND_URL}/api/outlines/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to initiate outline generation: ${res.statusText}`);
  }

  return res.json();
}

export async function fetchOutlineStatus(outlineId: string): Promise<OutlineStatusResponse> {
  const res = await fetch(`${BACKEND_URL}/api/outlines/${outlineId}/status`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch outline status: ${res.statusText}`);
  }

  return res.json();
}

export async function fetchOutlineDetail(outlineId: string): Promise<OutlineDetailResponse> {
  const res = await fetch(`${BACKEND_URL}/api/outlines/${outlineId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch outline detail: ${res.statusText}`);
  }

  return res.json();
}

export const getOutlineStatus = fetchOutlineStatus;
export const getOutlineDetail = fetchOutlineDetail;

export async function updateSectionField(
  outlineId: string,
  fieldId: string,
  payload: UpdateFieldRequest
): Promise<SectionFieldResponse> {
  const res = await fetch(`${BACKEND_URL}/api/outlines/${outlineId}/fields/${fieldId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to update field: ${res.statusText}`);
  }

  return res.json();
}

export async function regenerateOutline(
  outlineId: string,
  payload: RegenerateOutlineRequest = { reset_all_sections: false }
): Promise<RegenerateOutlineResponse> {
  const res = await fetch(`${BACKEND_URL}/api/outlines/${outlineId}/regenerate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to regenerate outline: ${res.statusText}`);
  }

  return res.json();
}

export async function regenerateSection(
  outlineId: string,
  sectionId: string
): Promise<RegenerateSectionResponse> {
  const res = await fetch(`${BACKEND_URL}/api/outlines/${outlineId}/sections/${sectionId}/regenerate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to regenerate section: ${res.statusText}`);
  }

  return res.json();
}

export async function approveOutline(outlineId: string): Promise<ApproveOutlineResponse> {
  const res = await fetch(`${BACKEND_URL}/api/outlines/${outlineId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to approve outline: ${res.statusText}`);
  }

  return res.json();
}

export async function fetchOutlineVersions(
  outlineOrDocId: string,
  isDocumentId: boolean = false
): Promise<VersionListResponse> {
  const url = isDocumentId
    ? `${BACKEND_URL}/api/outlines/document/${outlineOrDocId}/versions`
    : `${BACKEND_URL}/api/outlines/${outlineOrDocId}/versions`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch outline versions: ${res.statusText}`);
  }

  return res.json();
}

// =========================================================================
// Mock Fixtures & Test Helpers for UI Development & Testing
// =========================================================================

export const MOCK_OUTLINE_DETAIL: OutlineDetailResponse = {
  outline_id: "00000000-0000-0000-0000-000000000001",
  template_id: "icicos",
  version_number: 1,
  language_choice: "en_ieee",
  generation_status: "ready",
  approval_status: "draft",
  approved_at: null,
  sections: [
    {
      section_id: "sec-001",
      section_key: "abstract",
      title: "Abstract",
      order_index: 1,
      is_required: true,
      section_status: "filled",
      fields: [
        {
          field_id: "fld-001",
          field_key: "abstract_text",
          field_label: "Abstract",
          content:
            "This study proposes an automated template-based scientific paper outline generator tailored for IEEE conference manuscripts. Utilizing targeted chunk retrieval and structured language model prompting, the framework achieves deterministic structure alignment with provenance.",
          is_needs_input: false,
          is_edited: false,
          order_index: 1,
          source_refs: [
            {
              chunk_id: "chk-001",
              page_number: 1,
              excerpt_text: "We present a template-driven framework for academic manuscript generation...",
            },
          ],
        },
      ],
    },
    {
      section_id: "sec-002",
      section_key: "introduction",
      title: "I. INTRODUCTION",
      order_index: 3,
      is_required: true,
      section_status: "filled",
      fields: [
        {
          field_id: "fld-002",
          field_key: "background",
          field_label: "Background",
          content:
            "Academic manuscript preparation requires strict compliance with publisher layout instructions and IMRaD conventions.",
          is_needs_input: false,
          is_edited: false,
          order_index: 1,
          source_refs: [
            {
              chunk_id: "chk-002",
              page_number: 1,
              excerpt_text: "Manuscript writing often suffers from formatting inconsistencies...",
            },
          ],
        },
        {
          field_id: "fld-003",
          field_key: "problem_statement",
          field_label: "Problem Statement",
          content:
            "Researchers face high cognitive load when adapting raw experimental findings into formal IEEE conference layouts.",
          is_needs_input: false,
          is_edited: false,
          order_index: 2,
          source_refs: [
            {
              chunk_id: "chk-003",
              page_number: 2,
              excerpt_text: "Adapting notes to conference templates requires tedious manual mapping...",
            },
          ],
        },
        {
          field_id: "fld-004",
          field_key: "research_gap",
          field_label: "Research Gap",
          content: "[NEEDS INPUT]",
          is_needs_input: true,
          is_edited: false,
          order_index: 3,
          source_refs: [],
        },
      ],
    },
  ],
};
