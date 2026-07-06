import api from "./api";
import { ENDPOINTS } from "./config";

export const getLeads = async (params = {}) => {
  const {
    page = 1,
    perPage = 10,
    search = "",
    status = "",
    assignedEmployee = "",
    dateFrom = "",
    dateTo = "",
  } = params;

  // Fetch ALL leads to perform accurate client-side filtering and pagination
  const response = await api.get(ENDPOINTS.LEADS);
  let rawData = Array.isArray(response.data) ? response.data : (response.data.data || []);

  // Calculate global stats BEFORE applying filters
  const globalStats = {
    total: rawData.length,
    new: 0,
    qualified: 0,
    won: 0,
    lost: 0
  };
  rawData.forEach(lead => {
    if (lead.status && globalStats[lead.status] !== undefined) {
      globalStats[lead.status]++;
    }
  });

  let data = [...rawData];

  // 1. Search (Full word, case-insensitive across Name, Mobile, Email)
  if (search.trim()) {
    const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Matches the search term at the beginning of any word
    const searchRegex = new RegExp(`(^|\\s)${safeSearch}`, 'i');
    
    data = data.filter(lead => {
      return (
        (lead.name && searchRegex.test(lead.name)) ||
        (lead.mobile && searchRegex.test(lead.mobile)) ||
        (lead.email && searchRegex.test(lead.email))
      );
    });
  }

  // 2. Status Filter
  if (status) {
    data = data.filter(lead => lead.status === status);
  }

  // 3. Assigned Employee Filter
  if (assignedEmployee) {
    data = data.filter(lead => String(lead.assignedEmployeeId) === String(assignedEmployee));
  }

  // 4. Date Range Filter
  if (dateFrom || dateTo) {
    const from = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : null;
    const to = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : null;

    data = data.filter((lead) => {
      const created = lead.createdAt ? new Date(lead.createdAt).getTime() : null;
      if (!created) return false;
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    });
  }

  // 5. Pagination
  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  
  const startIndex = (page - 1) * perPage;
  const paginatedData = data.slice(startIndex, startIndex + perPage);

  return {
    data: paginatedData,
    totalItems,
    totalPages,
    currentPage: page,
    globalStats
  };
};

/**
 * Fetch a single lead by ID.
 */
export const getLeadById = async (id) => {
  const response = await api.get(`${ENDPOINTS.LEADS}/${id}`);
  return response.data;
};

/**
 * Create a new lead.
 */
export const createLead = async (leadData) => {
  const payload = {
    ...leadData,
    createdAt: new Date().toISOString(),
    notes: [],
  };
  const response = await api.post(ENDPOINTS.LEADS, payload);
  return response.data;
};

/**
 * Update an existing lead (partial update via PATCH).
 */
export const updateLead = async (id, leadData) => {
  const payload = {
    ...leadData,
    updatedAt: new Date().toISOString(),
  };
  const response = await api.patch(`${ENDPOINTS.LEADS}/${id}`, payload);
  return response.data;
};

/**
 * Delete a lead by ID.
 */
export const deleteLead = async (id) => {
  await api.delete(`${ENDPOINTS.LEADS}/${id}`);
  return id;
};

// ─── Notes (stored embedded in lead document) ─────────────────────────────────

/**
 * Add a note to a lead's notes array.
 * We PATCH the lead with the updated notes array.
 */
export const addNote = async (lead, text) => {
  const newNote = {
    id: `note_${Date.now()}`,
    text,
    createdAt: new Date().toISOString(),
    author: "Current User",
  };
  const updatedNotes = [...(lead.notes || []), newNote];
  const response = await api.patch(`${ENDPOINTS.LEADS}/${lead.id}`, {
    notes: updatedNotes,
  });
  return response.data;
};

/**
 * Edit a specific note inside a lead.
 */
export const editNote = async (lead, noteId, newText) => {
  const updatedNotes = (lead.notes || []).map((n) =>
    n.id === noteId
      ? { ...n, text: newText, updatedAt: new Date().toISOString() }
      : n
  );
  const response = await api.patch(`${ENDPOINTS.LEADS}/${lead.id}`, {
    notes: updatedNotes,
  });
  return response.data;
};

/**
 * Delete a specific note inside a lead.
 */
export const deleteNote = async (lead, noteId) => {
  const updatedNotes = (lead.notes || []).filter((n) => n.id !== noteId);
  const response = await api.patch(`${ENDPOINTS.LEADS}/${lead.id}`, {
    notes: updatedNotes,
  });
  return response.data;
};

// ─── Employees ─────────────────────────────────────────────────────────────────

/**
 * Fetch all employees (used for the filter dropdown).
 */
export const getEmployees = async () => {
  const response = await api.get(ENDPOINTS.EMPLOYEES);
  return Array.isArray(response.data) ? response.data : [];
};
