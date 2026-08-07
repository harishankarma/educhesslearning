import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Article, Profile } from "@/lib/types";
import {
  Modal, Field, Button, Spinner, EmptyState, Badge,
} from "@/components/ui";
import { Plus, CreditCard as Edit3, Trash2, Loader2, Upload, Star, FileText, X, BookOpen, ExternalLink } from "lucide-react";

const CATEGORIES = [
  "Openings", "Endgames", "Tactics", "Strategy",
  "Tournament Tips", "Academy News",
  "Beginner", "Intermediate", "Advanced",
];

export default function ArticleManager({ profile }: { profile: Profile }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("articles").select("*").order("created_at", { ascending: false });
    setArticles((data as Article[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function togglePublish(a: Article) {
    const newStatus = a.status === "published" ? "draft" : "published";
    const updates: Partial<Article> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "published" && !a.published_at) {
      updates.published_at = new Date().toISOString();
    }
    await supabase.from("articles").update(updates).eq("id", a.id);
    load();
  }

  async function toggleFeatured(a: Article) {
    await supabase.from("articles").update({ is_featured: !a.is_featured, updated_at: new Date().toISOString() }).eq("id", a.id);
    load();
  }

  async function handleDelete(a: Article) {
    if (!confirm(`Delete article "${a.title}"?`)) return;
    await supabase.from("articles").delete().eq("id", a.id);
    load();
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Learning Hub — Articles</h1>
          <p className="text-sm text-surface-500 mt-1">Publish chess learning resources for students</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-5 h-5" /> New Article</Button>
      </div>

      {articles.length === 0 ? (
        <EmptyState icon={BookOpen} message="No articles yet. Click 'New Article' to publish your first learning resource." />
      ) : (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-surface-600">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-surface-600 hidden sm:table-cell">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-surface-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-surface-600 hidden md:table-cell">Featured</th>
                  <th className="px-4 py-3 text-right font-medium text-surface-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {articles.map((a) => (
                  <tr key={a.id} className="hover:bg-surface-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {a.cover_image_url ? (
                          <img src={a.cover_image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-surface-400" /></div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-surface-900 truncate">{a.title}</p>
                          <p className="text-xs text-surface-400 truncate">{a.blog_url}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Badge color="primary">{a.category}</Badge></td>
                    <td className="px-4 py-3"><Badge color={a.status === "published" ? "success" : "surface"}>{a.status}</Badge></td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <button onClick={() => toggleFeatured(a)} className="p-1 rounded hover:bg-surface-100">
                        <Star className={`w-5 h-5 ${a.is_featured ? "text-warning-500 fill-warning-500" : "text-surface-300"}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditing(a); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-surface-100 text-primary-600"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => togglePublish(a)} className="text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-surface-100 text-surface-600">{a.status === "published" ? "Unpublish" : "Publish"}</button>
                        <button onClick={() => handleDelete(a)} className="p-1.5 rounded-lg hover:bg-error-50 text-error-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <ArticleFormModal
          profileId={profile.id}
          existing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function ArticleFormModal({ profileId, existing, onClose, onSaved }: {
  profileId: string; existing: Article | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: existing?.title ?? "",
    summary: existing?.summary ?? "",
    blog_url: existing?.blog_url ?? "",
    cover_image_url: existing?.cover_image_url ?? "",
    category: existing?.category ?? "Openings",
    is_featured: existing?.is_featured ?? false,
    status: existing?.status ?? "draft",
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  async function uploadCover() {
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "";
    const path = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const { error } = await supabase.storage.from("article-covers").upload(path, file, { contentType: file.type });
    if (error) { alert("Upload failed: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("article-covers").getPublicUrl(path);
    setForm({ ...form, cover_image_url: urlData.publicUrl });
    setUploading(false);
    setFile(null);
  }

  async function save() {
    if (!form.title.trim() || !form.blog_url.trim()) return;
    setBusy(true);
    const payload = {
      title: form.title,
      summary: form.summary,
      blog_url: form.blog_url,
      cover_image_url: form.cover_image_url,
      category: form.category,
      is_featured: form.is_featured,
      status: form.status,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from("articles").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("articles").insert({
        ...payload,
        created_by: profileId,
        published_at: form.status === "published" ? new Date().toISOString() : null,
      });
    }
    setBusy(false);
    onSaved();
  }

  return (
    <Modal title={existing ? "Edit Article" : "New Article"} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <Field label="Article Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
        <Field label="Short Summary"><textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={2} placeholder="2-3 line preview shown in cards" className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none resize-none" /></Field>
        <Field label="Blog URL (external article link)"><input value={form.blog_url} onChange={(e) => setForm({ ...form, blog_url: e.target.value })} placeholder="https://..." className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Category"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
          <Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "draft" | "published" })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none"><option value="draft">Draft</option><option value="published">Published</option></select></Field>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-surface-700 cursor-pointer">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="rounded" />
            <Star className="w-4 h-4 text-warning-500" /> Mark as featured article
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Cover Image</label>
          {form.cover_image_url ? (
            <div className="relative inline-block">
              <img src={form.cover_image_url} alt="Cover preview" className="w-full h-40 rounded-lg object-cover" />
              <button onClick={() => setForm({ ...form, cover_image_url: "" })} className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-lg hover:bg-black/70"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="flex-1 text-sm text-surface-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700" />
              <Button variant="secondary" onClick={uploadCover} disabled={!file || uploading} className="text-sm px-3 py-2">{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload</Button>
            </div>
          )}
        </div>

        <Button onClick={save} disabled={busy || !form.title.trim() || !form.blog_url.trim()} className="w-full">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <BookOpen className="w-5 h-5" />} {existing ? "Save Changes" : "Create Article"}</Button>
      </div>
    </Modal>
  );
}
