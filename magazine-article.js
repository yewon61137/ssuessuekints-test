import { auth, db, openAuthModal, getUserProfile } from '/auth.js?v=5';
import {
  doc, getDoc, setDoc, deleteDoc, serverTimestamp,
  collection, query, orderBy, getDocs, addDoc,
  runTransaction, increment
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

let currentUser = null;
let currentLang = 'ko';

const UI = {
  like:                 { ko: '좋아요',               en: 'Like',                     ja: 'いいね' },
  scrap:                { ko: '스크랩',               en: 'Save',                     ja: 'スクラップ' },
  comments:             { ko: '댓글',                 en: 'Comments',                 ja: 'コメント' },
  commentPlaceholder:   { ko: '댓글을 입력하세요...', en: 'Write a comment...',       ja: 'コメントを入力してください...' },
  replyPlaceholder:     { ko: '답글을 입력하세요...', en: 'Write a reply...',         ja: '返信を入力してください...' },
  submit:               { ko: '등록',                 en: 'Post',                     ja: '投稿' },
  reply:                { ko: '답글',                 en: 'Reply',                    ja: '返信' },
  delete:               { ko: '삭제',                 en: 'Delete',                   ja: '削除' },
  cancel:               { ko: '취소',                 en: 'Cancel',                   ja: 'キャンセル' },
  confirmComment:       { ko: '댓글을 삭제할까요?',   en: 'Delete this comment?',     ja: 'このコメントを削除しますか？' },
  confirmReply:         { ko: '답글을 삭제할까요?',   en: 'Delete this reply?',       ja: 'この返信を削除しますか？' },
};

function t(key) { return UI[key]?.[currentLang] ?? UI[key]?.ko ?? key; }

export function initMagazineArticle(articleId) {
  onAuthStateChanged(auth, user => { currentUser = user; });
  initArticleLang();
  initLikeScrap(articleId);
  loadComments(articleId);
  setupCommentForm(articleId);
}

// ─── Language switching ───────────────────────────────────

function initArticleLang() {
  const saved = localStorage.getItem('lang') || 'ko';
  applyArticleLang(saved);
  document.querySelectorAll('.lang-btn[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => applyArticleLang(btn.dataset.lang));
  });
}

function applyArticleLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;

  // 본문 언어 섹션
  document.querySelectorAll('.article-lang').forEach(el => {
    el.style.display = el.dataset.lang === lang ? '' : 'none';
  });

  // data-ko/en/ja 속성 (헤더·푸터 등 일반 요소)
  document.querySelectorAll('[data-ko]').forEach(el => {
    // article-title/meta는 아래에서 innerHTML로 별도 처리
    if (el.classList.contains('article-title') || el.classList.contains('article-meta')) return;
    const val = el.dataset[lang];
    if (val !== undefined) el.textContent = val;
  });

  // 언어 버튼 active 상태
  document.querySelectorAll('.lang-btn[data-lang]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  // 아티클 hero — 카테고리
  const catEl = document.querySelector('.article-category');
  if (catEl?.dataset[lang]) catEl.textContent = catEl.dataset[lang];

  // 아티클 hero — 제목 (innerHTML: <br> 태그 보존)
  const titleEl = document.querySelector('.article-title');
  if (titleEl?.dataset[lang]) titleEl.innerHTML = titleEl.dataset[lang];

  // 아티클 hero — 날짜/메타 (innerHTML: &nbsp; 보존)
  const metaEl = document.querySelector('.article-meta');
  if (metaEl?.dataset[lang]) metaEl.innerHTML = metaEl.dataset[lang];

  // 액션 바 라벨
  const likeLabel = document.getElementById('likeBtnLabel');
  if (likeLabel) likeLabel.textContent = t('like');
  const scrapLabel = document.getElementById('scrapBtnLabel');
  if (scrapLabel) scrapLabel.textContent = t('scrap');
  const commentLabel = document.getElementById('commentLabel');
  if (commentLabel) commentLabel.textContent = t('comments');

  // 댓글 섹션 타이틀 라벨
  const commentsTitleText = document.querySelector('.comments-title-text');
  if (commentsTitleText) commentsTitleText.textContent = t('comments');

  // 댓글 입력 폼
  const commentInput = document.getElementById('commentInput');
  if (commentInput) commentInput.placeholder = t('commentPlaceholder');
  const commentSubmitBtn = document.getElementById('commentSubmitBtn');
  if (commentSubmitBtn) commentSubmitBtn.textContent = t('submit');

  // 아티클 하단 네비게이션
  const navPrev = document.getElementById('navPrev');
  const navNext = document.getElementById('navNext');
  const navList = document.getElementById('navList');
  if (navPrev?.firstChild) navPrev.firstChild.textContent = ({ ko: '← 이전 글', en: '← Prev', ja: '← 前の記事' })[lang] || '← 이전 글';
  if (navNext?.firstChild) navNext.firstChild.textContent = ({ ko: '다음 글 →', en: 'Next →', ja: '次の記事 →' })[lang] || '다음 글 →';
  if (navList) navList.textContent = ({ ko: '목록으로', en: 'All Articles', ja: '一覧へ' })[lang] || '목록으로';
}

