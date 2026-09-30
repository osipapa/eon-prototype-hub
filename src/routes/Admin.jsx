import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle, ArrowLeft, Check, CheckCircle2, Copy, Eye, EyeOff, KeyRound,
  Loader2, MoreHorizontal, PlayCircle, RefreshCw, ShieldCheck,
  Shuffle, Trash2, UserPlus, Users, X,
} from "lucide-react";
import ProfileIcon from "../components/ProfileIcon";
import { copyText } from "../lib/uiState";
import { useAuth } from "../lib/auth";
import * as data from "../lib/data";
import { validTutorialPersona } from "../features/onboarding/tutorial";
import "./routes.css";

// `api` and `auth` are swapped for mocks by the dev-only ?admin-preview route.
export default function Admin({ api = data, auth: authOverride }) {
  const auth = useAuth();
  const { user, refreshProfile } = authOverride || auth;
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pending, setPending] = useState({});
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ email: "", password: "", role: "member" });
  const [showCreatePassword, setShowCreatePassword] = useState(true);
  // Passwords set on this page, kept in memory only so the admin can read and
  // share them until they leave. Stored passwords are hashes and can't be read back.
  const [setPasswords, setSetPasswords] = useState({});
  const [created, setCreated] = useState(null);
  const [menu, setMenu] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetValue, setResetValue] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tutorialTarget, setTutorialTarget] = useState(null);
  const modalRef = useRef(null);
  const modalReturnFocusRef = useRef(null);
  const modalBusyRef = useRef(false);
  modalBusyRef.current = Boolean(
    (resetTarget && pending[`password-${resetTarget.id}`])
    || (deleteTarget && pending[`delete-${deleteTarget.id}`])
    || (tutorialTarget && pending[`tutorial-${tutorialTarget.id}`]),
  );

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setLoadError("");
    try {
      setRows(await api.listProfiles());
    } catch (error) {
      setLoadError(error.message || "We couldn't load the team members.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!menu) return undefined;
    const close = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "mousedown" && event.target.closest?.(".admin-menu, .admin-menu-trigger")) return;
      setMenu(null);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", close);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  useEffect(() => {
    if (!resetTarget && !deleteTarget && !tutorialTarget) return undefined;
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
        setTutorialTarget(null);
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
  }, [resetTarget, deleteTarget, tutorialTarget]);

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
      () => api.setProfileRole(member.id, role),
      `${member.email} is now ${role === "admin" ? "an admin" : "a member"}.`,
    );
    if (!success) {
      setRows((current) => current.map((row) => row.id === member.id ? { ...row, role: previousRole } : row));
    }
  };

  const addAccount = async (event) => {
    event.preventDefault();
    const email = form.email.trim();
    const password = form.password;
    const success = await run(
      "create",
      () => api.createAccount(email, password, form.role),
      `Account created for ${email}.`,
    );
    if (success) {
      setCreated({ email, password });
      setForm({ email: "", password: "", role: "member" });
    }
  };

  const openPasswordReset = (member, trigger) => {
    modalReturnFocusRef.current = trigger;
    setResetValue(generatePassword());
    setShowResetPassword(true);
    setResetTarget(member);
  };

  const openTutorial = (member, trigger) => {
    modalReturnFocusRef.current = trigger;
    setTutorialTarget(member);
  };

  const startTutorial = async () => {
    if (!tutorialTarget) return;
    const target = tutorialTarget;
    // Every track shows the same walkthrough now; the stored persona just has to be valid.
    const persona = validTutorialPersona(target.tutorial_persona) || "designer";
    const success = await run(
      `tutorial-${target.id}`,
      async () => {
        await api.requestProfileTutorial(target.id, persona);
        if (target.id === user?.id) await refreshProfile();
      },
      target.id === user?.id
        ? "Your walkthrough is ready."
        : `${target.email} sees the walkthrough now if they're online, or the next time they sign in.`,
    );
    if (!success) return;
    setTutorialTarget(null);
    if (target.id === user?.id) navigate("/");
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    if (!resetTarget) return;
    const target = resetTarget;
    const password = resetValue;
    const success = await run(
      `password-${target.id}`,
      () => api.setAccountPassword(target.id, password),
      `Password updated for ${target.email}. It shows in their row until you leave this page.`,
    );
    if (!success) return;
    setSetPasswords((current) => ({ ...current, [target.id]: password }));
    setResetTarget(null);
  };

  const removeAccount = async () => {
    if (!deleteTarget) return;
    const success = await run(
      `delete-${deleteTarget.id}`,
      () => api.deleteAccount(deleteTarget.id),
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
        <button className="route-button route-button--secondary route-pressable admin-tutorial-button" onClick={() => navigate("/?tutorial=1")} aria-label="Preview onboarding tutorial">
          <PlayCircle size={16} aria-hidden="true" />
          <span>Preview onboarding</span>
        </button>
      </header>

      <div className="admin-page">
        <header className="admin-page-heading">
          <div>
            <span className="route-eyebrow">Workspace settings</span>
            <h1>Team members</h1>
            <p>Manage who can access, edit, and administer your shared design workspace.</p>
          </div>
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
              <p>Admins manage accounts and roles. Members can use and edit shared design resources.</p>
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
                  <tr><th>Member</th><th>Role</th><th>Password</th><th><span className="route-sr-only">More actions</span></th></tr>
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
                    const tutorialPending = pending[`tutorial-${member.id}`];
                    const rowBusy = passwordPending || deletePending || tutorialPending;
                    const name = member.full_name && member.full_name !== member.email ? member.full_name : null;
                    const isMe = member.id === user?.id;
                    return (
                      <tr key={member.id}>
                        <td data-label="Member">
                          <div className="admin-person">
                            <ProfileIcon email={member.email} name={name} src={member.avatar_url} size={36} />
                            <div>
                              <div className="admin-person-line">
                                <strong>{name || member.email}</strong>
                                {isMe && <span className="admin-you-badge">You</span>}
                              </div>
                              {name && <small>{member.email}</small>}
                            </div>
                          </div>
                        </td>
                        <td data-label="Role">
                          <div className="admin-role-control">
                            <select className="route-select" value={member.role}
                              disabled={Boolean(rolePending) || isMe}
                              title={isMe ? "You can't change your own role" : undefined}
                              aria-label={`Role for ${member.email}`}
                              onChange={(event) => changeRole(member, event.target.value)}>
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                            {rolePending && <Loader2 className="route-spinner" size={15} aria-label="Updating role" />}
                          </div>
                        </td>
                        <td data-label="Password">
                          <div className="admin-password-cell">
                            {setPasswords[member.id] && <SecretValue value={setPasswords[member.id]} label={`New password for ${member.email}`} />}
                            <button className="route-button route-button--quiet route-pressable admin-small-button" onClick={(event) => openPasswordReset(member, event.currentTarget)}
                              disabled={Boolean(rowBusy)} aria-label={`Change password for ${member.email}`}>
                              {passwordPending ? <Loader2 className="route-spinner" size={15} /> : <KeyRound size={15} aria-hidden="true" />}
                              Change
                            </button>
                          </div>
                        </td>
                        <td data-label="Actions">
                          <div className="admin-row-actions">
                            <button className="route-icon-button route-pressable admin-menu-trigger" aria-haspopup="menu" aria-expanded={menu?.id === member.id}
                              disabled={Boolean(rowBusy)} aria-label={`More actions for ${member.email}`}
                              onClick={(event) => {
                                const rect = event.currentTarget.getBoundingClientRect();
                                modalReturnFocusRef.current = event.currentTarget;
                                setMenu((current) => (current?.id === member.id ? null : { id: member.id, member, top: rect.bottom + 6, right: window.innerWidth - rect.right }));
                              }}>
                              {tutorialPending || deletePending ? <Loader2 className="route-spinner" size={16} /> : <MoreHorizontal size={16} />}
                            </button>
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

        {menu && (
          <div className="admin-menu" role="menu" aria-label={`Actions for ${menu.member.email}`} style={{ top: menu.top, right: menu.right }}>
            <button role="menuitem" className="route-pressable" onClick={() => { const member = menu.member; setMenu(null); openTutorial(member, modalReturnFocusRef.current); }}>
              <PlayCircle size={15} aria-hidden="true" /> Start walkthrough
            </button>
            {menu.member.id !== user?.id && (
              <button role="menuitem" className="route-pressable admin-menu-danger" onClick={() => { const member = menu.member; setMenu(null); setDeleteTarget(member); }}>
                <Trash2 size={15} aria-hidden="true" /> Delete account
              </button>
            )}
          </div>
        )}

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
              <div className="admin-field-label">
                <label htmlFor="admin-new-password">Temporary password</label>
                <button type="button" className="admin-link-button route-pressable"
                  onClick={() => { setForm((current) => ({ ...current, password: generatePassword() })); setShowCreatePassword(true); }}>
                  <Shuffle size={13} aria-hidden="true" /> Generate
                </button>
              </div>
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
          {created && (
            <div className="admin-created" role="status">
              <div>
                <strong>Share these with {created.email}</strong>
                <dl>
                  <dt>Email</dt><dd>{created.email}</dd>
                  <dt>Password</dt><dd><SecretValue value={created.password} label={`Password for ${created.email}`} /></dd>
                </dl>
              </div>
              <div className="admin-created-actions">
                <CopyButton text={`Eon Design Hub\n${window.location.origin}${window.location.pathname}\nEmail: ${created.email}\nPassword: ${created.password}`} label="Copy login" />
                <button className="route-icon-button route-pressable" type="button" onClick={() => setCreated(null)} aria-label="Hide login details"><X size={15} /></button>
              </div>
            </div>
          )}
          <p className="admin-create-note">There's no self-signup. Passwords are stored encrypted, so nobody can read a current one. Set a new one from the member's row and it stays visible there until you leave this page.</p>
        </section>
      </div>

      {resetTarget && (
        <div className="route-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending[`password-${resetTarget.id}`]) setResetTarget(null); }}>
          <section ref={modalRef} data-route-modal className="route-modal" role="dialog" aria-modal="true" aria-labelledby="reset-password-title" aria-describedby="reset-password-description">
            <div className="route-modal-header">
              <div>
                <h2 id="reset-password-title">Set a new password</h2>
                <p id="reset-password-description">For {resetTarget.email}. Their current password stops working.</p>
              </div>
              <button className="route-icon-button route-pressable" onClick={() => setResetTarget(null)} disabled={Boolean(pending[`password-${resetTarget.id}`])} aria-label="Close password dialog"><X size={17} /></button>
            </div>
            <form onSubmit={resetPassword}>
              <div className="route-modal-body">
                <div className="route-field">
                  <div className="admin-field-label">
                    <label htmlFor="admin-reset-password">New password</label>
                    <button type="button" className="admin-link-button route-pressable"
                      onClick={() => { setResetValue(generatePassword()); setShowResetPassword(true); }}>
                      <Shuffle size={13} aria-hidden="true" /> Generate
                    </button>
                  </div>
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
                  <span className="route-field-help">At least 8 characters. After you save, it shows in their row so you can copy it.</span>
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

      {tutorialTarget && (
        <div className="route-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending[`tutorial-${tutorialTarget.id}`]) setTutorialTarget(null); }}>
          <section ref={modalRef} data-route-modal className="route-modal route-modal--compact" role="dialog" aria-modal="true" aria-labelledby="tutorial-member-title" aria-describedby="tutorial-member-description">
            <div className="route-modal-header">
              <div>
                <h2 id="tutorial-member-title">Start the walkthrough?</h2>
                <p id="tutorial-member-description">
                  It shows {tutorialTarget.id === user?.id ? "you" : tutorialTarget.email} how to check screen sizes and states, open a prototype on a phone with the QR code, and find its animations.
                  {tutorialTarget.id === user?.id ? "" : " If they're online it starts right away, otherwise the next time they sign in."}
                </p>
              </div>
              <button className="route-icon-button route-pressable" onClick={() => setTutorialTarget(null)} disabled={Boolean(pending[`tutorial-${tutorialTarget.id}`])} aria-label="Close tutorial dialog"><X size={17} /></button>
            </div>
            <div className="route-modal-footer">
              <button className="route-button route-button--secondary route-pressable" type="button" onClick={() => setTutorialTarget(null)} disabled={Boolean(pending[`tutorial-${tutorialTarget.id}`])}>Cancel</button>
              <button data-autofocus className="route-button route-button--primary route-pressable" type="button" onClick={startTutorial} disabled={Boolean(pending[`tutorial-${tutorialTarget.id}`])}>
                {pending[`tutorial-${tutorialTarget.id}`] && <Loader2 className="route-spinner" size={16} />}
                {pending[`tutorial-${tutorialTarget.id}`] ? "Starting…" : "Start walkthrough"}
              </button>
            </div>
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

// Readable and strong: no look-alike characters (0/O, 1/l/I).
function generatePassword(length = 14) {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="route-button route-button--quiet route-pressable admin-small-button" type="button"
      onClick={async () => { await copyText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1400); }}>
      {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      {copied ? "Copied" : label}
    </button>
  );
}

function SecretValue({ value, label }) {
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  return (
    <span className="admin-secret" aria-label={label}>
      <code>{visible ? value : "•".repeat(Math.min(value.length, 12))}</code>
      <button className="route-pressable" type="button" onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible}>
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
      <button className="route-pressable" type="button" aria-label="Copy password"
        onClick={async () => { await copyText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1400); }}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </span>
  );
}

function PasswordVisibilityIcon({ visible }) {
  return (
    <span className="route-visibility-icon" aria-hidden="true">
      <EyeOff className={`route-visibility-glyph ${visible ? "is-visible" : "is-hidden"}`} size={17} />
      <Eye className={`route-visibility-glyph ${visible ? "is-hidden" : "is-visible"}`} size={17} />
    </span>
  );
}
