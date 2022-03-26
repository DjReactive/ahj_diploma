import AppFunc from '../AppFunc';
import { context } from './defines';
import Loader from './Loader';

export default class Buttons {
  constructor(builder) {
    this.buttons = [];
    this.isSending = false; // необходимо для блокировки
    this.curCtxMenu = null;
    this.inputBuffer = null;

    this.builder = builder;
    this.request = builder._Request;
    this.media = builder._Media;
    this.attachments = builder._Attachments;
    this.content = this.builder.content;
    this.feed = builder.feed;
    this.divSearch = this.builder.divSearch;
    this.divSending = this.builder.divSending;
    this.divAttach = this.builder.divAttach;

    this.titleSpan = this.content.querySelector('.main__title');
    this.searchInput = document.getElementById('search');
    this.sendInput = document.getElementById('sending');
    this.butAttachment = document.getElementById('attachment-link');
    this.butSend = document.getElementById('send-link');
    this.butAudio = document.getElementById('audio-link');
    this.butVideo = document.getElementById('video-link');
    this.butAccept = document.getElementById('accept-link');
    this.butStop = document.getElementById('stop-link');
    this.butSearchToggle = document.getElementById('search-toggle');
    this.butSearch = document.getElementById('start-search');
    this.createEvents();
    this.sendControl(false);
  }

