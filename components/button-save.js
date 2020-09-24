import { Icon } from './dom.js'

export default class ButtonSave {
  constructor (el) {
    this.el = el
    // this.save = Icon(32, 'save', 'M5 27  L30 27  30 10  25 4  10 4  5 4  Z  M12 4  L12 11  23 11  23 4  M12 27  L12 17  23 17  23 27')
    // this.save = Icon(32, 'save', 'M5 27  L30 27  30 10  25 4  10 4  5 4  Z  M11 4  L11 10  21 10  21 4', '<circle class="path" cx="17.5" cy="18.5" r="4" />')
    this.save = Icon(32, 'save', 'M5 27  L30 27  30 10  25 4  10 4  5 4  Z  M10.5 9.5  L21 9.5', '<circle class="path" cx="17.4" cy="18.5" r="3.4" />')
    this.save.disabled = true
    this.save.onclick = () => this.onsave?.()
    this.el.appendChild(this.save)
  }

  enable () {
    this.save.disabled = false
  }

  disable () {
    this.save.disabled = true
  }
}
