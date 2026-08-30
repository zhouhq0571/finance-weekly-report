/* 周报全文搜索（FWS v1，2026-08-28）
 * 纯静态、零依赖：manifest + 分期分片懒加载；多关键词AND + 机构简称同义词扩展；
 * 归一化（小写/全半角/康熙部首）与 build_search_index.py 保持一致。
 * 配置：window.FWS_CONFIG = {base, currentId, manifest}
 */
(function () {
  'use strict';
  var CFG = window.FWS_CONFIG || { base: './', currentId: null, manifest: './archive/search/manifest.json' };
  if (document.querySelector('.fws-overlay')) return; // 防重复初始化

  /* ---------- 归一化（与Python端一致） ---------- */
  var RAD_PAIRS = "⼀一|⼁丨|⼂丶|⼃丿|⼄乙|⼅亅|⼆二|⼇亠|⼈人|⼉儿|⼊入|⼋八|⼌冂|⼍冖|⼎冫|⼏几|⼐凵|⼑刀|⼒力|⼓勹|⼔匕|⼕匚|⼖匸|⼗十|⼘卜|⼙卩|⼚厂|⼛厶|⼜又|⼝口|⼞囗|⼟土|⼠士|⼡夂|⼢夊|⼣夕|⼤大|⼥女|⼦子|⼧宀|⼨寸|⼩小|⼪尢|⼫尸|⼬屮|⼭山|⼮巛|⼯工|⼰己|⼱巾|⼲干|⼳幺|⼴广|⼵廴|⼶廾|⼷弋|⼸弓|⼹彐|⼺彡|⼻彳|⼼心|⼽戈|⼾戶|⼿手|⽀支|⽁攴|⽂文|⽃斗|⽄斤|⽅方|⽆无|⽇日|⽈曰|⽉月|⽊木|⽋欠|⽌止|⽍歹|⽎殳|⽏毋|⽐比|⽑毛|⽒氏|⽓气|⽔水|⽕火|⽖爪|⽗父|⽘爻|⽙爿|⽚片|⽛牙|⽜牛|⽝犬|⽞玄|⽟玉|⽠瓜|⽡瓦|⽢甘|⽣生|⽤用|⽥田|⽦疋|⽧疒|⽨癶|⽩白|⽪皮|⽫皿|⽬目|⽭矛|⽮矢|⽯石|⽰示|⽱禸|⽲禾|⽳穴|⽴立|⽵竹|⽶米|⽷糸|⽸缶|⽹网|⽺羊|⽻羽|⽼老|⽽而|⽾耒|⽿耳|⾀聿|⾁肉|⾂臣|⾃自|⾄至|⾅臼|⾆舌|⾇舛|⾈舟|⾉艮|⾊色|⾋艸|⾌虍|⾍虫|⾎血|⾏行|⾐衣|⾑襾|⾒見|⾓角|⾔言|⾕谷|⾖豆|⾗豕|⾘豸|⾙貝|⾚赤|⾛走|⾜足|⾝身|⾞車|⾟辛|⾠辰|⾡辵|⾢邑|⾣酉|⾤釆|⾥里|⾦金|⾧長|⾨門|⾩阜|⾪隶|⾫隹|⾬雨|⾭靑|⾮非|⾯面|⾰革|⾱韋|⾲韭|⾳音|⾴頁|⾵風|⾶飛|⾷食|⾸首|⾹香|⾺馬|⾻骨|⾼高|⾽髟|⾾鬥|⾿鬯|⿀鬲|⿁鬼|⿂魚|⿃鳥|⿄鹵|⿅鹿|⿆麥|⿇麻|⿈黃|⿉黍|⿊黑|⿋黹|⿌黽|⿍鼎|⿎鼓|⿏鼠|⿐鼻|⿑齊|⿒齒|⿓龍|⿔龜|⿕龠";
  var RAD = {};
  RAD_PAIRS.split('|').forEach(function (p) { if (p.length >= 2) RAD[p[0]] = p[1]; });
  function normMap(s) { // 返回 {s:归一化串, map:归一化位置→原串位置}
    var out = [], map = [];
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (RAD[ch]) ch = RAD[ch];
      var o = ch.charCodeAt(0);
      if (o >= 0xFF01 && o <= 0xFF5E) ch = String.fromCharCode(o - 0xFEE0);
      else if (ch === '　') ch = ' ';
      ch = ch.toLowerCase();
      if (/\s/.test(ch)) continue;
      out.push(ch); map.push(i);
    }
    return { s: out.join(''), map: map };
  }
  function normQ(s) { return normMap(s).s; }

  /* ---------- 机构简称 ↔ 全称 同义词（钦定简称表） ---------- */
  var SYN_GROUPS = [
    ["浦发银行", "上海浦东发展银行"], ["上海清算所", "银行间市场清算所"],
    ["建信金科", "建信金融科技"], ["中科金财", "北京中科金财科技"],
    ["至恒融兴", "厦门至恒融兴信息技术"], ["外贸信托", "中国对外经济贸易信托"],
    ["五矿信托", "五矿国际信托"], ["天府信托", "四川天府信托"],
    ["广西农商", "广西农村商业联合银行"], ["贵州农商", "贵州农村商业联合银行"],
    ["光大银行", "中国光大银行"], ["天津农商", "天津农村商业银行"],
    ["河南农商", "河南农商银行"], ["江阴农商", "江阴农商银行"],
    ["上海农商", "上海农村商业银行"], ["天津滨海农商", "天津滨海农村商业银行"],
    ["云南农信", "云南省农村信用社"], ["邦盛科技", "浙江邦盛科技"],
    ["恒生", "恒生电子"], ["金证", "金证股份", "深圳金证科技", "深圳市金证科技"],
    ["开科唯识", "北京开科唯识"], ["蚂蚁数科", "蚂蚁区块链科技"],
    ["中行", "中国银行"], ["工行", "工商银行"], ["建行", "建设银行"],
    ["农行", "农业银行"], ["交行", "交通银行"], ["邮储", "邮储银行", "中国邮政储蓄银行"],
    ["招行", "招商银行"], ["中信", "中信银行"], ["兴业", "兴业银行"]
  ];
  var SYN_LOOKUP = {};
  SYN_GROUPS.forEach(function (g) {
    var norms = g.map(normQ);
    g.forEach(function (w) { SYN_LOOKUP[normQ(w)] = norms; });
  });
  function expandTerm(t) { // 一个查询词 → 归一化同义词组
    var n = normQ(t);
    return SYN_LOOKUP[n] || [n];
  }

  /* ---------- 样式（打印隐藏） ---------- */
  var css = [
    '.fws-overlay{position:fixed;inset:0;background:rgba(22,50,79,.45);z-index:9999;display:none;backdrop-filter:blur(2px);}',
    '.fws-overlay.open{display:block;}',
    '.fws-modal{position:absolute;top:9%;left:50%;transform:translateX(-50%);width:min(680px,94vw);background:#fff;border-radius:12px;box-shadow:0 18px 60px rgba(10,30,55,.35);overflow:hidden;display:flex;flex-direction:column;max-height:78vh;}',
    '.fws-head{background:linear-gradient(120deg,#16324f,#24507a);padding:14px 16px 12px;}',
    '.fws-row{display:flex;align-items:center;gap:10px;}',
    '.fws-input{flex:1;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);color:#fff;font-size:15px;padding:9px 13px;border-radius:8px;outline:none;}',
    '.fws-input::placeholder{color:rgba(255,255,255,.55);}',
    '.fws-input:focus{background:rgba(255,255,255,.2);border-color:#c89b3c;}',
    '.fws-scope{display:flex;background:rgba(255,255,255,.12);border-radius:7px;padding:2px;flex-shrink:0;}',
    '.fws-scope button{border:0;background:transparent;color:rgba(255,255,255,.75);font-size:12px;padding:6px 12px;border-radius:5px;cursor:pointer;white-space:nowrap;}',
    '.fws-scope button.on{background:#c89b3c;color:#fff;font-weight:600;}',
    '.fws-hintline{color:rgba(255,255,255,.55);font-size:11px;margin-top:8px;letter-spacing:.3px;}',
    '.fws-results{overflow-y:auto;padding:8px 0;flex:1;}',
    '.fws-group{padding:8px 16px 4px;font-size:11px;color:#8a94a6;letter-spacing:1px;position:sticky;top:0;background:#fff;}',
    '.fws-item{display:block;padding:10px 16px;cursor:pointer;border-left:3px solid transparent;text-decoration:none;color:inherit;}',
    '.fws-item:hover,.fws-item.sel{background:#f0f5fa;border-left-color:#c89b3c;}',
    '.fws-crumb{font-size:11px;color:#98a2b3;margin-bottom:3px;}',
    '.fws-crumb .fws-cat{color:#c89b3c;border:1px solid #e8d9b8;border-radius:3px;padding:0 5px;margin-right:6px;font-size:10px;}',
    '.fws-title{font-size:13.5px;font-weight:600;color:#16324f;line-height:1.45;}',
    '.fws-snip{font-size:12px;color:#55627a;line-height:1.6;margin-top:3px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
    '.fws-meta{font-size:10.5px;color:#a5aebd;margin-top:3px;}',
    '.fws-item mark,.fws-modal mark{background:#ffe9a8;color:#7a5b00;border-radius:2px;padding:0 1px;}',
    '.fws-empty{padding:36px 20px;text-align:center;color:#98a2b3;font-size:13px;line-height:2;}',
    '.fws-loading{padding:26px;text-align:center;color:#8a94a6;font-size:12.5px;}',
    '.fws-foot{border-top:1px solid #eef1f5;padding:7px 16px;font-size:10.5px;color:#a5aebd;display:flex;justify-content:space-between;}',
    '.fws-hit{background:#ffe9a8;border-radius:2px;box-shadow:0 0 0 2px #ffe9a8;}',
    '.fws-flash{animation:fwsFlash 2.2s ease;}',
    '@keyframes fwsFlash{0%,60%{background:#fff3c4;}100%{background:transparent;}}',
    '.fws-toast{position:fixed;bottom:26px;left:50%;transform:translateX(-50%);background:#16324f;color:#fff;font-size:12.5px;padding:8px 18px;border-radius:18px;z-index:9998;box-shadow:0 6px 20px rgba(10,30,55,.3);opacity:0;transition:opacity .25s;pointer-events:none;}',
    '.fws-toast.show{opacity:.95;}',
    '.fws-navlink{cursor:pointer;}',
    '@media(max-width:640px){.fws-modal{top:0;width:100vw;max-height:100vh;height:100vh;border-radius:0;}.fws-row{flex-wrap:wrap;}.fws-scope{width:100%;}.fws-scope button{flex:1;}}',
    '@media print{.fws-overlay,.fws-toast,.fws-fab{display:none!important;}}'
  ].join('\n');
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- 状态 ---------- */
  var manifest = null, shards = {}, scope = CFG.currentId ? 'issue' : 'all';
  var sel = -1, results = [];

  /* ---------- 入口按钮 ---------- */
  function openModal() { overlay.classList.add('open'); setTimeout(function () { input.focus(); }, 30); if (!manifest) loadManifest(); }
  function closeModal() { overlay.classList.remove('open'); sel = -1; }
  var nav = document.querySelector('.nav-bar');
  if (nav) {
    // 防重（2026-08-31）：导航栏已硬编码搜索按钮时只绑定事件，不再重复 append
    var a = nav.querySelector('.fws-navlink');
    if (!a) {
      a = document.createElement('a');
      a.href = 'javascript:void(0)'; a.className = 'fws-navlink'; a.textContent = '🔍 搜索';
      nav.appendChild(a);
    }
    a.addEventListener('click', openModal);
  }
  var heroBack = document.querySelector('.hero .back');
  if (heroBack) {
    var b = document.createElement('a');
    b.href = 'javascript:void(0)'; b.className = 'back fws-navlink'; b.style.marginLeft = '8px'; b.textContent = '🔍 搜索全部周报';
    heroBack.parentNode.insertBefore(b, heroBack.nextSibling);
    b.addEventListener('click', openModal);
  }
  if (!nav && !heroBack) {
    var fab = document.createElement('button');
    fab.className = 'fws-fab fws-navlink'; fab.textContent = '🔍';
    fab.style.cssText = 'position:fixed;right:18px;bottom:70px;width:44px;height:44px;border-radius:50%;border:0;background:#16324f;color:#fff;font-size:17px;box-shadow:0 6px 18px rgba(10,30,55,.3);cursor:pointer;z-index:9990;';
    document.body.appendChild(fab);
    fab.addEventListener('click', openModal);
  }

  /* ---------- 弹层 DOM ---------- */
  var overlay = document.createElement('div');
  overlay.className = 'fws-overlay';
  overlay.innerHTML =
    '<div class="fws-modal">' +
    '<div class="fws-head"><div class="fws-row">' +
    '<input class="fws-input" placeholder="搜索：机构 / 项目 / 人名 / 政策，空格分隔多关键词…">' +
    '<div class="fws-scope"><button data-s="issue">本期</button><button data-s="all">全部</button></div>' +
    '</div><div class="fws-hintline">支持机构简称（如"浦发""上清所"）· ↑↓ 选择 · Enter 跳转 · Esc 关闭</div></div>' +
    '<div class="fws-results"></div>' +
    '<div class="fws-foot"><span class="fws-count"></span><span>金融行业一周要闻报告 · 全文检索</span></div>' +
    '</div>';
  document.body.appendChild(overlay);
  var input = overlay.querySelector('.fws-input'),
      listEl = overlay.querySelector('.fws-results'),
      countEl = overlay.querySelector('.fws-count'),
      scopeBtns = overlay.querySelectorAll('.fws-scope button');

  if (!CFG.currentId) overlay.querySelector('[data-s="issue"]').style.display = 'none';
  function paintScope() { scopeBtns.forEach(function (x) { x.classList.toggle('on', x.dataset.s === scope); }); }
  paintScope();
  scopeBtns.forEach(function (x) { x.addEventListener('click', function () { scope = x.dataset.s; paintScope(); run(); }); });

  var toast = document.createElement('div');
  toast.className = 'fws-toast';
  document.body.appendChild(toast);
  function showToast(msg, ms) {
    toast.textContent = msg; toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, ms || 2600);
  }

  /* ---------- 数据加载 ---------- */
  function fetchJSON(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function loadManifest() {
    listEl.innerHTML = '<div class="fws-loading">正在载入检索索引…</div>';
    fetchJSON(CFG.manifest).then(function (m) {
      manifest = m;
      // 预载本期分片
      var cur = m.issues.filter(function (i) { return i.current; })[0];
      if (cur && cur.shard) loadShard(cur);
      run();
    }).catch(function () {
      listEl.innerHTML = '<div class="fws-empty">索引载入失败，请稍后重试</div>';
    });
  }
  function loadShard(issue) {
    if (shards[issue.id]) return Promise.resolve(shards[issue.id]);
    if (!issue.shard) return Promise.resolve(null);
    return fetchJSON(CFG.base + 'archive/search/' + issue.shard).then(function (d) {
      d.items.forEach(function (it) {
        it._nt = normMap(it.t || '');
        it._nc = normMap(it.c || '');
      });
      shards[issue.id] = d;
      return d;
    }).catch(function () { return null; });
  }

  /* ---------- 搜索 ---------- */
  var timer = null;
  function run() {
    clearTimeout(timer);
    timer = setTimeout(execSearch, 120);
  }
  function execSearch() {
    var q = input.value.trim();
    if (!manifest) return;
    if (!q) { listEl.innerHTML = ''; countEl.textContent = ''; return; }
    var groups = q.split(/\s+/).map(expandTerm).filter(function (g) { return g[0]; });
    if (!groups.length) return;
    var targets = manifest.issues.filter(function (i) {
      if (i.aliasOf) return false;
      return scope === 'issue' ? i.id === CFG.currentId : true;
    });
    listEl.innerHTML = '<div class="fws-loading">检索中…</div>';
    Promise.all(targets.map(loadShard)).then(function () {
      var out = [];
      targets.forEach(function (iss) {
        var d = shards[iss.id];
        if (!d) return;
        d.items.forEach(function (it) {
          var score = 0, ok = true, firstPos = null;
          for (var gi = 0; gi < groups.length; gi++) {
            var g = groups[gi], hitT = false, hitC = false, pos = -1;
            for (var vi = 0; vi < g.length; vi++) {
              var term = g[vi];
              if (it._nt.s.indexOf(term) >= 0) hitT = true;
              var p = it._nc.s.indexOf(term);
              if (p >= 0) { hitC = true; if (pos < 0 || p < pos) pos = p; }
            }
            if (!hitT && !hitC) { ok = false; break; }
            score += hitT ? 5 : 1;
            if (firstPos === null && pos >= 0) firstPos = pos;
          }
          if (ok) out.push({ iss: iss, it: it, score: score, pos: firstPos });
        });
      });
      out.sort(function (a, b) { return b.score - a.score; });
      render(out.slice(0, 60), groups, out.length);
    });
  }

  function markSnippet(origText, nmap, groups, centerNormPos, span) {
    // 以命中点为中心截取原串片段，并高亮所有组词
    var s = nmap.s, map = nmap.map;
    var start = 0;
    if (centerNormPos != null && centerNormPos > span / 2) start = centerNormPos - Math.floor(span / 2);
    var end = Math.min(s.length, start + span);
    var oStart = map[start] || 0, oEnd = (map[end - 1] != null ? map[end - 1] + 1 : origText.length);
    var frag = origText.slice(oStart, oEnd);
    // 原串内逐个组词高亮（原串级别匹配归一化不可行，退回在片段上做归一化匹配定位）
    var fragN = normMap(frag);
    var marks = [];
    groups.forEach(function (g) {
      g.forEach(function (t) {
        var p = fragN.s.indexOf(t);
        while (p >= 0) { marks.push([fragN.map[p], fragN.map[p + t.length - 1] + 1]); p = fragN.s.indexOf(t, p + 1); }
      });
    });
    if (!marks.length) return escapeHtml(frag);
    marks.sort(function (a, b) { return a[0] - b[0]; });
    var html = '', cur = 0;
    marks.forEach(function (mk) {
      if (mk[0] < cur) return;
      html += escapeHtml(frag.slice(cur, mk[0])) + '<mark>' + escapeHtml(frag.slice(mk[0], mk[1])) + '</mark>';
      cur = mk[1];
    });
    html += escapeHtml(frag.slice(cur));
    return (oStart > 0 ? '…' : '') + html + (oEnd < origText.length ? '…' : '');
  }
  function escapeHtml(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render(rows, groups, totalCount) {
    results = rows; sel = rows.length ? 0 : -1;
    if (!rows.length) {
      listEl.innerHTML = '<div class="fws-empty">未找到「' + escapeHtml(input.value.trim()) + '」相关内容<br>' +
        (scope === 'issue' ? '试试切换到「全部」范围，或减少关键词' : '试试更短的关键词，或用机构简称（如"浦发"）') + '</div>';
      countEl.textContent = '0 条结果';
      return;
    }
    var html = '', lastIss = null;
    rows.forEach(function (r, idx) {
      if (r.iss !== lastIss) {
        html += '<div class="fws-group">' + escapeHtml(r.iss.label) + (r.iss.current ? ' · 在读' : '') + '</div>';
        lastIss = r.iss;
      }
      var it = r.it;
      var crumb = (it.ch ? escapeHtml(it.ch) : '') + (it.sec ? ' › ' + escapeHtml(it.sec) : '');
      var pdfTag = r.iss.level === 'pdf' ? '<span style="color:#a5aebd">📄PDF期' + (it.pg ? ' · 约第' + it.pg + '页' : '') + '</span> ' : '';
      html += '<a class="fws-item' + (idx === sel ? ' sel' : '') + '" data-i="' + idx + '">' +
        '<div class="fws-crumb">' + (it.cat ? '<span class="fws-cat">' + escapeHtml(it.cat) + '</span>' : '') + pdfTag + crumb + '</div>' +
        '<div class="fws-title">' + markSnippet(it.t || '', it._nt, groups, null, 120) + '</div>' +
        '<div class="fws-snip">' + markSnippet(it.c || '', it._nc, groups, r.pos, 110) + '</div>' +
        (it.m ? '<div class="fws-meta">' + escapeHtml(it.m) + '</div>' : '') +
        '</a>';
    });
    listEl.innerHTML = html;
    countEl.textContent = '共 ' + totalCount + ' 条结果' + (totalCount > rows.length ? '（显示前' + rows.length + '条）' : '');
    Array.prototype.forEach.call(listEl.querySelectorAll('.fws-item'), function (el) {
      el.addEventListener('click', function () { jumpTo(+el.dataset.i); });
      el.addEventListener('mousemove', function () { setSel(+el.dataset.i); });
    });
    scrollSelIntoView();
  }
  function setSel(i) {
    sel = i;
    Array.prototype.forEach.call(listEl.querySelectorAll('.fws-item'), function (el) {
      el.classList.toggle('sel', +el.dataset.i === i);
    });
  }
  function scrollSelIntoView() {
    var el = listEl.querySelector('.fws-item.sel');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- 跳转与高亮 ---------- */
  function jumpTo(i) {
    var r = results[i];
    if (!r) return;
    var q = input.value.trim();
    var iss = r.iss, anchor = r.it.a || '';
    if (CFG.currentId && iss.id === CFG.currentId) {
      closeModal();
      locateInPage(q, anchor);
    } else if (iss.level === 'html' && iss.htmlUrl) {
      var url = CFG.base + iss.htmlUrl + '?fwsq=' + encodeURIComponent(q) + (anchor ? '#' + anchor : '');
      window.open(url, '_blank');
    } else if (iss.pdfUrl) {
      window.open(iss.pdfUrl, '_blank');
      showToast('PDF期：结果约在「第' + (r.it.pg || '?') + '页」附近，请在PDF内检索关键词');
    }
  }
  function locateInPage(q, anchor) {
    var scopeEl = document;
    if (anchor) {
      var aEl = document.getElementById(anchor);
      if (aEl) {
        aEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        scopeEl = aEl.parentElement || document;
      }
    }
    var n = highlightTerms(scopeEl === document ? (document.querySelector('.content') || document.body) : scopeEl, q);
    showToast(n > 0 ? '已定位「' + q + '」，本页共 ' + n + ' 处命中' : '已跳转到「' + (anchor || '') + '」小节');
  }
  function highlightTerms(rootEl, q) {
    clearHits();
    var terms = q.split(/\s+/).map(normQ).filter(Boolean);
    // 同义词扩展也参与高亮（原词级别的近似：用各组归一化词逐个试）
    var groups = q.split(/\s+/).map(expandTerm);
    var count = 0;
    var walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = node.parentNode;
        if (p && /^(SCRIPT|STYLE|MARK)$/.test(p.nodeName)) return NodeFilter.FILTER_REJECT;
        if (p && p.closest && p.closest('.fws-overlay,.nav-bar')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode() && nodes.length < 4000) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      if (count >= 120) return;
      var text = node.nodeValue;
      var nm = normMap(text);
      var ranges = [];
      groups.forEach(function (g) {
        g.forEach(function (t) {
          var p = nm.s.indexOf(t);
          while (p >= 0) { ranges.push([nm.map[p], nm.map[p + t.length - 1] + 1]); p = nm.s.indexOf(t, p + 1); }
        });
      });
      if (!ranges.length) return;
      ranges.sort(function (a, b) { return a[0] - b[0]; });
      var frag = document.createDocumentFragment(), cur = 0;
      ranges.forEach(function (rg) {
        if (rg[0] < cur) return;
        frag.appendChild(document.createTextNode(text.slice(cur, rg[0])));
        var mk = document.createElement('mark');
        mk.className = 'fws-hit';
        mk.textContent = text.slice(rg[0], rg[1]);
        frag.appendChild(mk);
        cur = rg[1];
        count++;
      });
      frag.appendChild(document.createTextNode(text.slice(cur)));
      node.parentNode.replaceChild(frag, node);
    });
    return count;
  }
  function clearHits() {
    Array.prototype.forEach.call(document.querySelectorAll('mark.fws-hit'), function (mk) {
      var p = mk.parentNode;
      p.replaceChild(document.createTextNode(mk.textContent), mk);
      p.normalize();
    });
  }

  /* ---------- 键盘 ---------- */
  document.addEventListener('keydown', function (e) {
    var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    if (((isMac && e.metaKey) || (!isMac && e.ctrlKey)) && e.key.toLowerCase() === 'k') { e.preventDefault(); openModal(); return; }
    if (e.key === '/' && !overlay.classList.contains('open') && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); openModal(); return; }
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') closeModal();
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (results.length) { setSel(Math.min(sel + 1, results.length - 1)); scrollSelIntoView(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (results.length) { setSel(Math.max(sel - 1, 0)); scrollSelIntoView(); } }
    else if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); jumpTo(sel); }
  });
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
  input.addEventListener('input', run);

  /* ---------- 落地高亮（带 fwsq 参数打开时） ---------- */
  (function () {
    var m = location.search.match(/[?&]fwsq=([^&]+)/);
    if (!m) return;
    var q = decodeURIComponent(m[1]);
    window.addEventListener('load', function () {
      setTimeout(function () {
        var anchor = location.hash ? location.hash.slice(1) : '';
        locateInPage(q, anchor);
      }, 250);
    });
  })();
})();
