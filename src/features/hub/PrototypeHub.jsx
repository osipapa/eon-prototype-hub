import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search, Monitor, Laptop, Tablet, Smartphone, Sun, Moon, Maximize2, ExternalLink,
  Figma, CircleDot, ChevronDown, Link2, FileText, Plus, Shield, LogOut,
} from "lucide-react";
import { HUB, VIEWPORTS, STATUS_COLOR, CANVAS_PRESETS, MEDIA, renderStory, currentArgs } from "./prototypes";

const VP_ICON = { desktop: Monitor, laptop: Laptop, tablet: Tablet, mobile: Smartphone };

export default function PrototypeHub({
  projects, assets = {}, isAdmin, userEmail,
  onPatchProject, onSetAsset, onNewProject, onOpenAdmin, onSignOut,
}) {
  const [hubTheme, setHubTheme] = useState("dark");
  const [protoTheme, setProtoTheme] = useState("dark");
  const [view, setView] = useState("stories");
  const [activeId, setActiveId] = useState(projects[0]?.id);
  const [viewport, setViewport] = useState("laptop");
  const [query, setQuery] = useState("");
  const [canvasBg, setCanvasBg] = useState("#808080");
  const [liveArgs, setLiveArgs] = useState({}); // {projectId: {key:val}} ephemeral

  const c = HUB[hubTheme];
  const story = projects.find((s) => s.id === activeId) || projects[0];
  const args = story ? currentArgs(story, liveArgs[story.id]) : {};
  const vp = VIEWPORTS[viewport];
  const media = { eonLogo: assets.eonLogo, acmeLogo: assets.acmeLogo };

  const html = useMemo(
    () => (story ? renderStory(story, protoTheme, media) : ""),
    [story, args, protoTheme, media.eonLogo, media.acmeLogo]
  );
  const scale = useMemo(() => Math.min(760 / vp.w, 460 / vp.h, 1), [viewport]);

  const groups = useMemo(() => {
    const q = query.toLowerCase();
    const g = {};
    projects
      .filter((s) => s.title.toLowerCase().includes(q) || (s.group_name || "").toLowerCase().includes(q))
      .forEach((s) => { (g[s.group_name || "General"] ||= []).push(s); });
    return g;
  }, [projects, query]);

  if (!story) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: c.bg, color: c.muted }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, color: c.text, fontWeight: 500 }}>No prototypes yet</div>
          <Button onClick={onNewProject} style={{ marginTop: 12, background: c.primary, color: c.primaryText }}>+ New prototype</Button>
        </div>
      </div>
    );
  }

  const [sc0, sc1] = STATUS_COLOR[story.status] || STATUS_COLOR["Exploration"];
  const isFigma = /figma\.com/i.test(story.figma_url || "") && !/REPLACE/i.test(story.figma_url || "");
  const figmaEmbed = `https://www.figma.com/embed?embed_host=eon-hub&url=${encodeURIComponent(story.figma_url || "")}`;

  const setArg = (key, val) => setLiveArgs((p) => ({ ...p, [story.id]: { ...p[story.id], [key]: val } }));
  const patch = (field, val) => onPatchProject(story.id, { [field]: val });
  const openFull = () => window.open(URL.createObjectURL(new Blob([html], { type: "text/html" })), "_blank");

  const seg = (opts, val, onPick) => (
    <div style={{ display: "flex", gap: 3, background: c.raised, borderRadius: 100, padding: 3 }}>
      {opts.map((o) => {
        const on = val === o;
        return (
          <button key={o} onClick={() => onPick(o)}
            style={{ padding: "5px 12px", borderRadius: 100, fontSize: 12, cursor: "pointer", border: "none", textTransform: "capitalize",
              background: on ? c.primary : "transparent", color: on ? c.primaryText : c.secondary, fontWeight: on ? 500 : 400 }}>{o}</button>
        );
      })}
    </div>
  );

  return (
    <div className={hubTheme === "dark" ? "" : "light"}
      style={{ display: "flex", height: "100vh", background: c.bg, color: c.text, fontFamily: "'DM Sans',sans-serif" }}>
      {/* sidebar */}
      <aside style={{ width: 240, background: c.nav, borderRight: `1px solid ${c.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${c.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ display: "inline-flex" }} dangerouslySetInnerHTML={{ __html: MEDIA.logos.eon(c.text, c.brand, media.eonLogo) }} />
            <span style={{ fontWeight: 500, fontSize: 16 }}>Eon Prototypes</span>
          </div>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 10, top: 10, width: 15, height: 15, color: c.muted }} />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stories"
              style={{ paddingLeft: 30, height: 34, background: c.raised, borderColor: c.border, color: c.text, borderRadius: 8 }} />
          </div>
          <div style={{ display: "flex", gap: 3, marginTop: 12, background: c.raised, border: `1px solid ${c.border}`, borderRadius: 8, padding: 3 }}>
            {["stories", "media"].map((v) => {
              const on = view === v;
              return (
                <button key={v} onClick={() => setView(v)}
                  style={{ flex: 1, height: 28, borderRadius: 6, fontSize: 12, cursor: "pointer", border: "none",
                    background: on ? c.panel : "transparent", color: on ? c.text : c.muted, fontWeight: on ? 500 : 400 }}>
                  {v === "stories" ? "Stories" : "Media"}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ overflowY: "auto", padding: 8, flex: 1 }}>
          <button onClick={onNewProject}
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px dashed ${c.border}`,
              background: "transparent", color: c.muted, cursor: "pointer", fontSize: 13, marginBottom: 8 }}>
            <Plus style={{ width: 14, height: 14 }} /> New prototype
          </button>
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 8px", fontSize: 11, fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase", color: c.muted }}>
                <ChevronDown style={{ width: 12, height: 12 }} /> {group}
              </div>
              {items.map((s) => (
                <button key={s.id} onClick={() => { setActiveId(s.id); setView("stories"); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "8px 10px 8px 22px", borderRadius: 8, border: "none", cursor: "pointer",
                    fontSize: 14, marginBottom: 1, color: activeId === s.id ? c.text : c.secondary, background: activeId === s.id ? c.active : "transparent", fontWeight: activeId === s.id ? 500 : 400 }}>
                  <CircleDot style={{ width: 13, height: 13, color: activeId === s.id ? c.brand : c.muted }} />
                  {s.title}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${c.border}`, padding: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: c.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</span>
          {isAdmin && (
            <button onClick={onOpenAdmin} title="Admin" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${c.border}`, background: "transparent", color: c.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield style={{ width: 14, height: 14 }} />
            </button>
          )}
          <button onClick={onSignOut} title="Sign out" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${c.border}`, background: "transparent", color: c.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LogOut style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </aside>

      {/* main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "auto" }}>
        {view === "media" && <MediaManager c={c} assets={assets} onSetAsset={onSetAsset} />}
        {view === "stories" && (<>
          {/* toolbar */}
          <div style={{ height: 56, borderBottom: `1px solid ${c.border}`, background: c.nav, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", flexShrink: 0, position: "sticky", top: 0, zIndex: 5 }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{story.title}</span>
            <Badge style={{ background: sc0, color: sc1, border: "none", fontWeight: 500 }}>{story.status}</Badge>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: 2, background: c.raised, borderRadius: 8, padding: 3, border: `1px solid ${c.border}` }}>
              {Object.keys(VIEWPORTS).map((k) => {
                const Icon = VP_ICON[k]; const on = viewport === k;
                return (
                  <button key={k} onClick={() => setViewport(k)} title={VIEWPORTS[k].label}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 28, borderRadius: 6, border: "none", cursor: "pointer", background: on ? c.panel : "transparent", color: on ? c.brand : c.muted }}>
                    <Icon style={{ width: 15, height: 15 }} />
                  </button>
                );
              })}
            </div>
            <button onClick={() => setHubTheme(hubTheme === "dark" ? "light" : "dark")} title="Interface theme"
              style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${c.border}`, background: c.panel, color: c.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {hubTheme === "dark" ? <Sun style={{ width: 15, height: 15 }} /> : <Moon style={{ width: 15, height: 15 }} />}
            </button>
            <Button onClick={openFull} style={{ height: 32, background: c.primary, color: c.primaryText, gap: 6, fontSize: 13, borderRadius: 8 }}>
              <Maximize2 style={{ width: 14, height: 14 }} /> Open full view
            </Button>
          </div>

          {/* canvas + floating controls */}
          <div style={{ position: "relative", background: canvasBg, minHeight: 540, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px 88px" }}>
            <div style={{ width: vp.w * scale, height: vp.h * scale, flexShrink: 0 }}>
              <iframe key={`${story.id}-${JSON.stringify(args)}-${protoTheme}`} title={story.title} srcDoc={html}
                style={{ width: vp.w, height: vp.h, border: "none", borderRadius: 10, background: "#fff", transform: `scale(${scale})`, transformOrigin: "top left", boxShadow: "0 12px 48px rgba(0,0,0,.28)" }} />
            </div>
            <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 14, background: c.panel, border: `1px solid ${c.border}`, borderRadius: 100, padding: "8px 14px", boxShadow: "0 8px 30px rgba(0,0,0,.35)", maxWidth: "92%", flexWrap: "wrap", justifyContent: "center" }}>
              {(story.controls || []).map((ctrl, i) => (
                <div key={ctrl.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {i > 0 && <span style={{ width: 1, height: 20, background: c.border }} />}
                  <span style={{ fontSize: 12, color: c.muted }}>{ctrl.label}</span>
                  {seg(ctrl.options, args[ctrl.key], (o) => setArg(ctrl.key, o))}
                </div>
              ))}
              {(story.controls || []).length > 0 && <span style={{ width: 1, height: 20, background: c.border }} />}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: c.muted }}>Theme</span>
                {seg(["light", "dark"], protoTheme, setProtoTheme)}
              </div>
              <span style={{ width: 1, height: 20, background: c.border }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: c.muted }}>Canvas</span>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {CANVAS_PRESETS.map((bg) => (
                    <button key={bg} onClick={() => setCanvasBg(bg)} title={bg}
                      style={{ width: 20, height: 20, borderRadius: 6, cursor: "pointer", background: bg, border: canvasBg === bg ? `2px solid ${c.brand}` : `1px solid ${c.border}` }} />
                  ))}
                  <label style={{ width: 20, height: 20, borderRadius: 6, cursor: "pointer", overflow: "hidden", border: `1px solid ${c.border}`, display: "block", position: "relative", background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)" }}>
                    <input type="color" value={canvasBg} onChange={(e) => setCanvasBg(e.target.value)} style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* links + docs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20 }}>
            <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 16, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 14, fontWeight: 500 }}><Link2 style={{ width: 15, height: 15, color: c.muted }} /> Links</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* figma */}
                <div>
                  <div style={{ fontSize: 12, color: c.muted, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><Figma style={{ width: 13, height: 13, color: c.brand }} /> Figma frame</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    <Input value={story.figma_url || ""} onChange={(e) => patch("figma_url", e.target.value)} placeholder="Paste a Figma URL"
                      style={{ height: 34, background: c.bg, borderColor: c.border, color: c.text, fontSize: 12, borderRadius: 8 }} />
                    <button onClick={() => isFigma && window.open(story.figma_url, "_blank")} style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ExternalLink style={{ width: 14, height: 14 }} /></button>
                  </div>
                  <div style={{ height: 300, borderRadius: 12, overflow: "hidden", border: `1px solid ${c.border}`, background: c.bg }}>
                    {isFigma
                      ? <iframe title="Figma preview" src={figmaEmbed} allowFullScreen style={{ width: "100%", height: "100%", border: "none" }} />
                      : <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center", padding: 20 }}><Figma style={{ width: 22, height: 22, color: c.muted }} /><div style={{ fontSize: 13, color: c.text }}>No Figma frame linked</div><div style={{ fontSize: 12, color: c.muted }}>Paste a share URL to embed a live preview.</div></div>}
                  </div>
                </div>
                {/* linear */}
                <div>
                  <div style={{ fontSize: 12, color: c.muted, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><CircleDot style={{ width: 13, height: 13, color: "#5E6AD2" }} /> Linear issue</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    <Input value={story.issue_id || ""} onChange={(e) => patch("issue_id", e.target.value)} placeholder="PRO-12" style={{ height: 34, width: 88, flexShrink: 0, background: c.bg, borderColor: c.border, color: c.text, fontSize: 12, borderRadius: 8 }} />
                    <Input value={story.issue_url || ""} onChange={(e) => patch("issue_url", e.target.value)} placeholder="https://linear.app/..." style={{ height: 34, background: c.bg, borderColor: c.border, color: c.text, fontSize: 12, borderRadius: 8 }} />
                    <button onClick={() => story.issue_url && window.open(story.issue_url, "_blank")} style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ExternalLink style={{ width: 14, height: 14 }} /></button>
                  </div>
                  <div style={{ height: 300, borderRadius: 12, border: `1px solid ${c.border}`, background: c.bg, padding: 16, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: c.muted, background: c.raised, padding: "3px 8px", borderRadius: 6 }}>{story.issue_id || "ISSUE"}</span>
                      <Badge style={{ background: sc0, color: sc1, border: "none", fontWeight: 500, fontSize: 11 }}>{story.status}</Badge>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 500, marginTop: 12 }}>{story.title} — design + build</div>
                    <div style={{ fontSize: 13, color: c.secondary, marginTop: 6, lineHeight: 1.5, flex: 1 }}>{(story.notes || "").slice(0, 160)}{(story.notes || "").length > 160 ? "…" : ""}</div>
                    <div style={{ fontSize: 11, color: c.muted, paddingTop: 12, borderTop: `1px solid ${c.border}` }}>Connect Linear to pull live title, status, and assignee.</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 16, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 14, fontWeight: 500 }}><FileText style={{ width: 15, height: 15, color: c.muted }} /> Docs</div>
              <Textarea value={story.notes || ""} onChange={(e) => patch("notes", e.target.value)} placeholder="Describe the project, goals, open questions..."
                style={{ minHeight: 120, background: c.bg, borderColor: c.border, color: c.text, fontSize: 13, resize: "vertical", borderRadius: 8 }} />
              <p style={{ fontSize: 11, color: c.muted, marginTop: 8 }}>Saved to Supabase and shared with your team.</p>
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}

