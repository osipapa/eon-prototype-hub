import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2,
  RefreshCw, ShieldCheck, Trash2, UserPlus, Users, X,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { createAccount, deleteAccount, listProfiles, setAccountPassword, setProfileRole } from "../lib/data";
import "./routes.css";

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pending, setPending] = useState({});
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ email: "", password: "", role: "member" });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetValue, setResetValue] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const modalRef = useRef(null);
  const modalReturnFocusRef = useRef(null);
  const modalBusyRef = useRef(false);
  modalBusyRef.current = Boolean(
    (resetTarget && pending[`password-${resetTarget.id}`])
    || (deleteTarget && pending[`delete-${deleteTarget.id}`]),
  );

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setLoadError("");
    try {
      setRows(await listProfiles());
    } catch (error) {
      setLoadError(error.message || "We couldn't load the team members.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!resetTarget && !deleteTarget) return undefined;
    const previousFocus = modalReturnFocusRef.current || document.activeElement;
    const dialog = modalRef.current;
    const focusableSelector = "button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const focusTarget = dialog?.querySelector("[data-autofocus]") || dialog?.querySelector(focusableSelector);
    focusTarget?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        if (modalBusyRef.current) return;
        setResetTarget(null);
        setDeleteTarget(null);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const controls = [...dialog.querySelectorAll(focusableSelector)];
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus?.();
      modalReturnFocusRef.current = null;
    };
  }, [resetTarget, deleteTarget]);

  const setActionPending = (key, value) => {
    setPending((current) => {
      const next = { ...current };
      if (value) next[key] = true;
      else delete next[key];
      return next;
    });
  };

  const run = async (key, action, successMessage) => {
    setActionPending(key, true);
    setMessage(null);
    try {
      await action();
      setMessage({ type: "success", text: successMessage });
      await load({ silent: true });
      return true;
    } catch (error) {
      setMessage({ type: "error", text: error.message || "That change couldn't be saved." });
      return false;
    } finally {
      setActionPending(key, false);
    }
  };

  const changeRole = async (member, role) => {
    if (role === member.role) return;
    const previousRole = member.role;
    setRows((current) => current.map((row) => row.id === member.id ? { ...row, role } : row));
    const success = await run(
      `role-${member.id}`,
      () => setProfileRole(member.id, role),
      `${member.email} is now ${role === "admin" ? "an admin" : "a member"}.`,
    );
    if (!success) {
      setRows((current) => current.map((row) => row.id === member.id ? { ...row, role: previousRole } : row));
    }
  };

  const addAccount = async (event) => {
    event.preventDefault();
    const email = form.email.trim();
    const success = await run(
      "create",
      () => createAccount(email, form.password, form.role),
      `Account created for ${email}.`,
    );
    if (success) {
      setForm({ email: "", password: "", role: "member" });
      setShowCreatePassword(false);
    }
  };

  const openPasswordReset = (member, trigger) => {
    modalReturnFocusRef.current = trigger;
    setResetValue("");
    setShowResetPassword(false);
    setResetTarget(member);
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    if (!resetTarget) return;
    const success = await run(
      `password-${resetTarget.id}`,
      () => setAccountPassword(resetTarget.id, resetValue),
      `Password updated for ${resetTarget.email}.`,
    );
    if (success) setResetTarget(null);
  };

  const removeAccount = async () => {
    if (!deleteTarget) return;
    const success = await run(
      `delete-${deleteTarget.id}`,
      () => deleteAccount(deleteTarget.id),
      `Deleted ${deleteTarget.email}.`,
    );
    if (success) setDeleteTarget(null);
  };

  return (
    <main className="route-shell admin-shell">
      <header className="route-topbar">
        <button className="route-button route-button--quiet route-pressable" onClick={() => navigate("/")}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to hub</span>
        </button>
        <div className="route-topbar-divider" aria-hidden="true" />
        <div className="route-topbar-context">
          <ShieldCheck size={17} aria-hidden="true" />
          <span>Workspace admin</span>
        </div>
      </header>

      <div className="admin-page">
        <header className="admin-page-heading">
          <div>
            <span className="route-eyebrow">Workspace settings</span>
            <h1>Team members</h1>
            <p>Manage who can access, edit, and administer your shared prototype workspace.</p>
          </div>
          <span className="admin-member-count"><Users size={15} aria-hidden="true" /><strong>{loading ? "—" : rows.length}</strong> {!loading && rows.length === 1 ? "member" : "members"}</span>
        </header>

        {message && (
          <div className={`route-notice route-notice--${message.type}`} role={message.type === "error" ? "alert" : "status"}>
            {message.type === "error" ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
            <span>{message.text}</span>
            <button className="route-notice-dismiss route-pressable" onClick={() => setMessage(null)} aria-label="Dismiss message"><X size={15} /></button>
          </div>
        )}

        <section className="route-card admin-members-card" aria-labelledby="members-heading">
          <div className="route-card-header">
            <div>
              <h2 id="members-heading">People with access</h2>
              <p>Admins manage accounts and roles. Members can view and edit prototypes.</p>
            </div>
          </div>

          {loadError ? (
            <div className="route-state route-state--error admin-load-state" role="alert">
              <span className="route-state-icon"><AlertCircle size={18} /></span>
              <div>
                <strong>Team members couldn't load</strong>
                <p>{loadError}</p>
              </div>
              <button className="route-button route-button--secondary route-pressable" onClick={() => load()}>
                <RefreshCw size={15} /> Retry
              </button>
            </div>
          ) : loading ? (
            <div className="admin-loading" role="status" aria-label="Loading team members">
              {[0, 1, 2].map((item) => (
                <div className="admin-loading-row" key={item}>
                  <span className="admin-loading-avatar" />
                  <span className="admin-loading-line" />
                  <span className="admin-loading-line admin-loading-line--short" />
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Member</th><th>Email</th><th>Role</th><th><span className="route-sr-only">Account actions</span></th></tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr className="admin-empty-row">
                      <td colSpan={4}>
                        <span className="route-state-icon"><Users size={20} /></span>
                        <strong>No team members yet</strong>
                        <p>Create the first account below to start collaborating.</p>
                      </td>
                    </tr>
                  ) : rows.map((member) => {
                    const rolePending = pending[`role-${member.id}`];
                    const passwordPending = pending[`password-${member.id}`];
                    const deletePending = pending[`delete-${member.id}`];
                    const rowBusy = passwordPending || deletePending;
                    const displayName = member.full_name || member.email?.split("@")[0] || "Team member";
                    return (
                      <tr key={member.id}>
                        <td data-label="Member">
                          <div className="admin-person">
                            <span className="admin-avatar" aria-hidden="true">{initials(displayName)}</span>
                            <div>
                              <strong>{displayName}</strong>
                              {member.id === user?.id && <span className="admin-you-badge">You</span>}
                            </div>
                          </div>
                        </td>
                        <td data-label="Email"><span className="admin-email">{member.email}</span></td>
                        <td data-label="Role">
                          <div className="admin-role-control">
                            <select className="route-select" value={member.role}
                              disabled={Boolean(rolePending) || member.id === user?.id}
                              title={member.id === user?.id ? "You can't change your own role" : undefined}
                              aria-label={`Role for ${member.email}`}
                              onChange={(event) => changeRole(member, event.target.value)}>
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                            {rolePending && <Loader2 className="route-spinner" size={15} aria-label="Updating role" />}
                          </div>
                        </td>
                        <td data-label="Actions">
                          <div className="admin-row-actions">
                            <button className="route-icon-button route-pressable" onClick={(event) => openPasswordReset(member, event.currentTarget)}
                              disabled={Boolean(rowBusy)} title="Set password" aria-label={`Set password for ${member.email}`}>
                              {passwordPending ? <Loader2 className="route-spinner" size={16} /> : <KeyRound size={16} />}
                            </button>
                            {member.id !== user?.id && (
                              <button className="route-icon-button route-icon-button--danger route-pressable"
                                onClick={(event) => { modalReturnFocusRef.current = event.currentTarget; setDeleteTarget(member); }} disabled={Boolean(rowBusy)}
                                title="Delete account" aria-label={`Delete account ${member.email}`}>
                                {deletePending ? <Loader2 className="route-spinner" size={16} /> : <Trash2 size={16} />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="route-card admin-create-card" aria-labelledby="create-account-heading">
          <div className="route-card-header admin-create-heading">
            <span className="route-section-icon"><UserPlus size={18} /></span>
            <div>
              <h2 id="create-account-heading">Add an account</h2>
              <p>Create secure credentials, then share them directly with your teammate.</p>
            </div>
          </div>
          <form className="admin-create-form" onSubmit={addAccount}>
            <div className="route-field admin-email-field">
              <label htmlFor="admin-new-email">Email address</label>
              <input id="admin-new-email" className="route-input" type="email" required value={form.email}
                placeholder="teammate@company.com" autoComplete="off"
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </div>
            <div className="route-field admin-password-field">
              <label htmlFor="admin-new-password">Temporary password</label>
              <div className="route-input-wrap">
                <input id="admin-new-password" className="route-input route-input--with-action"
                  type={showCreatePassword ? "text" : "password"} required minLength={8}
                  value={form.password} placeholder="At least 8 characters" autoComplete="new-password"
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
                <button className="route-input-action route-pressable" type="button"
                  onClick={() => setShowCreatePassword((visible) => !visible)}
                  aria-label={showCreatePassword ? "Hide temporary password" : "Show temporary password"}
                  aria-pressed={showCreatePassword}>
                  <PasswordVisibilityIcon visible={showCreatePassword} />
                </button>
              </div>
            </div>
            <div className="route-field admin-role-field">
              <label htmlFor="admin-new-role">Role</label>
              <select id="admin-new-role" className="route-select" value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button className="route-button route-button--primary route-pressable admin-create-button" type="submit" disabled={Boolean(pending.create)}>
              {pending.create && <Loader2 className="route-spinner" size={16} />}
              {pending.create ? "Creating…" : "Create account"}
            </button>
          </form>
          <p className="admin-create-note">There is no self-signup. Use the key action beside any member to set a new password later.</p>
        </section>
      </div>

      {resetTarget && (
        <div className="route-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending[`password-${resetTarget.id}`]) setResetTarget(null); }}>
          <section ref={modalRef} data-route-modal className="route-modal" role="dialog" aria-modal="true" aria-labelledby="reset-password-title" aria-describedby="reset-password-description">
            <div className="route-modal-header">
              <div>
                <h2 id="reset-password-title">Set a new password</h2>
                <p id="reset-password-description">Update the credentials for {resetTarget.email}.</p>
              </div>
              <button className="route-icon-button route-pressable" onClick={() => setResetTarget(null)} disabled={Boolean(pending[`password-${resetTarget.id}`])} aria-label="Close password dialog"><X size={17} /></button>
            </div>
            <form onSubmit={resetPassword}>
              <div className="route-modal-body">
                <div className="route-field">
                  <label htmlFor="admin-reset-password">New password</label>
                  <div className="route-input-wrap">
                    <input data-autofocus id="admin-reset-password" className="route-input route-input--with-action"
                      type={showResetPassword ? "text" : "password"} required minLength={8}
                      value={resetValue} placeholder="At least 8 characters" autoComplete="new-password"
                      onChange={(event) => setResetValue(event.target.value)} />
                    <button className="route-input-action route-pressable" type="button"
                      onClick={() => setShowResetPassword((visible) => !visible)}
                      aria-label={showResetPassword ? "Hide new password" : "Show new password"}
                      aria-pressed={showResetPassword}>
                      <PasswordVisibilityIcon visible={showResetPassword} />
                    </button>
                  </div>
                  <span className="route-field-help">Use at least 8 characters.</span>
                </div>
              </div>
              <div className="route-modal-footer">
                <button className="route-button route-button--secondary route-pressable" type="button" onClick={() => setResetTarget(null)} disabled={Boolean(pending[`password-${resetTarget.id}`])}>Cancel</button>
                <button className="route-button route-button--primary route-pressable" type="submit" disabled={Boolean(pending[`password-${resetTarget.id}`])}>
                  {pending[`password-${resetTarget.id}`] && <Loader2 className="route-spinner" size={16} />}
                  {pending[`password-${resetTarget.id}`] ? "Updating…" : "Update password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div className="route-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending[`delete-${deleteTarget.id}`]) setDeleteTarget(null); }}>
          <section ref={modalRef} data-route-modal className="route-modal route-modal--compact" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" aria-describedby="delete-account-description">
            <div className="route-modal-header">
              <div>
                <h2 id="delete-account-title">Delete this account?</h2>
                <p id="delete-account-description">{deleteTarget.email} will immediately lose workspace access. This can't be undone.</p>
              </div>
              <button className="route-icon-button route-pressable" onClick={() => setDeleteTarget(null)} disabled={Boolean(pending[`delete-${deleteTarget.id}`])} aria-label="Close delete dialog"><X size={17} /></button>
            </div>
            <div className="route-modal-footer">
              <button data-autofocus className="route-button route-button--secondary route-pressable" type="button" onClick={() => setDeleteTarget(null)} disabled={Boolean(pending[`delete-${deleteTarget.id}`])}>Keep account</button>
              <button className="route-button route-button--danger route-pressable" type="button" onClick={removeAccount} disabled={Boolean(pending[`delete-${deleteTarget.id}`])}>
                {pending[`delete-${deleteTarget.id}`] && <Loader2 className="route-spinner" size={16} />}
                {pending[`delete-${deleteTarget.id}`] ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "T";
}

function PasswordVisibilityIcon({ visible }) {
  return (
    <span className="route-visibility-icon" aria-hidden="true">
      <EyeOff className={`route-visibility-glyph ${visible ? "is-visible" : "is-hidden"}`} size={17} />
      <Eye className={`route-visibility-glyph ${visible ? "is-hidden" : "is-visible"}`} size={17} />
    </span>
  );
}
