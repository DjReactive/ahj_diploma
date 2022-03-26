import AppFunc from '../AppFunc';

export default class Request {
  constructor() {
    this.isRequestSend = false;
    this.serverURL = 'https://react-ahj-diploma.herokuapp.com';
  }

  send(url, data = null) {
    if (this.isSending) return { error: true, response: 'Request already sending...' };

    const b64filesArray = [];
    let options;
    let addUrl = '';
    switch (url) {
      case 'attachments/add':
        options = { method: 'POST', type: 'json' }; break;
      case 'upload':
        options = { method: 'POST', type: 'file' }; break;
      case 'upload/remove':
        addUrl = `/${data.id}`;
        options = { method: 'DELETE', type: 'json' }; break;
      case 'send':
        options = { method: 'POST', type: 'json' }; break;
      case 'attachments/get':
        addUrl = `/${data.id}`;
        options = { method: 'GET', type: 'json' }; break;
      case '/attachments/generate-id':
        options = { method: 'GET', type: 'json' }; break;
      case 'search':
        addUrl = `/${data.string}`;
        options = { method: 'GET', type: 'json' }; break;
      case 'pin/set':
        addUrl = `/${data.id}`;
        options = { method: 'POST', type: 'json' }; break;
      case 'pin/get':
        options = { method: 'GET', type: 'json' }; break;
      case 'feed':
        if (data && data.hasOwnProperty('pages')) { addUrl = `/${data.pages.start}`; }
        if (data && data.pages.end !== null) addUrl += `-${data.pages.end}`;
        options = { method: 'GET', type: 'json' }; break;
      default:
        options = { method: 'GET', type: 'json' }; break;
    }
    this.isRequestSend = true;

    return (async () => {
      const response = await this.request(
        options.method, `${this.serverURL}/${url}${addUrl}`, options.type, data,
      );
      this.isRequestSend = false;
      return response;
    })();
  }

  async request(method, url, type, data = null) {
    const options = {
      method,
    };
    if (data && method !== 'GET') {
      if (type === 'file') {
        const formData = new FormData();
        formData.append('content', data.content);
        formData.append('type', data.type);
        formData.append('id', data.id);
        if (data.name) formData.append('name', data.name);
        options.body = formData;
      } else {
        options.body = JSON.stringify(data);
        options.headers = { 'Content-Type': 'application/json;charset=utf-8' };
      }
    }
    try {
      const response = await fetch(url, options);
      const result = await response.json();
      return (type === 'blob') ? AppFunc.b64ArrayToBlob(result) : result;
    } catch (err) {
      return { error: true, response: err };
    }
  }
}
