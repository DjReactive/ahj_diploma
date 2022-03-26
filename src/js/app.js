import Builder from './dom/Builder';

const storage = localStorage;
const builder = new Builder(storage);
builder.init();