// ─── Like / Scrap ─────────────────────────────────────────

function initLikeScrap(articleId) {
  loadArticleCounts(articleId);
  onAuthStateChanged(auth, async user => {
    if (!user) {
      document.getElementById('likeBtn')?.classList.remove('active');
      document.getElementById('scrapBtn')?.classList.remove('active');
      return;
    }
    const [likeSnap, scrapSnap] = await Promise.all([
      getDoc(doc(db, `users/${user.uid}/magazineLikes/${articleId}`)),
      getDoc(doc(db, `users/${user.uid}/magazineScraps/${articleId}`))
    ]);
    document.getElementById('likeBtn')?.classList.toggle('active', likeSnap.exists());
    document.getElementById('scrapBtn')?.classList.toggle('active', scrapSnap.exists());
  });
  document.getElementById('likeBtn')?.addEventListener('click', () => toggleLike(articleId));
  document.getElementById('scrapBtn')?.addEventListener('click', () => toggleScrap(articleId));
}

async function loadArticleCounts(articleId) {
  const snap = await getDoc(doc(db, 'magazine', articleId));
  if (!snap.exists()) return;
  const d = snap.data();
  const lc = document.getElementById('likeCount');
  const sc = document.getElementById('scrapCount');
  const cc = document.getElementById('commentCountDisplay');
  if (lc) lc.textContent = d.likeCount || 0;
  if (sc) sc.textContent = d.scrapCount || 0;
  if (cc) cc.textContent = d.commentCount || 0;
}

async function toggleLike(articleId) {
  if (!currentUser) { openAuthModal(); return; }
  const likeRef = doc(db, `users/${currentUser.uid}/magazineLikes/${articleId}`);
  const articleRef = doc(db, 'magazine', articleId);
  const likeBtn = document.getElementById('likeBtn');
  const likeCount = document.getElementById('likeCount');
  const isLiked = likeBtn?.classList.contains('active');
  await runTransaction(db, async tx => {
    const snap = await tx.get(likeRef);
    if (snap.exists()) {
      tx.delete(likeRef);
      tx.set(articleRef, { likeCount: increment(-1) }, { merge: true });
    } else {
      tx.set(likeRef, { likedAt: serverTimestamp() });
      tx.set(articleRef, { likeCount: increment(1) }, { merge: true });
    }
  });
  likeBtn?.classList.toggle('active', !isLiked);
  if (likeCount) likeCount.textContent = Math.max(0, (parseInt(likeCount.textContent) || 0) + (isLiked ? -1 : 1));
}

