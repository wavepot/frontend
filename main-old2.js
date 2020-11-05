import DynamicCache from './dsp/dynamic-cache.js'
import debounce from './editor/lib/debounce.js'

// TODO: move to dep

  const Div = (className = '', html = '', props = {}) => {
    const div = document.createElement(props.tag ?? 'div')
    div.className = className
    div.innerHTML = html
    Object.assign(div, props)
    return div
  }

  const Icon = (name, path, extra = '') =>
    Div('icon ' + name, `<svg xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width="32"
      height="32"><path class="path" d="${path}" />${extra}</svg>`)



// https://github.com/oosmoxiecode/xgui.js/blob/master/src/xgui.js
const relativeMouseCoords = function (canvas, event) {
  var totalOffsetX = 0;
  var totalOffsetY = 0;
  var canvasX = 0;
  var canvasY = 0;
  var currentElement = canvas;

  do {
    totalOffsetX += currentElement.offsetLeft;
    totalOffsetY += currentElement.offsetTop;
  }
  while (currentElement = currentElement.offsetParent)

  canvasX = event.pageX - totalOffsetX;
  canvasY = event.pageY - totalOffsetY;

  // Fix for variable canvas width
  canvasX = Math.round( canvasX * (canvas.width / canvas.offsetWidth) );
  canvasY = Math.round( canvasY * (canvas.height / canvas.offsetHeight) );

  return {x:canvasX, y:canvasY}
}

// hacky way to switch api urls from dev to prod
const API_URL = location.port.length === 4
  ? 'http://localhost:3000'
  : location.origin

// store initial pixel ratio
// this avoids browser zoom issues changing
// pixel ratio and messing with our calculations
const pixelRatio = window.devicePixelRatio

