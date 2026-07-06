import { useState, useEffect, useCallback, useRef } from "react";
import styles from "./LeadManagement.module.css";
import LeadTable from "../components/LeadTable";
import LeadModal from "../components/LeadModal";
import { getLeads, getEmployees } from "../services/client";
import { LEAD_STATUSES, DEFAULT_PAGE_SIZE, DEBOUNCE_DELAY } from "../services/config";
import { Search, X, Calendar, AlertTriangle, RefreshCw, ClipboardList, Plus } from "lucide-react";

// ─── useDebounce hook ─────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ─── LeadManagement Page ──────────────────────────────────────────────────────
export default function LeadManagement() {
  // ── Filter state ──
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ── Pagination state ──
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);

  // ── Data state ──
  const [leads, setLeads] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [globalStats, setGlobalStats] = useState({ total: 0, new: 0, qualified: 0, won: 0, lost: 0 });
  const [employees, setEmployees] = useState([]);

  // ── UI state ──
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalState, setModalState] = useState(null); // { lead, mode }

  // ── Debounced search ──
  const debouncedSearch = useDebounce(search, DEBOUNCE_DELAY);

  // ── Fetch employees once ──
  useEffect(() => {
    getEmployees()
      .then(setEmployees)
      .catch(() => { }); // non-critical
  }, []);

  // ── Fetch leads whenever filters/pagination change ──
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getLeads({
        page: currentPage,
        perPage,
        search: debouncedSearch,
        status: statusFilter,
        assignedEmployee: employeeFilter,
        dateFrom,
        dateTo,
      });
      setLeads(result.data);
      setTotalItems(result.totalItems);
      setTotalPages(result.totalPages);
      if (result.globalStats) {
        setGlobalStats(result.globalStats);
      }
    } catch (err) {
      setError(err.message || "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, debouncedSearch, statusFilter, employeeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, employeeFilter, dateFrom, dateTo, perPage]);

  // ── Handlers ──
  const handleReset = () => {
    setSearch("");
    setStatusFilter("");
    setEmployeeFilter("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const openModal = (lead, mode) => setModalState({ lead, mode });
  const closeModal = () => setModalState(null);

  const handleLeadUpdated = (updatedLead) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
    );
    // Keep modal open in view mode after save
    setModalState({ lead: updatedLead, mode: "view" });
  };

  // ── Derived ──
  const hasActiveFilters = debouncedSearch || statusFilter || employeeFilter || dateFrom || dateTo;
  const statusLabel = LEAD_STATUSES.find((s) => s.value === statusFilter)?.label;
  const employeeLabel = employees.find((e) => String(e.id) === String(employeeFilter))?.name;

  // ── Stats ──
  // Calculate current page counts if needed later, but the top bar uses globalStats now

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.heading}>
            Lead <span className={styles.headingAccent}>Management</span>
          </h1>
          <p className={styles.subheading}>
            Track, manage, and nurture your sales pipeline in one place.
          </p>
        </div>
        <button className={styles.btnAddLead} onClick={() => openModal({}, "edit")}>
          <Plus size={16} /> New Lead
        </button>
      </header>

      {/* ── Stats Bar ── */}
      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Leads</span>
          <span className={styles.statValue}>{globalStats.total}</span>
          <span className={styles.statSub}>all time</span>
        </div>
        {["new", "qualified", "won", "lost"].map((s) => (
          <div key={s} className={styles.statCard}>
            <span className={styles.statLabel}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
            <span className={styles.statValue}>{globalStats[s] ?? 0}</span>
            <span className={styles.statSub}>total pipeline</span>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className={styles.filterBar}>
        <div className={styles.filterRow}>
          {/* Search */}
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}><Search size={16} /></span>
            <input
              id="lead-search"
              className={styles.searchInput}
              type="search"
              placeholder="Search by name, mobile or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search leads"
            />
          </div>

          {/* Status filter */}
          <select
            id="lead-status-filter"
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Employee filter */}
          <select
            id="lead-employee-filter"
            className={styles.filterSelect}
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            aria-label="Filter by assigned employee"
          >
            <option value="">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>

          {/* Reset */}
          {hasActiveFilters && (
            <button
              id="lead-reset-filters"
              className={styles.btnReset}
              onClick={handleReset}
              title="Clear all filters"
            >
              <X size={14} style={{ marginRight: '4px' }} /> Reset
            </button>
          )}
        </div>

        {/* ── Date range row ── */}
        <div className={styles.dateRangeRow}>
          <span className={styles.dateRangeLabel}><Calendar size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Created Date:</span>
          <div className={styles.dateInputGroup}>
            <label className={styles.dateInputLabel} htmlFor="date-from">From</label>
            <input
              id="date-from"
              type="date"
              className={styles.dateInput}
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Filter from date"
            />
          </div>
          <div className={styles.dateInputGroup}>
            <label className={styles.dateInputLabel} htmlFor="date-to">To</label>
            <input
              id="date-to"
              type="date"
              className={styles.dateInput}
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Filter to date"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              className={styles.btnDateClear}
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              title="Clear date range"
            >
              <X size={14} style={{ marginRight: '4px' }} /> Clear dates
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className={styles.activeFilters}>
            <span className={styles.activeFiltersLabel}>Active:</span>
            {debouncedSearch && (
              <span className={styles.chip}>
                Search: "{debouncedSearch}"
                <button className={styles.chipRemove} onClick={() => setSearch("")}><X size={14} /></button>
              </span>
            )}
            {statusFilter && (
              <span className={styles.chip}>
                Status: {statusLabel}
                <button className={styles.chipRemove} onClick={() => setStatusFilter("")}><X size={14} /></button>
              </span>
            )}
            {employeeFilter && (
              <span className={styles.chip}>
                Employee: {employeeLabel}
                <button className={styles.chipRemove} onClick={() => setEmployeeFilter("")}><X size={14} /></button>
              </span>
            )}
            {dateFrom && (
              <span className={styles.chip}>
                From: {new Date(dateFrom).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                <button className={styles.chipRemove} onClick={() => setDateFrom("")}><X size={14} /></button>
              </span>
            )}
            {dateTo && (
              <span className={styles.chip}>
                To: {new Date(dateTo).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                <button className={styles.chipRemove} onClick={() => setDateTo("")}><X size={14} /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Result Summary ── */}
      {!loading && !error && (
        <div className={styles.resultSummary}>
          <p className={styles.resultCount}>
            Found <strong>{totalItems}</strong> lead{totalItems !== 1 ? "s" : ""}
            {hasActiveFilters && " matching filters"}
          </p>
        </div>
      )}

      {/* ── Content States ── */}
      {loading ? (
        <div className={styles.loadingBox} aria-live="polite" aria-busy="true">
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading leads…</p>
        </div>
      ) : error ? (
        <div className={styles.errorBox} aria-live="assertive">
          <span className={styles.stateIcon}><AlertTriangle size={48} /></span>
          <h2 className={styles.errorTitle}>Something went wrong</h2>
          <p className={styles.errorMessage}>{error}</p>
          <button className={styles.btnRetry} onClick={fetchLeads}>
            <RefreshCw size={14} style={{ marginRight: '4px' }} /> Try Again
          </button>
        </div>
      ) : leads.length === 0 ? (
        <div className={styles.stateBox} aria-live="polite">
          <span className={styles.stateIcon}>{hasActiveFilters ? <Search size={48} /> : <ClipboardList size={48} />}</span>
          <h2 className={styles.stateTitle}>
            {hasActiveFilters ? "No matching leads" : "No leads yet"}
          </h2>
          <p className={styles.stateMessage}>
            {hasActiveFilters
              ? "Try adjusting your search or filters to find what you're looking for."
              : "Add your first lead by clicking the '+ New Lead' button above."}
          </p>
          {hasActiveFilters && (
            <button className={styles.btnReset} onClick={handleReset}>
              <X size={14} style={{ marginRight: '4px' }} /> Clear Filters
            </button>
          )}
        </div>
      ) : (
        <LeadTable
          leads={leads}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          perPage={perPage}
          onPageChange={setCurrentPage}
          onPerPageChange={(size) => { setPerPage(size); setCurrentPage(1); }}
          onView={(lead) => openModal(lead, "view")}
          onEdit={(lead) => openModal(lead, "edit")}
        />
      )}

      {/* ── Modal ── */}
      {modalState && (
        <LeadModal
          lead={modalState.lead}
          initialMode={modalState.mode}
          employees={employees}
          onClose={closeModal}
          onUpdated={handleLeadUpdated}
        />
      )}
    </div>
  );
}
