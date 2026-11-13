(function () {
  'use strict';
  var JF = window.JF;
  if (!JF) { document.body.insertAdjacentHTML('beforeend', '<div class="empty"><b>数据未加载</b>请确认 data.js 与页面在同一目录</div>'); return; }

  /* ============ 1. 基础数据与索引 ============ */
  var R = JF.records, ORGS = JF.orgs, CATS = JF.cats, GO = JF.gradeOrder;
  var GS = ['特等奖', '一等奖', '二等奖', '三等奖', '微创新奖'];
  var GC = { '特等奖': 0, '一等奖': 1, '二等奖': 2, '三等奖': 3, '微创新奖': 4 };
  var byId = {}, orgMeta = {}, shortToFull = {};
  R.forEach(function (r) { byId[r.id] = r; });
  ORGS.forEach(function (o) {
    orgMeta[o.full] = o;
    o.full.split(' / ').forEach(function (f) { orgMeta[f] = o; });
    shortToFull[o.short] = o;
  });

  // 常用简称/别称 → 归一化词
  var ALIAS = {
    '工行': '工商银行', 'icbc': '工商银行', '农行': '农业银行', 'abc': '农业银行',
    '中行': '中国银行', '建行': '建设银行', 'ccb': '建设银行', '交行': '交通银行',
    '邮储': '邮储银行', '邮储银行': '邮储银行', '招行': '招商银行', '浦发': '浦发银行',
    '民生': '民生银行', '兴业': '兴业银行', '光大': '光大银行', '华夏': '华夏银行',
    '广发': '广发银行', '平安': '平安银行', '浙商': '浙商银行', '中信': '中信银行',
    '北京银行': '北京银行', '上海银行': '上海银行', '江苏银行': '江苏银行',
    '国泰君安': '国泰君安', '国君': '国泰君安', '中金': '中金公司', '中信建投': '中信建投',
    '银河': '银河证券', '华泰': '华泰证券', '招商证券': '招商证券', '海通': '海通证券',
    '人保': '人保', '太保': '太保', '国寿': '中国人寿', '平安产险': '平安产险',
    '中信信托': '中信信托', '华润信托': '华润信托', '招银理财': '招银理财',
    '恒生': '恒生电子', '宇信': '宇信科技', '长亮': '长亮科技', '神州信息': '神州信息',
    '中电金信': '中电金信', '腾讯': '腾讯', '阿里': '阿里巴巴', '蚂蚁': '蚂蚁',
    '腾讯云': '腾讯云', '阿里云': '阿里云', '华为': '华为', '百度': '百度',
    '讯飞': '科大讯飞', '银联': '中国银联', '网联': '网联清算', '清算总中心': '人行清算总中心',
    '中国结算': '中国结算', '中央结算': '中央结算公司', '上清所': '上海清算所'
  };

  var PUNC = /[\s\u3000\u00a0（）()【】\[\]《》〈〉“”"'‘’·．.,，、。;；:：!！?？|/\\+—\-_~`^&*#@%$<>]/g;
  function N(s) { return (s || '').toLowerCase().replace(PUNC, ''); }
  function norm(s) { var t = N(s); return ALIAS[t] || t; }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // 主题标签
  var TAGDEF = [
    ['大模型', /大模型|大语言模型|LLM|生成式|AIGC/i],
    ['人工智能', /人工智能|AI|智能体|机器学习|深度学习|神经网络|算法/],
    ['多模态', /多模态|图文|视觉|语音识别|OCR/],
    ['知识图谱', /知识图谱|本体|图谱/],
    ['云原生', /云原生|容器|微服务|Kubernetes|云平台|分布式云|混合云|私有云/],
    ['分布式', /分布式|单元化|多活|两地三中心|异地多活/],
    ['核心系统', /核心系统|核心业务|主机下移|核心银行|核心交易|新核心/],
    ['数据中台', /数据中台|数据平台|数据治理|数据资产|数据仓库|湖仓|数据融合|数据要素/],
    ['风控', /风险|风控|授信|反欺诈|反洗钱|合规/],
    ['安全', /安全|密码|加密|隐私计算|可信执行|零信任|攻防|态势感知|量子/],
    ['区块链', /区块链|分布式账本|智能合约|数字人民币|数字货币/],
    ['支付清算', /支付|清算|结算|跨境|CIPS|收单/],
    ['资管托管', /资管|托管|理财|估值|投资交易|组合管理|基金/],
    ['信贷普惠', /信贷|普惠|小微|乡村振兴|三农|供应链金融|零售/],
    ['数字化经营', /数字化|数智|智慧|线上化|移动|渠道|客户经营|营销/],
    ['运维研发', /运维|研发|DevOps|AIOps|测试|敏捷|低代码|研发效能|可观测/],
    ['信创', /信创|国产化|自主可控|国产|替代/],
    ['监管科技', /监管|报送|合规科技|RegTech/],
    ['绿色金融', /绿色|碳|ESG/],
    ['养老金融', /养老|年金/]
  ];
  function tagsOf(title) {
    var out = [];
    for (var i = 0; i < TAGDEF.length; i++) { if (TAGDEF[i][1].test(title)) out.push(TAGDEF[i][0]); }
    return out.slice(0, 3);
  }

  // 每条记录的可检索文本
  R.forEach(function (r) {
    var us = r.units.map(function (u) { var m = orgMeta[u]; return m ? m.short : u; }).join(' ');
    r._t = tagsOf(r.title);
    r._ta = TAGDEF.filter(function (t) { return t[1].test(r.title); }).map(function (t) { return t[0]; });
    r._n = N(r.title) + ' ' + N(r.units.join(' ')) + ' ' + N(us) + ' ' + N(r.people.join(' ')) + ' ' + N(r._t.join(' ')) + ' ' + r.y + ' ' + r.grade + ' ' + r.seq;
    r._tt = N(r.title); r._uu = N(r.units.join(' ')) + N(us); r._pp = N(r.people.join(' '));
    r._s = r.units.reduce(function (a, u) { var m = orgMeta[u]; return a + (m ? m.n : 1); }, 0);
  });

  var personIdx = {}, orgIdx = {};
  R.forEach(function (r) {
    r.people.forEach(function (p) { (personIdx[p] = personIdx[p] || []).push(r.id); });
    r.units.forEach(function (u) { (orgIdx[u] = orgIdx[u] || []).push(r.id); });
  });
  var PEOPLE = Object.keys(personIdx).map(function (p) {
    var ids = personIdx[p], ys = {}, best = 9;
    ids.forEach(function (id) { var r = byId[id]; ys[r.y] = 1; best = Math.min(best, GC[r.grade]); });
    return { name: p, n: ids.length, years: Object.keys(ys).map(Number).sort().reverse(), best: best };
  });

  /* ============ 2. 状态 ============ */
  var S = {
    tab: 'over',
    q: '', neg: '',
    year: [], grade: [], cat: [], org: [], field: 'all',
    yview: 2025, yq: '', oq: '', ocat: '全部', oSort: 'n', pq: '', psort: 'n',
    page: 1, psize: 120, orgN: 200, pplN: 120, yearN: 60
  };
  var results = [];

  /* ============ 3. 工具 ============ */
  function $(s, p) { return (p || document).querySelector(s); }
  function $$(s, p) { return Array.prototype.slice.call((p || document).querySelectorAll(s)); }
  function ga(grade) { return 's' + (GC[grade] === undefined ? 3 : GC[grade]); }
  function gradTag(g) { return '<span class="gd ' + ga(g) + '">' + g + '</span>'; }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  function tokenize(q) {
    if (!q) return { toks: [], fields: [] };
    var fieldHits = [], rest = [];
    var src = String(q).replace(/(单位|人|年度|年|等级|类别)\s*[:：]\s*([^\s,，、;；|/+]+)/g, function (m, k, v) {
      fieldHits.push({ k: k, v: N(v) }); return ' ';
    });
    src.split(/[\s,，、;；|/+]+/).forEach(function (t) { if (t) rest.push(t); });
    var toks = rest.map(function (t) { return norm(t); }).filter(Boolean);
    return { toks: toks, fields: fieldHits };
  }

  function matchRecord(r, tk) {
    if (!tk || !tk.toks) tk = { toks: [], fields: [] };
    for (var i = 0; i < tk.fields.length; i++) {
      var f = tk.fields[i], v = f.v;
      var hay = (f.k === '单位') ? r._uu : (f.k === '人') ? r._pp : (f.k === '等级') ? N(r.grade) : (f.k === '类别') ? N(catsOf(r).join('')) : String(r.y);
      if (hay.indexOf(v) < 0) return false;
    }
    var hayAll = S.field === 'title' ? r._tt : S.field === 'unit' ? r._uu : S.field === 'person' ? r._pp : r._n;
    for (var j = 0; j < tk.toks.length; j++) {
      if (hayAll.indexOf(tk.toks[j]) < 0) return false;
    }
    if (S.neg) {
      var negk = String(S.neg).split(/[\s,，、;；|/+]+/).filter(Boolean);
      for (var k = 0; k < negk.length; k++) { if (r._n.indexOf(norm(negk[k])) >= 0) return false; }
    }
    return true;
  }
  function catsOf(r) {
    var c = {};
    r.units.forEach(function (u) { var m = orgMeta[u]; if (m) c[m.cat] = 1; });
    return Object.keys(c);
  }

  function doSearch(keepPage) {
    var tk = tokenize(S.q);
    results = R.filter(function (r) {
      if (S.year.length && S.year.indexOf(r.y) < 0) return false;
      if (S.grade.length && S.grade.indexOf(r.grade) < 0) return false;
      if (S.cat.length) {
        var cs = catsOf(r), hit = false;
        for (var i = 0; i < cs.length; i++) if (S.cat.indexOf(cs[i]) >= 0) { hit = true; break; }
        if (!hit) return false;
      }
      if (S.org.length) {
        var ok = false;
        for (var j = 0; j < r.units.length; j++) {
          var m = orgMeta[r.units[j]];
          if (S.org.indexOf(m ? m.short : r.units[j]) >= 0) { ok = true; break; }
        }
        if (!ok) return false;
      }
      return matchRecord(r, tk);
    });
    results.sort(function (a, b) { return b.y - a.y || GC[a.grade] - GC[b.grade] || a.seq - b.seq; });
    if (!keepPage) S.page = 1;
    renderSearch();
    syncURL();
  }

  /* ============ 4. 表格渲染 ============ */
  function orgLinks(r) {
    return r.units.map(function (u) {
      var m = orgMeta[u], s = m ? m.short : u;
      return '<span class="ent" data-org="' + esc(u) + '">' + esc(s) + '</span>';
    }).join('<span style="color:var(--ink4)"> · </span>');
  }
  function pplLinks(r, max) {
    var lim = max || 3, out = r.people.slice(0, lim).map(function (p) {
      return '<span class="person" data-p="' + esc(p) + '">' + esc(p) + '</span>';
    }).join('<span style="color:var(--ink4)">、</span>');
    if (r.people.length > lim) {
      out += '<span style="color:var(--ink4)"> </span><span class="more" data-people="' + esc(r.id) + '">等' + r.people.length + '人</span>';
    }
    return out;
  }
  function tableHTML(rows, opt) {
    opt = opt || {};
    var noY = !!opt.noYear;
    var h = '<table' + (noY ? ' class="noY"' : '') + '><colgroup>' + (noY ? '' : '<col class="col-y">') +
      '<col class="col-s"><col class="col-g"><col><col class="col-u"><col class="col-p"></colgroup>' +
      '<thead><tr>' + (noY ? '' : '<th>年度</th>') + '<th>序号</th><th>等级</th><th>项目名称</th><th>完成单位</th><th>主要完成人</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      h += '<tr>' +
        (noY ? '' : '<td class="nowrap"><span class="yr">' + r.y + '</span></td>') +
        '<td class="num" style="color:var(--ink3)">' + r.seq + '</td>' +
        '<td>' + gradTag(r.grade) + '</td>' +
        '<td class="wrap"><span class="ent" data-proj="' + esc(r.id) + '">' + esc(r.title) + '</span></td>' +
        '<td class="wrap" style="font-size:12.5px">' + orgLinks(r) + '</td>' +
        '<td class="wrap" style="font-size:12.5px">' + pplLinks(r) + '</td>' +
        '</tr>';
    });
    return h + '</tbody></table>';
  }
  function cardsHTML(rows) {
    return rows.map(function (r) {
      return '<div class="rc">' +
        '<div class="h"><span class="yr">' + r.y + '</span><span style="color:var(--ink4);font-size:11.5px">No.' + r.seq + '</span>' + gradTag(r.grade) + '</div>' +
        '<div class="ti"><span class="ent" data-proj="' + esc(r.id) + '">' + esc(r.title) + '</span></div>' +
        '<div class="mt"><b>单位</b>　' + orgLinks(r) + '</div>' +
        '<div class="mt"><b>完成人</b>　' + pplLinks(r, 4) + '</div>' +
        '</div>';
    }).join('');
  }

  /* ============ 5. 总览图表 ============ */
  function years() { return [2023, 2024, 2025]; }
  function countBy(f) {
    var o = {};
    R.forEach(function (r) { var k = f(r); o[k] = (o[k] || 0) + 1; });
    return o;
  }

  function renderVolume() {
    var ys = years(), data = ys.map(function (y) {
      var d = { y: y, t: 0, g: [] };
      GS.forEach(function (g) { var c = R.filter(function (r) { return r.y === y && r.grade === g; }).length; d.g.push(c); d.t += c; });
      return d;
    });
    var W = 520, H = 230, pl = 42, pr = 8, pt = 14, pb = 28;
    var max = Math.max.apply(null, data.map(function (d) { return d.t; })) * 1.12;
    var bw = (W - pl - pr) / ys.length, barW = Math.min(76, bw * 0.46);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto">';
    var step = Math.max(50, Math.round(max / 4 / 50) * 50);
    for (var v = 0; v <= max; v += step) {
      var yy = H - pb - (H - pt - pb) * (v / max);
      s += '<line x1="' + pl + '" y1="' + yy.toFixed(1) + '" x2="' + (W - pr) + '" y2="' + yy.toFixed(1) + '" stroke="#eef1f5"/>';
      s += '<text x="' + (pl - 8) + '" y="' + (yy + 3.5).toFixed(1) + '" font-size="11.5" fill="#8f9bab" text-anchor="end">' + v + '</text>';
    }
    var cols = ['#8a6a1f', '#14527f', '#3f6178', '#6b7887', '#1a6b57'];
    data.forEach(function (d, i) {
      var cx = pl + bw * i + bw / 2, acc = 0;
      d.g.forEach(function (c, gi) {
        if (!c) return;
        var hh = (H - pt - pb) * (c / max);
        var y0 = H - pb - (H - pt - pb) * ((acc + c) / max);
        s += '<rect x="' + (cx - barW / 2).toFixed(1) + '" y="' + y0.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + hh.toFixed(1) + '" fill="' + cols[gi] + '" rx="1.5"/>';
        acc += c;
      });
      s += '<text x="' + cx + '" y="' + (H - pb + 15) + '" font-size="13" fill="#5d6b7c" text-anchor="middle">' + d.y + '</text>';
      s += '<text x="' + cx + '" y="' + (H - pb - (H - pt - pb) * (d.t / max) - 5).toFixed(1) + '" font-size="13" fill="#101d2c" text-anchor="middle" font-weight="600">' + d.t + '</text>';
    });
    s += '</svg>';
    $('#c-volume').innerHTML = s;
    $('#l-volume').innerHTML = GS.map(function (g, i) {
      return '<span><i style="background:' + cols[i] + '"></i>' + g + ' ' + R.filter(function (r) { return r.grade === g; }).length + '</span>';
    }).join('');
  }

  function renderCat() {
    var o = {};
    R.forEach(function (r) {
      var cs = catsOf(r);
      cs.forEach(function (c) { o[c] = (o[c] || 0) + 1; });
    });
    var arr = CATS.map(function (c) { return { c: c, n: o[c] || 0 }; }).sort(function (a, b) { return b.n - a.n; });
    var max = arr[0].n;
    $('#c-cat').innerHTML = arr.map(function (a) {
      return '<div class="bar-row" title="' + a.c + '：' + a.n + ' 项"><div class="lab">' + a.c + '</div>' +
        '<div class="bar-track"><i style="width:' + (a.n / max * 100).toFixed(1) + '%;background:linear-gradient(90deg,#1d5c86,#3f87b0)"></i></div>' +
        '<div class="val">' + a.n + '</div></div>';
    }).join('');
  }

  function renderHeat() {
    var ys = years(), m = {};
    R.forEach(function (r) {
      catsOf(r).forEach(function (c) { m[c + '|' + r.y] = (m[c + '|' + r.y] || 0) + 1; });
    });
    var max = 1;
    CATS.forEach(function (c) { ys.forEach(function (y) { max = Math.max(max, m[c + '|' + y] || 0); }); });
    var h = '<thead><tr><th style="text-align:left;padding-left:2px">类别</th>' + ys.map(function (y) { return '<th>' + y + '</th>'; }).join('') + '<th>合计</th></tr></thead><tbody>';
    CATS.forEach(function (c) {
      var tot = 0;
      var cells = ys.map(function (y) {
        var v = m[c + '|' + y] || 0; tot += v;
        var a = v ? 0.09 + 0.72 * (v / max) : 0;
        var st = v ? 'background:rgba(20,86,127,' + a.toFixed(2) + ');color:' + (a > 0.5 ? '#fff' : '#25384b') : 'color:#c3ccd8';
        return '<td style="' + st + '">' + (v || '–') + '</td>';
      }).join('');
      h += '<tr><td style="text-align:left;padding-left:2px;color:#3b4b5d">' + c + '</td>' + cells + '<td style="color:#78859a">' + tot + '</td></tr>';
    });
    h += '</tbody>';
    $('#c-heat').innerHTML = h;
  }

  function renderTop() {
    var arr = ORGS.slice(0, 100);
    var max = arr[0].n;
    $('#c-top').innerHTML = '<div class="bars">' + arr.map(function (o, i) {
      return '<div class="bar-row" style="grid-template-columns:22px 108px 1fr 34px">' +
        '<div class="val" style="text-align:right;color:' + (i < 3 ? '#8f7024' : '#b3bdc9') + '">' + (i + 1) + '</div>' +
        '<div class="lab" title="' + esc(o.full) + '"><span class="ent" data-org="' + esc(o.full.split(' / ')[0]) + '">' + esc(o.short) + '</span></div>' +
        '<div class="bar-track"><i style="width:' + (o.n / max * 100).toFixed(1) + '%;background:linear-gradient(90deg,#0d3b66,#3f87b0)"></i></div>' +
        '<div class="val">' + o.n + '</div></div>';
    }).join('') + '</div>';
  }

  function renderTags() {
    var o = {};
    R.forEach(function (r) { r._ta.forEach(function (t) { o[t] = (o[t] || 0) + 1; }); });
    var arr = Object.keys(o).map(function (k) { return { t: k, n: o[k] }; }).sort(function (a, b) { return b.n - a.n; });
    var max = arr[0].n, min = arr[arr.length - 1].n;
    $('#c-tags').innerHTML = arr.map(function (a) {
      var sz = 12 + 6 * (a.n - min) / Math.max(1, max - min);
      return '<span class="tg" data-tag="' + esc(a.t) + '" style="font-size:' + sz.toFixed(1) + 'px"><b>' + a.t + '</b><span class="c">' + a.n + '</span></span>';
    }).join('');
  }

  function renderIns() {
    var n23 = R.filter(function (r) { return r.y === 2023; }).length,
      n25 = R.filter(function (r) { return r.y === 2025; }).length;
    var first = R.filter(function (r) { return r.grade === '一等奖' || r.grade === '特等奖'; }).length;
    var bank = 0, tech = 0, techOrgs = {}, trustN = 0, trustItems = 0, wmN = 0, wmItems = 0;
    R.forEach(function (r) {
      var cs = catsOf(r);
      if (cs.indexOf('银行') >= 0) bank++;
      if (cs.indexOf('金融IT/科技公司') >= 0) { tech++; r.units.forEach(function (u) { var m = orgMeta[u]; if (m && m.cat === '金融IT/科技公司') techOrgs[u] = 1; }); }
      if (cs.indexOf('信托') >= 0) trustItems++;
      if (cs.indexOf('理财子公司') >= 0) wmItems++;
    });
    ORGS.forEach(function (o) { if (o.cat === '信托') trustN++; if (o.cat === '理财子公司') wmN++; });
    var top20 = ORGS.slice(0, 20).reduce(function (a, o) { return a + o.n; }, 0);
    var items = [
      ['评审规模持续扩张', '获奖项目由 2023 年度 <em>' + n23 + '</em> 项增至 2025 年度 <em>' + n25 + '</em> 项，增幅 <em>' + ((n25 - n23) / n23 * 100).toFixed(1) + '%</em>。增量主要落在二等奖与三等奖，一等奖数量三年基本持平（18→19 项）。'],
      ['头部机构高度集中', '<em>' + ORGS[0].short + '</em> 以 <em>' + ORGS[0].n + '</em> 项居首；前 20 家单位合计参与 <em>' + top20 + '</em> 项，占全部项目的 <em>' + (top20 / R.length * 100).toFixed(1) + '%</em>。国有大行与全国性股份行构成第一梯队，且多以牵头单位身份出现。'],
      ['一等奖以上保持稀缺', '特等奖与一等奖三年合计 <em>' + first + '</em> 项，占比 <em>' + (first / R.length * 100).toFixed(1) + '%</em>。特等奖仅 2 项：2024 年度「多功能激光雕刻钞券制版系统研制」与 2025 年度「新一代核心银行系统项目」，分别指向货币印制工艺与银行核心系统两个方向。'],
      ['银行主导，科技公司深度嵌入', '含银行类完成单位的项目 <em>' + bank + '</em> 项，占 <em>' + (bank / R.length * 100).toFixed(1) + '%</em>；金融IT／科技公司类主体 <em>' + Object.keys(techOrgs).length + '</em> 家，参与项目 <em>' + tech + '</em> 项。科技公司多以联合完成单位身份出现，「金融机构出题、科技公司交付」已是主流协作形态。']
    ];
    var wide = '<div class="ins-i wide"><b>结构性的空白：信托与理财子近乎缺席</b><span>三年名单中，信托公司仅 <em>' + trustN + '</em> 家上榜、合计 <em>' + trustItems + '</em> 个项目；理财子公司 <em>' + wmN + '</em> 家、<em>' + wmItems + '</em> 个项目。与之对照，银行类主体覆盖 <em>' + bank + '</em> 个项目、证券类 <em>' + R.filter(function (r) { return catsOf(r).indexOf('证券') >= 0; }).length + '</em> 个。资管与信托条线的科技投入规模并不小，但在这份名单上的能见度明显低于其资产体量，值得作为申报策略问题单独研究。</span></div>';
    $('#c-ins').innerHTML = items.map(function (i) {
      return '<div class="ins-i"><b>' + i[0] + '</b><span>' + i[1] + '</span></div>';
    }).join('') + wide;
  }

  /* ============ 6. 检索视图 ============ */
  function renderSearch() {
    var total = results.length;
    var shown = results.slice(0, S.page * S.psize);
    var kw = tokenize(S.q).toks;
    var kwHtml = kw.length ? '　匹配 <span class="kw">' + kw.map(esc).join(' + ') + '</span>' : '';
    $('#resbar').innerHTML = '<div>共 <b>' + total + '</b> 项' + kwHtml + (total ? '　·　当前显示 ' + shown.length + ' 项' : '') + '</div>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
      '<span>排序：</span><select class="input" id="sortSel" style="height:30px;padding:0 8px;font-size:12px">' +
      '<option value="yg">年度优先</option><option value="gy">等级优先</option><option value="u">参与单位多</option></select></div>';
    $('#tw-search').innerHTML = total ? tableHTML(shown, {}) : '';
    $('#cards-search').innerHTML = total ? cardsHTML(shown) +
      (total > shown.length ? '<button class="btn" data-more="search" style="width:100%;margin:2px 0 10px">显示更多（剩余 ' + (total - shown.length) + ' 项）</button>' : '') : '';
    $('#empty-search').style.display = total ? 'none' : 'block';
    $('#tf-search').firstElementChild.innerHTML = total > shown.length
      ? '<button class="btn sm" id="moreBtn">显示更多（剩余 ' + (total - shown.length) + ' 项）</button>'
      : '　';
    var sel = $('#sortSel');
    sel.value = S.sortBy || 'yg';
    sel.onchange = function () { S.sortBy = this.value; applySort(); renderSearch(); };
    var mb = $('#moreBtn');
    if (mb) mb.onclick = function () { S.page++; renderSearch(); };
  }
  function applySort() {
    if (S.sortBy === 'gy') results.sort(function (a, b) { return GC[a.grade] - GC[b.grade] || b.y - a.y || a.seq - b.seq; });
    else if (S.sortBy === 'u') results.sort(function (a, b) { return b.units.length - a.units.length || b.y - a.y; });
    else results.sort(function (a, b) { return b.y - a.y || GC[a.grade] - GC[b.grade] || a.seq - b.seq; });
  }

  /* ============ 7. 年度名录 ============ */
  function renderYear() {
    var y = S.yview;
    var rows = R.filter(function (r) { return (!y || r.y === y) && (!S.yq || matchRecord(r, tokenize(S.yq))); });
    rows.sort(function (a, b) { return a.y - b.y || (GC[a.grade] - GC[b.grade]) || a.seq - b.seq; });
    $('#tw-year').innerHTML = tableHTML(rows, { noYear: !!y });
    $('#cards-year').innerHTML = cardsHTML(rows.slice(0, S.yearN)) +
      (rows.length > S.yearN ? '<button class="btn" data-more="year" style="width:100%;margin:2px 0 10px">显示更多（剩余 ' + (rows.length - S.yearN) + ' 项）</button>' : '');
    $('#tf-year').textContent = (y ? y + ' 年度' : '全部年度') + '　共 ' + rows.length + ' 项';
    $$('#y-tabs .chip').forEach(function (c) { c.classList.toggle('on', +c.dataset.y === S.yview); });
  }

  /* ============ 8. 单位 ============ */
  function renderOrg() {
    var q = N(S.oq);
    var arr = ORGS.filter(function (o) {
      if (S.ocat !== '全部' && o.cat !== S.ocat) return false;
      if (q && N(o.short + o.full).indexOf(q) < 0) return false;
      return true;
    });
    if (S.oSort === 'name') arr.sort(function (a, b) { return a.short.localeCompare(b.short, 'zh'); });
    else if (S.oSort === 'cat') arr.sort(function (a, b) { return a.cat.localeCompare(b.cat, 'zh') || b.n - a.n; });
    else arr.sort(function (a, b) { return b.n - a.n || a.best - b.best; });
    var h = '<table><colgroup><col style="width:130px"><col><col style="width:112px"><col style="width:64px"><col style="width:112px"><col style="width:88px"></colgroup>' +
      '<thead><tr><th>简称</th><th>全称</th><th>机构类别</th><th class="num">项目数</th><th>年度分布</th><th>最高等级</th></tr></thead><tbody>';
    arr.slice(0, 800).forEach(function (o) {
      var yearly = [2023, 2024, 2025].map(function (y) {
        var c = 0;
        o.full.split(' / ').forEach(function (f) { (orgIdx[f] || []).forEach(function (id) { if (byId[id].y === y) c++; }); });
        return '<span class="yr" style="' + (c ? '' : 'opacity:.32') + ';margin-right:3px">' + String(y).slice(2) + '<b style="font-weight:600">' + (c ? '·' + c : '') + '</b></span>';
      }).join('');
      h += '<tr><td class="nowrap"><span class="ent" data-org="' + esc(o.full.split(' / ')[0]) + '">' + esc(o.short) + '</span>' +
        (o.members && o.members.length ? '<span class="mk" title="含 ' + o.members.length + ' 个分支机构／下属单位">并' + o.members.length + '</span>' : '') + '</td>' +
        '<td class="wrap" style="font-size:12px;color:var(--ink3);line-height:1.5">' + esc(o.full.replace(/ \/ /g, ' ／ ')) + '</td>' +
        '<td class="nowrap"><span style="font-size:11.5px;color:#4c5d70">' + o.cat + '</span></td>' +
        '<td class="num"><b>' + o.n + '</b></td>' +
        '<td class="nowrap">' + yearly + '</td>' +
        '<td>' + gradTag(GS[o.best] || '三等奖') + '</td></tr>';
    });
    $('#tw-org').innerHTML = h + '</tbody></table>';
    $('#cards-org').innerHTML = arr.slice(0, S.orgN).map(function (o) {
      return '<div class="rc"><div class="h"><span class="ent" data-org="' + esc(o.full.split(' / ')[0]) + '" style="font-weight:600">' + esc(o.short) + '</span><span style="color:var(--ink4);font-size:11.5px">' + o.cat + '</span></div>' +
        '<div class="ti" style="font-size:12px;color:var(--ink3)">' + esc(o.full.replace(/ \/ /g, ' ／ ')) + '</div>' +
        '<div class="mt"><b>获奖</b>　' + o.n + ' 项　' + gradTag(GS[o.best]) + '</div></div>';
    }).join('') + (arr.length > S.orgN ? '<button class="btn" data-more="org" style="width:100%;margin:2px 0 10px">显示更多（剩余 ' + (arr.length - S.orgN) + ' 家）</button>' : '');
    $('#tf-org').textContent = '显示 ' + Math.min(arr.length, 800) + ' 家';
    $('#o-total').textContent = arr.length;
  }

  /* ============ 9. 人物 ============ */
  function renderPpl() {
    var q = N(S.pq);
    var arr = PEOPLE.filter(function (p) { return !q || N(p.name).indexOf(q) >= 0; });
    if (S.psort === 'n') arr.sort(function (a, b) { return b.n - a.n || a.name.localeCompare(b.name, 'zh'); });
    else arr.sort(function (a, b) { return a.name.localeCompare(b.name, 'zh'); });
    var top = arr.slice(0, 400);
    var h = '<table><colgroup><col style="width:110px"><col style="width:90px"><col style="width:120px"><col style="width:96px"><col></colgroup>' +
      '<thead><tr><th>姓名</th><th class="num">项目数</th><th>涉及年度</th><th>最高等级</th><th>代表项目</th></tr></thead><tbody>';
    top.forEach(function (p) {
      var ids = personIdx[p.name].slice().sort(function (a, b) { return byId[b].y - byId[a].y; });
      var best = byId[ids[0]];
      h += '<tr><td class="nowrap"><span class="person" data-p="' + esc(p.name) + '">' + esc(p.name) + '</span></td>' +
        '<td class="num"><b>' + p.n + '</b></td>' +
        '<td class="nowrap" style="font-size:12px;color:var(--ink3)">' + p.years.join(' · ') + '</td>' +
        '<td>' + gradTag(GS[p.best]) + '</td>' +
        '<td class="wrap" style="font-size:12.5px;color:var(--ink2)">' + esc(best.title) + ' <span style="color:var(--ink4);font-size:11px">(' + best.y + ')</span></td></tr>';
    });
    $('#tw-ppl').innerHTML = h + '</tbody></table>';
    $('#cards-ppl').innerHTML = arr.slice(0, S.pplN).map(function (p) {
      var ids = personIdx[p.name].slice().sort(function (a, b) { return byId[b].y - byId[a].y; });
      return '<div class="rc"><div class="h"><span class="person" data-p="' + esc(p.name) + '" style="font-weight:600">' + esc(p.name) + '</span>' + gradTag(GS[p.best]) + '</div>' +
        '<div class="mt">参与 ' + p.n + ' 个项目　' + p.years.join(' · ') + '</div></div>';
    }).join('') + (arr.length > S.pplN ? '<button class="btn" data-more="ppl" style="width:100%;margin:2px 0 10px">显示更多（剩余 ' + (arr.length - S.pplN) + ' 人）</button>' : '');
    $('#tf-ppl').textContent = '共 ' + arr.length + ' 位，显示前 ' + top.length + ' 位';
  }

  /* ============ 10. 浮层 ============ */
  var popEl = $('#pop'), popTimer = null, hideTimer = null;
  function orgPop(full) {
    var m = orgMeta[full]; if (!m) return null;
    var ids = [];
    m.full.split(' / ').forEach(function (f) { ids = ids.concat(orgIdx[f] || []); });
    ids = Array.from(new Set(ids));
    var list = ids.map(function (id) { return byId[id]; }).sort(function (a, b) { return b.y - a.y || GC[a.grade] - GC[b.grade] || a.seq - b.seq; });
    var h = '<div class="pop-h"><div class="t">' + esc(m.short) + '</div><div class="s">' + esc(m.full.split(' / ')[0]) + '　·　' + m.cat + '　·　获奖 ' + list.length + ' 项</div></div><div class="pop-b">';
    var cur = null;
    list.forEach(function (r) {
      if (r.y !== cur) { cur = r.y; h += '<div class="py">' + cur + ' 年度</div>'; }
      h += '<div class="pit"><span class="g">' + gradTag(r.grade) + '</span><div class="x">' + esc(r.title) +
        '<i>No.' + r.seq + '　' + esc(r.units.map(function (u) { var x = orgMeta[u]; return x ? x.short : u; }).join('、')) + '</i></div></div>';
    });
    return h + '</div>';
  }
  function personPop(name) {
    var ids = (personIdx[name] || []).slice().sort(function (a, b) { return byId[b].y - byId[a].y || GC[byId[a].grade] - GC[byId[b].grade]; });
    var h = '<div class="pop-h"><div class="t">' + esc(name) + '</div><div class="s">参与 ' + ids.length + ' 个获奖项目</div></div><div class="pop-b">';
    var cur = null;
    ids.forEach(function (id) {
      var r = byId[id];
      if (r.y !== cur) { cur = r.y; h += '<div class="py">' + cur + ' 年度</div>'; }
      h += '<div class="pit"><span class="g">' + gradTag(r.grade) + '</span><div class="x">' + esc(r.title) +
        '<i>' + esc(r.units.map(function (u) { var x = orgMeta[u]; return x ? x.short : u; }).join('、')) + '</i></div></div>';
    });
    return h + '</div>';
  }
  function peoplePop(rid) {
    var r = byId[rid]; if (!r) return null;
    var h = '<div class="pop-h"><div class="t">' + esc(r.title) + '</div><div class="s">' + r.y + ' 年度　' + r.grade + '　共 ' + r.people.length + ' 位主要完成人</div></div><div class="pop-b" style="padding:10px 14px;line-height:2">';
    h += r.people.map(function (p) { return '<span class="person" data-p="' + esc(p) + '">' + esc(p) + '</span>'; }).join('、');
    return h + '</div>';
  }
  function showPop(html, el) {
    if (!html) return;
    popEl.innerHTML = html; popEl.classList.add('on');
    var b = el.getBoundingClientRect(), pw = popEl.offsetWidth, ph = popEl.offsetHeight;
    var left = Math.min(b.left, window.innerWidth - pw - 12); if (left < 8) left = 8;
    var top = b.bottom + 8;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, b.top - ph - 8);
    popEl.style.left = left + 'px'; popEl.style.top = top + 'px';
  }
  function hidePop() { popEl.classList.remove('on'); }
  document.addEventListener('mouseover', function (e) {
    var t = e.target.closest('[data-org],[data-p],[data-people]');
    if (!t) return;
    if (window.matchMedia('(hover:none)').matches) return;
    clearTimeout(hideTimer); clearTimeout(popTimer);
    popTimer = setTimeout(function () {
      var html = null;
      if (t.dataset.org) html = orgPop(t.dataset.org);
      else if (t.dataset.p) html = personPop(t.dataset.p);
      else if (t.dataset.people) html = peoplePop(t.dataset.people);
      showPop(html, t);
    }, 110);
  });
  document.addEventListener('mouseout', function (e) {
    var t = e.target.closest('[data-org],[data-p],[data-people]');
    if (!t) return;
    clearTimeout(popTimer);
    hideTimer = setTimeout(hidePop, 160);
  });
  popEl.addEventListener('mouseenter', function () { clearTimeout(hideTimer); });
  popEl.addEventListener('mouseleave', function () { hideTimer = setTimeout(hidePop, 120); });

  /* ============ 11. 抽屉 ============ */
  var drawer = $('#drawer');
  function openDrawer(kind, key) {
    var title = '', sub = '', body = '';
    if (kind === 'org') {
      var m = orgMeta[key]; if (!m) return;
      var ids = [];
      m.full.split(' / ').forEach(function (f) { ids = ids.concat(orgIdx[f] || []); });
      ids = Array.from(new Set(ids));
      var list = ids.map(function (id) { return byId[id]; }).sort(function (a, b) { return b.y - a.y || GC[a.grade] - GC[b.grade]; });
      title = m.short;
      sub = m.full.replace(/ \/ /g, ' ／ ');
      body = '<dl class="kv"><dt>机构类别</dt><dd>' + m.cat + '</dd>' +
        (m.members && m.members.length ? '<dt>归并主体</dt><dd style="font-size:12.5px;color:var(--ink3)">含 ' + m.members.length + ' 个分支机构／下属单位：' + esc(m.members.join('、')) + '</dd>' : '') +
        '<dt>获奖项目</dt><dd>' + list.length + ' 项</dd>' +
        '<dt>年度分布</dt><dd>' + m.years.map(function (y) { return y + ' 年 ' + list.filter(function (r) { return r.y === y; }).length + ' 项'; }).join('　') + '</dd>' +
        '<dt>最高等级</dt><dd>' + GS[m.best] + '</dd></dl>';
      body += '<div class="dlist">' + list.map(function (r) {
        return '<div class="ditem"><div class="g">' + gradTag(r.grade) + '</div><div><div class="ti">' + esc(r.title) + '</div>' +
          '<div class="mt">' + r.y + ' 年度 · No.' + r.seq + '　' + esc(r.units.map(function (u) { var x = orgMeta[u]; return x ? x.short : u; }).join('、')) + '</div></div></div>';
      }).join('') + '</div>';
    } else if (kind === 'person') {
      var pids = (personIdx[key] || []).slice().sort(function (a, b) { return byId[b].y - byId[a].y; });
      title = key; sub = '参与 ' + pids.length + ' 个获奖项目';
      body = '<div class="dlist">' + pids.map(function (id) {
        var r = byId[id];
        return '<div class="ditem"><div class="g">' + gradTag(r.grade) + '</div><div><div class="ti">' + esc(r.title) + '</div>' +
          '<div class="mt">' + r.y + ' 年度　' + esc(r.units.map(function (u) { var x = orgMeta[u]; return x ? x.short : u; }).join('、')) + '</div></div></div>';
      }).join('') + '</div>';
    } else {
      var r = byId[key]; if (!r) return;
      title = r.title; sub = r.y + ' 年度　' + r.grade + '　No.' + r.seq;
      body = '<dl class="kv"><dt>完成单位</dt><dd>' + r.units.map(function (u) { var x = orgMeta[u]; return esc(x ? x.short : u); }).join('、') + '</dd>' +
        '<dt>全部完成人</dt><dd style="line-height:2">' + r.people.map(function (p) { return '<span class="person" data-p="' + esc(p) + '">' + esc(p) + '</span>'; }).join('、') + '</dd>' +
        '<dt>全称</dt><dd style="font-size:12px;color:var(--ink3);line-height:1.8">' + esc(r.units.join('、')) + '</dd></dl>';
    }
    $('#dtitle').textContent = title; $('#dsub').textContent = sub; $('#dbody').innerHTML = body;
    drawer.classList.add('on'); document.body.style.overflow = 'hidden';
  }
  $('#dclose').onclick = function () { drawer.classList.remove('on'); document.body.style.overflow = ''; };
  $('.dmask').onclick = function () { drawer.classList.remove('on'); document.body.style.overflow = ''; };
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-org],[data-p],[data-proj],[data-people]');
    if (!t) { if (!e.target.closest('.pop') && !e.target.closest('.drawer')) hidePop(); return; }
    if (t.dataset.org) openDrawer('org', t.dataset.org);
    else if (t.dataset.p) openDrawer('person', t.dataset.p);
    else if (t.dataset.proj) openDrawer('proj', t.dataset.proj);
    else if (t.dataset.people) openDrawer('proj', t.dataset.people);
  });

  /* ============ 12. 筛选控件 ============ */
  function chip(label, on, handler, extra) {
    var b = document.createElement('button');
    b.className = 'chip' + (on ? ' on' : '');
    b.innerHTML = label + (extra || '');
    b.onclick = handler;
    return b;
  }
  function buildFilters() {
    var fy = $('#f-year');
    [2023, 2024, 2025].forEach(function (y) {
      fy.appendChild(chip(y + ' 年度', S.year.indexOf(y) >= 0, function () {
        var i = S.year.indexOf(y); i >= 0 ? S.year.splice(i, 1) : S.year.push(y); this.classList.toggle('on'); doSearch();
      }));
    });
    var fg = $('#f-grade');
    GS.forEach(function (g) {
      fg.appendChild(chip(g, false, function () {
        var i = S.grade.indexOf(g); i >= 0 ? S.grade.splice(i, 1) : S.grade.push(g); this.classList.toggle('on'); doSearch();
      }, '<span class="n">' + R.filter(function (r) { return r.grade === g; }).length + '</span>'));
    });
    var fc = $('#f-cat');
    var catCount = {};
    R.forEach(function (r) { catsOf(r).forEach(function (c) { catCount[c] = (catCount[c] || 0) + 1; }); });
    CATS.forEach(function (c) {
      fc.appendChild(chip(c, false, function () {
        var i = S.cat.indexOf(c); i >= 0 ? S.cat.splice(i, 1) : S.cat.push(c); this.classList.toggle('on'); doSearch();
      }, '<span class="n">' + (catCount[c] || 0) + '</span>'));
    });
    var fo = $('#f-org');
    ORGS.slice(0, 24).forEach(function (o) {
      fo.appendChild(chip(o.short, false, function () {
        var i = S.org.indexOf(o.short); i >= 0 ? S.org.splice(i, 1) : S.org.push(o.short); this.classList.toggle('on'); doSearch();
      }, '<span class="n">' + o.n + '</span>'));
    });
    var more = document.createElement('button');
    more.className = 'btn sm'; more.textContent = '更多单位…';
    more.onclick = function () { switchTab('org'); };
    fo.appendChild(more);

    var ff = $('#f-field');
    [['all', '全域'], ['title', '仅项目名称'], ['unit', '仅完成单位'], ['person', '仅完成人']].forEach(function (f) {
      ff.appendChild(chip(f[1], S.field === f[0], function () {
        S.field = f[0]; $$('#f-field .chip').forEach(function (c) { c.classList.remove('on'); });
        this.classList.add('on'); doSearch();
      }));
    });
  }
  function buildYearTabs() {
    var c = $('#y-tabs');
    var mk = function (v, label) {
      var b = document.createElement('button');
      var n = v ? R.filter(function (r) { return r.y === v; }).length : R.length;
      b.className = 'chip' + (S.yview === v ? ' on' : ''); b.dataset.y = v;
      b.innerHTML = label + '<span class="n">' + n + '</span>';
      b.onclick = function () { S.yview = v; renderYear(); };
      return b;
    };
    c.appendChild(mk(0, '全部年度'));
    [2023, 2024, 2025].forEach(function (y) { c.appendChild(mk(y, y + ' 年度')); });
  }
  function buildOrgCats() {
    var c = $('#o-cats');
    ['全部'].concat(CATS).forEach(function (k) {
      var b = document.createElement('button');
      b.className = 'chip' + (S.ocat === k ? ' on' : '');
      b.textContent = k;
      b.onclick = function () {
        S.ocat = k; $$('#o-cats .chip').forEach(function (x) { x.classList.remove('on'); });
        this.classList.add('on'); renderOrg();
      };
      c.appendChild(b);
    });
    var s = $('#p-sort');
    [['n', '按项目数'], ['name', '按姓名']].forEach(function (x) {
      var b = document.createElement('button');
      b.className = 'chip' + (S.psort === x[0] ? ' on' : ''); b.textContent = x[1];
      b.onclick = function () {
        S.psort = x[0]; $$('#p-sort .chip').forEach(function (y) { y.classList.remove('on'); });
        this.classList.add('on'); renderPpl();
      };
      s.appendChild(b);
    });
  }

  function syncChips() {
    var ys = [2023, 2024, 2025];
    $$('#f-year .chip').forEach(function (c, i) { c.classList.toggle('on', S.year.indexOf(ys[i]) >= 0); });
    $$('#f-grade .chip').forEach(function (c, i) { c.classList.toggle('on', S.grade.indexOf(GS[i]) >= 0); });
    $$('#f-cat .chip').forEach(function (c, i) { c.classList.toggle('on', S.cat.indexOf(CATS[i]) >= 0); });
  }

  /* ============ 13. 导航与联动 ============ */
  function switchTab(v, skip) {
    S.tab = v;
    $$('.tab').forEach(function (t) { t.classList.toggle('on', t.dataset.v === v); });
    $$('.view').forEach(function (s) { s.classList.toggle('on', s.id === 'v-' + v); });
    if (!skip) { try { history.replaceState(null, '', '#' + v); } catch (e) { } }
    window.scrollTo(0, 0);
  }
  $$('.tab').forEach(function (t) { t.onclick = function () { switchTab(t.dataset.v); }; });

  var gq = $('#gq'), q = $('#q');
  function runQuery(v) {
    S.q = v; q.value = v;
    switchTab('search');
    doSearch();
  }
  if (gq) gq.addEventListener('keydown', function (e) { if (e.key === 'Enter') runQuery(this.value); });
  q.addEventListener('input', function () {
    S.q = this.value; $('#qclr').style.display = this.value ? 'block' : 'none';
    clearTimeout(q._t); q._t = setTimeout(function () { doSearch(); }, 180);
  });
  q.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSearch(); });
  $('#qclr').onclick = function () { q.value = ''; S.q = ''; this.style.display = 'none'; doSearch(); };
  $('#goBtn').onclick = function () { doSearch(); };
  $('#advBtn').onclick = function () { $('#adv').classList.toggle('on'); };
  $('#f-neg').addEventListener('input', function () { S.neg = this.value; clearTimeout(this._t); var self = this; this._t = setTimeout(function () { doSearch(); }, 220); });
  $('#y-q').addEventListener('input', function () { S.yq = this.value; clearTimeout(this._t); this._t = setTimeout(renderYear, 180); });
  $('#o-q').addEventListener('input', function () { S.oq = this.value; clearTimeout(this._t); this._t = setTimeout(renderOrg, 160); });
  $('#p-q').addEventListener('input', function () { S.pq = this.value; clearTimeout(this._t); this._t = setTimeout(renderPpl, 160); });

  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      e.preventDefault(); if (gq && gq.offsetParent) gq.focus(); else { switchTab('search'); q.focus(); }
    }
    if (e.key === 'Escape') { hidePop(); drawer.classList.remove('on'); document.body.style.overflow = ''; }
  });

  // 标签点击
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tag]');
    if (t) { runQuery(t.dataset.tag); }
  });

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-more]');
    if (!b) return;
    var k = b.dataset.more;
    if (k === 'search') { S.page++; renderSearch(); }
    else if (k === 'org') { S.orgN += 200; renderOrg(); }
    else if (k === 'ppl') { S.pplN += 200; renderPpl(); }
    else if (k === 'year') { S.yearN += 60; renderYear(); }
  });

  $('#top').onclick = function () { window.scrollTo({ top: 0, behavior: 'smooth' }); };
  window.addEventListener('scroll', function () { $('#top').classList.toggle('on', window.scrollY > 600); }, { passive: true });

  // CSV
  $('#csvBtn').onclick = function () {
    var rows = [['年度', '序号', '获奖等级', '项目名称', '完成单位', '主要完成人']];
    results.forEach(function (r) { rows.push([r.y, r.seq, r.grade, r.title, r.units.join('、'), r.people.join('、')]); });
    var csv = '\ufeff' + rows.map(function (x) { return x.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = '金融科技发展奖_检索结果_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click(); URL.revokeObjectURL(a.href);
  };

  /* ============ 14. URL 同步 ============ */
  function syncURL() {
    var p = [];
    if (S.q) p.push('q=' + encodeURIComponent(S.q));
    if (S.year.length) p.push('y=' + S.year.join(','));
    if (S.grade.length) p.push('g=' + S.grade.join(','));
    if (S.cat.length) p.push('c=' + S.cat.join(','));
    try { history.replaceState(null, '', '#' + S.tab + (p.length ? '?' + p.join('&') : '')); } catch (e) { }
  }
  function readURL() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!h) return;
    var parts = h.split('?'), v = parts[0];
    if (['over', 'search', 'year', 'org', 'ppl', 'about'].indexOf(v) >= 0) { S.tab = v; switchTab(v, true); }
    if (parts[1]) {
      parts[1].split('&').forEach(function (kv) {
        var a = kv.split('='), k = a[0], val = a[1] || '';
        if (k === 'q') { S.q = val; q.value = val; $('#qclr').style.display = val ? 'block' : 'none'; }
        if (k === 'y') S.year = val.split(',').map(Number);
        if (k === 'g') S.grade = val.split(',');
        if (k === 'c') S.cat = val.split(',');
      });
    }
  }

  /* ============ 15. 启动 ============ */
  function boot() {
    $('#mhN').textContent = fmt(R.length);
    $('#mhO').textContent = fmt(ORGS.length);
    $('#mhP').textContent = fmt(PEOPLE.length);
    $('#k1').innerHTML = fmt(R.length) + '<small>项</small>';
    $('#k2').innerHTML = fmt(ORGS.length) + '<small>家</small>';
    $('#k3').innerHTML = fmt(PEOPLE.length) + '<small>人</small>';
    $('#k4').innerHTML = CATS.length + '<small>类</small>';
    $('#ab-n').textContent = R.length;
    var perPerson = R.reduce(function (a, r) { return a + r.people.length; }, 0);
    $('#k3d').textContent = '参与人次 ' + fmt(perPerson);
    $('#k1d').textContent = '2023 年 ' + R.filter(function (r) { return r.y === 2023; }).length + ' · 2024 年 ' + R.filter(function (r) { return r.y === 2024; }).length + ' · 2025 年 ' + R.filter(function (r) { return r.y === 2025; }).length;

    renderVolume(); renderCat(); renderHeat(); renderTop(); renderTags(); renderIns();
    buildFilters(); buildYearTabs(); buildOrgCats();
    readURL();
    syncChips();
    doSearch(); renderYear(); renderOrg(); renderPpl();
    switchTab(S.tab, true);
  }
  boot();
})();
