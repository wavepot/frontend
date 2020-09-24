import './components/OggVorbisEncoder.min.js'
import drawWaveform from './components/draw-waveform.js'
import Shared32Array from './dsp/lib/shared-array-buffer.js'
import Audio from './components/audio.js'
import Mix from './dsp/src/mix.js'
import mixBuffers from './dsp/src/mix-buffers.js'
import DynamicCache from './dsp/dynamic-cache.js'
import * as API from './components/api.js'

const cache = new DynamicCache('projects', {
  'Content-Type': 'application/javascript'
})

const renderWaveform = async title => {
  const audio = Audio() // required for sample service

  const getBeatRate = (sampleRate, bpm) => {
    return Math.round(sampleRate * (60 / bpm))
  }

  await DynamicCache.install()

  // warmup in cache
  fetch('/mix-worker-thread.js')

  const json = await API.load(title)

  await Promise.all([
    ...json.tracks,
    ...json.modules
  ].map(async file => {
    file.filename = await cache.put(file.title, file.value)
  }))

  const bpm = parseFloat(
    (60 * (
      44100
    / getBeatRate(44100, json.bpm)
    )
  ).toFixed(6))

  const beatRate = getBeatRate(44100, bpm)

  const bufferSize = beatRate * 4

  const output = Array(2).fill(0).map(() =>
    new Shared32Array(bufferSize))

  const tracks = json.tracks.map(track => {
    track.buffer = Array(2).fill(0).map(() =>
      new Shared32Array(bufferSize))
    track.context = {
      n: 0,
      bpm,
      beatRate,
      sampleRate: 44100,
      buffer: track.buffer
    }
    track.mix = Mix(track.context)
    return track
  })

  await Promise.all(tracks.map(track => track.mix(c => c.src(track.filename))))

  mixBuffers(output, ...tracks.filter(track => !track.mute).map(track =>
    [track.buffer, 1, track.vol]
  ))

  const canvas = document.createElement('canvas')
  canvas.width = 1000
  canvas.height = 500
  canvas.style.width = '500px'
  canvas.style.height = '250px'
  container.appendChild(canvas)

  drawWaveform(canvas, output[0])
  canvas.toBlob(blob => {
    const filename = title.replace(/[^a-z0-9]/gi, '_') + '.webp'
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
  }, 'image/webp', .1)

  const encoder = new OggVorbisEncoder(44100, 2, .1)
  encoder.encode(output)
  const blob = encoder.finish()
  const filename = title.replace(/[^a-z0-9]/gi, '_') + '.ogg'
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()

  // const audio = Audio()
  // const audioBuffer = audio.createBuffer(2, bufferSize, 44100)
  // audioBuffer.getChannelData(0).set(output[0])
  // audioBuffer.getChannelData(1).set(output[1])

  // const node = audio.createBufferSource()
  // node.buffer = audioBuffer

  // const dest = audio.createMediaStreamDestination()
  // const chunks = []
  // const mediaRecorder = new MediaRecorder(dest.stream)
  // mediaRecorder.ondataavailable = e => chunks.push(e.data)
  // mediaRecorder.onstop = e => {
  //   const blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' })
  //   const filename = 'output.ogg'
  //   const a = document.createElement('a')
  //   a.href = URL.createObjectURL(blob)
  //   a.download = filename
  //   a.click()
  // }

  // // node.connect(audio.destination)
  // node.connect(dest)
  // mediaRecorder.start()
  // node.start()
  // node.onended = () => {
  //   mediaRecorder.stop()
  // }
  console.log('done')
}

const waveformQuery = new URL(location).searchParams.get('waveform')
if (waveformQuery) {
  renderWaveform(waveformQuery)
}
