(() => {
  "use strict";

  const config = window.STP_SOUND_BATTLE;
  const get = (selector) => document.querySelector(selector);
  const game = get(".game");
  const hero = get(".hero");
  const play = get("#play");
  const choice = get(".choice");
  const bench = get(".workbench");
  const meter = get(".meter");
  const meterValue = get("#meter-value");
  const meterProgress = get(".meter-track");
  const outro = get(".outro");
  const heading = get("#outro-title");
  const apply = get("#apply");
  const canvas = get(".effects");
  const ctx = canvas.getContext("2d");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const audio = new window.StpAudio(config, get("#sound-toggle"));
  const narrow = matchMedia("(max-width: 700px) and (orientation: portrait)");
  const materials = {
    stp: ["StP Bronner SPL Extreme", "bronner-photo.webp"],
    other: ["Другая виброизоляция", "neutral-sheet.webp"]
  };
  let state;
  let branch;
  let frame = 0;
  let ending = 0;
  let blast = null;

  function https(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url : null;
    } catch {
      return null;
    }
  }

  const application = https(config.applicationUrl);
  const parentUrl = https(config.parentOrigin);
  const parentOrigin = parentUrl && parentUrl.origin === config.parentOrigin ? parentUrl.origin : null;
  apply.textContent = config.applicationLabel || "Подать заявку";

  function notifyParent(action) {
    if (window.parent !== window) {
      window.parent.postMessage({ source: "stp-sound-battle", version: 1, action }, parentOrigin || "*");
      return true;
    }
    return false;
  }

  const clamp = (value) => Math.max(0, Math.min(1, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { const n = clamp(t); return n * n * (3 - 2 * n); };

  function vars(values) {
    for (const [key, value] of Object.entries(values)) {
      game.style.setProperty("--" + key, value);
    }
  }

  function placeHero(pose, x, foot, scale, sway = 0, lean = 0) {
    hero.dataset.pose = pose;
    vars({ "hero-x": x + "%", foot: foot + "%", figure: scale, sway: sway + "px", lean: lean + "deg" });
  }

  function placeCar(x, y, scale, alpha = 1, opened = 0, shake = 0) {
    vars({ "car-x": x + "%", "car-y": y + "%", "car-scale": scale,
      "car-alpha": alpha, opened, "car-rattle": shake + "px" });
  }

  function setState(next, message = "") {
    state = next;
    audio.enter(next, branch);
    game.dataset.state = next;
    get(".start").hidden = next !== "start";
    choice.hidden = next !== "choice";
    bench.hidden = next !== "prep";
    meter.hidden = next !== "measure";
    outro.hidden = !["win", "lose", "skipped"].includes(next);
    get("#status").textContent = message;
  }

  function viewport() {
    if (!ctx) return null;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const density = Math.min(devicePixelRatio || 1, 1.5);
    if (canvas.width !== Math.round(width * density) || canvas.height !== Math.round(height * density)) {
      canvas.width = Math.round(width * density);
      canvas.height = Math.round(height * density);
    }
    ctx.setTransform(density, 0, 0, density, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return [width, height];
  }

  function prepareBlast() {
    const car = get(".car").getBoundingClientRect();
    const stage = game.getBoundingClientRect();
    blast = {
      x: (car.left - stage.left) / stage.width,
      y: (car.top - stage.top) / stage.height,
      width: car.width / stage.width,
      height: car.height / stage.height
    };
    vars({ "ash-x": (blast.x + blast.width / 2) * 100 + "%",
      "ash-y": (blast.y + blast.height * .94) * 100 + "%" });
  }

  function fragments(progress, width, height) {
    if (!blast || reduced.matches) return;
    const image = get(".car .closed");
    const bw = blast.width * width;
    const bh = blast.height * height;
    const time = progress * 1.8;
    ctx.globalAlpha = 1 - smooth((progress - .55) / .4);
    // Every triangle owns a different section of the original car silhouette.
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        for (let side = 0; side < 2; side++) {
          const index = (row * 5 + col) * 2 + side;
          const left = col * bw / 5;
          const top = row * bh / 3;
          const right = (col + 1) * bw / 5;
          const bottom = (row + 1) * bh / 3;
          const points = side === 0
            ? [[left, top], [right, top], [left, bottom]]
            : [[right, top], [right, bottom], [left, bottom]];
          const cx = (points[0][0] + points[1][0] + points[2][0]) / 3;
          const cy = (points[0][1] + points[1][1] + points[2][1]) / 3;
          const angle = Math.atan2(cy - bh * .52, cx - bw * .5);
          const speed = width * (.42 + (index * .137 % .4));
          const dx = Math.cos(angle) * speed * time;
          const dy = Math.sin(angle) * speed * time * .65 - height * .22 * time + height * .3 * time * time;
          ctx.save();
          ctx.translate(blast.x * width + cx + dx, blast.y * height + cy + dy);
          ctx.rotate(time * (index % 2 ? 1 : -1) * (1.2 + index % 4));
          ctx.scale(1 - progress * .28, 1 - progress * .28);
          ctx.beginPath();
          ctx.moveTo(points[0][0] - cx, points[0][1] - cy);
          ctx.lineTo(points[1][0] - cx, points[1][1] - cy);
          ctx.lineTo(points[2][0] - cx, points[2][1] - cy);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(image, -cx, -cy, bw, bh);
          ctx.restore();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function smoke(time) {
    const size = viewport();
    if (!size) return;
    const ash = get(".ash").getBoundingClientRect();
    const stage = game.getBoundingClientRect();
    const x = ash.left - stage.left + ash.width * .5;
    const y = ash.top - stage.top + ash.height * .51;
    const count = reduced.matches ? 4 : narrow.matches ? 12 : 18;
    const rise = Math.min(size[1] * .3, 200);
    for (let i = 0; i < count; i++) {
      const age = reduced.matches ? (i + 1) / 5 : ((time / 3.8 + i / count) % 1);
      const radius = (8 + age * 36) * (narrow.matches ? .72 : 1);
      const drift = Math.sin(age * 5 + i * 1.7) * age * 26;
      const px = x + drift + Math.sin(i * 4) * 10;
      const py = y - age * rise;
      const alpha = (1 - age) * smooth(age * 9) * .28;
      const glow = ctx.createRadialGradient(px, py, 0, px, py, radius);
      glow.addColorStop(0, "rgba(180,173,193," + alpha + ")");
      glow.addColorStop(.5, "rgba(131,125,148," + alpha * .65 + ")");
      glow.addColorStop(1, "rgba(110,105,125,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(px, py, radius, radius * 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function startSmoke() {
    cancelAnimationFrame(ending);
    smoke(0);
    if (reduced.matches) return;
    let startedAt;
    let lastPaint = 0;
    const tick = (now) => {
      if (state !== "lose") return;
      startedAt ??= now;
      if (!document.hidden && now - lastPaint > 33) {
        smoke((now - startedAt) / 1000);
        lastPaint = now;
      }
      ending = requestAnimationFrame(tick);
    };
    ending = requestAnimationFrame(tick);
  }

  function effects(kind, t) {
    const size = viewport();
    if (!size || reduced.matches) return;
    const [w, h] = size;
    const mobile = narrow.matches;

    if (kind === "measure") {
      const strength = smooth(t);
      const pace = branch === "other" ? 1 + t * 2.3 : 1.65;
      const originY = h * (mobile ? .72 : .76);
      for (let i = 0; i < 5; i++) {
        const wave = (t * pace + i / 5) % 1;
        ctx.strokeStyle = branch === "other" && t > .65
          ? "rgba(255,73,107," + ((1 - wave) * strength) + ")"
          : "rgba(61,225,228," + ((1 - wave) * strength) + ")";
        ctx.lineWidth = 2 + strength * 2;
        ctx.beginPath();
        ctx.ellipse(w * .5, originY, (wave + .14) * w * .45, (wave + .1) * h * .14, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      return;
    }

    if (kind === "drive" || kind === "break") {
      const impact = kind === "break";
      if (impact) fragments(t, w, h);
      const count = mobile ? 14 : 27;
      ctx.lineWidth = impact ? 2.5 : 1.5;
      for (let i = 0; i < count; i++) {
        const angle = i * 2.4;
        const radius = (.13 + ((t * 1.8 + i * .137) % 1) * .53) * Math.max(w, h);
        const cx = w * .55, cy = h * .62;
        ctx.strokeStyle = "rgba(255," + (impact ? "182,93," : "228,241,") + ((1 - t) * .66) + ")";
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.lineTo(cx + Math.cos(angle) * (radius + 24), cy + Math.sin(angle) * (radius + 24));
        ctx.stroke();
      }
      return;
    }

    const colors = ["#ffcb61", "#f73d89", "#3de1e4", "#f4f2ef"];
    const bursts = mobile ? 2 : 4;
    for (let i = 0; i < bursts; i++) {
      const age = t - i * .19;
      if (age < 0 || age > 1.25) continue;
      const x = w * (.17 + i * (mobile ? .62 : .22));
      const y = h * (.17 + (i % 2) * .15);
      for (let j = 0; j < 25; j++) {
        const angle = j * Math.PI * 2 / 25;
        const radius = Math.min(w, h) * age * (.13 + (j % 3) * .025);
        ctx.globalAlpha = 1 - age / 1.25;
        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * radius * .8, y + Math.sin(angle) * radius * .8);
        ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius + age * age * 11);
        ctx.stroke();
      }
    }
    for (let i = 0; i < (mobile ? 35 : 85); i++) {
      const x = ((i * .618033 + Math.sin(t * 2 + i) * .036) % 1 + 1) % 1;
      const y = t * (.23 + (i % 9) * .033) - (i % 19) * .043;
      ctx.globalAlpha = clamp((3.8 - t) * 1.6);
      ctx.fillStyle = colors[i % 4];
      ctx.save();
      ctx.translate(x * w, y * h);
      ctx.rotate(t * 3 + i);
      ctx.fillRect(0, 0, 4 + i % 6, 3 + i % 3);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function animate(ms, paint, done) {
    const length = reduced.matches ? Math.min(ms, 300) : ms;
    let start;
    function tick(now) {
      start ??= now;
      const p = clamp((now - start) / length);
      paint(reduced.matches ? 1 : p);
      audio.progress(reduced.matches ? 1 : p);
      vars({ progress: p });
      if (p < 1) frame = requestAnimationFrame(tick);
      else {
        frame = 0;
        done();
      }
    }
    paint(reduced.matches ? 1 : 0);
    frame = requestAnimationFrame(tick);
  }

  function reveal(p) {
    const t = smooth(p);
    const mobile = narrow.matches;
    placeHero(p < .55 ? "turn" : "ready", lerp(50, mobile ? 25 : 18, t),
      lerp(88, mobile ? 63 : 87, t), lerp(1, mobile ? .59 : .86, t));
    placeCar(mobile ? 53 : 48, mobile ? 56 : 72, lerp(.8, 1, t), smooth((p - .15) / .8));
    vars({ zoom: lerp(1.05, 1.04, t), pan: "0px" });
  }

  function begin() {
    if (state !== "start") return;
    audio.unlock();
    setState("walk", "Герой выходит на набережную.");
    animate(Math.max(1800, Number(config.introDurationMs) || 4550), (p) => {
      const travel = clamp(p / .84);
      const depth = smooth(travel);
      const phase = travel * 3 % 1;
      const sway = travel < 1 ? Math.sin(phase * Math.PI * 2) : 0;
      const pose = travel < 1 ? (phase < .5 ? "left" : "right") : (p < .94 ? "neutral" : "ready");
      // Follow the paved side of the railing from the distance to the foreground.
      // Scale and foot position share the same perspective progression.
      placeHero(pose, lerp(68, 50, depth), lerp(74, 88, depth),
        lerp(.42, 1, depth), sway * 2 * depth, sway * .45);
      vars({ zoom: 1.05, pan: "0px" });
    }, () => {
      setState("reveal", "Герой отходит в сторону. Появляется автомобиль.");
      animate(1150, reveal, () => {
        setState("choice");
        get("#choice-title").focus();
      });
    });
  }

  function choose(material) {
    if (state !== "choice" || !Object.hasOwn(materials, material)) return;
    branch = material;
    const [name, file] = materials[material];
    get("#material-name").textContent = name;
    get(".install-sheet").src = "assets/effects/" + file;
    setState("prep", "Мастерская. Открываются передняя и задняя двери, капот и багажник. Подготовка передней двери. " + name + ".");
    animate(5200, (p) => {
      const open = smooth((p - .04) / .15) * (1 - smooth((p - .86) / .13));
      const panel = smooth((p - .34) / .12) * (1 - smooth((p - .72) / .1));
      const mobile = narrow.matches;
      placeCar(mobile ? 50 : 33, mobile ? 60 : 64, 1.01 + .07 * open, 1, open);
      vars({
        zoom: 1.05 + open * .07, bench: panel,
        install: smooth((p - .45) / .12), roll: smooth((p - .58) / .13),
        rolling: smooth((p - .58) / .04) * (1 - smooth((p - .69) / .04))
      });
    }, drive);
  }

  function drive() {
    setState("drive", "Автомобиль выезжает на площадку замера.");
    animate(2100, (p) => {
      const t = smooth(p);
      placeCar(lerp(-42, 50, t), narrow.matches ? 62 : 68, lerp(.76, 1, t));
      vars({ zoom: lerp(1.12, 1.04, t), pan: lerp(12, 0, t) + "px" });
      effects("drive", p);
    }, measure);
  }

  function measure() {
    setState("measure", "Начался игровой замер звукового давления.");
    const maxDecibels = branch === "other" ? 150 : 161;
    meterProgress.setAttribute("aria-valuemax", maxDecibels);
    animate(3750, (p) => {
      const t = smooth(p / .85);
      const decibels = Math.round(maxDecibels * t);
      meterValue.textContent = decibels;
      meterProgress.setAttribute("aria-valuenow", decibels);
      meterProgress.setAttribute("aria-valuetext", decibels + " дБ — игровой показатель");
      const shake = reduced.matches ? 0 : Math.sin(p * 128) * t * (branch === "other" ? 12 : 2);
      placeCar(50, narrow.matches ? 62 : 68, 1 + .04 * t, 1, 0, shake);
      vars({ charge: t, zoom: 1.04 + t * .028, pan: shake * .4 + "px" });
      effects("measure", p);
    }, () => {
      if (branch === "stp") finish("win");
      else {
        prepareBlast();
        setState("break", "Комиксный взрыв. Машина разлетается на части. На её месте остаётся пепел.");
        animate(1900, (p) => {
          const shake = reduced.matches ? 0 : Math.sin(p * 31) * (1 - p) * 14;
          placeCar(50, narrow.matches ? 62 : 68, 1.04, 1, 0, shake);
          vars({ pan: shake * .6 + "px", "ash-alpha": smooth((p - .2) / .3) });
          effects("break", p);
        }, () => finish("lose"));
      }
    });
  }

  function finish(result) {
    viewport();
    const skipped = result === "skipped";
    const won = result === "win";
    setState(result);
    get("#outro-label").textContent = skipped ? "STP TEAM 2027" : "";
    heading.textContent = skipped ? "Подать заявку" : won ? "YOU WIN!" : "GAME OVER";
    get("#outro-copy").textContent = skipped ? "Заявка на участие в STP Team 2027."
      : won ? "Замер завершен. Кубок твой!" : "";
    apply.hidden = branch === "other" && !won;
    get("#apply-note").hidden = true;
    if (!skipped) {
      const mobile = narrow.matches;
      placeCar(mobile ? 56 : 55, mobile ? 56 : 60, .92, won ? 1 : 0);
      placeHero(won ? "victory" : "defeat", mobile ? 25 : 26, mobile ? 68 : 78, mobile ? .71 : .86);
      vars({ zoom: 1.09, pan: "0px" });
    }
    heading.focus();
    if (result === "lose") {
      vars({ "ash-alpha": 1, "ash-x": "57%", "ash-y": narrow.matches ? "61%" : "65%" });
      startSmoke();
    }
    if (won && !reduced.matches) {
      let start;
      const celebrate = (now) => {
        start ??= now;
        const time = (now - start) / 1000;
        effects("win", time);
        if (time < 3.8) ending = requestAnimationFrame(celebrate);
        else { ending = 0; viewport(); }
      };
      ending = requestAnimationFrame(celebrate);
    }
  }

  function reset() {
    cancelAnimationFrame(frame);
    cancelAnimationFrame(ending);
    frame = 0;
    ending = 0;
    branch = null;
    blast = null;
    meterValue.textContent = "0";
    meterProgress.setAttribute("aria-valuenow", "0");
    meterProgress.setAttribute("aria-valuetext", "0 дБ — игровой показатель");
    viewport();
    placeCar(50, 70, 1, 0);
    placeHero("neutral", 50, 57, .16);
    vars({ zoom: 1.05, pan: "0px", charge: 0, progress: 0, bench: 0, rolling: 0, "ash-alpha": 0 });
    setState("start");
  }

  play.addEventListener("click", begin);
  get("#skip").addEventListener("click", () => {
    if (state !== "start") return;
    notifyParent("skip");
    finish("skipped");
  });
  for (const button of document.querySelectorAll("[data-material]")) {
    button.addEventListener("click", () => choose(button.dataset.material));
  }
  get("#replay").addEventListener("click", () => {
    if (!["win", "lose", "skipped"].includes(state)) return;
    reset();
    begin();
  });
  apply.addEventListener("click", () => {
    const handedOff = notifyParent("apply");
    if (application) window.open(application.href, "_blank", "noopener,noreferrer");
    else {
      const note = get("#apply-note");
      note.textContent = handedOff ? "Запрос передан странице STP Team." : "Ссылка на анкету пока не подключена.";
      note.hidden = false;
    }
  });
  narrow.addEventListener("change", () => {
    if (state === "choice") reveal(1);
    if (state === "win" || state === "lose") {
      cancelAnimationFrame(ending);
      viewport();
      placeCar(narrow.matches ? 56 : 55, narrow.matches ? 56 : 60, .92, state === "win" ? 1 : 0);
      placeHero(state === "win" ? "victory" : "defeat", narrow.matches ? 25 : 26,
        narrow.matches ? 68 : 78, narrow.matches ? .71 : .86);
      if (state === "lose") {
        vars({ "ash-y": narrow.matches ? "61%" : "65%" });
        startSmoke();
      }
    }
  });
  reduced.addEventListener("change", () => { if (state === "lose") startSmoke(); });

  reset();
})();




