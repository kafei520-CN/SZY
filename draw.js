/* 区格式双面水准尺，按红标特写还原：倒写注记、E 形区格、橙边铝槽。 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Draw = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var RED = "#e12c24";
  var RED_EVEN = "#c24a38";
  var BLACK = "#1a1a1a";
  var FACE = "#eef1e4";
  var ORANGE = "#e86128";
  var ORANGE_DARK = "#c94b16";
  var ORANGE_LIGHT = "#f08a4a";

  function fit(canvas) {
    var rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return null;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var bw = Math.max(1, Math.round(rect.width * dpr));
    var bh = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: rect.width, h: rect.height };
  }

  function barsOnLeft(dmMm, origin) {
    var idx = Math.floor((dmMm - origin) / 100);
    return ((idx % 2) + 2) % 2 === 0;
  }

  function numberColor(face, dmMm) {
    if (face === "red") return RED;
    return Math.round(dmMm / 100) % 2 === 0 ? RED_EVEN : BLACK;
  }

  function fillCell(ctx, x, w, y0, y1) {
    var left = Math.round(x * 2) / 2;
    var top = Math.min(y0, y1);
    var bottom = Math.max(y0, y1);
    var width = Math.max(0.5, Math.round(w * 2) / 2);
    var h = bottom - top;
    if (h < 0.4 || width < 0.4) return;
    ctx.fillRect(left, top, width, h);
  }

  function fillZeroArm(ctx, xInner, xOuter, yZero, yOne) {
    var dir = xOuter >= xInner ? 1 : -1;
    var cut = Math.max(4, Math.abs(xOuter - xInner) * 0.38);
    ctx.beginPath();
    ctx.moveTo(xInner, yZero);
    ctx.lineTo(xOuter, yZero);
    ctx.lineTo(xOuter - dir * cut, yOne);
    ctx.lineTo(xInner, yOne);
    ctx.closePath();
    ctx.fill();
  }

  function drawShoe(ctx, x, y, w, down) {
    var footW = w * 1.42;
    var ox = x - (footW - w) / 2;
    var plate = Math.max(7, w * 0.16);
    var legW = Math.max(4, w * 0.11);
    var legH = Math.max(10, w * 0.28);
    ctx.fillStyle = "#141414";
    if (down) {
      ctx.fillRect(ox, y, footW, plate);
      ctx.fillRect(ox, y, legW, legH);
      ctx.fillRect(ox + footW - legW, y, legW, legH);
    } else {
      ctx.fillRect(ox, y - plate, footW, plate);
      ctx.fillRect(ox, y - legH, legW, legH);
      ctx.fillRect(ox + footW - legW, y - legH, legW, legH);
    }
  }

  function drawStaff(ctx, o) {
    var ppm = Math.abs(o.yAt(100) - o.yAt(0)) / 100;
    if (!isFinite(ppm) || ppm <= 0) return;
    var railW = Math.max(3.2, o.w * 0.09);
    var faceX = o.x + railW;
    var faceW = o.w - railW * 2;
    var yFoot = o.yAt(o.origin);
    var yHead = o.yAt(o.origin + o.length);
    var bodyTop = Math.min(yFoot, yHead);
    var bodyH = Math.abs(yHead - yFoot);
    var mark = o.face === "red" ? RED : BLACK;
    var origin = o.origin || 0;
    var inset = Math.max(1, faceW * 0.02);
    var workX = faceX + inset;
    var workW = faceW - inset * 2;
    var numShare = 0.4;
    var barShare = 0.6;

    ctx.save();
    ctx.beginPath();
    ctx.rect(o.x - 0.5, bodyTop - 0.5, o.w + 1, bodyH + 1);
    ctx.clip();

    ctx.fillStyle = ORANGE;
    ctx.fillRect(o.x, bodyTop, o.w, bodyH);
    ctx.fillStyle = ORANGE_LIGHT;
    ctx.fillRect(o.x, bodyTop, Math.max(1.2, railW * 0.28), bodyH);
    ctx.fillStyle = ORANGE_DARK;
    ctx.fillRect(o.x + o.w - railW, bodyTop, railW, bodyH);
    ctx.fillStyle = FACE;
    ctx.fillRect(faceX, bodyTop, faceW, bodyH);

    var rLo = Math.min(o.rLo, o.rHi);
    var rHi = Math.max(o.rLo, o.rHi);
    var dm0 = Math.floor((Math.max(origin, rLo) - 20) / 100) * 100;
    var dm1 = Math.ceil((Math.min(origin + o.length, rHi) + 20) / 100) * 100;
    var dm;
    for (dm = dm0; dm < dm1; dm += 100) {
      var yDm0 = o.yAt(Math.max(dm, origin));
      var yDm1 = o.yAt(Math.min(dm + 100, origin + o.length));
      if (Math.abs(yDm1 - yDm0) < 1) continue;
      var left = barsOnLeft(dm, origin);
      var barX = left ? workX : workX + workW * numShare;
      var barW = workW * barShare;
      var spineW = Math.max(2.2, barW * 0.28);
      var spineX = left ? barX : barX + barW - spineW;
      var longW = barW;
      var eUpperW = barW * 0.58;
      var shortW = barW * 0.5;
      ctx.fillStyle = mark;

      function solid(offsetMm, width, pointed) {
        var mm0 = dm + offsetMm;
        var mm1 = mm0 + 10;
        if (mm1 <= origin || mm0 >= origin + o.length) return;
        if (mm1 < rLo - 6 || mm0 > rHi + 6) return;
        var y0 = o.yAt(Math.max(mm0, origin));
        var y1 = o.yAt(Math.min(mm1, origin + o.length));
        var xInner = left ? barX : barX + barW;
        var xOuter = left ? barX + width : barX + barW - width;
        if (pointed) fillZeroArm(ctx, xInner, xOuter, y0, y1);
        else {
          var x = left ? barX : barX + barW - width;
          fillCell(ctx, x, width, y0, y1);
        }
      }

      var e0 = 0;
      var b0 = 60;
      fillCell(
        ctx,
        spineX,
        spineW,
        o.yAt(Math.max(dm + e0, origin)),
        o.yAt(Math.min(dm + e0 + 50, origin + o.length))
      );
      solid(e0, longW, true);
      solid(e0 + 20, eUpperW, false);
      solid(e0 + 40, eUpperW, false);
      solid(b0, shortW, false);
      solid(b0 + 20, shortW, false);
    }

    for (dm = dm0; dm <= dm1; dm += 100) {
      var centerReading = dm + 28;
      if (centerReading < origin || centerReading > origin + o.length) continue;
      if (centerReading < rLo - 18 || centerReading > rHi + 18) continue;
      var leftNum = barsOnLeft(dm, origin);
      var numX = leftNum ? workX + workW * barShare : workX;
      var numW = workW * numShare;
      var text = String(Math.round(dm / 100)).padStart(2, "0");
      var fontPx = Math.max(11, Math.min(ppm * 42, numW * 1.15, Math.abs(o.yAt(dm) - o.yAt(dm + 55)) * 0.82));
      ctx.font = "800 " + fontPx.toFixed(1) + "px Arial, 'Microsoft YaHei', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      while (fontPx > 9 && ctx.measureText(text).width * 0.78 > numW * 0.96) {
        fontPx -= 0.5;
        ctx.font = "800 " + fontPx.toFixed(1) + "px Arial, 'Microsoft YaHei', sans-serif";
      }
      ctx.save();
      ctx.translate(numX + numW / 2, o.yAt(centerReading));
      ctx.scale(0.78, 1);
      ctx.fillStyle = numberColor(o.face, dm);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }

    ctx.restore();

    if (o.shoe) {
      var down = o.yAt(origin - 10) > yFoot;
      drawShoe(ctx, o.x, yFoot, o.w, down);
    }
  }

  function drawGrass(ctx, x, y, w, h) {
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "#5b8a3e");
    g.addColorStop(0.45, "#326332");
    g.addColorStop(1, "#1a3d1e");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    var s = 91;
    var i;
    for (i = 0; i < 110; i += 1) {
      s = (s * 48271) % 2147483647;
      var bx = x + (s % 997) / 997 * w;
      s = (s * 48271) % 2147483647;
      var by = y + (s % 991) / 991 * h;
      ctx.strokeStyle = i % 2 ? "rgba(16,42,14,0.38)" : "rgba(186,214,112,0.28)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + (i % 5) - 2, by - 5 - (i % 8));
      ctx.stroke();
    }
  }

  function drawTelescope(canvas, view) {
    var box = fit(canvas);
    if (!box) return;
    var ctx = box.ctx;
    var w = box.w;
    var h = box.h;
    ctx.clearRect(0, 0, w, h);

    var narrow = w < 460;
    var marginR = narrow ? 8 : 86;
    var marginL = 10;
    var marginV = 12;
    var R = Math.min((w - marginL - marginR) / 2, (h - marginV * 2) / 2);
    var cx = marginL + R;
    var cy = h / 2;
    var mid = view.mid;
    var upper = view.upper;
    var lower = view.lower;
    var span = R * 1.62;
    var range = Math.max(80, (lower - upper) + 72);
    var ppm = span / range;

    function yAt(reading) {
      return view.inverted
        ? cy + (reading - mid) * ppm
        : cy - (reading - mid) * ppm;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    drawGrass(ctx, cx - R, cy - R, R * 2, R * 2);
    var staffW = Math.max(96, R * 0.8);
    var extra = R / ppm + 30;
    drawStaff(ctx, {
      x: cx - staffW / 2,
      w: staffW,
      yAt: yAt,
      origin: view.origin,
      length: view.length || 2000,
      face: view.face,
      rLo: mid - extra,
      rHi: mid + extra,
      shoe: false,
    });

    var shade = ctx.createRadialGradient(cx, cy, R * 0.45, cx, cy, R);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = shade;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx - R * 0.18, cy - R * 0.22, R * 0.52, Math.PI * 1.18, Math.PI * 1.52);
    ctx.stroke();

    function hair(y, halfWidth, strong) {
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = strong ? 3 : 2.4;
      ctx.beginPath();
      ctx.moveTo(cx - halfWidth, y);
      ctx.lineTo(cx + halfWidth, y);
      ctx.stroke();
      ctx.strokeStyle = "#111";
      ctx.lineWidth = strong ? 1.35 : 1;
      ctx.beginPath();
      ctx.moveTo(cx - halfWidth, y);
      ctx.lineTo(cx + halfWidth, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - R + 6);
    ctx.lineTo(cx, cy + R - 6);
    ctx.stroke();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - R + 6);
    ctx.lineTo(cx, cy + R - 6);
    ctx.stroke();
    hair(yAt(upper), R * 0.42, false);
    hair(yAt(lower), R * 0.42, false);
    hair(yAt(mid), R * 0.9, true);

    if (view.userMarks) {
      view.userMarks.forEach(function (mark) {
        var y = yAt(mark.mm);
        if (y < cy - R || y > cy + R) return;
        ctx.save();
        ctx.strokeStyle = "#e07a2f";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(cx - R * 0.55, y);
        ctx.lineTo(cx + R * 0.55, y);
        ctx.stroke();
        ctx.restore();
      });
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, R + 16, 0, Math.PI * 2);
    ctx.arc(cx, cy, R, 0, Math.PI * 2, true);
    ctx.fillStyle = "#171a1d";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, R + 7, 0, Math.PI * 2);
    ctx.arc(cx, cy, R, 0, Math.PI * 2, true);
    ctx.fillStyle = "#b5894e";
    ctx.fill();
    ctx.strokeStyle = "#e6d2a4";
    ctx.lineWidth = 1;
    [45, 135, 225, 315].forEach(function (deg) {
      var a = deg * Math.PI / 180;
      var sx = cx + Math.cos(a) * (R + 3.5);
      var sy = cy + Math.sin(a) * (R + 3.5);
      ctx.beginPath();
      ctx.arc(sx, sy, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = "#8d7040";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx - 2.4, sy);
      ctx.lineTo(sx + 2.4, sy);
      ctx.stroke();
    });

    if (!narrow) {
      ctx.font = "12px 'Microsoft YaHei', 'Segoe UI', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      var labels = [
        { y: yAt(upper), name: "上丝", value: view.values && view.values.upper },
        { y: yAt(mid), name: "中丝", value: view.values && view.values.mid },
        { y: yAt(lower), name: "下丝", value: view.values && view.values.lower },
      ];
      labels.forEach(function (item) {
        var lines = item.value ? [item.name, item.value] : [item.name];
        var boxW = 0;
        lines.forEach(function (line) {
          boxW = Math.max(boxW, ctx.measureText(line).width);
        });
        var boxH = lines.length === 2 ? 30 : 18;
        var boxX = cx + R + 10;
        var boxY = item.y - boxH / 2;
        ctx.fillStyle = "rgba(16, 20, 18, 0.88)";
        ctx.fillRect(boxX, boxY, boxW + 12, boxH);
        ctx.fillStyle = "#f6edd8";
        lines.forEach(function (line, index) {
          ctx.fillText(line, boxX + 6, boxY + (lines.length === 2 ? 9 + index * 14 : boxH / 2));
        });
      });
    }
  }

  function drawRod(canvas, rod) {
    var box = fit(canvas);
    if (!box) return;
    var ctx = box.ctx;
    ctx.clearRect(0, 0, box.w, box.h);
    var padT = 6;
    var padB = 28;
    var span = rod.span || 540;
    var r0 = rod.origin;
    var usable = box.h - padT - padB;
    var ppm = usable / span;
    function yAt(reading) {
      return box.h - padB - (reading - r0) * ppm;
    }
    var staffW = Math.max(28, box.w * 0.56);
    var x = (box.w - staffW) / 2;
    drawStaff(ctx, {
      x: x,
      w: staffW,
      yAt: yAt,
      origin: rod.origin,
      length: 2000,
      face: rod.face,
      rLo: rod.origin - 8,
      rHi: rod.origin + span,
      shoe: true,
    });
  }

  return {
    drawTelescope: drawTelescope,
    drawRod: drawRod,
    drawStaff: drawStaff,
  };
});
