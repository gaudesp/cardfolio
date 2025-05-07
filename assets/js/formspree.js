const FORMSPREE_SELECTORS = {
  form:       '#contactForm', // Contact form element
  submitBtn:  '#submitBtn',   // Submit button element
  messageBox: '#formMessage', // Container for flash messages
};

// Build Formspree endpoint from form_id
const FORMSPREE_ENDPOINT = `https://formspree.io/f/${document
  .querySelector(FORMSPREE_SELECTORS.form)
  .querySelector('[name="form_id"]')
  .value}`;

/**
 * Handles form submission and messaging via Formspree
 */
class FormspreeHandler {
  constructor() {
    this.form = document.querySelector(FORMSPREE_SELECTORS.form);
    this.submitBtn = document.querySelector(FORMSPREE_SELECTORS.submitBtn);
    this.msgBox = document.querySelector(FORMSPREE_SELECTORS.messageBox);
    this.endpoint = FORMSPREE_ENDPOINT;
    this.flashTimer = null;

    this._bindEvents();
  }

  /**
   * Attach form submit event
   */
  _bindEvents() {
    this.form.addEventListener('submit', this._onSubmit.bind(this));
  }

  /**
   * Handle form submission
   */
  async _onSubmit(event) {
    event.preventDefault();
    this.submitBtn.disabled = true;
    this._flash('Envoi en cours…', 'info');

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        body: new FormData(this.form),
        headers: { 'Accept': 'application/json' }
      });
      const data = await response.json();

      if (response.ok) {
        this._flash('Votre message a bien été envoyé', 'success');
        this.form.reset();
        grecaptcha.reset();
      } else {
        const message = this._parseError(data);
        this._flash(message, 'error');
        grecaptcha.reset();
      }
    } catch (err) {
      console.error(err);
      this._flash('Indisponible, contactez-moi par email', 'error');
      grecaptcha.reset();
    } finally {
      this.submitBtn.disabled = false;
    }
  }

  /**
   * Display a flash message
   */
  _flash(message, type) {
    if (this.flashTimer) clearTimeout(this.flashTimer);

    this.msgBox.innerHTML = `
      <span class="text">${message}</span>
      <i class="fas fa-times close-btn" aria-label="Fermer"></i>
    `;

    this.msgBox.classList.remove('success', 'error', 'info', 'show');
    if (['success', 'error', 'info'].includes(type)) {
      this.msgBox.classList.add(type);
    }
    this.msgBox.classList.add('show');

    this.msgBox.querySelector('.close-btn')
      .addEventListener('click', () => this._hideFlash(), { once: true });

    if (type === 'error') {
      this.flashTimer = setTimeout(() => this._hideFlash(), 5000);
    }
  }

  /**
   * Hide the flash message
   */
  _hideFlash() {
    this.msgBox.classList.remove('show');
  }

  /**
   * Parse Formspree error response
   */
  _parseError(json) {
    const { errors = [], error = '' } = json;
    const msg = error.toLowerCase();

    if (msg.includes('recaptcha')) return 'Merci de valider le captcha';
    if (msg.includes('form not found')) return 'Formulaire introuvable';

    for (const e of errors) {
      const code = (e.code || '').toUpperCase();
      const field = e.field || '';

      switch (code) {
        case 'RECAPTCHA_ERROR': return 'Captcha invalide. Merci de réessayer';
        case 'REQUIRED_FIELD_MISSING':
        case 'REQUIRED_FIELD_EMPTY':
          return `Le champ "${field}" est requis`;
        case 'TYPE_EMAIL': return 'Adresse email invalide';
        case 'TYPE_NUMERIC': return `Le champ "${field}" doit contenir un nombre`;
        case 'TYPE_TEXT': return `Le champ "${field}" doit contenir du texte`;
        case 'INACTIVE': return 'Ce formulaire est désactivé';
        case 'BLOCKED': return 'Ce formulaire est bloqué';
        case 'FORM_NOT_FOUND': return 'Formulaire introuvable';
        case 'NO_FILE_UPLOADS': return 'Les fichiers ne sont pas autorisés';
        case 'TOO_MANY_FILES': return 'Trop de fichiers envoyés';
        case 'FILES_TOO_BIG': return 'Fichier trop volumineux';
        default:
          if (field) return `Erreur "${field}": ${e.message}`;
      }
    }

    return 'Indisponible, contactez-moi par email';
  }
}

/**
 * Initialization
 */
window.addEventListener('DOMContentLoaded', () => {
  new FormspreeHandler();
});