const main = async () => {
  // init dynamic cache to serve our dynamic js scripts
  await DynamicCache.install()
  const cache = new DynamicCache(
    'projects',
    { 'Content-Type': 'application/javascript' }
  )

  container.appendChild(panel)
  container.appendChild(sideEditor.canvas)
  container.appendChild(mainEditor.canvas)

  document.body.appendChild(Div('plus main', '+', { title: 'add channel' }))
  document.body.appendChild(Div('plus sub', '+', { title: 'add module' }))

  setTimeout(() => {
    for (let i = 0; i < 10; i++) {
      mainEditor.addSubEditor({
        id: 'main' + i,
        title: 'main' + i,
        value: mainValue,
        fontSize: fontSizeMain,
        titlebarHeight,
        padding,
      })
    }
    for (let i = 0; i < 10; i++) {
      sideEditor.addSubEditor({
        id: 'aux' + i,
        title: 'drums/808/' + i,
        extraTitle: i + ' - ',
        value: sideValue,
        fontSize: fontSizeSide,
        titlebarHeight,
        padding,
      })
    }
  }, 1000)

  registerEvents(document.body)

  mainEditor.onresize()
  sideEditor.onresize()



  // project name
  const projectName = Div('project-name', 'my project')
  const projectNameInput = Div('project-name', '', { tag: 'input', type: 'text' })
  projectName.ondblclick = () => {
    projectName.parentNode.replaceChild(projectNameInput, projectName)
    projectNameInput.value = projectName.textContent
    projectNameInput.focus()
    projectNameInput.addEventListener('blur', () => {
      projectNameInput.parentNode.replaceChild(projectName, projectNameInput)
      projectName.textContent = projectNameInput.value
    }, { once: true })
  }
  projectNameInput.addEventListener('keydown', e => {
    if (e.which === 13) {
      e.preventDefault()
      projectNameInput.blur()
      return false
    }
  })

  control.el.appendChild(projectName)


  const onresize = window.onresize = () => {
    const mainEditorWidth = window.innerWidth / 2.4
    const sideWidth = (window.innerWidth - mainEditorWidth) / 2
    const height = window.innerHeight
    panel.style.width = sideWidth + 'px'
    sideEditor.canvas.style.left = sideWidth + 'px'
    mainEditor.onresize({ width: mainEditorWidth, height })
    sideEditor.onresize({ width: sideWidth, height })
  }

  const logo = Icon('logo', 'M4.9 6 A 13.8 13.8 0 1 0 27.4 6', '<path class="path wave" d="M9.7 13.5 Q12 10.5, 15.5 13.9 T 22 13.9" />')
  const love = Icon('love', 'M4 16 C1 12 2 6 7 4 12 2 15 6 16 8 17 6 21 2 26 4 31 6 31 12 28 16 25 20 16 28 16 28 16 28 7 20 4 16 Z')
  const save = Icon('save', 'M5 27  L30 27  30 10  25 4  10 4  5 4  Z  M12 4  L12 11  23 11  23 4  M12 27  L12 17  23 17  23 27')
  const play = Icon('play', 'M7 4 L7 28 27 16 Z')
  const pause = Icon('pause', 'M20 6 L20 26 M10 6 L10 26')

  panel.appendChild(logo)

  logo.querySelector('svg').setAttribute('width', 36)
  logo.querySelector('svg').setAttribute('height', 36)

  const projectData = Div('project')

  projectData.appendChild(Div('avatar', '', { tag: 'img', src: './avatar.png' }))
  projectData.appendChild(Div('name', 'My Amazing Project'))
  projectData.appendChild(Div('author', 'Undiscovered Talent'))

  panel.appendChild(projectData)

  play.querySelector('svg').setAttribute('width', 38)
  play.querySelector('svg').setAttribute('height', 38)
  panel.appendChild(play)

  projectName.parentNode.insertBefore(save, projectName)
  save.querySelector('svg').setAttribute('width', 22)

  play.onmousedown = () => {
    play.parentNode.replaceChild(pause, play)
  }
  pause.onmousedown = () => {
    pause.parentNode.replaceChild(play, pause)
  }

  const toolbar = Div('toolbar')
  // toolbar.appendChild(logo)
  // toolbar.appendChild(save)
  // toolbar.appendChild(love)
  // toolbar.appendChild(play)
  // toolbar.appendChild(play)
  // setInterval(() => {
  //   play.parentNode.replaceChild(pause, play)
  //   setTimeout(() => {
  //     pause.parentNode.replaceChild(play, pause)
  //   }, 250)
  // }, 500)
  control.el.appendChild(toolbar)

  const createTabs = items => {
    let activeItem
    const setActiveItem = item => {
      if (activeItem) {
        activeItem.menuItem.classList.remove('active')
        activeItem.contentItem.classList.remove('active')
      }
      activeItem = item
      activeItem.menuItem.classList.add('active')
      activeItem.contentItem.classList.add('active')
    }
    const tabs = Div('tabs')
    const menu = Div('tabs-menu')
    const menuItems = items.map(tab => {
      const el = tab.icon //Div('tabs-menu-item', tab.name, { tag: 'button', tabIndex: 0 })
      el.querySelector('svg').setAttribute('width', 20)
      el.onmousedown = el.onclick = () => setActiveItem(tab)
      tab.menuItem = el
      return el
    })
    const contentItems = items.map(tab => {
      const el = Div('tabs-content-item', tab.content)
      tab.contentItem = el
      return el
    })

    setActiveItem(items[0])

    contentItems.forEach(el => tabs.appendChild(el))
    tabs.appendChild(menu)
    menuItems.forEach(el => menu.appendChild(el))

    return {
      el: tabs,
      items
    }
  }

  const ProjectIcon = Icon('project', 'M28 6 L4 6 M28 16 L4 16 M28 26 L4 26 M24 3 L24 9 M8 13 L8 19 M20 23 L20 29')
  const BrowseIcon = Icon('browse', 'M23 23 L30 30', '<circle cx="14" cy="14" r="12" />')
  const FavoritesIcon = Icon('favorites', 'M4 16 C1 12 2 6 7 4 12 2 15 6 16 8 17 6 21 2 26 4 31 6 31 12 28 16 25 20 16 28 16 28 16 28 7 20 4 16 Z')
  const ShaderIcon = Icon('shader', 'M20 24 L12 16 2 26 2 2 30 2 30 24 M16 20 L22 14 30 22 30 30 2 30 2 24', '<circle cx="10" cy="9" r="3" />')

  const tabs = createTabs([
    { name: 'project', content: '', icon: ProjectIcon },
    { name: 'shader', content: 'shader content', icon: ShaderIcon },
    { name: 'browse', content: 'browse content', icon: BrowseIcon },
    { name: 'favorites', content: 'favorites content', icon: FavoritesIcon },
  ])

  panel.appendChild(ProjectIcon)

  const createMixer = () => {
    const faders = Array.from(Array(15), () => ({
      vol: Math.random()
    }))

    const width = sideWidth
    const height = faders.length * 32

    const mixer = Div('mixer', '', {
      tag: 'canvas',
      width: width*pixelRatio,
      height: height*pixelRatio
    })

    mixer.style.width = width + 'px'
    mixer.style.height = height + 'px'

    const ctx = mixer.getContext('2d')
    ctx.scale(pixelRatio, pixelRatio)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, width, height)

    ctx.textBaseline = 'top'

    const drawFader = i => {
      let y = 32 * i
      let w = width
      ctx.fillStyle = '#222'
      ctx.fillRect(0, y, w, 30)
      updateFader(i)
      // ctx.fillStyle = '#f00'
      // ctx.clearRect(x, h + 5, 30, 20)
      // ctx.fillStyle = faders[i].solo ? '#fff' : '#666'
      // ctx.fillText('S', x+3, 7 + h)
      ctx.font = '6pt sans serif'
      ctx.fillStyle = '#777'
      ctx.fillText(i, 5, y + 7)

      ctx.font = '7pt sans serif'
      ctx.fillStyle = '#aaa'
      ctx.fillText('drums/808/913a', 16, y + 6)
      // ctx.fillStyle = faders[i].mute ? '#fff' : '#666'
      // ctx.fillText('M', x + 21, 7 + h)
    }

    const updateFader = i => {
      let y = 32 * i
      let w = width
      ctx.fillStyle = '#000'
      ctx.fillRect(w/2, y+3, w/2-4, 24)
      ctx.fillStyle = `rgba(97,204,224,${faders[i].vol*.8+.2})` //'#61CCE0'
      let r = ( (w/2-8) * (faders[i].vol) )
      ctx.fillRect(w/2+2, y+5, r, 20)
    }

    for (let i = 0; i < faders.length; i++) {
      drawFader(i)
    }

    let mouseDown = false
    const onmousemove = e => {
      let { x, y } = relativeMouseCoords(mixer, e)
      let i = Math.ceil(y / pixelRatio / 22) - 1
      let vol = Math.max(0, Math.min(1, ( (x-(width)) / (width * pixelRatio /2))))
      if (faders[i]) {
        faders[i].vol = vol
        updateFader(i)
      }
    }

    const stop = () => {
      mouseDown = false
      document.body.removeEventListener('mousemove', onmousemove)
      window.removeEventListener('blur', stop, { once: true })
      window.removeEventListener('mouseup', stop, { once: true })
    }

    mixer.onmousedown = e => {
      mouseDown = true
      window.addEventListener('blur', stop, { once: true })
      window.addEventListener('mouseup', stop, { once: true })
      document.body.addEventListener('mousemove', onmousemove)
      onmousemove(e)
    }

    return mixer
  }

  const mixer = createMixer()
  document.body.appendChild(mixer)
  // mixer.appendChild(mixerInner)
  // for (let i = 0; i < 8; i++) {
  //   const range = Div('vol', '<input type="range" min=-24 max=10 value=0 step=.01 /> 0')
  //   mixerInner.appendChild(range)
  // }
  const projectContentItem = tabs.items[0].contentItem

  // projectContentItem.appendChild(mixer)

