import React from 'react'

import Base from './Base'
import loadScript from 'load-script'

const AUDIO_EXTENSIONS = /\.(m4a|mp4a|mpga|mp2|mp2a|mp3|m2a|m3a|wav|weba|aac|oga|spx)($|\?)/i
const HLS_EXTENSIONS = /\.(m3u8)($|\?)/i
const HLS_SDK_URL = '//assets/hls.min.js'
const HLS_GLOBAL = 'Hls'
const DASH_EXTENSIONS = /\.(mpd)($|\?)/i
const DASH_SDK_URL = '//assets/dash.all.min.js'
const DASH_GLOBAL = 'dashjs'

export default class FilePlayer extends Base {
  static displayName = 'FilePlayer'
  static canPlay (url) {
    return true
  }
  componentDidMount () {
    const { playsinline, onPause, onEnded, onError } = this.props
    this.player.addEventListener('canplay', this.onReady)
    this.player.addEventListener('play', this.onPlay)
    this.player.addEventListener('pause', () => {
      if (this.mounted) {
        onPause()
      }
    })
    this.player.addEventListener('seeked', this.onSeek)
    this.player.addEventListener('ended', onEnded)
    this.player.addEventListener('error', onError)
    if (playsinline) {
      this.player.setAttribute('playsinline', '')
      this.player.setAttribute('webkit-playsinline', '')
    }
    super.componentDidMount()
  }
  componentWillUnmount () {
    const { onPause, onEnded, onError } = this.props
    this.player.removeEventListener('canplay', this.onReady)
    this.player.removeEventListener('play', this.onPlay)
    this.player.removeEventListener('pause', onPause)
    this.player.removeEventListener('seeked', this.onSeek)
    this.player.removeEventListener('ended', onEnded)
    this.player.removeEventListener('error', onError)
    super.componentWillUnmount()
  }
  onSeek = e => {
    this.props.onSeek(e.target.currentTime)
  }
  shouldUseHLS (url) {
    return HLS_EXTENSIONS.test(url) || this.props.fileConfig.forceHLS
  }
  shouldUseDASH (url) {
    return DASH_EXTENSIONS.test(url) || this.props.fileConfig.forceDASH
  }
  load (url) {
    if (this.shouldUseHLS(url)) {
      loadSDK(HLS_SDK_URL, HLS_GLOBAL).then(Hls => {
        this.hls = new Hls()
        this.hls.loadSource(url)
        this.hls.attachMedia(this.player)
      })
    }
    if (this.shouldUseDASH(url)) {
      loadSDK(DASH_SDK_URL, DASH_GLOBAL).then(dashjs => {
        const player = dashjs.MediaPlayer().create()
        player.initialize(this.player, url, true)
      })
    }
  }
  play () {
    this.player.play().catch(this.props.onError)
  }
  pause () {
    this.player.pause()
  }
  stop () {
    this.player.removeAttribute('src')
    if (this.hls) {
      this.hls.detachMedia()
    }
  }
  seekTo (amount) {
    const seconds = super.seekTo(amount)
    this.player.currentTime = seconds
  }
  setVolume (fraction) {
    this.player.volume = fraction
  }
  setPlaybackRate (rate) {
    this.player.playbackRate = rate
  }
  getDuration () {
    if (!this.isReady) return null
    return this.player.duration
  }
  getFractionPlayed () {
    if (!this.isReady) return null
    return this.player.currentTime / this.getDuration()
  }
  getFractionLoaded () {
    if (!this.isReady || this.player.buffered.length === 0) return null
    return this.player.buffered.end(0) / this.getDuration()
  }
  renderSource = source => {
    if (typeof source === 'string') {
      return <source key={source} src={source} />
    }
    const { src, type } = source
    return <source key={src} src={src} type={type} />
  }
  renderTrack = (track, index) => {
    return <track key={index} {...track} />
  }
  ref = player => {
    this.player = player
  }
  render () {
    const { url, loop, controls, fileConfig, width, height } = this.props
    const useAudio = AUDIO_EXTENSIONS.test(url) || fileConfig.forceAudio
    const useHLS = this.shouldUseHLS(url)
    const useDASH = this.shouldUseDASH(url)
    const Element = useAudio ? 'audio' : 'video'
    const src = url instanceof Array || useHLS || useDASH ? undefined : url
    const style = {
      width: !width || width === 'auto' ? width : '100%',
      height: !height || height === 'auto' ? height : '100%',
      display: url ? 'block' : 'none'
    }
    return (
      <Element
        ref={this.ref}
        src={src}
        style={style}
        preload='auto'
        controls={controls}
        loop={loop}
        {...fileConfig.attributes}>
        {url instanceof Array &&
          url.map(this.renderSource)
        }
        {fileConfig.tracks instanceof Array &&
          fileConfig.tracks.map(this.renderTrack)
        }
      </Element>
    )
  }
}

function loadSDK (url, globalVar) {
  if (window[globalVar]) {
    return Promise.resolve(window[globalVar])
  }
  return new Promise((resolve, reject) => {
    loadScript(url, err => {
      if (err) reject(err)
      resolve(window[globalVar])
    })
  })
}
