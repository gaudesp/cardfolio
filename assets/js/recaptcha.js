// recaptcha.js
// Gestion du widget Google reCAPTCHA : rendu, thème et réinitialisation complète

const RECAPTCHA_SITE_KEY = '6LfwTjErAAAAAE5A2dyaERVEbdIDVvCeBgLvtCfx'
const CAPTCHA_CONTAINER_ID = 'captcha-wrapper'
const RECAPTCHA_SCRIPT_SRC = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoadCallback&render=explicit&hl=fr'

export class RecaptchaManager {
  constructor() {
    this.widgetId = null
    this.lastTheme = null
    window.onRecaptchaLoadCallback = () => this._renderWidget()
  }

  // Détermine le thème actuel (light/dark) depuis le <html>
  _getCurrentTheme() {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  }

  // Charge ou recharge le script reCAPTCHA dans le DOM
  _loadScript() {
    const existing = document.querySelector(`script[src*="recaptcha/api.js"]`)
    if (existing) existing.remove()
    const script = document.createElement('script')
    script.src = RECAPTCHA_SCRIPT_SRC
    script.async = true
    document.head.appendChild(script)
  }

  // Callback interne pour rendre le widget
  _renderWidget() {
    const container = document.getElementById(CAPTCHA_CONTAINER_ID)
    if (!container || !window.grecaptcha) return

    container.innerHTML = ''
    const div = document.createElement('div')
    div.setAttribute('class', 'g-recaptcha')
    div.setAttribute('data-sitekey', RECAPTCHA_SITE_KEY)
    div.setAttribute('data-theme', this._getCurrentTheme())
    container.appendChild(div)

    this.widgetId = window.grecaptcha.render(div, {
      sitekey: RECAPTCHA_SITE_KEY,
      theme: this._getCurrentTheme()
    })
    this.lastTheme = this._getCurrentTheme()
  }

  /**
   * Rend le widget reCAPTCHA en tenant compte du thème
   */
  render() {
    const theme = this._getCurrentTheme()

    // Si thème inchangé et déjà rendu, reset
    if (this.widgetId !== null && this.lastTheme === theme) {
      window.grecaptcha.reset(this.widgetId)
      return
    }

    // Sinon, recharge le script pour appliquer le nouveau thème
    this._loadScript()
  }

  /**
   * Réinitialise le challenge reCAPTCHA pour un nouvel envoi
   */
  reset() {
    if (this.widgetId !== null && window.grecaptcha) {
      window.grecaptcha.reset(this.widgetId)
    }
  }
}
