import AppFunc from '../AppFunc';

export default class Attachments {
  constructor(storage, serverUrl) {
    this.counter = 1;
    this.serverUrl = serverUrl;
    this.limitOfAttachments = 3;
    this.attachments = new Map();
    this.files = new Map();
  }

  addFile(file) {
    this.files.set(this.counter, file);
    this.counter += 1;
  }

  setAttachment(type, attachObj) {
    const { id } = attachObj;
    const fixtype = (!type || type === 'text') ? 'document' : type;
    this.attachments.set(id, {
      id,
      type: fixtype,
      name: attachObj.name,
      blob: attachObj.blob,
      file: attachObj.file,
    });
    return this.getAttachment(id);
  }

  // Returned json response
  removeAttachment(id) {
    const attach = this.getAttachment(id);
    if (!this.attachments.delete(id)) { return { error: true, response: 'Filed remove attachment' }; }

    return { error: false };
  }

  removeAll(id) {
    this.attachments.clear();
    this.files.clear();
    this.counter = 1;
  }

  limitExceeded() {
    const count = this.getAllAttachments().length;
    return (count >= this.limitOfAttachments);
  }

  getAttachment(id) {
    return this.attachments.get(id);
  }

  getAllAttachments() {
    const arr = [];
    this.attachments.forEach((value, key) => {
      if (value) arr.push({ id: key, type: value.type, full: value });
    });
    return arr;
  }

  getMediaHTML(type, link) {
    const ofType = type.split('/');
    const url = `${this.serverUrl}/${link.url}`;
    if (ofType[0] === 'audio' || ofType[0] === 'video') {
      return `
      <video class="attachment__${ofType[0]}" src ="${url}" data-id="${link.id}" controls>
        <p>Ваш браузер не поддерживает HTML5 аудио/видео.
        Используйте <a href="${url}">ссылку </a> для доступа.</p>
      </video>
      <span class="media__name">${AppFunc.formatTextSize(link.name, 24, false)}</span>`;
    }
    if (ofType[0] === 'image') {
      return `<a href="${url}" target="_blank">
      <img class="attachment__post-${ofType[0]}" data-id="${link.id}" src ="${url}"></a>
      <span class="media__name">${AppFunc.formatTextSize(link.name, 24, true)}</span>`;
    }
    return `<div class="attachment__document" data-id="${link.id}">
    <span class="document__icon">H</span><a href="${url}" target="_blank">
    ${AppFunc.formatTextSize(link.name, 28)}</a>
    <span class="filesize">(${AppFunc.formatFileSize(link.size)})</span></div>`;
  }
}