  createEvents() {
    // Сохраняем все основные кнопки в массив для дальнейшего использования
    const buttons = document.querySelectorAll('.send-button');
    Array.from(buttons).forEach((b) => this.buttons.push({
      element: b, icon: b.textContent,
    }));

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;

      switch (document.activeElement) {
        case this.sendInput:
          this.preSending('text', this.butSend); break;
        case this.searchInput:
          this.startSearch(this.searchInput.value); break;
        default: {}
      }
    });
    this.butSend.addEventListener('click', (e) => this.preSending('text', e.target));
    this.butAudio.addEventListener('click', (e) => this.preSending('audio', e.target));
    this.butVideo.addEventListener('click', (e) => this.preSending('video', e.target));
    this.butAttachment.addEventListener('click', (e) => this.toggleMenu(e.target, 'attachment'));
    this.butSearchToggle.addEventListener('click', () => this.searchToggle());
    // close, if click on other nearest
    document.addEventListener('click', (e) => {
      if (this.buttons.some((b) => b.element === e.target)
      || (this.curCtxMenu && e.target.closest('div') === this.curCtxMenu.menu)) return;
      this.toggleMenu(e.target);
    });
    // start search
    this.butSearch.addEventListener('click', async () => this.startSearch(this.searchInput.value));

    // accept recording (current)
    this.butAccept.addEventListener('click', () => {
      let medianame;
      this.switcher();
      clearInterval(this.timerId);
      this.media.stop(async (blob, t) => {
        Loader.addLoader('attachment', this.butSend, 15);
        this.isSending = true;
        const uniqId = await this.request.send('attachments/generate-id');
        this.isSending = false;
        medianame = (t === 'audio') ? 'Аудиозапись' : 'Видеозапись';
        medianame += ` (${this.sendInput.value})`;
        const obj = await this.attachments.setAttachment(t, {
          id: uniqId,
          blob,
          name: medianame,
        });
        Loader.removeLoader('attachment');
        this.builder.createAttachment(obj);
        this.sendControl(false, false);
      });
    });
    // cancel recording
    this.butStop.addEventListener('click', () => {
      this.switcher();
      clearInterval(this.timerId);
      this.media.stop();
      this.sendControl(false, false);
    });
  }

  async startSearch(string) {
    Loader.addLoader('search', this.feed, null, false);
    const response = await this.request.send('search', { string });
    if (response.error) {
      Loader.removeLoader('search');
      this.builder.showAlert(response.response);
      return;
    }
    this.builder.feedType = 'search';
    const posts = response.response;
    this.feed.innerHTML = '';
    if (posts.length < 1) {
      this.feed.innerHTML = 'К сожалению, нам не удалось ничего найти';
      return;
    }
    for (let res = [], i = posts.length - 1; i >= 0; i--) {
      if (posts[i][1].attachCount > 0) {
        res = await this.request.send('attachments/get', { id: posts[i][0] });
        if (res.error) {
          this.builder.showAlert(res.response);
          continue;
        }
      } else res = [];
      this.builder.createPost(posts[i], res, 'beforeend');
    }
    Loader.removeLoader('search');
  }

  preSending(type, button) {
    if (this.isSending) return;
    switch (type) {
      case 'text':
        this.sendMessage(button);
        break;
      case 'audio':
      case 'video':
        this.sendMediaContent(button, type);
        break;
    }
  }

  sendMediaContent(button, type) {
    if (this.attachments.limitExceeded()) {
      this.builder.showAlert('Sorry, limit is exceeded');
      return;
    }
    Loader.addLoader('send', button, 15);

    this.sendControl(true);
    this.switcher();
    new Promise((resolve) => resolve(this.media.start(type)))
      .then((err) => {
        Loader.removeLoader('send');
        if (!err.error) {
          this.inputBuffer = this.sendInput.value;
          this.sendInput.classList.add('toright');
          this.sendInput.value = '00:00';
          this.timer = 0;
          this.timerId = setInterval(() => {
            this.timer += 1;
            this.sendInput.value = AppFunc.formatTime(this.timer);
          }, 1000);
        } else {
          this.switcher();
          this.builder.showAlert(err.message);
        }
      });
  }

  sendMessage(button) {
    Loader.addLoader('send', button, 15);
    this.sendControl(true);

    const content = [];
    this.attachments.getAllAttachments().forEach((a) => content.push({
      id: a.id,
      type: a.type,
      name: a.full.name,
      userfile: (a.type !== 'audio' && a.type !== 'video')
        ? a.full.file : a.full.blob,
    }));
    const sendMsg = {
      type: 'text',
      message: this.sendInput.value,
      attachCount: content.length,
      attachments: content,
      created: Date.now(),
    };
    // Отправка сообщения
    (async () => {
      const send = await this.request.send('send', sendMsg);
      if (send.error) {
        Loader.removeLoader('send');
        this.builder.showAlert(send.response);
        this.inputBuffer = this.sendInput.value;
        this.sendControl(false, false);
        return;
      }
      // Загрузка файлов на сервер, если они есть
      if (content.length > 0) {
        for (let i = 0; i < content.length; i++) {
          console.log(content[i]);
          await this.request.send('upload', {
            id: content[i].id,
            type: 'file',
            name: content[i].name,
            content: content[i].userfile,
          });
        }
        // Обработка прикреплений к сообщению для получения ссылок
        await this.request.send('attachments/add', { token: send.token });
      }
      this.attachments.removeAll();
      Array.from(this.divAttach.querySelectorAll('.attachment')).forEach((el) => {
        this.builder.checkAttachments(el, 'remove');
      });
      this.feed.scrollTop = 0;
      Loader.removeLoader('send');
      this.sendControl(false);
      this.builder._WebSocket.send(JSON.stringify(sendMsg));
    })();
  }

  sendControl(state, clear = true) {
    this.isSending = state;
    if (!state) {
      if (clear) this.sendInput.value = '';
      else this.sendInput.value = this.inputBuffer;
      this.sendInput.classList.remove('toright');
      this.sendInput.removeAttribute('disabled');
      this.sendInput.focus();
    } else this.sendInput.setAttribute('disabled', state);
  }

  switcher() {
    this.builder.switchControl(this.butSend, this.butAudio, this.butVideo, this.butAccept, this.butStop);
  }

  toggleMenu(button = null, type = 'close') {
    if (this.curCtxMenu) {
      this.curCtxMenu.menu.classList.add('animation-contextmenu');
      this.buttonToggleIcon(this.curCtxMenu.current);
      if (button === this.curCtxMenu.current || type === 'close') {
        this.curCtxMenu = null;
        return;
      }
    }
    if (type === 'close') return;
    if (this.isSending) return;
    this.buttonToggleIcon(button);
    this.curCtxMenu = {
      current: button,
      menu: this.createMenu(button, type),
    };
  }

  createMenu(button, type) {
    const div = document.createElement('div');
    div.classList.add('contextmenu');

    const ul = document.createElement('ul');
    ul.classList.add('context__list');
    div.appendChild(ul);
    context[type].forEach((item) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.dataset.id = item.id;
      link.innerHTML = `<span class="ctx__icon">${item.icon}</span> ${item.name}`;
      li.appendChild(link);
      li.innerHTML += `<input type="file" class="load__${item.id}" id="${item.id}" accept="${item.accept}">`;
      ul.appendChild(li);
    });
    this.content.insertAdjacentElement('beforebegin', div);
    // div.style.top = String(Number(button.offsetTop) - Number(div.offsetHeight)) + 'px';
    // div.style.left = String(Number(button.offsetLeft) - Number(div.offsetWidth)/2 + 25) + 'px';
    div.classList.add('animation-contextmenu');
    this.menuEvents(div);
    return div;
  }

  menuEvents(div) {
    // animated create/remove menu
    div.addEventListener('animationend', (e) => {
      if (div.style.animationDirection === 'reverse') {
        e.target.remove();
        return;
      }
      div.classList.remove('animation-contextmenu');
      div.style.animationDirection = 'reverse';
    });
    // buttons file events
    Array.from(div.querySelectorAll('a')).forEach((item) => {
      item.addEventListener('click', (e) => {
        const input = document.getElementById(item.dataset.id);
        input.dispatchEvent(new MouseEvent('click'));
      });
    });
    // CHANGE ___
    Array.from(div.querySelectorAll('input[type=file]')).forEach((item) => {
      item.addEventListener('change', (e) => this.fileCreateAttachments(e.currentTarget.files));
    });
  }

  // функция добавляет прикрепление в виде div элемента
  async fileCreateAttachments(files) {
    this.toggleMenu();
    Loader.addLoader('attachment', this.butAttachment, 15);
    this.isSending = true;
    const file = files[0];
    const uniqId = await this.request.send('attachments/generate-id');
    this.isSending = false;
    const type = (file.type !== '') ? file.type.split('/') : ['document'];
    const b64 = await AppFunc.blobTob64(file);
    const blob = await AppFunc.b64toBlob(b64, file.size);
    const obj = await this.attachments.setAttachment(type[0], {
      id: uniqId,
      blob,
      file,
      name: file.name,
    });
    Loader.removeLoader('attachment');
    this.builder.createAttachment(obj);
  }

  searchToggle() {
    const isAnim = this.divSearch.classList.contains('search-open-animation');
    if (isAnim) {
      this.titleSpan.style.opacity = 1;
      this.divSearch.style.width = '0';
      this.divSearch.style.overflow = 'hidden';
    } else {
      this.searchInput.value = '';
      this.searchInput.focus();
      this.titleSpan.style.opacity = 0;
      this.divSearch.style.width = '100%';
      this.divSearch.style.overflow = 'visible';
    }
    if (this.builder.feedType !== 'feed') {
      (async () => {
        this.feed.innerHTML = '';
        this.builder.lastItem = null;
        this.builder.msgCount = null;
        while (await this.builder.preloadContent('history')) {}
        this.builder.feedType = 'feed';
      })();
    }
    this.buttonToggleIcon(this.butSearchToggle);
    this.divSearch.classList.toggle('search-open-animation');
  }

  buttonToggleIcon(button) {
    for (let i = 0; i < this.buttons.length; i++) {
      if (button === this.buttons[i].element) {
        this.buttons[i].element.textContent = (button.textContent === 'P') ? this.buttons[i].icon : 'P';
        return true;
      }
    }
    return false;
  }
}