/* ---- Media manager (assets persist via onSetAsset) ---- */
function MediaManager({ c, assets, onSetAsset }) {
  const [ph, setPh] = useState({ w: 320, h: 180, label: "", bg: "#E5E7EB", fg: "#94A3B8" });
  const field = { height: 34, background: c.bg, borderColor: c.border, color: c.text, fontSize: 12, borderRadius: 8 };
  const panel = { background: c.panel, border: `1px solid ${c.border}`, borderRadius: 16, padding: 18 };
  const previewBox = { height: 96, borderRadius: 10, border: `1px solid ${c.border}`, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 };

  const LogoRow = ({ label, keyName, current }) => (
    <div style={panel}>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>{label}</div>
      <div style={previewBox}>
        {assets[keyName]
          ? <img src={assets[keyName]} alt={label} style={{ maxHeight: 56, maxWidth: "80%", objectFit: "contain", borderRadius: 8 }} />
          : <span dangerouslySetInnerHTML={{ __html: current }} />}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <Input defaultValue={assets[keyName] || ""} placeholder="Paste image URL to replace"
          onBlur={(e) => onSetAsset(keyName, e.target.value)} style={field} />
        <button onClick={() => onSetAsset(keyName, "")} style={{ height: 34, padding: "0 12px", flexShrink: 0, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.muted, cursor: "pointer", fontSize: 12 }}>Reset</button>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1 }}>
      <div style={{ height: 56, borderBottom: `1px solid ${c.border}`, background: c.nav, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", position: "sticky", top: 0, zIndex: 5 }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>Media library</span>
        <span style={{ fontSize: 12, color: c.muted }}>Shared assets used across every story</span>
      </div>
      <div style={{ padding: 20 }}>
        <Tabs defaultValue="logos">
          <TabsList style={{ background: c.raised, borderRadius: 100, marginBottom: 18 }}>
            <TabsTrigger value="logos">Logos</TabsTrigger>
            <TabsTrigger value="placeholders">Placeholders</TabsTrigger>
          </TabsList>
          <TabsContent value="logos" style={{ margin: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <LogoRow label="Eon logo (hub)" keyName="eonLogo" current={MEDIA.logos.eon(c.text, c.brand)} />
              <LogoRow label="Acme logo (stories)" keyName="acmeLogo" current={MEDIA.logos.acme(40, 10, "#4F46E5")} />
            </div>
          </TabsContent>
          <TabsContent value="placeholders" style={{ margin: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
              <div style={panel}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Generate placeholder</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <Input type="number" value={ph.w} onChange={(e) => setPh({ ...ph, w: +e.target.value || 0 })} style={field} />
                  <Input type="number" value={ph.h} onChange={(e) => setPh({ ...ph, h: +e.target.value || 0 })} style={field} />
                </div>
                <Input value={ph.label} onChange={(e) => setPh({ ...ph, label: e.target.value })} placeholder={`${ph.w}×${ph.h}`} style={{ ...field, marginBottom: 8 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="color" value={ph.bg} onChange={(e) => setPh({ ...ph, bg: e.target.value })} style={{ flex: 1, height: 34, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg }} />
                  <input type="color" value={ph.fg} onChange={(e) => setPh({ ...ph, fg: e.target.value })} style={{ flex: 1, height: 34, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg }} />
                </div>
              </div>
              <div style={panel}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Preview</div>
                <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: "hidden", display: "flex", justifyContent: "center", background: c.bg, padding: 12 }}>
                  <img src={MEDIA.placeholder(ph.w, ph.h, ph.label, ph.bg, ph.fg)} alt="placeholder" style={{ maxWidth: "100%", maxHeight: 220, objectFit: "contain" }} />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
