export default class Websocket {
  constructor(builder) {
    this.wsUrl = 'react-ahj-diploma.herokuapp.com';
    this.ws = new WebSocket(`wss://${this.wsUrl}/ws`);
    this.ws.binaryType = 'blob'; // arraybuffer
    this.ignoreListen = null;
    // this.event = new CustomEvent('listen', {});

    this.ws.addEventListener('open', () => console.log('connected to WS'));
    // this.ws.addEventListener('message', (e) => this.listen(e));
    this.ws.addEventListener('close', (e) => console.log('connection closed', e));
    this.ws.addEventListener('error', (e) => console.log('error', e));
  }

  // listen(e) {
  //   if (e.data === this.ignoreListen) return;
  //
  //   this.event;
  // }

  send(data) {
    // this.ignoreListen = data;
    this.ws.send(data);
  }
}
