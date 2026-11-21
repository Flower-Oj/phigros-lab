/**
 * Android 下载桥接（只在 App 内生效，网页版加载后直接返回，行为完全不变）。
 *
 * WebView 不认识 <a download> + blob: 的下载，点「导出 B30 图片」「导出 JSON」
 * 「下载 .md」都会静默失败。这里在原型上拦一刀：只要命中 blob: 且带 download
 * 属性，就把数据交给原生层写进「下载/PhigrosLab」。
 *
 * 放在所有脚本之后加载，覆盖 ui.js / b30image.js 里三处导出入口。
 */
(function () {
  var B = window.PhigrosAndroid;
  if (!B || typeof B.saveBlob !== 'function') return;

  var nativeClick = HTMLAnchorElement.prototype.click;

  HTMLAnchorElement.prototype.click = function () {
    var href = this.href || '';
    var name = this.download || '';
    if (!name || href.indexOf('blob:') !== 0) return nativeClick.call(this);

    var self = this;
    fetch(href)
      .then(function (r) { return r.blob(); })
      .then(function (blob) {
        return new Promise(function (resolve, reject) {
          var fr = new FileReader();
          fr.onload = function () { resolve(String(fr.result)); };
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        }).then(function (dataUrl) {
          var comma = dataUrl.indexOf(',');
          if (comma < 0) throw new Error('bad data url');
          B.saveBlob(name, dataUrl.slice(comma + 1), blob.type || 'application/octet-stream');
        });
      })
      .catch(function () { nativeClick.call(self); });
  };

  /**
   * WebView 里 target="_blank" 的链接点了没反应（不开新窗口也不跳转），
   * 扫码登录页和 AI 回答里的外链都会受影响。这里统一拦下来交给系统浏览器。
   */
  if (typeof B.openUrl === 'function') {
    document.addEventListener('click', function (e) {
      var el = e.target;
      while (el && el.tagName !== 'A') el = el.parentElement;
      if (!el) return;
      var href = el.getAttribute('href') || '';
      if (!/^https?:/i.test(href)) return;
      e.preventDefault();
      B.openUrl(href);
    }, true);
  }
})();
