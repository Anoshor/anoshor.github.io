/* ============================================================
   anoshor.com — site behaviour
   islands: theme · clocks · brush · reveal · bonsai · commit
   ============================================================ */
(function () {
  "use strict";
  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ---------- theme ---------- */
  (function () {
    var root = document.documentElement, btns = $$(".tbtn");
    function mark() {
      var cur = root.getAttribute("data-theme");
      btns.forEach(function (b) { b.classList.toggle("on", b.dataset.set === cur); });
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        root.setAttribute("data-theme", b.dataset.set);
        try { localStorage.setItem("theme", b.dataset.set); } catch (e) {}
        mark();
      });
    });
    mark();
  })();

  /* ---------- clocks ---------- */
  (function () {
    var el = $("#clocks");
    if (!el) return;
    function fmt(tz) {
      try {
        return new Intl.DateTimeFormat("en-GB", {
          timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false
        }).format(new Date());
      } catch (e) { return "--:--"; }
    }
    function tick() {
      el.innerHTML = '<span>bengaluru ' + fmt("Asia/Kolkata") + "</span>";
    }
    tick(); setInterval(tick, 20000);
  })();

  /* ---------- reveal ---------- */
  (function () {
    var els = $$(".rv");
    if (!els.length) return;
    if (RM || !("IntersectionObserver" in window)) {
      els.forEach(function (e) { e.classList.add("in"); }); return;
    }
    var revealAll = function () { els.forEach(function (e) { e.classList.add("in"); }); };
    setTimeout(revealAll, 2500);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: .06, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (e) { io.observe(e); });
  })();

  /* ---------- brushstroke ---------- */
  (function () {
    var p = $("#brush path");
    if (!p || RM) return;
    var len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
    function draw() {
      var h = document.body.scrollHeight - innerHeight;
      var t = h > 0 ? Math.min(1, Math.max(0, scrollY / h)) : 0;
      p.style.strokeDashoffset = len * (1 - (0.06 + t * 0.94));
    }
    addEventListener("scroll", draw, { passive: true });
    addEventListener("resize", draw);
    draw();
  })();

  /* ---------- typing tagline ---------- */
  (function () {
    var el = $("#type");
    if (!el) return;
    var lines = JSON.parse(el.dataset.lines || "[]");
    if (!lines.length) return;
    if (RM) { el.textContent = lines[0]; return; }
    var li = 0, ci = 0, del = false;
    (function tick() {
      var s = lines[li];
      ci += del ? -1 : 1;
      el.textContent = s.slice(0, ci);
      var wait = del ? 30 : 68;
      if (!del && ci === s.length) { wait = 1900; del = true; }
      else if (del && ci === 0) { del = false; li = (li + 1) % lines.length; wait = 320; }
      setTimeout(tick, wait);
    })();
  })();

  /* ---------- bonsai ---------- */
  (function () {
    var wrap = $("#bonsai");
    if (!wrap) return;
    var detail = $("#detail");
    var nodes = $$(".node", wrap);
    var open = null;

    var DATA = {
      lang: { t: "Languages", items: ["Java", "Python", "JavaScript", "C/C++", "SQL"] },
      ai: { t: "AI / ML", items: ["Agentic AI", "LLMs", "Model Context Protocol", "A2A", "Generative AI", "Hugging Face Transformers", "PyTorch", "TensorFlow", "NLP", "OpenCV"] },
      backend: { t: "Backend & Platform", items: ["Spring Boot", "Microservices", "REST APIs", "Docker", "AWS", "Jenkins", "Git", "Jira"] },
      front: { t: "Frontend", items: ["React.js", "Next.js", "HTML / CSS"] }
    };

    function petals(node) {
      if (RM || wrap.classList.contains("three-on")) return;   // the 3D tree bursts its own
      var r = node.getBoundingClientRect(), w = wrap.getBoundingClientRect();
      for (var i = 0; i < 7; i++) (function (i) {
        var d = document.createElement("i");
        d.className = "petal";
        var sz = 5 + Math.random() * 5;
        d.style.width = sz + "px"; d.style.height = sz + "px";
        d.style.left = (r.left - w.left + r.width / 2) + "px";
        d.style.top = (r.top - w.top + r.height / 2) + "px";
        wrap.appendChild(d);
        var dx = (Math.random() - .5) * 120, dy = 90 + Math.random() * 130;
        d.animate([
          { transform: "translate(0,0) rotate(0deg)", opacity: .8 },
          { transform: "translate(" + dx + "px," + dy + "px) rotate(" + (180 + Math.random() * 360) + "deg)", opacity: 0 }
        ], { duration: 1300 + Math.random() * 900, easing: "cubic-bezier(.3,.6,.4,1)", delay: i * 60 })
          .onfinish = function () { d.remove(); };
      })(i);
    }

    function render(key) {
      var d = DATA[key];
      detail.innerHTML =
        '<div class="detail-h"><span class="dt">' + d.t +
        '</span><span class="dc">' + d.items.length + " items</span></div>" +
        '<div class="chips">' + d.items.map(function (s, i) {
          return '<span class="chip" style="animation-delay:' + (i * 45) + 'ms">' + s + "</span>";
        }).join("") + "</div>";
    }

    function clear() {
      detail.innerHTML = '<p class="detail-empty">// pick a branch</p>';
      nodes.forEach(function (n) { n.classList.remove("on", "off"); });
      $$(".lf", wrap).forEach(function (l) { l.classList.remove("dim"); });
      $$(".crown", wrap).forEach(function (c) { c.classList.remove("dim", "hot"); });
      open = null;
    }

    nodes.forEach(function (n) {
      n.addEventListener("click", function () {
        var key = n.dataset.key;
        if (open === key) { clear(); return; }
        open = key;
        nodes.forEach(function (o) {
          o.classList.toggle("on", o === n);
          o.classList.toggle("off", o !== n);
        });
        $$(".lf", wrap).forEach(function (l) { l.classList.toggle("dim", l.dataset.key !== key); });
        $$(".crown", wrap).forEach(function (c) {
          c.classList.toggle("hot", c.dataset.key === key);
          c.classList.toggle("dim", c.dataset.key !== key);
        });
        render(key);
        petals(n);
      });
    });

    clear();

    // deep link: /?branch=ai
    var want = new URLSearchParams(location.search).get("branch");
    if (want && DATA[want]) {
      var target = nodes.filter(function (n) { return n.dataset.key === want; })[0];
      if (target) target.click();
    }
  })();

  /* ---------- 3D sakura (lazy island) ----------
     Loads three.js only when the skills section is close. Any failure
     (no WebGL, CDN down, old browser) leaves the SVG tree in place. */
  (function () {
    var wrap = $("#bonsai");
    if (!wrap) return;
    function go() {
      import("/assets/sakura.js")
        .then(function (m) { m.mount(wrap); })
        .catch(function () { /* keep the 2D tree */ });
    }
    if (!("IntersectionObserver" in window)) { go(); return; }
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { io.disconnect(); go(); }
    }, { rootMargin: "400px 0px" });
    io.observe(wrap);
  })();

  /* ---------- copy email ---------- */
  (function () {
    var btns = $$("button.copy");
    if (!btns.length) return;

    // works without clipboard permissions / without user-activation
    function legacyCopy(text) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:-9999px;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      return ok;
    }

    btns.forEach(function (b) {
      b.title = "Click to copy " + b.dataset.copy;
      b.addEventListener("click", function () {
        var text = b.dataset.copy;
        var label = b.dataset.label || (b.dataset.label = b.textContent);
        function ok() {
          b.classList.add("done");
          // if the button doesn't already show the address, say what was copied
          b.textContent = label === text ? "copied" : "copied " + text;
          setTimeout(function () { b.classList.remove("done"); b.textContent = label; }, 1900);
        }
        // last resort: select the address so the reader can copy it themselves
        function selectSelf() {
          try {
            var r = document.createRange();
            r.selectNodeContents(b);
            var sel = getSelection();
            sel.removeAllRanges();
            sel.addRange(r);
          } catch (e) {}
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(ok, function () {
            if (legacyCopy(text)) ok(); else selectSelf();
          });
        } else if (legacyCopy(text)) { ok(); } else { selectSelf(); }
      });
    });
  })();

  /* ---------- latest commit ---------- */
  (function () {
    var el = $("#commit");
    if (!el) return;
    fetch("https://api.github.com/repos/Anoshor/anoshor.github.io/commits?per_page=1")
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (j) {
        if (!j || !j[0]) return;
        var d = new Date(j[0].commit.author.date);
        var days = Math.floor((Date.now() - d) / 864e5);
        el.textContent = "last commit " + (days === 0 ? "today" : days === 1 ? "yesterday" : days + "d ago");
      })
      .catch(function () { /* offline or rate-limited — stay silent */ });
  })();
})();
