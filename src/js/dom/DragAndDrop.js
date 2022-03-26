export default class DnD {
  constructor(builder, dropArea) {
    const classActive = 'active';
    const classEnter = 'drop__enter';
    const drop = dropArea.querySelector('.drop__inside');
    this.dragged = false;

    document.addEventListener('dragleave', (e) => {
      e.preventDefault();
      if (!this.dragged) this.removeClass(dropArea, classActive);
    });
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.addClass(dropArea, classActive);
    });
    dropArea.addEventListener('dragenter', (e) => {
      e.preventDefault();
      this.addClass(drop, classEnter);
      this.dragged = true;
    });
    dropArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.removeClass(drop, classEnter);
      this.dragged = false;
    });
    dropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.removeClass(dropArea, classActive);
      this.removeClass(dropArea, classEnter);

      if (e.dataTransfer.files.length < 1) return;

      this.dragged = false;
      const files = Array.from(e.dataTransfer.files);
      builder._Buttons.fileCreateAttachments(files);
    });
  }

  addClass(el, classname) {
    if (!el.classList.contains(classname)) el.classList.add(classname);
  }

  removeClass(el, classname) {
    if (el.classList.contains(classname)) el.classList.remove(classname);
  }
}
