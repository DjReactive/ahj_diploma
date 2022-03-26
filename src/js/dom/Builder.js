import { map, interval, fromEvent } from 'rxjs';
import AppFunc from '../AppFunc';
import Buttons from './Buttons';
import Loader from './Loader';
import DnD from './DragAndDrop';
import Request from '../controller/Request';
import Websocket from '../controller/Websocket';
import Media from '../controller/Media';
import Attachments from '../controller/Attachments';
import { typeIcons } from './defines';
// import { ajax } from 'rxjs/ajax';

export default class Builder {
  constructor(storage) {
    this._Buttons = null; // for module
    this._Request = null;
    this._Media = null;
    this.lastItem = null;
    this.msgCount = null;
    this.isLoading = false;
    this.addCount = 5; // кол-во загружаемых постов
    this.errorTime = 1500; // количество мс задержки перед исчезанием сообщения
    this.alertTimeout = [];
    this.feedType = 'feed'; // переменная для определения назначения текущего feed блока
    this.pinnedId = null;
    this.panelHeight = {
      attachment: 0,
      pinned: 0,
    };
    this.storage = storage;

    this.feed = document.getElementById('feed');
    this.main = document.querySelector('.main');
    this.top = this.main.querySelector('.main__top');
    this.content = this.main.querySelector('.main__content');
    this.divDrop = this.main.querySelector('[data-id=drop-block]');
    this.divError = this.main.querySelector('.main__error');
    this.divSearch = this.top.querySelector('.main__search');
    this.divAttach = this.content.querySelector('.main__attachments');
    this.divSending = this.main.querySelector('.main__sending');
  }

  init() {
    this._Request = new Request(); // Request
    this._Media = new Media(); // Media module
    this._Attachments = new Attachments(this.storage, this._Request.serverURL); // Attachments
    this._Buttons = new Buttons(this); // Buttons managment
    this._WebSocket = new Websocket(this);
    this._DragAndDrop = new DnD(this, this.divDrop);
    this.feed.addEventListener('scroll', () => this.preloadContent('history'));
    (async () => {
      await this.pinMessage();

      while (await this.preloadContent('history')) {}
      const wsStream$ = fromEvent(this._WebSocket.ws, 'message');
      wsStream$.subscribe((value) => {
        if (this.feedType === 'feed') this.getContent('unread', value.count);
      });
    })();
  }

  async preloadContent(type) {
    let next = false;
    const rCount = await this._Request.send('feed', {
      pages:
      { start: 'count', end: null },
    });

    this.msgCount = rCount.count;
    if (AppFunc.checkScrollingDown(this.feed) && this.msgCount > this.lastItem) next = true;

    if (!next || this.isLoading || this._Buttons.isSending) return false;

    this.isLoading = true;
    Loader.addLoader('ajax', this.feed, null, false);
    // await new Promise(resolve => setTimeout(() => resolve(), 1000));
    await this.getContent(type, this.msgCount);
    Loader.removeLoader('ajax');
    this.isLoading = false;
    return true;
  }

  async getContent(type, count = null) {
    if (!this.lastItem) this.lastItem = 0;

    const pages = (type === 'unread')
      ? AppFunc.getPagesCounter(0, count - this.msgCount, false)
      : AppFunc.getPagesCounter(this.lastItem, this.addCount, false);
    const response = await this._Request.send('feed', { pages });
    if (response.error) {
      this.showAlert(response.response);
      return false;
    }
    this.lastItem += response.response.length;
    if (response.response.length < 1) {
      return false;
    }

    const posts = response.response;
    for (let res = [], i = 0; i < posts.length; i++) {
      if (posts[i][1].attachCount > 0) {
        res = await this._Request.send('attachments/get', { id: posts[i][0] });
        if (res.error) {
          this.showAlert(res.response);
          continue;
        }
      } else res = [];
      this.createPost(posts[i], res, (type === 'unread') ? 'afterbegin' : 'beforeend');
    }
    return true;
  }

