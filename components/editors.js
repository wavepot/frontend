import Editor, { registerEvents } from '../editor/editor.js'
import * as API from './api.js'

registerEvents(document.body)

const getSettings = () => {
  const sideWidth = 300

  const common = {
    font: '/fonts/mplus-1m-regular.woff2',
    fontSize: '9.4pt',
    padding: 10,
    titlebarHeight: 42,
  }

  const modules = {
    ...common,
    width: (window.innerWidth - sideWidth) / 2,
    height: window.innerHeight,
  }

  const tracks = {
    ...common,
    width: modules.width, //(window.innerWidth - modules.width),
    height: window.innerHeight,
  }

  return { tracks, modules }
}

export default class Editors {
  static async fromProject (el, title) {
    const json = await API.load(title)
    return new Editors(el, json)
  }

  constructor (el, project) {
    if (!project) project = {
      title: 'untitled',
      bpm: '125',
      tracks: [{
        title: 'untitled/track.js',
        value: ''
      }],
      modules: [{
        title: 'untitled/module.js',
        value: ''
      }]
    }
    this.project = project
    this.el = el
    this.title = project.title
    this.tracks = [project.tracks[0]]
    this.modules = [project.modules[0]]
    this.modulesEditors = {}
    this.currentModuleEditor = null
    this.createEditors()
  }

  destroy () {
    this.tracksEditor.destroy()
    for (const moduleEditor of Object.values(this.modulesEditors)) {
      moduleEditor.destroy()
    }
  }

  createEditors () {
    const settings = getSettings()
    this.tracksEditor = new Editor({
      ...this.project.tracks[0],
      ...settings.tracks
    })
    this.tracksEditor.onchange = data => {
      const track = this.tracks.find(track => track.title === data.title)
      track.value = data.value
      this.onchange?.(track)
      console.log('track changed:', data)
    }

    this.ensureModuleEditor(this.title, this.project.modules[0])

    this.tracksEditor.onfocus = editor => {
      const [dir, title] = editor.title.split('/')
      const prevModuleEditor = this.currentModuleEditor
      const moduleEditor = this.ensureModuleEditor(dir)
      if (prevModuleEditor !== moduleEditor) {
        prevModuleEditor.canvas.style.display = 'none'
        prevModuleEditor.isVisible = false
        moduleEditor.canvas.style.display = 'block'
        moduleEditor.isVisible = true
        this.currentModuleEditor = moduleEditor
        moduleEditor.resize()
      }
    }
    this.tracksEditor.canvas.style.left = settings.modules.width + 'px'
    this.tracksEditor.parent = this.el

    this.el.appendChild(this.tracksEditor.canvas)
    this.tracksEditor.resize()

    this.project.tracks.slice(1).forEach(track => this.addTrack(track))
    this.project.modules.slice(1).forEach(module => this.addModule(module))
  }

  ensureModuleEditor (dir, module) {
    let moduleEditor = this.modulesEditors[dir]
    if (moduleEditor) {
      if (module) moduleEditor.addSubEditor(module)
      return moduleEditor
    }

    if (!module) module = { title: dir + '/module.js' }

    const settings = getSettings()
    moduleEditor = this.modulesEditors[dir] = new Editor({
      ...module,
      ...settings.modules
    })
    moduleEditor.onchange = data => {
      const module = this.modules.find(module => module.title === data.title)
      module.value = data.value
      this.onchange?.(module)
      console.log('module changed:', data)
    }

    if (this.currentModuleEditor) {
      moduleEditor.canvas.style.display = 'none'
      moduleEditor.isVisible = false
    } else {
      this.currentModuleEditor = moduleEditor
      moduleEditor.isVisible = true
    }
    moduleEditor.canvas.style.left = 0
    moduleEditor.parent = this.el
    this.el.appendChild(moduleEditor.canvas)
    moduleEditor.resize()

    return moduleEditor
  }

  addTrack (track) {
    this.tracksEditor.addSubEditor(track)
    this.tracks.push(track)
  }

  addModule (module) {
    const [dir, title] = module.title.split('/')
    this.ensureModuleEditor(dir, module)
    this.modules.push(module)
  }

  async importProject (title) {
    const json = await API.load(title)
    json.tracks.forEach(track => this.addTrack(track))
    json.modules.forEach(module => this.addModule(module))
  }
}
