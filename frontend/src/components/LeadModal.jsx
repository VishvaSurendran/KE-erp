import { useState, useEffect, useCallback, useRef } from "react";
import styles from "./LeadModal.module.css";
import { LEAD_STATUSES, LEAD_SOURCES } from "../services/config";
import { addNote, editNote, deleteNote, updateLead, createLead } from "../services/client";
import { User, Edit2, X, Trash2, Check, Save, Plus, Eye } from "lucide-react";
import toast from "react-hot-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name = "") {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateForm(values) {
  const errors = {};
  if (!values.name?.trim()) errors.name = "Name is required.";
  if (!values.mobile?.trim()) {
    errors.mobile = "Mobile is required.";
  } else if (!/^[6-9]\d{9}$/.test(values.mobile.replace(/\s/g, ""))) {
    errors.mobile = "Enter a valid 10-digit mobile number.";
  }
  if (!values.email?.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!values.status) errors.status = "Please select a status.";
  return errors;
}

// ─── NoteItem ─────────────────────────────────────────────────────────────────
function NoteItem({ note, onEdit, onDelete }) {
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState(note.text);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editMode && inputRef.current) inputRef.current.focus();
  }, [editMode]);

  const handleSave = () => {
    if (editText.trim() && editText.trim() !== note.text) {
      onEdit(note.id, editText.trim());
    }
    setEditMode(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditText(note.text);
      setEditMode(false);
    }
  };

  return (
    <div className={styles.noteItem}>
      <div className={styles.noteAvatar}>{getInitials(note.author || "U")}</div>
      <div className={styles.noteContent}>
        <span className={styles.noteMeta}>
          {note.author ?? "Unknown"} · {formatDateTime(note.createdAt)}
          {note.updatedAt && " (edited)"}
        </span>
        {editMode ? (
          <input
            ref={inputRef}
            className={styles.noteEditInput}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <p className={styles.noteText}>{note.text}</p>
        )}
      </div>
      <div className={styles.noteActions}>
        {editMode ? (
          <button
            className={`${styles.btnNoteAction} ${styles.btnNoteSave}`}
            onClick={handleSave}
            title="Save"
          >
            <Check size={14} />
          </button>
        ) : (
          <button
            className={`${styles.btnNoteAction} ${styles.btnNoteEdit}`}
            onClick={() => setEditMode(true)}
            title="Edit note"
          >
            <Edit2 size={14} />
          </button>
        )}
        <button
          className={`${styles.btnNoteAction} ${styles.btnNoteDelete}`}
          onClick={() => onDelete(note.id)}
          title="Delete note"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── DetailItem ───────────────────────────────────────────────────────────────
function DetailItem({ label, value }) {
  return (
    <div className={styles.detailItem}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value || "—"}</span>
    </div>
  );
}
// ─── LeadModal ────────────────────────────────────────────────────────────────
/**
 * @param {object}   props
 * @param {object}   props.lead          – lead data object (read from parent)
 * @param {"view"|"edit"} props.initialMode – starting tab
 * @param {Array}    props.employees     – list of employee objects { id, name }
 * @param {Function} props.onClose       – close callback
 * @param {Function} props.onUpdated     – (updatedLead) => void – after save/note change
 */
