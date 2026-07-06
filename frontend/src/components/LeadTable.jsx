import { memo } from "react";
import { Eye, Edit2, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./LeadTable.module.css";
import { PAGE_SIZE_OPTIONS } from "../services/config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps a lead status string to a CSS module class suffix.
 */
const STATUS_CLASS_MAP = {
  new: styles.badge_new,
  contacted: styles.badge_contacted,
  qualified: styles.badge_qualified,
  proposal: styles.badge_proposal,
  negotiation: styles.badge_negotiation,
  won: styles.badge_won,
  lost: styles.badge_lost,
};

const STATUS_LABEL_MAP = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal Sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
const StatusBadge = memo(({ status }) => {
  const cls = STATUS_CLASS_MAP[status] ?? styles.badge_default;
  const label = STATUS_LABEL_MAP[status] ?? status ?? "Unknown";
  return <span className={`${styles.badge} ${cls}`}>{label}</span>;
});
StatusBadge.displayName = "StatusBadge";

// ─── LeadTable Component ──────────────────────────────────────────────────────
/**
 * @param {object}   props
 * @param {Array}    props.leads          – current page's data
 * @param {number}   props.currentPage    – 1-indexed current page
 * @param {number}   props.totalPages     – total number of pages
 * @param {number}   props.totalItems     – total record count
 * @param {number}   props.perPage        – current page size
 * @param {Function} props.onPageChange   – (newPage: number) => void
 * @param {Function} props.onPerPageChange– (newSize: number) => void
 * @param {Function} props.onView         – (lead) => void
 * @param {Function} props.onEdit         – (lead) => void
 */
function LeadTable({
  leads = [],
  currentPage,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
  onView,
  onEdit,
}) {
  const startRecord = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const endRecord = Math.min(currentPage * perPage, totalItems);

  return (
    <div className={styles.wrapper}>
      {/* ── Table ── */}
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Lead Name</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Created Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, idx) => (
              <tr key={lead.id}>
                <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  {startRecord + idx}
                </td>
                <td>
                  <div className={styles.leadName}>{lead.name}</div>
                  <div className={styles.leadEmail}>{lead.email}</div>
                </td>
                <td>{lead.mobile || "—"}</td>
                <td>{lead.email || "—"}</td>
                <td>
                  <StatusBadge status={lead.status} />
                </td>
                <td>{lead.assignedEmployee || "Unassigned"}</td>
                <td>{formatDate(lead.createdAt)}</td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.btnView}
                      onClick={() => onView(lead)}
                      title="View lead details"
                    >
                      <Eye size={14} /> View
                    </button>
                    <button
                      className={styles.btnEdit}
                      onClick={() => onEdit(lead)}
                      title="Edit lead"
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className={styles.pagination}>
        <div className={styles.paginationInfo}>
          Showing <strong>{startRecord}</strong> – <strong>{endRecord}</strong>{" "}
          of <strong>{totalItems}</strong> leads
        </div>

        <div className={styles.paginationControls}>
          <span className={styles.perPageLabel}>Rows:</span>
          <select
            className={styles.perPageSelect}
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            aria-label="Records per page"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          <div className={styles.divider} />

          <button
            className={styles.btnPage}
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            title="Previous page"
          >
            <ChevronLeft size={16} />
          </button>

          <span className={styles.pageIndicator}>
            <strong>{currentPage}</strong> / {totalPages || 1}
          </span>

          <button
            className={styles.btnPage}
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
            title="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(LeadTable);
