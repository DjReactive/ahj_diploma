export default class AppFunc {
  static getFormatedDate(date) {
    const nDate = new Date(date);
    return `${AppFunc.formatDateNumber(nDate.getDate())}`
    + `.${AppFunc.formatDateNumber(nDate.getMonth() + 1)}`
    + `.${AppFunc.formatDateNumber(nDate.getFullYear())}`
    + ` ${AppFunc.formatDateNumber(nDate.getHours())}`
    + `:${AppFunc.formatDateNumber(nDate.getMinutes())}`;
  }

  static formatDateNumber(number) {
    return String(number).padStart(2, '0');
  }

  // Приводит кол-во секунд в формат string, вида "00:00"
  static formatTime(seconds) {
    const min = Math.trunc(seconds / 60);
    const sec = seconds - (min * 60);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  static formatUrlHTML(message) {
    const words = message.split(' ');
    const newWords = [];
    words.forEach((word) => {
      if (/http(s)?:\/\//.test(word)) {
        newWords.push(`<a class="message__link" href="${word}" target="_blank">${word}</a>`);
      } else newWords.push(word);
    });
    return newWords.join(' ');
  }

  static formatTextSize(string, length, end = true) {
    const type = string.split('.');
    const forEnd = (end && type.length > 1 && string.length > length)
      ? `...${type[type.length - 1]}` : '';
    return string.substr(0, length) + forEnd;
  }

  static getPagesCounter(lastIndex, addCount = null) {
    const index = lastIndex;
    return { start: index + 1, end: Math.max(index + addCount, index + 1) };
  }

  static formatFileSize(size) {
    const kb = Number(size) / 1024;
    const mb = kb / 1024;
    if (Math.trunc(mb) > 0) return `${mb.toFixed(2)}Мб`;
    return `${kb.toFixed(2)}Кб`;
  }

  // Проверяет достигла ли текущий скролл в заданном блоке до конца
  static checkScrollingDown(block) {
    const maxHeight = block.scrollHeight - block.offsetHeight;
    const offset = (block.scrollHeight - block.offsetHeight) / 10;
    if (block.scrollTop >= (maxHeight - offset)) return true;
    return false;
  }

  static async blobTob64(blobOrFile) {
    const reader = new FileReader();
    reader.readAsDataURL(blobOrFile);
    return new Promise((resolve) => {
      reader.onload = () => resolve(reader.result);
    });
  }

  static b64ArrayToBlob(array) {
    const newArr = [];
    array.forEach((item) => {
      const blob = AppFunc.b64toBlob(item.base, item.size);
      newArr.push(blob);
    });
    return newArr;
  }

  // function on: https://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
  static b64toBlob(dataUrl, sliceSize) {
    let a; let b; let c; let
      d;
    [a, b] = dataUrl.split(','); [c, d] = a.split(';'); [d, a] = c.split(':');
    const b64Data = [b];
    const contentType = a;
    sliceSize = sliceSize || 512;

    const byteCharacters = atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);

      byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    return blob;
  }
}