function LeadModal({ lead: propLead, initialMode = "view", employees = [], onClose, onUpdated }) {
  const [mode, setMode] = useState(initialMode);
  const [lead, setLead] = useState(propLead);

  // ── Edit form state ──
  const [form, setForm] = useState({
    name: propLead.name ?? "",
    mobile: propLead.mobile ?? "",
    email: propLead.email ?? "",
    status: propLead.status ?? "",
    assignedEmployeeId: propLead.assignedEmployeeId ?? "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // ── Escape to close ──
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Overlay click-outside
  const handleOverlayClick = useCallback(
    (e) => { if (e.target === e.currentTarget) onClose(); },
    [onClose]
  );

  // ── Form handlers ──
  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSave = async () => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      toast.error("Please fix the validation errors before saving.");
      return;
    }

    setConfirmDialog({
      title: "Save Changes",
      message: "Are you sure you want to save these changes?",
      onConfirm: async () => {
        setConfirmDialog(null);
        setSaving(true);
        try {
          const selectedEmp = employees.find((e) => String(e.id) === String(form.assignedEmployeeId));
          let updated;
          if (lead.id) {
            updated = await updateLead(lead.id, {
              ...form,
              assignedEmployee: selectedEmp ? selectedEmp.name : lead.assignedEmployee,
            });
          } else {
            updated = await createLead({
              ...form,
              assignedEmployee: selectedEmp ? selectedEmp.name : "Unassigned",
            });
          }
          setLead(updated);
          onUpdated?.(updated);
          setMode("view");
          toast.success(lead.id ? "Lead updated successfully!" : "Lead created successfully!");
        } catch (err) {
          setErrors({ _global: err.message });
          toast.error(err.message || "Failed to save lead.");
        } finally {
          setSaving(false);
        }
      },
      confirmText: "Yes, Save",
      isDanger: false
    });
  };

  // ── Note handlers ──
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setNoteLoading(true);
    try {
      const updated = await addNote(lead, newNote.trim());
      setLead(updated);
      onUpdated?.(updated);
      setNewNote("");
      toast.success("Note added!");
    } catch (err) {
      console.error("Add note failed:", err);
      toast.error("Failed to add note.");
    } finally {
      setNoteLoading(false);
    }
  };

  const handleEditNote = async (noteId, newText) => {
    try {
      const updated = await editNote(lead, noteId, newText);
      setLead(updated);
      onUpdated?.(updated);
      toast.success("Note updated!");
    } catch (err) {
      console.error("Edit note failed:", err);
      toast.error("Failed to edit note.");
    }
  };

  const handleDeleteNote = async (noteId) => {
    setConfirmDialog({
      title: "Delete Note",
      message: "Are you sure you want to delete this note? This action cannot be undone.",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const updated = await deleteNote(lead, noteId);
          setLead(updated);
          onUpdated?.(updated);
          toast.success("Note deleted.");
        } catch (err) {
          console.error("Delete note failed:", err);
          toast.error("Failed to delete note.");
        }
      },
      confirmText: "Delete",
      isDanger: true
    });
  };

  const notes = lead.notes ?? [];

  return (
    <div className={styles.overlay} onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className={styles.dialog}>
        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              {mode === "view" ? <User size={24} /> : <Edit2 size={24} />}
            </div>
            <div>
              <p className={styles.title}>{lead?.name || "New Lead"}</p>
              <p className={styles.subtitle}>
                {mode === "view" ? "Lead Details" : "Edit Lead Information"}
              </p>
            </div>
          </div>
          <button className={styles.btnClose} onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* ── Mode Tabs ── */}
        <div className={styles.modeTabs} role="tablist">
          <button
            role="tab"
            aria-selected={mode === "view"}
            className={`${styles.modeTab} ${mode === "view" ? styles.modeTabActive : ""}`}
            onClick={() => setMode("view")}
          >
            <Eye size={16} style={{ marginRight: '6px' }} /> View
          </button>
          <button
            role="tab"
            aria-selected={mode === "edit"}
            className={`${styles.modeTab} ${mode === "edit" ? styles.modeTabActive : ""}`}
            onClick={() => setMode("edit")}
          >
            <Edit2 size={16} style={{ marginRight: '6px' }} /> Edit
          </button>
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>
          {mode === "view" ? (
            <>
              {/* Contact Info */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Contact Information</h3>
                <div className={styles.detailGrid}>
                  <DetailItem label="Full Name"    value={lead.name} />
                  <DetailItem label="Mobile"       value={lead.mobile} />
                  <DetailItem label="Email"        value={lead.email} />
                  <DetailItem label="Address"      value={lead.address} />
                </div>
              </div>

              {/* Lead Info */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Lead Information</h3>
                <div className={styles.detailGrid}>
                  <DetailItem label="Status"           value={lead.status} />
                  <DetailItem label="Lead Source"      value={lead.leadSource} />
                  <DetailItem label="Course Interested" value={lead.courseInterested} />
                  <DetailItem label="Assigned To"      value={lead.assignedEmployee} />
                  <DetailItem label="Created"          value={formatDateTime(lead.createdAt)} />
                  <DetailItem label="Last Updated"     value={formatDateTime(lead.updatedAt)} />
                </div>
              </div>

              {/* Notes */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Notes ({notes.length})</h3>
                <div className={styles.notesArea}>
                  <div className={styles.noteCompose}>
                    <input
                      className={styles.noteInput}
                      placeholder="Write a note and press Add…"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddNote(); }}
                    />
                    <button
                      className={styles.btnAddNote}
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || noteLoading}
                    >
                      {noteLoading ? "Adding…" : <><Plus size={14} style={{ marginRight: '4px' }} /> Add</>}
                    </button>
                  </div>
                  <div className={styles.noteList}>
                    {notes.length === 0 ? (
                      <p className={styles.emptyNotes}>No notes yet. Add one above.</p>
                    ) : (
                      [...notes].reverse().map((note) => (
                        <NoteItem
                          key={note.id}
                          note={note}
                          onEdit={handleEditNote}
                          onDelete={handleDeleteNote}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Edit Form */}
              {errors._global && (
                <div style={{
                  padding: "0.75rem 1rem",
                  background: "var(--danger-soft)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--danger)",
                  fontSize: "0.85rem",
                  border: "1px solid var(--danger-ring)",
                }}>
                  ⚠️ {errors._global}
                </div>
              )}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Edit Lead Details</h3>
                <div className={styles.formGrid}>
                  {/* Name */}
                  <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                    <label className={styles.label}>
                      Full Name <span className={styles.required}>*</span>
                    </label>
                    <input
                      className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
                      value={form.name}
                      onChange={(e) => handleFieldChange("name", e.target.value)}
                      placeholder="Enter full name"
                    />
                    {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
                  </div>

                  {/* Mobile */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Mobile <span className={styles.required}>*</span>
                    </label>
                    <input
                      className={`${styles.input} ${errors.mobile ? styles.inputError : ""}`}
                      value={form.mobile}
                      onChange={(e) => handleFieldChange("mobile", e.target.value)}
                      placeholder="10-digit mobile"
                      maxLength={10}
                    />
                    {errors.mobile && <span className={styles.errorMsg}>{errors.mobile}</span>}
                  </div>

                  {/* Email */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Email <span className={styles.required}>*</span>
                    </label>
                    <input
                      className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                      value={form.email}
                      onChange={(e) => handleFieldChange("email", e.target.value)}
                      placeholder="email@example.com"
                      type="email"
                    />
                    {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
                  </div>

                  {/* Status */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Status <span className={styles.required}>*</span>
                    </label>
                    <select
                      className={`${styles.select} ${errors.status ? styles.inputError : ""}`}
                      value={form.status}
                      onChange={(e) => handleFieldChange("status", e.target.value)}
                    >
                      <option value="">— Select Status —</option>
                      {LEAD_STATUSES.filter((s) => s.value).map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    {errors.status && <span className={styles.errorMsg}>{errors.status}</span>}
                  </div>

                  {/* Assigned Employee */}
                  <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                    <label className={styles.label}>Assigned Employee</label>
                    <select
                      className={styles.select}
                      value={form.assignedEmployeeId}
                      onChange={(e) => handleFieldChange("assignedEmployeeId", e.target.value)}
                    >
                      <option value="">— Unassigned —</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {mode === "edit" && (
          <div className={styles.footer}>
            <button className={styles.btnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button
              className={styles.btnPrimary}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <><span className={styles.spinner} /> Saving…</>
              ) : (
                <><Save size={16} style={{ marginRight: '6px' }} /> Save Changes</>
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* ── Confirm Dialog Overlay ── */}
      {confirmDialog && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)',
            width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>{confirmDialog.title}</h3>
            <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                className={styles.btnSecondary} 
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </button>
              <button 
                className={styles.btnPrimary} 
                style={confirmDialog.isDanger ? { background: 'var(--danger)' } : {}}
                onClick={confirmDialog.onConfirm}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadModal;
