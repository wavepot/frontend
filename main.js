// ui
import Editors from './components/editors.js'
import Tabs from './components/tabs.js'
import Mixer from './components/mixer.js'
import SelectMenu from './components/select-menu.js'
import ListBrowse from './components/list-browse.js'
import ButtonPlayPayse from './components/button-play-pause.js'
import ButtonSave from './components/button-save.js'
import ButtonLogo from './components/button-logo.js'
import InputBpm from './components/input-bpm.js'

// engine
import toFinite from './dsp/lib/to-finite.js'
import Audio from './components/audio.js'
import mixWorker from './dsp/src/mix-worker-service.js'
import LoopPlayer from './dsp/src/loop-player.js'
import DynamicCache from './dsp/dynamic-cache.js'

// misc
import * as API from './components/api.js'

const cache = new DynamicCache('projects', {
  'Content-Type': 'application/javascript'
})
cache.onchange = url => {
  console.log('cache put:', url)
  mixWorker.update(url)
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
  tabs.setActive(tabs.project)

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
      fn: () => {}
    },
    {
      id: 'import',
      text: 'Import from File',
      fn: () => {}
    },
    {
      id: 'export',
      text: 'Export to File',
      fn: () => {}
    },
    {
      id: 'export',
      text: 'Export to Audio',
      fn: () => {}
    },
  ])

  const buttonPlayPause = new ButtonPlayPayse(el)
  const buttonSave = new ButtonSave(el)
  const buttonLogo = new ButtonLogo(el)
  const inputBpm = new InputBpm(el)

  let editors
  if (location.pathname.split('/').length === 3) {
    editors = await Editors.fromProject(el, location.pathname.slice(1))
  } else {
    editors = await Editors.fromProject(el, './demos/drums')
  }

  editors.onchange = file => {
    cache.put(file.title, file.value)
    buttonSave.enable()
  }

  inputBpm.setValue(editors.project.bpm)

  const mixer = new Mixer(tabs.project, editors.tracks)
  mixer.onchange = track => {
    if (track.player) {
      track.player.setVolume(track.mute ? 0 : track.vol)
    }
  }

  let players

  const play = buttonPlayPause.onplay = async () => {
    const audio = Audio()
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
    players.forEach(player => player.start())
  }

  const stop = buttonPlayPause.onpause = () => {
    players.forEach(player => player.stop(0))
    mixWorker.clear()
  }

  const save = buttonSave.onsave = async () => {
    const title = editors.title

    const bpm = toFinite(+inputBpm.value)

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

  // setTimeout(async () => {
  //   editors.destroy()
  //   mixer.destroy()
  //   const eds = await Editors.fromProject(el, './demos/piano')
  //   new Mixer(el, eds.tracks)
  // }, 5000)
  tabs.setActive(tabs.browse)
  actionsMenu.browse.fn()
}

main(container)

/*

TODO

- editor titlebar buttons
  - add editor
    - prompt for name?
  - remove editor
  - move editor up/down
  - move editor right/left
  - play editor (shot play)
  - play editor (loop play)?

- shader api

dependency tree tracking thru cache

canvas server draw waveforms for browsing

examine ideal same origin headers (chrome suggestion?)

*/