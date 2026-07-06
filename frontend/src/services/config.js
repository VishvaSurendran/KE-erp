// ─── API Configuration & Constants ────────────────────────────────────────────

export const API_BASE_URL = "https://ke-erp-backend.onrender.com/";

export const ENDPOINTS = {
  LEADS: "/leads",
  EMPLOYEES: "/employees",
  NOTES: (leadId) => `/leads/${leadId}/notes`,
};

export const LEAD_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal Sent" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export const LEAD_SOURCES = [
  "Website",
  "Referral",
  "Social Media",
  "Cold Call",
  "Email Campaign",
  "Walk-In",
  "Partner",
  "Other",
];

export const PAGE_SIZE_OPTIONS = [10, 25, 50];

export const DEFAULT_PAGE_SIZE = 10;

export const DEBOUNCE_DELAY = 400; // ms
