export default class Media {
  constructor() {
    this.lastURL = null;
    this.callback = null;
    this.type = 'audio';
  }

  initEvents() {
    this.recorder.addEventListener('dataavailable', (e) => {
      this.chunks.push(e.data);
    });
    this.recorder.addEventListener('stop', () => {
      const blob = new Blob(this.chunks,
        { type: (this.type === 'audio') ? 'audio/mp3' : 'video/webm' });
      this.callback(blob, this.type);
    });
  }

  start(type) {
    this.type = type;
    return (async () => {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: (type === 'video'),
        });
        this.recorder = new MediaRecorder(this.stream);
        this.chunks = [];
        this.initEvents();
        this.recorder.start();
      } catch (err) {
        return { error: true, message: err };
      }
      return { error: false };
    })();
  }

  stop(callback = () => {}) {
    this.callback = callback;
    this.recorder.stop();

    this.lastURL = null;
    this.stream.getTracks().forEach((track) => track.stop());
  }
}
