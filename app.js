(function () {
  "use strict";

  var STEPS = {
    fourth: [
      { title: "后视黑面", rod: "back", face: "black", fields: [
        { key: "back.lower", wire: "lower", label: "下丝" },
        { key: "back.upper", wire: "upper", label: "上丝" },
        { key: "back.mid", wire: "mid", label: "中丝" },
      ]},
      { title: "后视红面", rod: "back", face: "red", fields: [
        { key: "back.red", wire: "mid", label: "中丝" },
      ]},
      { title: "前视黑面", rod: "fore", face: "black", fields: [
        { key: "fore.lower", wire: "lower", label: "下丝" },
        { key: "fore.upper", wire: "upper", label: "上丝" },
        { key: "fore.mid", wire: "mid", label: "中丝" },
      ]},
      { title: "前视红面", rod: "fore", face: "red", fields: [
        { key: "fore.red", wire: "mid", label: "中丝" },
      ]},
    ],
    mid: [
      { title: "后视黑面", rod: "back", face: "black", fields: [
        { key: "back.mid", wire: "mid", label: "中丝" },
      ]},
      { title: "后视红面", rod: "back", face: "red", fields: [
        { key: "back.red", wire: "mid", label: "中丝" },
      ]},
      { title: "前视黑面", rod: "fore", face: "black", fields: [
        { key: "fore.mid", wire: "mid", label: "中丝" },
      ]},
      { title: "前视红面", rod: "fore", face: "red", fields: [
        { key: "fore.red", wire: "mid", label: "中丝" },
      ]},
    ],
  };

  var STATS_KEY = "level-sim-v1";
  var state = {
    mode: "fourth",
    inverted: false,
    step: 0,
    station: null,
    lineIndex: 1,
    trueSumMm: 0,
    userSumM: 0,
    answers: {},
    graded: false,
    grade: null,
    lastStat: null,
    demo: false,
    savedStep: 0,
    stats: loadStats(),
  };

  var els = {
    modeFourth: document.getElementById("modeFourth"),
    modeMid: document.getElementById("modeMid"),
    btnInvert: document.getElementById("btnInvert"),
    btnErect: document.getElementById("btnErect"),
    scope: document.getElementById("scope"),
    caption: document.getElementById("scopeCaption"),
    rodRack: document.getElementById("rodRack"),
    meta: document.getElementById("stationMeta"),
    linkNote: document.getElementById("linkNote"),
    steps: document.getElementById("steps"),
    form: document.getElementById("readForm"),
    fields: document.getElementById("fields"),
    preview: document.getElementById("preview"),
    formMsg: document.getElementById("formMsg"),
    btnPrev: document.getElementById("btnPrev"),
    btnNext: document.getElementById("btnNext"),
    btnSubmit: document.getElementById("btnSubmit"),
    sheet: document.getElementById("sheet"),
    result: document.getElementById("result"),
    btnDemo: document.getElementById("btnDemo"),
    btnNew: document.getElementById("btnNew"),
    btnNextStation: document.getElementById("btnNextStation"),
    stats: document.getElementById("stats"),
  };

  function loadStats() {
    try {
      var saved = JSON.parse(localStorage.getItem(STATS_KEY) || "{}");
      return {
        readings: saved.readings || 0,
        passed: saved.passed || 0,
        absSum: saved.absSum || 0,
        stations: saved.stations || 0,
        stationsPass: saved.stationsPass || 0,
      };
    } catch (err) {
      return { readings: 0, passed: 0, absSum: 0, stations: 0, stationsPass: 0 };
    }
  }

  function saveStats() {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(state.stats)); } catch (err) { /* ignore */ }
  }

  function steps() {
    return STEPS[state.mode];
  }

  function currentStep() {
    return steps()[state.step];
  }

  function stationNow() {
    return state.demo ? Survey.DEMO : state.station;
  }

  function answersNow() {
    if (state.demo) return Survey.truthAnswers(Survey.DEMO, state.mode);
    return state.answers;
  }

  function wireHint(wire) {
    if (wire === "mid") return "长横丝";
    if (wire === "upper") return state.inverted ? "视场上方，读数较小" : "视场下方，读数较小";
    return state.inverted ? "视场下方，读数较大" : "视场上方，读数较大";
  }

  function rodKey(step) {
    if (step.face === "black") return "black";
    var rod = stationNow()[step.rod];
    return rod.k === Survey.K1 ? "k4687" : "k4787";
  }

  function explainMid(mm) {
    var info = Survey.explainReading(mm);
    return "注记 " + info.label + " 起，沿增大方向 " + info.cm + " cm " + info.mm + " mm，读作 " + info.meters + " m";
  }

  function paint() {
    var step = currentStep();
    var rod = stationNow()[step.rod];
    var red = step.face === "red";
    var upper = red ? rod.redUpper : rod.upper;
    var mid = red ? rod.redMid : rod.mid;
    var lower = red ? rod.redLower : rod.lower;
    var reveal = state.demo || state.graded;
    Draw.drawTelescope(els.scope, {
      inverted: state.inverted,
      face: step.face,
      origin: red ? rod.k : 0,
      length: Survey.STAFF_MM,
      mid: mid,
      upper: upper,
      lower: lower,
      values: reveal ? {
        upper: Survey.formatMeters(upper, false),
        mid: Survey.formatMeters(mid, false),
        lower: Survey.formatMeters(lower, false),
      } : null,
      userMarks: userMarks(step),
    });
    var rods = els.rodRack.querySelectorAll("canvas");
    Draw.drawRod(rods[0], { origin: 0, face: "black", span: 540 });
    Draw.drawRod(rods[1], { origin: Survey.K1, face: "red", span: 540 });
    Draw.drawRod(rods[2], { origin: Survey.K2, face: "red", span: 540 });
  }

  function userMarks(step) {
    if (!state.graded || state.demo) return [];
    var marks = [];
    step.fields.forEach(function (field) {
      var mm = Survey.parseReading(state.answers[field.key]);
      if (mm != null) marks.push({ mm: mm });
    });
    return marks;
  }

  function renderChrome() {
    var station = stationNow();
    var step = currentStep();
    var red = step.face === "red";
    var rod = station[step.rod];
    els.modeFourth.setAttribute("aria-pressed", String(state.mode === "fourth"));
    els.modeMid.setAttribute("aria-pressed", String(state.mode === "mid"));
    els.btnInvert.setAttribute("aria-pressed", String(state.inverted));
    els.btnErect.setAttribute("aria-pressed", String(!state.inverted));
    els.meta.textContent = (state.demo ? "读数示范 · " : "") + "第 " + station.index + " 站";
    document.getElementById("stationSub").textContent = "编号 " + station.id
      + " · 后尺 No." + station.back.no + "　K=" + (station.back.k / 1000).toFixed(3)
      + " · 前尺 No." + station.fore.no + "　K=" + (station.fore.k / 1000).toFixed(3);
    els.linkNote.textContent = "本站上丝、中丝、下丝在同一视线上。红面读数 = 黑面读数 + 该尺常数。后视减前视就是这一站的高差。";
    var where = (step.rod === "back" ? "后视" : "前视") + " · " + (red ? "红面 " + (rod.k / 1000).toFixed(3) + " 尺" : "黑面 0 尺");
    var caption = "第 " + station.index + " 站 · " + where + " · " + (state.inverted ? "倒像" : "正像");
    if (state.demo || state.graded) {
      var mid = red ? rod.redMid : rod.mid;
      caption += "。" + explainMid(mid) + "。";
      if (red) {
        caption += "同一视线：黑面 " + Survey.formatMeters(rod.mid, false)
          + " + " + Survey.formatMeters(rod.k, false)
          + " = " + Survey.formatMeters(mid, false) + "。";
      }
    }
    els.caption.textContent = caption;

    els.steps.innerHTML = "";
    steps().forEach(function (item, index) {
      var li = document.createElement("li");
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = (index + 1) + " " + item.title;
      if (index === state.step) button.className = "on";
      else if (item.fields.every(function (field) { return Survey.parseReading(answersNow()[field.key]) != null; })) button.className = "done";
      button.addEventListener("click", function () {
        state.step = index;
        renderAll();
        focusFirst();
      });
      li.appendChild(button);
      els.steps.appendChild(li);
    });

    var active = rodKey(step);
    els.rodRack.querySelectorAll("figure").forEach(function (figure) {
      var on = figure.getAttribute("data-rod") === active;
      figure.classList.toggle("active", on);
      figure.querySelector("em").textContent = on ? (step.rod === "back" ? "后视" : "前视") : "";
    });

    var last = state.step >= steps().length - 1;
    els.btnPrev.disabled = state.step === 0;
    els.btnNext.disabled = last;
    els.btnSubmit.hidden = state.demo;
    els.btnSubmit.textContent = state.graded ? "已提交" : (state.mode === "mid" ? "提交本局" : "提交本站");
    els.btnSubmit.disabled = state.graded;
    els.btnDemo.textContent = state.demo ? "返回练习" : "读数示范";
    els.btnNextStation.disabled = state.demo || !state.graded;
  }

  function renderFields() {
    var step = currentStep();
    var answers = answersNow();
    els.fields.innerHTML = "";
    step.fields.forEach(function (field) {
      var label = document.createElement("label");
      label.className = "field";
      var span = document.createElement("span");
      span.textContent = field.label + "（米） ";
      var small = document.createElement("small");
      small.textContent = wireHint(field.wire);
      span.appendChild(small);
      var input = document.createElement("input");
      input.inputMode = "decimal";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.setAttribute("aria-label", field.label);
      input.dataset.key = field.key;
      input.value = answers[field.key] || "";
      input.readOnly = state.demo || state.graded;
      input.placeholder = "0.000";
      input.addEventListener("input", function () {
        state.answers[field.key] = input.value;
        input.classList.remove("bad");
        els.formMsg.textContent = "";
        renderPreview();
        renderSheet();
        markDoneSteps();
      });
      input.addEventListener("keydown", function (event) {
        if (event.key !== "Enter") return;
        event.preventDefault();
        var inputs = els.fields.querySelectorAll("input");
        var index = Array.prototype.indexOf.call(inputs, input);
        if (index < inputs.length - 1) inputs[index + 1].focus();
        else if (state.step < steps().length - 1) {
          state.step += 1;
          renderAll();
          focusFirst();
        } else submit();
      });
      label.appendChild(span);
      label.appendChild(input);
      els.fields.appendChild(label);
    });
    renderPreview();
  }

  function markDoneSteps() {
    var buttons = els.steps.querySelectorAll("button");
    steps().forEach(function (item, index) {
      if (index === state.step) return;
      var done = item.fields.every(function (field) {
        return Survey.parseReading(state.answers[field.key]) != null;
      });
      buttons[index].className = done ? "done" : "";
    });
  }

  function renderPreview() {
    var bits = [];
    var warn = false;
    currentStep().fields.forEach(function (field) {
      var raw = answersNow()[field.key];
      var mm = Survey.parseReading(raw);
      if (raw && mm == null) {
        bits.push(field.label + "无法识别");
        warn = true;
        return;
      }
      if (mm == null) return;
      var rod = stationNow()[field.key.split(".")[0]];
      var red = field.key.slice(-4) === ".red";
      var range = red ? [rod.k, rod.k + Survey.STAFF_MM] : [0, Survey.STAFF_MM];
      var text = field.label + " " + Survey.formatMeters(mm, false) + " m";
      if (mm < range[0] || mm > range[1]) {
        text += "（超出尺面）";
        warn = true;
      }
      bits.push(text);
    });
    els.preview.textContent = bits.length ? ("将记为 " + bits.join(" · ")) : "可输入米，如 1.486；或毫米整数，如 1486。";
    els.preview.classList.toggle("warn", warn);
  }

  function cell(text, className) {
    var el = document.createElement("td");
    el.textContent = text;
    el.className = "num" + (className ? " " + className : "");
    return el;
  }

  function row(label, back, fore, className) {
    var tr = document.createElement("tr");
    var th = document.createElement("th");
    th.textContent = label;
    tr.appendChild(th);
    tr.appendChild(cell(back, className));
    tr.appendChild(cell(fore, className));
    return tr;
  }

  function checkClass(label) {
    if (!(state.graded || state.demo) || !state.grade && !state.demo) return "";
    var grade = state.demo
      ? Survey.grade(Survey.DEMO, Survey.truthAnswers(Survey.DEMO, state.mode), state.mode, 0)
      : state.grade;
    var found = grade.checks.filter(function (item) { return item.label === label; })[0];
    if (!found) return "";
    return found.pass ? "pass" : "fail";
  }

  function renderSheet() {
    var station = stationNow();
    var answers = answersNow();
    var fourth = state.mode === "fourth";
    function read(key) { return Survey.parseReading(answers[key]); }
    var backLower = read("back.lower");
    var backUpper = read("back.upper");
    var backMid = read("back.mid");
    var backRed = read("back.red");
    var foreLower = read("fore.lower");
    var foreUpper = read("fore.upper");
    var foreMid = read("fore.mid");
    var foreRed = read("fore.red");
    var distBack = fourth && backLower != null && backUpper != null ? (backLower - backUpper) / 10 : null;
    var distFore = fourth && foreLower != null && foreUpper != null ? (foreLower - foreUpper) / 10 : null;
    var distDiff = distBack != null && distFore != null ? distBack - distFore : null;
    var backBr = backMid != null && backRed != null ? backMid + station.back.k - backRed : null;
    var foreBr = foreMid != null && foreRed != null ? foreMid + station.fore.k - foreRed : null;
    var hBlack = backMid != null && foreMid != null ? backMid - foreMid : null;
    var hRed = backRed != null && foreRed != null ? backRed - foreRed : null;
    var kDelta = station.back.k - station.fore.k;
    var residual = hBlack != null && hRed != null ? hBlack - hRed + kDelta : null;
    var hMean = residual != null ? (hBlack + (hRed - kDelta)) / 2 : null;
    var sum = distDiff == null ? null : state.userSumM + distDiff;

    function meters(mm) { return mm == null ? "—" : Survey.formatMeters(mm, false); }
    function signed(mm) { return mm == null ? "—" : Survey.formatMeters(mm, true); }
    function mmText(mm) { return mm == null ? "—" : Survey.formatMm(mm); }
    function distText(metersValue) {
      if (!fourth) return "不测";
      return metersValue == null ? "—" : Survey.formatDist(metersValue);
    }

    els.sheet.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "sheet";
    var table = document.createElement("table");
    var head = document.createElement("tr");
    ["项目", "后视", "前视"].forEach(function (text) {
      var th = document.createElement("th");
      th.textContent = text;
      head.appendChild(th);
    });
    table.appendChild(head);
    table.appendChild(row("下丝 (m)", fourth ? meters(backLower) : "不测", fourth ? meters(foreLower) : "不测"));
    table.appendChild(row("上丝 (m)", fourth ? meters(backUpper) : "不测", fourth ? meters(foreUpper) : "不测"));
    table.appendChild(row("黑中丝 (m)", meters(backMid), meters(foreMid)));
    table.appendChild(row("红中丝 (m)", meters(backRed), meters(foreRed)));
    table.appendChild(row("K (m)", (station.back.k / 1000).toFixed(3), (station.fore.k / 1000).toFixed(3)));
    table.appendChild(row("视距 (m)", distText(distBack), distText(distFore)));
    table.appendChild(row("黑+K−红", mmText(backBr), mmText(foreBr), checkClass(backBr == null ? "" : "后视黑红面读数差")));
    var backClass = checkClass("后视黑红面读数差");
    var foreClass = checkClass("前视黑红面读数差");
    table.lastChild.children[1].className = "num" + (backClass ? " " + backClass : "");
    table.lastChild.children[2].className = "num" + (foreClass ? " " + foreClass : "");
    wrap.appendChild(table);

    var derived = document.createElement("table");
    function line(label, value, gradeLabel) {
      var tr = document.createElement("tr");
      var th = document.createElement("th");
      th.textContent = label;
      var td = document.createElement("td");
      td.colSpan = 2;
      td.textContent = value;
      td.className = "num" + (gradeLabel ? " " + checkClass(gradeLabel) : "");
      tr.appendChild(th);
      tr.appendChild(td);
      derived.appendChild(tr);
    }
    line("前后视距差", fourth ? (distDiff == null ? "—" : Survey.formatDist(distDiff) + " m") : "不测", fourth ? "前后视距差" : "");
    line("视距累计差", fourth ? (sum == null ? "—" : Survey.formatDist(sum) + " m") : "不测", fourth ? "视距累计差" : "");
    line("黑面高差（后−前）", signed(hBlack) + (hBlack == null ? "" : " m"));
    line("红面高差（后−前）", signed(hRed) + (hRed == null ? "" : " m"));
    line("高差之差", mmText(residual), "黑红面高差之差");
    line("高差中数", signed(hMean) + (hMean == null ? "" : " m"));
    wrap.appendChild(derived);
    var note = document.createElement("p");
    note.textContent = "高差之差 = 黑面高差 − 红面高差 +（K后 − K前）。中数用改正后的红面高差。K后 − K前 本站为 "
      + Survey.formatMeters(kDelta, true) + " m。";
    wrap.appendChild(note);
    els.sheet.appendChild(wrap);
  }

  function renderResult() {
    els.result.innerHTML = "";
    if (!state.graded || state.demo || !state.grade) return;
    var grade = state.grade;
    var box = document.createElement("div");
    box.className = "result";
    var stamp = document.createElement("div");
    if (grade.readingPass && grade.checkPass) {
      stamp.className = "stamp ok";
      stamp.textContent = "合格";
    } else if (grade.readingPass) {
      stamp.className = "stamp mid";
      stamp.textContent = "读数合格";
    } else {
      stamp.className = "stamp bad";
      stamp.textContent = "超限";
    }
    box.appendChild(stamp);
    var summary = document.createElement("p");
    var mean = grade.absMean == null ? "—" : grade.absMean.toFixed(1);
    summary.textContent = "读数合格 " + grade.items.filter(function (item) { return item.pass; }).length
      + "/" + grade.items.length + "，平均绝对误差 " + mean + " mm。手簿检核"
      + (grade.checkPass ? "通过。" : "未全部通过。");
    box.appendChild(summary);

    var table = document.createElement("table");
    var head = document.createElement("tr");
    ["读数", "你的 (m)", "真值 (m)", "误差", "评定"].forEach(function (text) {
      var th = document.createElement("th");
      th.textContent = text;
      head.appendChild(th);
    });
    table.appendChild(head);
    grade.items.forEach(function (item) {
      var tr = document.createElement("tr");
      var name = document.createElement("th");
      name.textContent = item.label;
      tr.appendChild(name);
      [Survey.formatMeters(item.given, false), Survey.formatMeters(item.truth, false), Survey.formatMm(item.error)].forEach(function (text) {
        tr.appendChild(cell(text, item.pass ? "pass" : "fail"));
      });
      var judge = document.createElement("td");
      judge.textContent = item.pass ? "合格" : "超限";
      judge.className = item.pass ? "pass" : "fail";
      tr.appendChild(judge);
      table.appendChild(tr);
    });
    var sheet = document.createElement("div");
    sheet.className = "sheet";
    sheet.appendChild(table);
    box.appendChild(sheet);

    var trueH = state.station.back.mid - state.station.fore.mid;
    var elev = document.createElement("p");
    elev.textContent = "假定后视点高程 100.000 m。按你的高差中数，前视点 "
      + (grade.foreElevMm == null ? "—" : Survey.formatMeters(grade.foreElevMm, false))
      + " m；真值 " + Survey.formatMeters(Survey.BENCH_MM + trueH, false) + " m。";
    box.appendChild(elev);
    els.result.appendChild(box);
  }

  function renderStats() {
    var stats = state.stats;
    if (!stats.readings) {
      els.stats.textContent = "还没有提交过成绩。合格标准是每个读数与真值之差不超过 3 mm。";
      return;
    }
    var rate = Math.round(stats.passed / stats.readings * 1000) / 10;
    var mean = stats.readings ? (stats.absSum / stats.readings) : 0;
    els.stats.textContent = "累计 " + stats.readings + " 个读数，合格率 " + rate
      + "%，平均绝对误差 " + mean.toFixed(1) + " mm。整站读数合格 "
      + stats.stationsPass + "/" + stats.stations + "。";
  }

  function renderAll() {
    renderChrome();
    renderFields();
    renderSheet();
    renderResult();
    renderStats();
    paint();
  }

  function focusFirst() {
    var input = els.fields.querySelector("input");
    if (input && !input.readOnly) input.focus();
  }

  function newLine() {
    state.demo = false;
    state.lineIndex = 1;
    state.trueSumMm = 0;
    state.userSumM = 0;
    state.station = Survey.generateStation({ index: 1, prevSumMm: 0 });
    state.step = 0;
    state.answers = {};
    state.graded = false;
    state.grade = null;
    state.lastStat = null;
    els.formMsg.textContent = "";
    renderAll();
  }

  function submit() {
    if (state.demo || state.graded) return;
    var missing = false;
    els.fields.querySelectorAll("input").forEach(function (input) {
      var bad = Survey.parseReading(input.value) == null;
      input.classList.toggle("bad", bad);
      if (bad) missing = true;
    });
    var pending = steps().some(function (item) {
      return item.fields.some(function (field) {
        return Survey.parseReading(state.answers[field.key]) == null;
      });
    });
    if (missing || pending) {
      els.formMsg.textContent = "还有读数没填，或格式无法识别。";
      return;
    }
    state.grade = Survey.grade(state.station, state.answers, state.mode, state.userSumM);
    state.graded = true;
    var absSum = 0;
    var passed = 0;
    state.grade.items.forEach(function (item) {
      absSum += Math.abs(item.error);
      if (item.pass) passed += 1;
    });
    state.stats.readings += state.grade.items.length;
    state.stats.passed += passed;
    state.stats.absSum += absSum;
    state.stats.stations += 1;
    if (state.grade.readingPass) state.stats.stationsPass += 1;
    state.lastStat = true;
    saveStats();
    renderAll();
    els.result.scrollIntoView({ block: "nearest" });
  }

  function nextStation() {
    if (!state.graded || state.demo) return;
    if (state.grade.distDiff != null) state.userSumM += state.grade.distDiff;
    state.trueSumMm += state.station.back.distanceMm - state.station.fore.distanceMm;
    state.lineIndex += 1;
    state.station = Survey.generateStation({ index: state.lineIndex, prevSumMm: state.trueSumMm });
    state.step = 0;
    state.answers = {};
    state.graded = false;
    state.grade = null;
    els.formMsg.textContent = "";
    renderAll();
    focusFirst();
  }

  function enterDemo() {
    if (state.demo) {
      state.demo = false;
      state.step = state.savedStep;
      renderAll();
      return;
    }
    state.savedStep = state.step;
    state.demo = true;
    state.step = 0;
    els.formMsg.textContent = "";
    renderAll();
  }

  function setMode(mode) {
    if (state.mode === mode && !state.demo) return;
    state.mode = mode;
    newLine();
  }

  function bind() {
    els.modeFourth.addEventListener("click", function () { setMode("fourth"); });
    els.modeMid.addEventListener("click", function () { setMode("mid"); });
    els.btnInvert.addEventListener("click", function () {
      state.inverted = true;
      renderAll();
    });
    els.btnErect.addEventListener("click", function () {
      state.inverted = false;
      renderAll();
    });
    els.btnPrev.addEventListener("click", function () {
      if (state.step === 0) return;
      state.step -= 1;
      renderAll();
      focusFirst();
    });
    els.btnNext.addEventListener("click", function () {
      if (state.step >= steps().length - 1) return;
      state.step += 1;
      renderAll();
      focusFirst();
    });
    els.form.addEventListener("submit", function (event) {
      event.preventDefault();
      submit();
    });
    els.btnNew.addEventListener("click", newLine);
    els.btnNextStation.addEventListener("click", nextStation);
    els.btnDemo.addEventListener("click", enterDemo);
    window.addEventListener("resize", paint);
    if (window.ResizeObserver) {
      var observer = new ResizeObserver(function () { paint(); });
      observer.observe(els.scope.parentElement);
      observer.observe(els.rodRack);
    }
  }

  newLine();
  if (location.hash === "#demo") enterDemo();
  bind();
})();
