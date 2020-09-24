import { Icon } from './dom.js'

export default class ButtonPlayPause {
  constructor (el, size = 30) {
    this.el = el
    this.play = Icon(size, 'play', 'M6 4 L6 28 26 16 Z')
    this.pause = Icon(size, 'play pause', 'M18 6 L18 27 M6 6 L6 27')
    this.play.onmousedown = () => {
      this.play.parentNode.replaceChild(this.pause, this.play)
      this.onplay?.()
    }
    this.pause.onmousedown = () => {
      this.pause.parentNode.replaceChild(this.play, this.pause)
      this.onpause?.()
    }
    this.el.appendChild(this.play)
  }
}
