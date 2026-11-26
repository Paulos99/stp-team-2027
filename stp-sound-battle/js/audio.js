(() => {
  "use strict";

  const tracks = {
    walk: "steps.mp3",
    reveal: "arrival.mp3",
    prep: "install.mp3",
    drive: "drive.mp3",
    measure: "measure.mp3",
    measureOther: "measure-other.mp3",
    break: "explosion.mp3",
    win: "win.mp3",
    lose: "lose.mp3"
  };

  class StpAudio {
    constructor(config, button) {
      this.button = button;
      this.enabled = config.soundEnabled !== false;
      this.volume = Number.isFinite(config.soundVolume) ? Math.max(0, Math.min(1, config.soundVolume)) : .45;
      this.media = new Audio();
      this.media.preload = "auto";
      this.media.volume = this.volume;
      this.media.muted = !this.enabled;
      this.scene = "start";
      this.position = 0;
      this.unlocked = false;
      this.blocked = false;
      this.failed = false;
      this.generation = 0;
      this.pending = null;
      this.updateButton();

      button.addEventListener("click", () => {
        this.enabled = this.blocked || !this.enabled;
        this.blocked = false;
        this.media.muted = !this.enabled;
        this.unlock();
        this.updateButton();
      });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) this.media.pause();
        else this.play();
      });
      this.media.addEventListener("error", () => {
        this.failed = true;
        this.updateButton();
      });
    }

    updateButton() {
      const audible = this.enabled && !this.blocked && !this.failed;
      this.button.textContent = this.failed ? "Ошибка звука" : audible ? "Звук вкл." : "Звук выкл.";
      this.button.setAttribute("aria-pressed", String(audible));
      this.button.setAttribute("aria-label", this.failed ? "Не удалось загрузить звук" : audible ? "Выключить звук" : "Включить звук");
    }

    unlock() {
      this.unlocked = true;
      this.play();
    }

    active() {
      if (!tracks[this.scene]) return false;
      if (this.scene === "walk") return this.position < .84;
      if (this.scene === "prep") return this.position >= .45 && this.position < .75;
      return true;
    }

    play() {
      if (!this.unlocked || !this.active() || document.hidden || this.pending || !this.media.paused) return;
      if (this.media.ended && !this.media.loop) return;
      const generation = this.generation;
      const pending = {};
      this.pending = pending;
      Promise.resolve(this.media.play()).catch((error) => {
        if (generation !== this.generation || error.name === "AbortError") return;
        this.blocked = error.name === "NotAllowedError";
        this.failed = !this.blocked;
        this.updateButton();
      }).finally(() => {
        if (this.pending === pending) this.pending = null;
      });
    }

    enter(scene, branch) {
      this.generation++;
      this.media.pause();
      this.pending = null;
      this.scene = scene;
      this.position = 0;
      this.failed = false;
      this.blocked = false;
      const file = scene === "measure" && branch === "other" ? tracks.measureOther : tracks[scene];
      if (file) {
        // A persistent media element supports local file playback without fetch.
        this.media.src = "assets/audio/" + file;
        this.media.loop = ["walk", "prep", "measure"].includes(scene);
        this.media.load();
      } else {
        this.media.removeAttribute("src");
        this.media.load();
      }
      this.updateButton();
      this.play();
    }

    progress(position) {
      this.position = position;
      if (this.active()) this.play();
      else this.media.pause();
    }
  }

  window.StpAudio = StpAudio;
})();

