import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { notePreview } from "@/lib/note-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { FileText, LogOut, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

function formatDate(date: Date | string) { return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(date)); }

function RichEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value; }, [value]);
  const format = (command: string) => { ref.current?.focus(); document.execCommand(command, false); onChange(ref.current?.innerHTML ?? ""); };
  return <div className="rich-editor"><div className="format-toolbar" role="toolbar" aria-label="Text formatting"><button type="button" aria-label="Bold" onMouseDown={e => e.preventDefault()} onClick={() => format("bold")}><strong>B</strong></button><button type="button" aria-label="Italic" onMouseDown={e => e.preventDefault()} onClick={() => format("italic")}><em>I</em></button><button type="button" aria-label="Bulleted list" onMouseDown={e => e.preventDefault()} onClick={() => format("insertUnorderedList")}>• List</button></div><div ref={ref} className="content-editable" contentEditable role="textbox" aria-multiline="true" aria-label="Note content" data-placeholder="Begin writing…" onInput={e => onChange(e.currentTarget.innerHTML)} /></div>;
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState({ title: "", content: "" });
  const utils = trpc.useUtils();
  const notes = trpc.notes.list.useQuery(undefined, { enabled: isAuthenticated });
  const create = trpc.notes.create.useMutation({ onSuccess: note => { utils.notes.list.invalidate(); setSelectedId(note?.id ?? null); toast.success("Note created"); }, onError: e => toast.error(e.message) });
  const update = trpc.notes.update.useMutation({ onSuccess: () => { utils.notes.list.invalidate(); toast.success("Changes saved"); }, onError: e => toast.error(e.message) });
  const remove = trpc.notes.delete.useMutation({ onSuccess: () => { utils.notes.list.invalidate(); setSelectedId(null); setDraft({ title: "", content: "" }); toast.success("Note deleted"); }, onError: e => toast.error(e.message) });
  const items = useMemo(() => (notes.data ?? []).filter(n => `${n.title} ${n.content}`.toLowerCase().includes(query.toLowerCase())), [notes.data, query]);
  const selected = (notes.data ?? []).find(n => n.id === selectedId);

  function openNote(id: number) { const note = (notes.data ?? []).find(n => n.id === id); if (note) { setSelectedId(id); setDraft({ title: note.title, content: note.content }); } }
  function newNote() { setSelectedId(null); setDraft({ title: "", content: "" }); }
  function saveNote() { if (!draft.title.trim()) return toast.error("Give your note a title first"); if (selectedId) update.mutate({ id: selectedId, ...draft }); else create.mutate(draft); }
  function cancelEdit() { if (selected) setDraft({ title: selected.title, content: selected.content }); else newNote(); }

  if (loading) return <div className="center-state"><div className="loader" /><p>Preparing your private workspace…</p></div>;
  if (!isAuthenticated) return <main className="auth-shell"><section className="auth-card"><div className="brand-mark"><Sparkles size={18} /></div><p className="eyebrow">A quieter place to think</p><h1>Your ideas deserve<br /><em>a beautiful home.</em></h1><p className="auth-copy">Capture thoughts, keep plans close, and return to what matters. Your notes are private and available only to you.</p><Button className="primary-cta" onClick={() => startLogin()}>Sign in to continue <span>→</span></Button><p className="fine-print">Secure authentication · Personal workspace</p></section><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /></main>;

  return <div className="app-shell"><aside className="sidebar"><div className="wordmark"><span className="brand-mark small"><Sparkles size={14} /></span><span>notely</span></div><div className="sidebar-intro"><p className="eyebrow">Personal space</p><h2>Good to see you,<br /><strong>{user?.name?.split(" ")[0] ?? "friend"}.</strong></h2></div><Button className="new-note" onClick={newNote}><Plus size={17} /> New note</Button><div className="sidebar-foot"><div className="avatar">{(user?.name ?? "U").charAt(0).toUpperCase()}</div><div className="user-meta"><strong>{user?.name ?? "Your account"}</strong><span>{user?.email ?? "Private workspace"}</span></div><button className="icon-button" aria-label="Log out" onClick={() => logout()}><LogOut size={16} /></button></div></aside><main className="workspace"><header className="workspace-header"><div><p className="eyebrow">Your library</p><h1>Notes <span>{notes.data?.length ?? 0}</span></h1></div><label className="search-box"><Search size={17} /><Input aria-label="Search notes" placeholder="Search your notes" value={query} onChange={e => setQuery(e.target.value)} /></label></header><div className="content-grid"><section className="notes-panel"><div className="panel-label">All notes</div>{notes.isLoading ? <div className="state-box"><div className="loader" /><span>Loading your notes…</span></div> : notes.isError ? <div className="state-box error"><span>We couldn't load your notes.</span><Button variant="outline" onClick={() => notes.refetch()}>Try again</Button></div> : items.length === 0 ? <div className="state-box empty"><FileText size={26} /><strong>{query ? "No notes found" : "Your notebook is empty"}</strong><span>{query ? "Try a different search." : "Start with a thought worth keeping."}</span><Button variant="outline" onClick={newNote}><Plus size={15} /> Create a note</Button></div> : <div className="note-list">{items.map(note => <button className={`note-row ${selectedId === note.id ? "active" : ""}`} key={note.id} onClick={() => openNote(note.id)}><span className="note-dot" /><span className="note-summary"><strong>{note.title}</strong><span>{notePreview(note.content) || "No additional text"}</span></span><time>{formatDate(note.updatedAt)}</time></button>)}</div>}</section><section className="editor-panel"><div className="editor-topbar"><span className="status-dot" />{selectedId ? "Editing note" : "New note"}<div className="editor-actions"><Button variant="ghost" size="icon" aria-label="Cancel editing" onClick={cancelEdit}><X size={18} /></Button>{selectedId && <Button variant="ghost" size="icon" aria-label="Delete note" className="danger-button" onClick={() => { if (confirm("Delete this note permanently?")) remove.mutate({ id: selectedId }); }}><Trash2 size={17} /></Button>}</div></div><div className="editor-body"><Input className="title-input" placeholder="Untitled note" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /><RichEditor value={draft.content} onChange={content => setDraft({ ...draft, content })} /><div className="editor-footer"><span>{draft.content.length} characters</span><Button className="save-button" onClick={saveNote} disabled={create.isPending || update.isPending}>{create.isPending || update.isPending ? "Saving…" : "Save note"}</Button></div></div></section></div></main></div>;
}
