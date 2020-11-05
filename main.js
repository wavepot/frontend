// ui
import Editors from './components/editors.js'
import Shader from './components/shader.js'
import Tabs from './components/tabs.js'
import Mixer from './components/mixer.js'
import SelectMenu from './components/select-menu.js'
import ListBrowse from './components/list-browse.js'
import Toolbar from './components/toolbar.js'
import ask from './editor/lib/prompt.js'

// engine
import toFinite from './dsp/lib/to-finite.js'
import Audio from './components/audio.js'
import mixWorker from './dsp/src/mix-worker-service.js'
import LoopPlayer from './dsp/src/loop-player.js'
import DynamicCache from './dsp/dynamic-cache.js'

// misc
import * as API from './components/api.js'

let players
let shaders
let shader

const cache = new DynamicCache('projects', {
  'Content-Type': 'application/javascript'
})
cache.onchange = url => {
  console.log('cache put:', url)
  if (!url.includes('gl/')) {
    mixWorker.update(url, false, true)
    console.log('mix worker update:', url)
  } else {
    if (shader) {
      url = new URL('shader.js', url).href
      shader.load(url)
    }
  }
}

mixWorker.onerror = (error, url) => {
  console.error(error, url)
}

const main = async (el) => {
  await DynamicCache.install()

  const tabs = new Tabs(el, [
    'project',
    'actions',
    'browse',
  ])
  // tabs.setActive(tabs.actions)

  const actionsMenu = new SelectMenu(tabs.actions, [
    {
      id: 'browse',
      text: 'Browse Projects',
      fn: async () => {
        tabs.setActive(tabs.browse)
        const recent = await API.recent()
        tabs.browse.innerHTML = ''
        const listBrowse = new ListBrowse(tabs.browse, recent.projects)
        listBrowse.ondrop = title => {
          editors.importProject(title)
        }
      }
    },
    {
      id: 'start',
      text: 'Start New Project',
      fn: async () => {
        const result = await ask('New Project', 'Type name for new project', 'untitled')
        if (result) {
          editors.destroy()
          editors = new Editors(el, result.value)
          bindEditorsListeners(editors)
          updateMixer()
        }
      }
    },
    {
      id: 'addtrack',
      text: 'Add Track',
      fn: async () => {
        const result = await ask('Set track path/name', `path/name`, '')
        if (result) {
          const [dir, title] = result.value.split('/')

          editors.addTrack({
            title: dir + '/' + title,
            value: 'export default c => 0',
          })

          editors.ensureModuleEditor(dir)

          updateMixer()

          players = null
        }
      }
    },
    {
      id: 'addmodule',
      text: 'Add Module',
      fn: async () => {
        const result = await ask('Set module path/name', `path/name`, '')
        if (result) {
          const [dir, title] = result.value.split('/')

          const mod = {
            title: dir + '/' + title,
            value: 'export default c => 0',
          }

          editors.ensureModuleEditor(dir, mod)
        }
      }
    },
    // {
    //   id: 'import',
    //   text: 'Import from File',
    //   fn: () => {}
    // },
    // {
    //   id: 'export',
    //   text: 'Export to File',
    //   fn: () => {}
    // },
    // {
    //   id: 'export',
    //   text: 'Export to Audio',
    //   fn: () => {}
    // },
  ])

  const toolbar = new Toolbar(el)
  const { buttonPlayPause, buttonSave, buttonLogo, inputBpm } = toolbar

  let editors
  if (location.pathname.split('/').length === 3) {
    editors = await Editors.fromProject(el, location.pathname.slice(1))
  } else {
    editors = await Editors.fromProject(el, './demos/drums')
  }

  const bindEditorsListeners = editors => {
    editors.onfocus = editor => {
      if (shader) {
        shader.sources.editor?.setStream(editor.stream)
      }
    }

    editors.onchange = file => {
      cache.put(file.title, file.value)
      buttonSave.enable()
    }

    editors.onrename = file => {
      editors.onchange(file)
      updateMixer()
      console.log('renamed', file)
    }

    editors.onadd = file => {
      editors.onchange(file)
      updateMixer()
    }

    editors.onremove = file => {
      editors.onchange(file)
      updateMixer()
    }

    editors.ontoaddtrack = () => actionsMenu.addtrack.fn()
    editors.ontoaddmodule = () => actionsMenu.addmodule.fn()
  }

  bindEditorsListeners(editors)

  inputBpm.setValue(editors.project.bpm)

  let mixer

  const updateMixer = () => {
    if (mixer) {
      mixer.destroy()
    }
    mixer = new Mixer(tabs.project, editors.tracks)
    mixer.onchange = track => {
      if (track.player) {
        track.player.setVolume(track.mute ? 0 : track.vol)
      }
    }
  }

  updateMixer()

  const play = buttonPlayPause.onplay = async () => {
    const audio = Audio()

    if (editors.tracks.find(track => track.title.endsWith('shader.js'))) {
      shader = shader ?? new Shader(el, {
        source: audio.gain,
        stream: editors.tracksEditor.stream,
      })
    }

    const bpm = toFinite(+inputBpm.value)
    if (!players || players[0].bpm !== bpm) {
      await Promise.all([
        ...editors.tracks,
        ...editors.modules
      ].map(async file => {
        file.filename = await cache.put(file.title, file.value)
      }))

      //mixWorker.scheduleUpdate.clear()

      players = editors.tracks
        .filter(track => !track.title.endsWith('shader.js'))
        .map(track => {
          const player = new LoopPlayer(
            track.title,
            c => c.src(track.filename),
            { bpm, numberOfChannels: 2 }
          )
          player.track = track
          track.player = player
          return player
        })

      players.forEach(player => {
        player.connect(audio.gain)
        player.setVolume(player.track.mute ? 0 : player.track.vol)
        player.onrender = buffer => {}
        player.onerror = error => console.error(error)
      })
    }

    if (!shaders) {
      shaders = editors.tracks
        .filter(track => track.title.includes('gl/'))
        .map(track => {
          shader.load(track.filename)
          // TODO: shader volume->opacity
        })
    }

    players.forEach(player => player.start())

    if (shader) shader.start()
  }

  const stop = buttonPlayPause.onpause = () => {
    players.forEach(player => player.stop(0))
    if (shader) shader.stop()
    mixWorker.clear()
  }

  const save = buttonSave.onsave = async () => {
    const title = editors.title

    const bpm = toFinite(+inputBpm.value)

    editors.tracks = editors.tracks.filter(track => !!track.value.trim())
    editors.modules = editors.modules.filter(mod => !!mod.value.trim())

    const tracks = editors.tracks.map(track => ({
      title: track.title,
      value: track.value,
      vol: track.vol,
      mute: track.mute,
      X: track.X,
      Y: track.Y,
    }))

    const modules = editors.modules.map(module => ({
      title: module.title,
      value: module.value,
    }))

    const projectJson = {
      title,
      bpm,
      tracks,
      modules,
    }

    const respJson = await API.save(projectJson)

    history.pushState({}, '',
      '/' + title + '/' + respJson.generatedId)

    buttonSave.disable()
  }

  buttonLogo.onclick = () => {
    tabs.setActive(tabs.active === tabs.project
      ? tabs.actions
      : tabs.project
    )
  }

  tabs.setActive(tabs.project)

  window.onresize = () => editors.resize()
}

main(container)