//   tabs.items[0].contentItem.appendChild(Div('files', `
//     <div><i>0</i>drums/808/913a</div>
//     <div><i>1</i>drums/snare/2a9a</div>
//     <div><i>2</i>bassline/303/3a3f</div>
//     <div><i>3</i>vocals/miss-judged/49fd</div>
//     <div><i>4</i>piano/339a</div>
// `))

  const drawKnob = (value) => {
    const radius = 15
    const width = radius * 2
    const height = radius * 2 + 20
    const knob = Div('knob', '', {
      tag: 'canvas',
      width: width * pixelRatio,
      height: height * pixelRatio
    })
    knob.style.width = width + 'px'
    knob.style.height = height + 'px'
    const ctx = knob.getContext('2d')
    ctx.scale(pixelRatio, pixelRatio)
    ctx.textBaseline = 'top'
    ctx.textAlign = 'center'

    // const
    value = Math.random()

    const draw = () => {
      ctx.clearRect(0, 10, width, height)

      // circle
      ctx.strokeStyle = '#61CCE0'
      ctx.lineWidth = 1.7
      let pi = Math.PI*0.15
      const beginAngle = Math.PI/2+pi
      const endAngle = 2*Math.PI+Math.PI/2-pi

      ctx.strokeStyle = '#333'
      ctx.beginPath()
      ctx.arc(radius, radius+10, radius-2, beginAngle, endAngle)
      ctx.stroke()

      ctx.strokeStyle = '#61CCE0'
      const endValueAngle = (2*(Math.PI-pi))*value+Math.PI/2+pi
      ctx.beginPath()
      ctx.arc(radius, radius+10, radius-2, beginAngle, endValueAngle)
      ctx.stroke()

      pi = Math.PI - pi
      let x = radius - Math.cos(value*pi*2-endAngle) * (radius-2)
      let y = radius - Math.sin(value*pi*2-endAngle) * (radius-2)

      ctx.beginPath()
      ctx.moveTo(radius, radius+10)
      ctx.lineTo(x, y+10)
      ctx.closePath()
      ctx.stroke()

      ctx.font = '5.5pt sans serif'
      ctx.fillStyle = '#777'
      ctx.fillText(value.toPrecision(2), radius, height-10)
    }

    draw()

    // value
    ctx.font = '6.5pt sans serif'
    ctx.fillStyle = '#aaa'
    ctx.fillText(['cut','res','lfo'][Math.random()*3|0], radius, 1.5)

    let mouseDown = false
    let startY = -1
    let startValue = 0

    const onmousemove = e => {
      let { x, y } = relativeMouseCoords(mixer, e)
      if (startY === -1) {
        startY = y
        startValue = value
      }
      value = Math.min(1, Math.max(0, startValue + (startY-y)/240))
      draw()
    }

    const stop = () => {
      mouseDown = false
      document.body.removeEventListener('mousemove', onmousemove)
      window.removeEventListener('blur', stop, { once: true })
      window.removeEventListener('mouseup', stop, { once: true })
    }

    knob.onmousedown = e => {
      mouseDown = true
      startY = -1
      window.addEventListener('blur', stop, { once: true })
      window.addEventListener('mouseup', stop, { once: true })
      document.body.addEventListener('mousemove', onmousemove)
      onmousemove(e)
    }


    return knob
  }

  const knobs = Div('knobs')
  for (let i = 0; i < 35; i++) {
    knobs.appendChild(drawKnob())
  }
  // projectContentItem.appendChild(knobs)

  // tabs.items[0].contentItem.appendChild(Div('waves', `
  //   <img src="./waveform.png">
  //   <img src="./spectrogram.png">
  //   <img src="./analyzer.png">
  //   <!-- <img src="./analyzer.png"> -->
  // `))

}

main()
