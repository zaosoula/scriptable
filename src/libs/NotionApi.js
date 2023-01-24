// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: light-gray; icon-glyph: cube;
module.exports = class NotionApi {
  constructor(secret) {
    this.secret = secret;
    this.base = 'https://api.notion.com/v1';
  }

  request(method, url, body) {
    if (!this.base.endsWith('/')) {
      this.base += '/';
    }

    if (url.startsWith('/')) {
      // eslint-disable-next-line no-param-reassign
      url = url.slice(1);
    }

    const req = new Request(!url.includes('://') ? `${this.base}${url}` : url);
    req.method = method.toUpperCase();
    req.body = body ? JSON.stringify(body) : null;

    if (req.url.startsWith(this.base)) {
      req.headers = {
        Authorization: `Bearer ${this.secret}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      };
    }

    return req;
  }

  get(url) {
    return this.request('GET', url).loadJSON();
  }

  post(url, query) {
    return this.request('POST', url, query).loadJSON();
  }

  queryDatabase(databaseId, query) {
    return this.post(`databases/${databaseId}/query`, query);
  }

  getDatabase(databaseId) {
    return this.get(`databases/${databaseId}`);
  }

  getPage(pageId) {
    return this.get(`pages/${pageId}`);
  }

  getImage(url) {
    return this.request('GET', url).loadImage();
  }
};