  switchControl(...buttons) {
    Array.from(buttons).forEach((b) => b.classList.toggle('hidden'));
  }

  showAlert(message, type = 'error') {
    if (this.alertTimeout.length > 0) {
      this.alertTimeout.forEach((t) => clearTimeout(t));
      this.alertTimeout = [];
    }
    const anim = 'animation-error';
    const divMessage = this.divError.querySelector('.error__message');
    ['error', 'warning'].forEach((cl) => this.divError.classList.remove(cl));
    divMessage.textContent = message;
    this.divError.classList.add(type);
    this.divError.querySelector('.error__icon').textContent = (type !== 'error') ? 'G' : 'P';
    this.divError.classList.add(anim);
    this.divError.style.display = 'block';

    this.divError.addEventListener('animationend', () => {
      this.divError.classList.remove(anim);
      const timer = setTimeout(() => {
        if (!this.alertTimeout) return;
        this.divError.style.display = 'none';
        divMessage.textContent = '';
      }, this.errorTime);
      this.alertTimeout.push(timer);
    });
  }

  /* Array: [id, obj]
    Obj value:
      type: 'text' / 'audio'
      message: this.sendInput.value,
      attachment: <array of blob attachments>,
      created: <timestamp>,
  */
  createPost(array, attachments = [], method = 'afterbegin') {
    const post = array[1];
    const div = document.createElement('div');
    const msgClass = (attachments.length > 0 && post.message.length > 0) ? ' wrapper' : '';
    const pinclass = (this.pinnedId === array[0]) ? 'pin__button' : '';
    let content = `<span class="message__text${msgClass}">${AppFunc.formatUrlHTML(post.message)}</span>`;
    if (attachments.length > 0) {
      attachments.forEach((a) => content += this._Attachments.getMediaHTML(a.type, a));
    }
    div.classList.add('feed__message');
    if (this.pinnedId === array[0]) div.classList.add('pin__bg');
    div.setAttribute('id', `messageId-${array[0]}`);
    div.innerHTML = `<div class="message__content">${content}</div>
    <div class="message__control">
      <button class="send-button ico ${pinclass}" data-id="${array[0]}">l</button>
    </div>
    <span class="message__created">${AppFunc.getFormatedDate(post.created)}</span>`;
    this.feed.insertAdjacentElement(method, div);
    div.querySelector('button').addEventListener('click', async (e) => {
      Loader.addLoader('setpin', e.target, 15);
      await this.pinMessage('set', array[0]);
      Loader.removeLoader('setpin');
    });
  }

  createAttachment(obj) {
    const div = document.createElement('div');
    const url = URL.createObjectURL(obj.blob);
    const img = (obj.type === 'image')
      ? `<div style="background: url(${url}); background-size: cover;" class="attachment__image" data-id="${obj.id}">` : '';
    div.classList.add('attachment');
    div.dataset.id = obj.id;
    div.innerHTML = `<span class="attachment__icon">${typeIcons[obj.type]}</span>`
    + `<span class="attachment__name">${AppFunc.formatTextSize(obj.name, 18)}${img}</span>`
    + '<div class="attachment__remove">P</div>';
    this.checkAttachments(div);
    const remove = div.querySelector('.attachment__remove');
    remove.addEventListener('click', () => this.removeAttachment(obj.id, div));
    div.addEventListener('click', (e) => {
      if (e.target !== remove) window.open(url, '_blank');
    });
  }

  async removeAttachment(id, div) {
    // const response = await this._Request.send('upload/remove', { id: id });
    const remove = this._Attachments.removeAttachment(id);
    if (remove.error) {
      this.showAlert(remove.response);
      return;
    }
    this.checkAttachments(div, 'remove');
  }