async function toggleScrap(articleId) {
  if (!currentUser) { openAuthModal(); return; }
  const scrapRef = doc(db, `users/${currentUser.uid}/magazineScraps/${articleId}`);
  const articleRef = doc(db, 'magazine', articleId);
  const scrapBtn = document.getElementById('scrapBtn');
  const scrapCount = document.getElementById('scrapCount');
  const isScrapped = scrapBtn?.classList.contains('active');
  await runTransaction(db, async tx => {
    const snap = await tx.get(scrapRef);
    if (snap.exists()) {
      tx.delete(scrapRef);
      tx.set(articleRef, { scrapCount: increment(-1) }, { merge: true });
    } else {
      tx.set(scrapRef, { scrappedAt: serverTimestamp() });
      tx.set(articleRef, { scrapCount: increment(1) }, { merge: true });
    }
  });
  scrapBtn?.classList.toggle('active', !isScrapped);
  if (scrapCount) scrapCount.textContent = Math.max(0, (parseInt(scrapCount.textContent) || 0) + (isScrapped ? -1 : 1));
}

// ─── Comments ─────────────────────────────────────────────

async function loadComments(articleId) {
  const listEl = document.getElementById('commentsList');
  if (!listEl) return;
  listEl.innerHTML = '';
  const q = query(collection(db, 'magazine', articleId, 'comments'), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  snap.forEach(d => listEl.appendChild(buildCommentEl(articleId, d.id, d.data())));
  syncCommentCount(snap.size);
}

function syncCommentCount(n) {
  document.querySelectorAll('#commentCountDisplay').forEach(el => el.textContent = n);
}

function avatarHtml(photoURL, size = 28) {
  return photoURL
    ? `<div class="comment-avatar" style="background-image:url(${photoURL})"></div>`
    : `<div class="comment-avatar"><svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></div>`;
}

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildCommentEl(articleId, commentId, data) {
  const el = document.createElement('div');
  el.className = 'comment-item';
  const isMine = currentUser && currentUser.uid === data.uid;
  el.innerHTML = `
    <div class="comment-header">
      ${avatarHtml(data.profilePhotoURL)}
      <span class="comment-author">${esc(data.nickname || '')}</span>
      <span class="comment-date">${formatDate(data.createdAt)}</span>
    </div>
    <p class="comment-body">${esc(data.content || '')}</p>
    <div class="comment-footer"></div>
    <div class="replies-list"></div>`;

  const footerEl = el.querySelector('.comment-footer');
  const repliesEl = el.querySelector('.replies-list');

  const replyBtn = document.createElement('button');
  replyBtn.className = 'reply-btn link-btn';
  replyBtn.textContent = t('reply');
  replyBtn.addEventListener('click', () => toggleReplyForm(articleId, commentId, repliesEl));
  footerEl.appendChild(replyBtn);

  if (isMine) {
    const delBtn = document.createElement('button');
    delBtn.className = 'comment-delete-btn link-btn';
    delBtn.textContent = t('delete');
    delBtn.addEventListener('click', async () => {
      if (!confirm(t('confirmComment'))) return;
      await deleteDoc(doc(db, 'magazine', articleId, 'comments', commentId));
      await runTransaction(db, async tx => {
        tx.set(doc(db, 'magazine', articleId), { commentCount: increment(-1) }, { merge: true });
      });
      el.remove();
      const listEl = document.getElementById('commentsList');
      syncCommentCount(listEl ? listEl.children.length : 0);
    });
    footerEl.appendChild(delBtn);
  }

  loadReplies(articleId, commentId, repliesEl);
  return el;
}

async function loadReplies(articleId, commentId, container) {
  const q = query(
    collection(db, 'magazine', articleId, 'comments', commentId, 'replies'),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  snap.forEach(d => container.appendChild(buildReplyEl(articleId, commentId, d.id, d.data())));
}

function buildReplyEl(articleId, commentId, replyId, data) {
  const el = document.createElement('div');
  el.className = 'comment-item reply-item';
  const isMine = currentUser && currentUser.uid === data.uid;
  el.innerHTML = `
    <div class="comment-header">
      ${avatarHtml(data.profilePhotoURL, 22)}
      <span class="comment-author">${esc(data.nickname || '')}</span>
      <span class="comment-date">${formatDate(data.createdAt)}</span>
    </div>
    <p class="comment-body">${esc(data.content || '')}</p>
    ${isMine ? '<div class="comment-footer"></div>' : ''}`;
  if (isMine) {
    const delBtn = document.createElement('button');
    delBtn.className = 'comment-delete-btn link-btn';
    delBtn.textContent = t('delete');
    delBtn.addEventListener('click', async () => {
      if (!confirm(t('confirmReply'))) return;
      await deleteDoc(doc(db, 'magazine', articleId, 'comments', commentId, 'replies', replyId));
      el.remove();
    });
    el.querySelector('.comment-footer').appendChild(delBtn);
  }
  return el;
}

function toggleReplyForm(articleId, commentId, repliesEl) {
  const existing = repliesEl.querySelector('.reply-form');
  if (existing) { existing.remove(); return; }
  const form = document.createElement('div');
  form.className = 'reply-form';
  form.innerHTML = `
    <textarea class="reply-input" placeholder="${t('replyPlaceholder')}" maxlength="500" rows="2"></textarea>
    <div class="reply-form-btns">
      <button class="primary-btn reply-submit-btn" style="font-size:0.8rem;padding:0.4rem 1rem;">${t('submit')}</button>
      <button class="link-btn reply-cancel-btn">${t('cancel')}</button>
    </div>`;
  repliesEl.appendChild(form);
  form.querySelector('.reply-cancel-btn').addEventListener('click', () => form.remove());
  form.querySelector('.reply-submit-btn').addEventListener('click', async () => {
    if (!currentUser) { openAuthModal(); return; }
    const text = form.querySelector('.reply-input').value.trim();
    if (!text) return;
    const profile = await getUserProfile(currentUser.uid);
    const data = {
      uid: currentUser.uid,
      nickname: profile?.nickname || currentUser.displayName || currentUser.email.split('@')[0],
      profilePhotoURL: profile?.profilePhotoURL || '',
      content: text,
      createdAt: serverTimestamp()
    };
    const ref = await addDoc(
      collection(db, 'magazine', articleId, 'comments', commentId, 'replies'), data
    );
    form.remove();
    repliesEl.appendChild(buildReplyEl(articleId, commentId, ref.id, { ...data, createdAt: { toDate: () => new Date() } }));
  });
}

function setupCommentForm(articleId) {
  const input = document.getElementById('commentInput');
  const submitBtn = document.getElementById('commentSubmitBtn');
  if (!input || !submitBtn) return;
  submitBtn.addEventListener('click', async () => {
    if (!currentUser) { openAuthModal(); return; }
    const text = input.value.trim();
    if (!text) return;
    submitBtn.disabled = true;
    const profile = await getUserProfile(currentUser.uid);
    const data = {
      uid: currentUser.uid,
      nickname: profile?.nickname || currentUser.displayName || currentUser.email.split('@')[0],
      profilePhotoURL: profile?.profilePhotoURL || '',
      content: text,
      createdAt: serverTimestamp()
    };
    const ref = await addDoc(collection(db, 'magazine', articleId, 'comments'), data);
    await runTransaction(db, async tx => {
      tx.set(doc(db, 'magazine', articleId), { commentCount: increment(1) }, { merge: true });
    });
    input.value = '';
    submitBtn.disabled = false;
    const listEl = document.getElementById('commentsList');
    if (listEl) {
      listEl.appendChild(buildCommentEl(articleId, ref.id, { ...data, createdAt: { toDate: () => new Date() } }));
      syncCommentCount(listEl.children.length);
    }
  });
}
