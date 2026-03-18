// magazine-share.js — 매거진 글 공유 버튼 (IIFE)
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('shareBtn');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var title = document.title;
      var url   = location.href;
      var desc  = (document.querySelector('meta[name="description"]') || {}).content || '';

      if (navigator.share) {
        navigator.share({ title: title, text: desc, url: url }).catch(function (e) {
          if (e.name !== 'AbortError') _copyFallback(url, btn);
        });
      } else {
        _copyFallback(url, btn);
      }
    });

    function _copyFallback(url, btn) {
      var lbl  = btn.querySelector('.share-label');
      var lang = document.documentElement.lang || 'ko';
      var ok   = { ko: '링크 복사됨!', en: 'Link copied!', ja: 'リンクをコピーしました！' };
      var orig = { ko: '공유하기',     en: 'Share',         ja: 'シェア' };

      function _showCopied() {
        if (lbl) lbl.textContent = ok[lang] || ok.ko;
        setTimeout(function () {
          if (lbl) lbl.textContent = orig[lang] || orig.ko;
        }, 2000);
      }

      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(_showCopied).catch(_execCopy);
      } else {
        _execCopy();
      }

      function _execCopy() {
        var ta = document.createElement('textarea');
        ta.value = url;
        ta.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); _showCopied(); } catch (e) {}
        document.body.removeChild(ta);
      }
    }
  });
})();