  checkAttachments(attachment, action = 'add') {
    const all = this._Attachments.getAllAttachments();
    if (action === 'remove') {
      attachment.classList.add('animation-attachment');
    }
    // Height control
    let height = 0;
    function check(h) { return (height < h) ? h : height; }
    all.forEach((item) => {
      if (item.type === 'image') height = check(70);
      if (item.type === 'audio' || item.type === 'document'
      || item.type === 'video') height = check(20);
    });
    this.heightBoard(height, 'attachment');

    if (action === 'add') {
      this.divAttach.appendChild(attachment);
      attachment.classList.add('animation-attachment');
      attachment.addEventListener('animationend', () => {
        if (attachment.style.animationDirection === 'reverse') {
          attachment.remove();
          return;
        }
        attachment.classList.remove('animation-attachment');
        attachment.style.animationDirection = 'reverse';
      });
    }
  }

  heightBoard(addHeight, type = 'attachment') {
    let hAdded = 0;
    this.panelHeight[type] = addHeight;
    for (const key of Object.keys(this.panelHeight)) hAdded += this.panelHeight[key];
    this.divAttach.style.height = `${hAdded}px`;
    this.feed.style.height = `calc(100vh - 140px - ${hAdded}px)`;
  }

  async pinMessage(type = 'get', id = null) {
    if (this.pinnedId) {
      this.showAlert('У вас уже есть закрепленное сообщение', 'warning');
      return;
    }
    const response = await this._Request.send((type === 'get')
      ? 'pin/get' : 'pin/set', { id });
    if (response.error) {
      if (type !== 'get') this.showAlert(response.response);
      return;
    }
    const [msgId, obj] = response.response;
    const el = document.getElementById(`messageId-${id}`);
    const div = document.createElement('div');
    const message = (obj.message) ? obj.message : '(текст отсутствует)';
    div.classList.add('pinned');
    div.style.animationDirection = 'reverse';
    div.innerHTML = `<span class="pinned__icon">P</span>
      <div class="pinned__title">Pinned</div>
      <div class="pinned__message">
        <span class="icon">M</span><span>Сообщение:</span>
        ${AppFunc.formatTextSize(message, 32, false)}
      </div>
      <div class="pinned__attachments">
        <span class="icon">h</span><span>Прикреплений:</span> ${obj.attachCount}
      </div>`;
    this.divAttach.insertAdjacentElement('afterbegin', div);
    this.heightBoard(50, 'pinned');
    this.pinnedId = (id) || msgId;
    this.pinToggle(this.pinnedId);
    // удаление закрепленного сообщения
    div.querySelector('.pinned__icon').addEventListener('click', async (e) => {
      Loader.addLoader('pin', e.target, 15);
      div.classList.add('animation-attachment');
      await this._Request.send('pin/set', { id: 0 });
      this.pinToggle(this.pinnedId);
      if (this.pinnedId) this.pinnedId = null;
      Loader.removeLoader('pin');
    });
    div.addEventListener('animationend', () => {
      this.heightBoard(0, 'pinned');
      div.remove();
    });
    // перейти к закрепленному сообщению
    div.addEventListener('click', async (e) => {
      console.log(this.feedType);
      if (this.feedType === 'feed') {
        if (e.target !== div.querySelector('.pinned__icon')) {
          await this._Buttons.startSearch(`force|${this.pinnedId},{`);
        }
      } else {
        this.feed.innerHTML = '';
        this.lastItem = null;
        this.msgCount = null;
        this.feedType = 'feed';
        while (await this.preloadContent('history')) {}
      }
    });
  }

  pinToggle(id) {
    if (!id) return;
    const div = document.getElementById(`messageId-${id}`);
    if (!div) return;
    if (div.classList.contains('pin__bg')) {
      div.classList.remove('pin__bg');
      div.querySelector('button').classList.remove('pin__button');
    } else {
      div.classList.add('pin__bg');
      div.querySelector('button').classList.add('pin__button');
    }
  }
}
