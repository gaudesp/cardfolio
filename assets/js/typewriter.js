// typewriter.js
// Animation de rotateur de texte avec effet machine à écrire
export const TYPEWRITER_PREFIX         = 'Développeur ';
export const TYPEWRITER_DEFAULTS       = {
  speed:         75,
  pause:         2000,
  initialDelay: 1000,
};

/**
 * Gère l'affichage cyclique de textes avec un effet machine à écrire
 */
export class TypewriterRotator {
  constructor(selector, texts, options = {}) {
    this.el           = document.querySelector(selector);
    this.prefix       = TYPEWRITER_PREFIX;
    this.suffixes     = texts.map(txt =>
                         txt.startsWith(this.prefix)
                           ? txt.slice(this.prefix.length)
                           : txt
                       );
    const cfg         = { ...TYPEWRITER_DEFAULTS, ...options };
    this.speed        = cfg.speed;
    this.pause        = cfg.pause;
    this.initialDelay = cfg.initialDelay;

    this.currentIndex = 0;  
    this.suffixPos    = 0;
    this.fullPos      = 0;
    this.deleting     = false;
    this.firstRun     = true;

    if (this.el) {
      setTimeout(() => this._tick(), this.initialDelay);
    }
  }

  /**
   * Boucle principale : délègue selon l'état (firstRun/cycle)
   */
  _tick() {
    if (this.firstRun) {
      this._firstRunTick();
    } else {
      this._cycleTick();
    }
  }

  /**
   * Premier affichage complet du texte (préfixe + suffixe)
   */
  _firstRunTick() {
    const suffix = this.suffixes[this.currentIndex];
    const full   = this.prefix + suffix;

    const text = full.slice(0, this.fullPos);
    this.el.textContent = text;

    if (this.fullPos < full.length) {
      this.fullPos++;
      setTimeout(() => this._tick(), this.speed);
    } else {
      this.firstRun  = false;
      this.deleting  = true;
      this.suffixPos = suffix.length;
      setTimeout(() => this._tick(), this.pause);
    }
  }

  /**
   * Cycles suivants : écriture ou suppression cyclique du suffixe
   */
  _cycleTick() {
    const suffix = this.suffixes[this.currentIndex];
    let text;

    if (!this.deleting) {
      this.suffixPos++;
      text = this.prefix + suffix.slice(0, this.suffixPos);
      this.el.textContent = text;

      if (this.suffixPos < suffix.length) {
        setTimeout(() => this._tick(), this.speed);
      } else {
        this.deleting = true;
        setTimeout(() => this._tick(), this.pause);
      }

    } else {
      text = this.prefix + suffix.slice(0, this.suffixPos);
      this.el.textContent = text;

      if (this.suffixPos > 0) {
        this.suffixPos--;
        setTimeout(() => this._tick(), this.speed / 2);
      } else {
        this.deleting     = false;
        this.currentIndex = (this.currentIndex + 1) % this.suffixes.length;
        setTimeout(() => this._tick(), this.speed);
      }
    }
  }
}
