export default class Settings<T extends Record<string, unknown>> extends Map {
  keychainKey: string;
  defaultSettings: T;

  constructor({ keychainKey, defaultSettings }: {
    keychainKey: string;
    defaultSettings: T
  }) {
    super();
    this.keychainKey = keychainKey;
    this.defaultSettings = JSON.parse(JSON.stringify(defaultSettings));
    this.load();
  }

  load() {
    const settings: T = Keychain.contains(this.keychainKey)
      ? {
        ...this.defaultSettings,
        ...this.readKeychain()
      }
      : this.defaultSettings;

    Object.entries(settings).forEach(entry => this.set(...entry));

    return this;
  }

  get<J extends keyof T>(key: J)  {
    return super.get(key);
  }

  patch(payload: Partial<T>) {
    Object.entries(payload).forEach(entry => this.set(...entry));
  }

  readKeychain() {
    return JSON.parse(Keychain.get(this.keychainKey));
  }

  save() {
    Keychain.set(this.keychainKey, JSON.stringify(Object.fromEntries(this.entries())));
    return this;
  }
} 
