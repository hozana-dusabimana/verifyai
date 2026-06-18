import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import {
  Newspaper, Send, CheckCircle, ShieldAlert, AlertTriangle, Loader2,
  Trash2, RefreshCw, PenLine,
} from 'lucide-react';
import { newsfeedAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_META = {
  approved: { labelKey: 'newsfeed.status.approved', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle className="w-3.5 h-3.5 mr-1" /> },
  rejected: { labelKey: 'newsfeed.status.rejected', cls: 'bg-red-100 text-red-800 border-red-200', icon: <ShieldAlert className="w-3.5 h-3.5 mr-1" /> },
  review: { labelKey: 'newsfeed.status.review', cls: 'bg-amber-100 text-amber-800 border-amber-200', icon: <AlertTriangle className="w-3.5 h-3.5 mr-1" /> },
  pending: { labelKey: 'newsfeed.status.pending', cls: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> },
  failed: { labelKey: 'newsfeed.status.failed', cls: 'bg-slate-100 text-slate-700 border-slate-200', icon: <AlertTriangle className="w-3.5 h-3.5 mr-1" /> },
};

function PostStatusBadge({ status }) {
  const { t } = useTranslation();
  const m = STATUS_META[status] || STATUS_META.failed;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${m.cls}`}>
      {m.icon} {t(m.labelKey)}
    </span>
  );
}

const formatDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const NewsFeedPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState('');

  const [myPosts, setMyPosts] = useState([]);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [lastResult, setLastResult] = useState(null);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError('');
    try {
      const res = await newsfeedAPI.getFeed();
      setFeed(res.data.data || []);
    } catch {
      setFeedError(t('newsfeed.feedLoadError'));
    } finally {
      setFeedLoading(false);
    }
  }, [t]);

  const loadMyPosts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await newsfeedAPI.getMyPosts();
      setMyPosts(res.data.data || []);
    } catch {
      /* non-critical */
    }
  }, [user]);

  useEffect(() => { loadFeed(); }, [loadFeed]);
  useEffect(() => { loadMyPosts(); }, [loadMyPosts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setLastResult(null);

    if (content.trim().length < 50) {
      setFormError(t('newsfeed.contentTooShort'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await newsfeedAPI.submit({
        title: title.trim(),
        content: content.trim(),
        source_url: sourceUrl.trim(),
        source_name: sourceName.trim(),
      });
      const post = res.data.data;
      setLastResult(post);
      if (post.status === 'approved') {
        // Reset the composer and surface it in the public feed.
        setTitle('');
        setContent('');
        setSourceUrl('');
        setSourceName('');
        loadFeed();
      }
      loadMyPosts();
    } catch (err) {
      const msg = err.response?.data?.error;
      setFormError(typeof msg === 'string' ? msg : (msg ? JSON.stringify(msg) : t('newsfeed.submissionFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await newsfeedAPI.delete(id);
      setMyPosts((prev) => prev.filter((p) => p.id !== id));
      loadFeed();
    } catch { /* ignore */ }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Newspaper className="w-8 h-8 text-brand-600" /> {t('newsfeed.pageTitle')}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            <Trans i18nKey="newsfeed.pageSubtitle">
              Posts are verified by our AI ensemble. Only news classified as <span className="font-bold text-emerald-600">REAL</span> is published to the newsletter below.
            </Trans>
          </p>
        </div>
        <button
          onClick={loadFeed}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> {t('common.refresh')}
        </button>
      </div>

      {/* Composer (authenticated only) */}
      {user ? (
        <div className="glass rounded-3xl p-6 sm:p-8 shadow-sm border-t-4 border-t-brand-500">
          <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
            <PenLine className="w-5 h-5 text-brand-500" /> {t('newsfeed.composerTitle')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{formError}</div>
            )}
            <input
              type="text"
              required
              maxLength={500}
              placeholder={t('newsfeed.titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm font-semibold"
            />
            <textarea
              required
              placeholder={t('newsfeed.contentPlaceholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-40 border border-slate-300 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none shadow-sm"
            />
            <input
              type="url"
              placeholder={t('newsfeed.sourceUrlPlaceholder')}
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-brand-500 focus:border-brand-500"
            />
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <input
                type="text"
                placeholder={t('newsfeed.sourceNamePlaceholder')}
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="flex-1 border border-slate-300 rounded-xl p-3 text-sm focus:ring-brand-500 focus:border-brand-500"
              />
              <button
                type="submit"
                disabled={submitting}
                className={`px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  submitting ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-brand-600 text-white hover:bg-brand-700 shadow-md hover:shadow-lg'
                }`}
              >
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> {t('newsfeed.verifying')}</> : <><Send className="w-5 h-5" /> {t('newsfeed.verifyAndPost')}</>}
              </button>
            </div>
          </form>

          {/* Verdict for the just-submitted post */}
          {lastResult && (
            <div className={`mt-5 rounded-2xl border p-4 flex items-start gap-3 ${
              lastResult.status === 'approved' ? 'bg-emerald-50 border-emerald-200' :
              lastResult.status === 'rejected' ? 'bg-red-50 border-red-200' :
              lastResult.status === 'review' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="mt-0.5">
                {lastResult.status === 'approved' ? <CheckCircle className="w-6 h-6 text-emerald-600" /> :
                 lastResult.status === 'rejected' ? <ShieldAlert className="w-6 h-6 text-red-600" /> :
                 <AlertTriangle className="w-6 h-6 text-slate-500" />}
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-900">
                  {lastResult.status === 'approved' && t('newsfeed.result.approved')}
                  {lastResult.status === 'review' && t('newsfeed.result.review')}
                  {lastResult.status === 'rejected' && t('newsfeed.result.rejected', { verdict: lastResult.classification || t('newsfeed.result.rejectedDefaultVerdict') })}
                  {lastResult.status === 'failed' && t('newsfeed.result.failed')}
                </p>
                {lastResult.credibility_score != null && (
                  <p className="text-slate-600 mt-0.5 font-medium">{t('newsfeed.result.credibilityScore', { score: Math.round(lastResult.credibility_score) })}</p>
                )}
                {lastResult.status === 'approved' && !lastResult.source_url && (
                  <p className="text-slate-500 mt-1">{t('newsfeed.result.unsourcedPublished')}</p>
                )}
                {lastResult.status === 'rejected' && (
                  <p className="text-slate-500 mt-1">{t('newsfeed.result.rejectedHint')}</p>
                )}
                {lastResult.error_message && <p className="text-slate-500 mt-1">{lastResult.error_message}</p>}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass rounded-3xl p-6 shadow-sm flex items-center justify-between gap-4 flex-wrap">
          <p className="text-slate-600 font-medium">{t('newsfeed.signedOutPrompt')}</p>
          <Link to="/login" className="px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition-colors">{t('common.signIn')}</Link>
        </div>
      )}

      {/* My submissions (authenticated only) */}
      {user && myPosts.length > 0 && (
        <div className="glass rounded-3xl p-6 sm:p-8 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-4">{t('newsfeed.mySubmissions')}</h2>
          <div className="divide-y divide-slate-100">
            {myPosts.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{p.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDate(p.created_at)}
                    {p.credibility_score != null && ` · ${t('newsfeed.credibleSuffix', { score: Math.round(p.credibility_score) })}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <PostStatusBadge status={p.status} />
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title={t('common.delete')} aria-label={t('common.delete')}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Public newsletter feed */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mb-4">{t('newsfeed.newsletterTitle')}</h2>

        {feedLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : feedError ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{feedError}</div>
        ) : feed.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center text-slate-500">
            <Newspaper className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="font-medium">{t('newsfeed.emptyFeed')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {feed.map((post) => (
              <article key={post.id} className="glass rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <h3 className="font-bold text-lg text-slate-900 leading-snug">{post.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed flex-1">{post.excerpt}</p>
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium pt-2 border-t border-slate-100">
                  {post.source_url ? (
                    <a href={post.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">
                      {post.source_name || (() => { try { return new URL(post.source_url).hostname.replace(/^www\./, ''); } catch { return t('newsfeed.sourceFallback'); } })()}
                    </a>
                  ) : (
                    <span>{post.source_name || post.submitted_by || t('newsfeed.communityFallback')}</span>
                  )}
                  <span>{formatDate(post.published_at)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsFeedPage;
