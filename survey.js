/* 四等水准读数的几何、解析和评分。与界面无关。 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    if (typeof require !== "undefined" && require.main === module) {
      api.runTests();
    }
  } else {
    root.Survey = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var TOL = {
    readingMm: 3,
    blackRedMm: 3,
    heightMm: 5,
    distM: 5,
    sumDistM: 10,
    wireMm: 3,
  };

  var K1 = 4687;
  var K2 = 4787;
  var STAFF_MM = 2000;
  var BENCH_MM = 100000;

  function randInt(rng, a, b) {
    return a + Math.floor(rng() * (b - a + 1));
  }

  function formatMeters(mm, signed) {
    if (mm == null || !isFinite(mm)) return "—";
    var neg = mm < 0;
    var text = (Math.abs(Math.round(mm)) / 1000).toFixed(3);
    if (!signed) return neg ? "−" + text : text;
    if (Math.round(mm) === 0) return "0.000";
    return (neg ? "−" : "+") + text;
  }

  function formatMm(mm) {
    if (mm == null || !isFinite(mm)) return "—";
    var n = Math.round(mm);
    if (n === 0) return "0 mm";
    return (n > 0 ? "+" : "−") + Math.abs(n) + " mm";
  }

  function formatDist(meters) {
    if (meters == null || !isFinite(meters)) return "—";
    var neg = meters < 0;
    var text = Math.abs(meters).toFixed(1);
    return neg ? "−" + text : text;
  }

  function parseReading(raw) {
    if (raw == null) return null;
    var s = String(raw).trim();
    if (!s) return null;
    s = s.replace(/[０-９]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30);
    });
    s = s.replace(/[，．。]/g, ".").replace(/\s+/g, "");
    s = s.replace(/毫米|mm|米|ｍ|m/gi, "");
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
    if (s.indexOf(".") >= 0) {
      var meters = Number(s);
      if (!isFinite(meters)) return null;
      return Math.round(meters * 1000);
    }
    return Number(s);
  }

  function explainReading(mm) {
    var dm = Math.floor(mm / 100);
    var rest = mm - dm * 100;
    var cm = Math.floor(rest / 10);
    return {
      dm: dm,
      cm: cm,
      mm: rest - cm * 10,
      label: String(dm).padStart(2, "0"),
      meters: formatMeters(mm, false),
    };
  }

  function makeRod(k, distanceMm, mid) {
    var half = distanceMm / 200;
    return {
      k: k,
      no: k === K1 ? 1 : 2,
      distanceMm: distanceMm,
      mid: mid,
      upper: mid - half,
      lower: mid + half,
      redMid: mid + k,
      redUpper: mid - half + k,
      redLower: mid + half + k,
    };
  }

  function randomDistance(rng) {
    return 12000 + randInt(rng, 0, 60) * 200;
  }

  function pickDistances(rng, prevSumMm) {
    var choice = null;
    var i;
    for (i = 0; i < 120; i += 1) {
      var back = randomDistance(rng);
      var fore = randomDistance(rng);
      var diff = back - fore;
      if (Math.abs(diff) > TOL.distM * 1000) continue;
      choice = { back: back, fore: fore };
      if (Math.abs(prevSumMm + diff) <= TOL.sumDistM * 1000) return choice;
    }
    return choice || { back: 20000, fore: 20000 };
  }

  function pickMid(rng, distanceMm) {
    var half = distanceMm / 200;
    var min = half + 50;
    var max = STAFF_MM - half - 50;
    return randInt(rng, min, max);
  }

  function generateStation(options) {
    var opts = options || {};
    var rng = opts.rng || Math.random;
    var index = opts.index || 1;
    var prevSumMm = opts.prevSumMm || 0;
    var dist = pickDistances(rng, prevSumMm);
    var backK = index % 2 === 1 ? K1 : K2;
    var foreK = index % 2 === 1 ? K2 : K1;
    return {
      index: index,
      id: String(randInt(rng, 1000, 9999)),
      back: makeRod(backK, dist.back, pickMid(rng, dist.back)),
      fore: makeRod(foreK, dist.fore, pickMid(rng, dist.fore)),
    };
  }

  var DEMO = {
    index: 1,
    id: "1486",
    back: makeRod(K1, 20000, 1486),
    fore: makeRod(K2, 18000, 1124),
  };

  var FIELDS = {
    fourth: [
      ["back.lower", "后视下丝"],
      ["back.upper", "后视上丝"],
      ["back.mid", "后视黑中丝"],
      ["back.red", "后视红中丝"],
      ["fore.lower", "前视下丝"],
      ["fore.upper", "前视上丝"],
      ["fore.mid", "前视黑中丝"],
      ["fore.red", "前视红中丝"],
    ],
    mid: [
      ["back.mid", "后视黑中丝"],
      ["back.red", "后视红中丝"],
      ["fore.mid", "前视黑中丝"],
      ["fore.red", "前视红中丝"],
    ],
  };

  function truthFor(station, key) {
    var rodName = key.split(".")[0];
    var part = key.split(".")[1];
    var rod = station[rodName];
    if (part === "lower") return rod.lower;
    if (part === "upper") return rod.upper;
    if (part === "mid") return rod.mid;
    if (part === "red") return rod.redMid;
    return null;
  }

  function truthAnswers(station, mode) {
    var out = {};
    var list = FIELDS[mode] || FIELDS.fourth;
    var i;
    for (i = 0; i < list.length; i += 1) {
      out[list[i][0]] = formatMeters(truthFor(station, list[i][0]), false);
    }
    return out;
  }

  function rodRange(rod, red) {
    return red ? [rod.k, rod.k + STAFF_MM] : [0, STAFF_MM];
  }

  function inRange(value, range) {
    return value >= range[0] && value <= range[1];
  }

  function checkItem(label, pass, detail) {
    return { label: label, pass: pass, detail: detail };
  }

  function grade(station, answers, mode, prevSumM) {
    var list = FIELDS[mode] || FIELDS.fourth;
    var items = [];
    var i;
    for (i = 0; i < list.length; i += 1) {
      var key = list[i][0];
      var truth = truthFor(station, key);
      var given = parseReading(answers ? answers[key] : null);
      var missing = given == null;
      var error = missing ? null : given - truth;
      items.push({
        key: key,
        label: list[i][1],
        truth: truth,
        given: missing ? null : given,
        error: error,
        missing: missing,
        pass: !missing && Math.abs(error) <= TOL.readingMm,
      });
    }

    function givenOf(key) {
      var n;
      for (n = 0; n < items.length; n += 1) {
        if (items[n].key === key) return items[n].given;
      }
      return null;
    }

    var checks = [];
    var backBlack = givenOf("back.mid");
    var foreBlack = givenOf("fore.mid");
    var backRed = givenOf("back.red");
    var foreRed = givenOf("fore.red");
    var kDelta = station.back.k - station.fore.k;

    if (backBlack != null && backRed != null) {
      var backDiff = backBlack + station.back.k - backRed;
      checks.push(checkItem(
        "后视黑红面读数差",
        Math.abs(backDiff) <= TOL.blackRedMm,
        formatMm(backDiff) + "（限差 ±" + TOL.blackRedMm + " mm）"
      ));
    } else {
      checks.push(checkItem("后视黑红面读数差", false, "缺测"));
    }

    if (foreBlack != null && foreRed != null) {
      var foreDiff = foreBlack + station.fore.k - foreRed;
      checks.push(checkItem(
        "前视黑红面读数差",
        Math.abs(foreDiff) <= TOL.blackRedMm,
        formatMm(foreDiff) + "（限差 ±" + TOL.blackRedMm + " mm）"
      ));
    } else {
      checks.push(checkItem("前视黑红面读数差", false, "缺测"));
    }

    var hBlack = null;
    var hRed = null;
    var hMean = null;
    if (backBlack != null && foreBlack != null && backRed != null && foreRed != null) {
      hBlack = backBlack - foreBlack;
      hRed = backRed - foreRed;
      var residual = hBlack - hRed + kDelta;
      var corrected = hRed - kDelta;
      hMean = (hBlack + corrected) / 2;
      checks.push(checkItem(
        "黑红面高差之差",
        Math.abs(residual) <= TOL.heightMm,
        formatMm(residual) + "（限差 ±" + TOL.heightMm + " mm）"
      ));
    } else {
      checks.push(checkItem("黑红面高差之差", false, "缺测"));
    }

    var distBack = null;
    var distFore = null;
    var distDiff = null;
    if (mode !== "mid") {
      var bu = givenOf("back.upper");
      var bl = givenOf("back.lower");
      var fu = givenOf("fore.upper");
      var fl = givenOf("fore.lower");
      if (bu != null && bl != null) {
        distBack = (bl - bu) / 10;
        var backWire = Math.abs((bu + bl) / 2 - backBlack);
        checks.push(checkItem(
          "后视三丝校核",
          backBlack != null && backWire <= TOL.wireMm,
          backBlack == null ? "缺中丝" : "与中丝差 " + formatMm(Math.round((bu + bl) / 2 - backBlack))
        ));
      } else {
        checks.push(checkItem("后视三丝校核", false, "缺测"));
      }
      if (fu != null && fl != null) {
        distFore = (fl - fu) / 10;
        var foreWire = Math.abs((fu + fl) / 2 - foreBlack);
        checks.push(checkItem(
          "前视三丝校核",
          foreBlack != null && foreWire <= TOL.wireMm,
          foreBlack == null ? "缺中丝" : "与中丝差 " + formatMm(Math.round((fu + fl) / 2 - foreBlack))
        ));
      } else {
        checks.push(checkItem("前视三丝校核", false, "缺测"));
      }
      if (distBack != null && distFore != null) {
        distDiff = distBack - distFore;
        var orderOk = distBack > 0 && distFore > 0;
        checks.push(checkItem(
          "前后视距差",
          orderOk && Math.abs(distDiff) <= TOL.distM + 1e-6,
          orderOk
            ? formatDist(distDiff) + " m（限差 ±" + TOL.distM + " m）"
            : "上丝应小于下丝"
        ));
        var sum = (prevSumM || 0) + distDiff;
        checks.push(checkItem(
          "视距累计差",
          orderOk && Math.abs(sum) <= TOL.sumDistM + 1e-6,
          orderOk
            ? formatDist(sum) + " m（限差 ±" + TOL.sumDistM + " m）"
            : "上丝应小于下丝"
        ));
      } else {
        checks.push(checkItem("前后视距差", false, "缺测"));
        checks.push(checkItem("视距累计差", false, "缺测"));
      }
    }

    var readingPass = items.every(function (item) { return item.pass; });
    var checkPass = checks.every(function (item) { return item.pass; });
    var absSum = 0;
    var absN = 0;
    items.forEach(function (item) {
      if (item.error == null) return;
      absSum += Math.abs(item.error);
      absN += 1;
    });

    return {
      items: items,
      checks: checks,
      readingPass: readingPass,
      checkPass: checkPass,
      absMean: absN ? absSum / absN : null,
      hBlack: hBlack,
      hRed: hRed,
      hMean: hMean,
      kDelta: kDelta,
      distBack: distBack,
      distFore: distFore,
      distDiff: distDiff,
      foreElevMm: hMean == null ? null : BENCH_MM + hMean,
    };
  }

  function wiresOnStaff(rod) {
    var black = [rod.upper, rod.mid, rod.lower];
    var red = [rod.redUpper, rod.redMid, rod.redLower];
    var i;
    for (i = 0; i < black.length; i += 1) {
      if (!inRange(black[i], [0, STAFF_MM])) return false;
      if (!inRange(red[i], [rod.k, rod.k + STAFF_MM])) return false;
    }
    return true;
  }

  function assert(cond, message) {
    if (!cond) throw new Error(message);
  }

  function runTests() {
    var n = 0;
    function check(cond, message) {
      n += 1;
      assert(cond, message + " (#" + n + ")");
    }

    check(parseReading("1.486") === 1486, "meters");
    check(parseReading("1486") === 1486, "millimeters");
    check(parseReading(" 6.173 m ") === 6173, "unit");
    check(parseReading("1。486") === 1486, "ideographic dot");
    check(parseReading("１．４８６") === 1486, "fullwidth");
    check(parseReading("") === null, "empty");
    check(parseReading("abc") === null, "junk");
    check(parseReading("1.4865") === 1487, "round");

    var demo = DEMO;
    check(demo.back.upper === 1386, "demo upper");
    check(demo.back.lower === 1586, "demo lower");
    check(demo.back.redMid === 6173, "demo red");
    check(demo.fore.redMid === 5911, "demo fore red");
    check((demo.back.lower - demo.back.upper) / 10 === 20, "demo distance");
    check(demo.back.mid - demo.fore.mid - ((demo.back.redMid - demo.fore.redMid) - (demo.back.k - demo.fore.k)) === 0, "demo residual identity");

    var perfect = grade(demo, truthAnswers(demo, "fourth"), "fourth", 0);
    check(perfect.readingPass, "perfect readings");
    check(perfect.checkPass, "perfect checks");
    check(perfect.hMean === demo.back.mid - demo.fore.mid, "mean height");

    var midPerfect = grade(demo, truthAnswers(demo, "mid"), "mid", 0);
    check(midPerfect.readingPass && midPerfect.checkPass, "mid mode");
    check(midPerfect.distBack == null, "mid mode skips distance");

    var off = truthAnswers(demo, "fourth");
    off["back.mid"] = formatMeters(demo.back.mid + 3, false);
    var edge = grade(demo, off, "fourth", 0);
    var edgeItem = edge.items.filter(function (item) { return item.key === "back.mid"; })[0];
    check(edgeItem.pass, "3 mm passes");
    off["back.mid"] = formatMeters(demo.back.mid + 4, false);
    var over = grade(demo, off, "fourth", 0);
    var overItem = over.items.filter(function (item) { return item.key === "back.mid"; })[0];
    check(!overItem.pass, "4 mm fails");

    var redOff = truthAnswers(demo, "fourth");
    redOff["back.red"] = formatMeters(demo.back.redMid + 4, false);
    var redGrade = grade(demo, redOff, "fourth", 0);
    var redCheck = redGrade.checks.filter(function (item) { return item.label === "后视黑红面读数差"; })[0];
    check(!redCheck.pass, "black-red check");

    var swapped = {
      index: 2,
      id: "2000",
      back: makeRod(K2, 16000, 1500),
      fore: makeRod(K1, 16000, 1400),
    };
    var swappedGrade = grade(swapped, truthAnswers(swapped, "fourth"), "fourth", 2);
    check(swappedGrade.checkPass, "swapped rods");
    check(swappedGrade.hMean === 100, "swapped mean");

    function mulberry32(seed) {
      var a = seed >>> 0;
      return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    var line;
    var s;
    var station;
    for (line = 0; line < 40; line += 1) {
      var rng = mulberry32(1000 + line);
      var sum = 0;
      for (s = 1; s <= 6; s += 1) {
        station = generateStation({ rng: rng, index: s, prevSumMm: sum });
        check(wiresOnStaff(station.back), "back on staff");
        check(wiresOnStaff(station.fore), "fore on staff");
        check(station.back.redMid - station.back.mid === station.back.k, "back K");
        check(station.fore.redMid - station.fore.mid === station.fore.k, "fore K");
        check(station.back.lower - station.back.upper === station.back.distanceMm / 100, "stadia");
        check((station.back.upper + station.back.lower) / 2 === station.back.mid, "mean wire");
        var diff = station.back.distanceMm - station.fore.distanceMm;
        check(Math.abs(diff) <= 5000, "distance difference");
        sum += diff;
        check(Math.abs(sum) <= 10000, "cumulative distance");
        check(station.back.k !== station.fore.k, "rod pair");
        if (s % 2 === 1) check(station.back.k === K1, "odd station rod");
        var g = grade(station, truthAnswers(station, "fourth"), "fourth", (sum - diff) / 1000);
        check(g.readingPass && g.checkPass, "generated station grades clean");
      }
    }

    var swappedWires = truthAnswers(demo, "fourth");
    var tmp = swappedWires["back.upper"];
    swappedWires["back.upper"] = swappedWires["back.lower"];
    swappedWires["back.lower"] = tmp;
    tmp = swappedWires["fore.upper"];
    swappedWires["fore.upper"] = swappedWires["fore.lower"];
    swappedWires["fore.lower"] = tmp;
    var wireGrade = grade(demo, swappedWires, "fourth", 0);
    var distCheck = wireGrade.checks.filter(function (item) { return item.label === "前后视距差"; })[0];
    check(!distCheck.pass, "swapped stadia wires fail");

    var exp = explainReading(1486);
    check(exp.label === "14" && exp.cm === 8 && exp.mm === 6, "explain");
    console.log("survey tests passed: " + n);
  }

  return {
    TOL: TOL,
    K1: K1,
    K2: K2,
    STAFF_MM: STAFF_MM,
    BENCH_MM: BENCH_MM,
    DEMO: DEMO,
    FIELDS: FIELDS,
    formatMeters: formatMeters,
    formatMm: formatMm,
    formatDist: formatDist,
    parseReading: parseReading,
    explainReading: explainReading,
    generateStation: generateStation,
    truthFor: truthFor,
    truthAnswers: truthAnswers,
    rodRange: rodRange,
    grade: grade,
    runTests: runTests,
  };
});
