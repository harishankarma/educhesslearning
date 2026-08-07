import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Article, Profile } from "@/lib/types";
import {
  BookOpen, Search, Star, Bookmark, Heart, ExternalLink,
  Loader2, FileText, TrendingUp,
} from "lucide-react";

const CATEGORIES = [
  "Openings", "Endgames", "Tactics", "Strategy",
  "Tournament Tips", "Academy News",
  "Beginner", "Intermediate", "Advanced",
];

export default function StudentLearningHub({ profile }: { profile: Profile }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCats, setActiveCats] = useState<Set<string>>(new Set());
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [readArticles, setReadArticles] = useState<Set<string>>(new Set());
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  const load = useCallback(async () => {
    const [arts, bms, lks, prog] = await Promise.all([
      supabase.from("articles").select("*").eq("status", "published").order("is_featured", { ascending: false }).order("published_at", { ascending: false }),
      supabase.from("article_bookmarks").select("article_id").eq("student_id", profile.id),
      supabase.from("article_likes").select("article_id").eq("student_id", profile.id),
      supabase.from("article_progress").select("article_id").eq("student_id", profile.id),
    ]);
    setArticles((arts.data as Article[]) ?? []);
    setBookmarks(new Set((bms.data ?? []).map((b: { article_id: string }) => b.article_id)));
    setLikes(new Set((lks.data ?? []).map((l: { article_id: string }) => l.article_id)));
    setReadArticles(new Set((prog.data ?? []).map((r: { article_id: string }) => r.article_id)));
    setLoading(false);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = articles;
    if (showBookmarksOnly) list = list.filter((a) => bookmarks.has(a.id));
    if (activeCats.size > 0) list = list.filter((a) => activeCats.has(a.category));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [articles, activeCats, search, showBookmarksOnly, bookmarks]);

  const featured = filtered.filter((a) => a.is_featured);
  const regular = filtered.filter((a) => !a.is_featured);

  function toggleCat(cat: string) {
    setActiveCats((prev) => {
      const n = new Set(prev);
      if (n.has(cat)) n.delete(cat); else n.add(cat);
      return n;
    });
  }

  async function toggleBookmark(a: Article) {
    if (bookmarks.has(a.id)) {
      await supabase.from("article_bookmarks").delete().eq("article_id", a.id).eq("student_id", profile.id);
      setBookmarks((prev) => { const n = new Set(prev); n.delete(a.id); return n; });
    } else {
      await supabase.from("article_bookmarks").insert({ article_id: a.id, student_id: profile.id });
      setBookmarks((prev) => new Set(prev).add(a.id));
    }
  }

  async function toggleLike(a: Article) {
    if (likes.has(a.id)) {
      await supabase.from("article_likes").delete().eq("article_id", a.id).eq("student_id", profile.id);
      setLikes((prev) => { const n = new Set(prev); n.delete(a.id); return n; });
    } else {
      await supabase.from("article_likes").insert({ article_id: a.id, student_id: profile.id });
      setLikes((prev) => new Set(prev).add(a.id));
    }
  }

  async function markRead(a: Article) {
    if (readArticles.has(a.id)) return;
    await supabase.from("article_progress").insert({ article_id: a.id, student_id: profile.id });
    setReadArticles((prev) => new Set(prev).add(a.id));
    window.open(a.blog_url, "_blank", "noopener,noreferrer");
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Learning Hub</h1>
        <p className="text-sm text-surface-500 mt-1">Chess articles, guides, and learning resources</p>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="w-5 h-5 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles by title, summary, or category..."
          className="w-full pl-11 pr-4 py-3 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-surface-900"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => { setActiveCats(new Set()); setShowBookmarksOnly(false); }}
          className={`text-sm font-medium px-3 py-1.5 rounded-full transition ${activeCats.size === 0 && !showBookmarksOnly ? "bg-primary-600 text-white" : "bg-surface-100 text-surface-600 hover:bg-surface-200"}`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => toggleCat(cat)}
            className={`text-sm font-medium px-3 py-1.5 rounded-full transition ${activeCats.has(cat) ? "bg-primary-600 text-white" : "bg-surface-100 text-surface-600 hover:bg-surface-200"}`}
          >
            {cat}
          </button>
        ))}
        <button
          onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
          className={`text-sm font-medium px-3 py-1.5 rounded-full transition flex items-center gap-1.5 ${showBookmarksOnly ? "bg-accent-600 text-white" : "bg-surface-100 text-surface-600 hover:bg-surface-200"}`}
        >
          <Bookmark className="w-3.5 h-3.5" /> Saved
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center text-surface-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No articles found. Try a different search or filter.</p>
        </div>
      ) : (
        <>
          {/* Featured articles */}
          {featured.length > 0 && !showBookmarksOnly && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-surface-900 mb-3 flex items-center gap-2"><Star className="w-5 h-5 text-warning-500 fill-warning-500" /> Featured</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {featured.map((a) => (
                  <FeaturedCard
                    key={a.id}
                    a={a}
                    isBookmarked={bookmarks.has(a.id)}
                    isLiked={likes.has(a.id)}
                    isRead={readArticles.has(a.id)}
                    onBookmark={() => toggleBookmark(a)}
                    onLike={() => toggleLike(a)}
                    onRead={() => markRead(a)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Regular articles */}
          <div>
            <h2 className="text-lg font-bold text-surface-900 mb-3">Recent Articles</h2>
            {regular.length === 0 ? (
              <p className="text-sm text-surface-400">No articles in this category.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {regular.map((a) => (
                  <ArticleCard
                    key={a.id}
                    a={a}
                    isBookmarked={bookmarks.has(a.id)}
                    isLiked={likes.has(a.id)}
                    isRead={readArticles.has(a.id)}
                    onBookmark={() => toggleBookmark(a)}
                    onLike={() => toggleLike(a)}
                    onRead={() => markRead(a)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Reading progress summary */}
          {articles.length > 0 && (
            <div className="mt-8 bg-white rounded-xl border border-surface-200 p-5">
              <h3 className="font-semibold text-surface-900 mb-2 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-success-500" /> Your Reading Progress</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm text-surface-500 mb-1">
                    <span>{readArticles.size} of {articles.length} articles read</span>
                    <span>{Math.round((readArticles.size / articles.length) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                    <div className="h-full bg-success-500 rounded-full transition-all duration-500" style={{ width: `${(readArticles.size / articles.length) * 100}%` }} />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-surface-900">{bookmarks.size}</p>
                  <p className="text-xs text-surface-500">Saved</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FeaturedCard({ a, isBookmarked, isLiked, isRead, onBookmark, onLike, onRead }: {
  a: Article; isBookmarked: boolean; isLiked: boolean; isRead: boolean;
  onBookmark: () => void; onLike: () => void; onRead: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 overflow-hidden hover:shadow-lg transition group">
      {a.cover_image_url ? (
        <div className="relative h-48 overflow-hidden">
          <img src={a.cover_image_url} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
          <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-warning-500 text-white flex items-center gap-1"><Star className="w-3 h-3 fill-white" /> Featured</span>
        </div>
      ) : (
        <div className="h-32 bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
          <BookOpen className="w-12 h-12 text-primary-400" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">{a.category}</span>
          {isRead && <span className="text-xs text-success-600 flex items-center gap-1"><FileText className="w-3 h-3" /> Read</span>}
        </div>
        <h3 className="font-semibold text-surface-900 text-lg mb-2 line-clamp-2">{a.title}</h3>
        <p className="text-sm text-surface-500 line-clamp-2 mb-4">{a.summary || "No summary available"}</p>
        <div className="flex items-center justify-between">
          <button onClick={onRead} className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition text-sm">
            <ExternalLink className="w-4 h-4" /> Read Article
          </button>
          <div className="flex items-center gap-1">
            <button onClick={onBookmark} className={`p-2 rounded-lg transition ${isBookmarked ? "text-accent-600 bg-accent-50" : "text-surface-400 hover:bg-surface-100"}`}><Bookmark className={`w-5 h-5 ${isBookmarked ? "fill-accent-600" : ""}`} /></button>
            <button onClick={onLike} className={`p-2 rounded-lg transition ${isLiked ? "text-error-500 bg-error-50" : "text-surface-400 hover:bg-surface-100"}`}><Heart className={`w-5 h-5 ${isLiked ? "fill-error-500" : ""}`} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ a, isBookmarked, isLiked, isRead, onBookmark, onLike, onRead }: {
  a: Article; isBookmarked: boolean; isLiked: boolean; isRead: boolean;
  onBookmark: () => void; onLike: () => void; onRead: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 overflow-hidden hover:shadow-md transition group flex flex-col">
      {a.cover_image_url ? (
        <div className="relative h-36 overflow-hidden">
          <img src={a.cover_image_url} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        </div>
      ) : (
        <div className="h-24 bg-gradient-to-br from-surface-100 to-primary-50 flex items-center justify-center">
          <FileText className="w-10 h-10 text-surface-300" />
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">{a.category}</span>
          {isRead && <span className="text-xs text-success-600 flex items-center gap-0.5"><FileText className="w-3 h-3" /> Read</span>}
        </div>
        <h3 className="font-semibold text-surface-900 mb-1 line-clamp-2">{a.title}</h3>
        <p className="text-sm text-surface-500 line-clamp-2 mb-3 flex-1">{a.summary || "No summary"}</p>
        {a.published_at && <p className="text-xs text-surface-400 mb-3">{new Date(a.published_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</p>}
        <div className="flex items-center justify-between">
          <button onClick={onRead} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
            <ExternalLink className="w-4 h-4" /> Read Article
          </button>
          <div className="flex items-center gap-1">
            <button onClick={onBookmark} className={`p-1.5 rounded-lg transition ${isBookmarked ? "text-accent-600 bg-accent-50" : "text-surface-400 hover:bg-surface-100"}`}><Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-accent-600" : ""}`} /></button>
            <button onClick={onLike} className={`p-1.5 rounded-lg transition ${isLiked ? "text-error-500 bg-error-50" : "text-surface-400 hover:bg-surface-100"}`}><Heart className={`w-4 h-4 ${isLiked ? "fill-error-500" : ""}`} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
