export default class Loader {
  /*    loader_name: {
          element: <element>,
          content: <textContent>,
        }
  */
  static loaders = [];

  /*  name - название,
      element - элемент, в который будет встраиваться загрузчик
      [optional] size - размер загрузчика
      [optional] hide - удалять содержимое элемента, пока работает загрузчик
  */
  static addLoader(name, element, size = null, hide = true) {
    this.removeLoader(name);
    const img = document.createElement('img');
    img.classList.add('loader');
    if (size) img.style.width = `${size}px`;
    img.setAttribute('src', 'images/tail-spin.svg');
    this.loaders.push({
      [name]: {
        element,
        content: element.textContent,
        loader: img,
        hide,
      },
    });
    if (hide) element.textContent = '';
    element.appendChild(img);
  }

  static isLoader(loader) {
    return !!(Loader.getLoaderIndex(loader) !== null);
  }

  static getLoaderIndex(loader) {
    for (let i = 0; i < Loader.loaders.length; i++) {
      if (Loader.loaders[i].hasOwnProperty(loader)) return i;
    }
    return null;
  }

  static removeLoader(name) {
    const idx = Loader.getLoaderIndex(name);
    if (idx !== null) {
      if (Loader.loaders[idx][name].hide) Loader.loaders[idx][name].element.textContent = Loader.loaders[idx][name].content;
      Loader.loaders[idx][name].loader.remove();
      Loader.loaders.splice(idx, 1);
    }
  }
}
