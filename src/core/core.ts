import { App } from './app';
import { Client } from './client';
import { Cordova } from './cordova';
import { Device } from './device';
import { EventEmitter } from './events';
import { Insights } from './insights';
import { Storage, LocalStorageStrategy } from './storage';
import { Logger } from './logger';
import { Config, config } from './config';
import { ILogger, ISettings, IPushNotificationEvent } from '../interfaces';

export class Core {

  app: App;
  client: Client;
  config: Config;
  cordova: Cordova;
  device: Device;
  emitter: EventEmitter;
  insights: Insights;
  logger: ILogger;
  storage: Storage;

  private _version = 'VERSION_STRING';

  constructor() {
    this.config = config;
    this.logger = new Logger();
    this.emitter = new EventEmitter();
    this.client = new Client(this.config.getURL('api'));
    this.device = new Device(this.emitter);
    this.cordova = new Cordova(this.device, this.emitter, { logger: this.logger });
    this.storage = new Storage(new LocalStorageStrategy());
    this.registerEventHandlers();
    this.cordova.load();
  }

  public init(cfg: ISettings) {
    this.config.register(cfg);
    this.emitter.emit('core:init');
    this.client.baseUrl = this.config.getURL('api');
    this.app = new App(this.config.get('app_id'));
    this.insights = new Insights(this.client, this.app, { logger: this.logger, intervalSubmit: 60 * 1000 });
    this.insights.track('mobileapp.opened');
  }

  public get version(): string {
    return this._version;
  }

  private registerEventHandlers(): void {
    this.emitter.on('cordova:resume', (data) => {
      this.insights.track('mobileapp.opened');
    });

    this.emitter.on('auth:token-changed', (data) => {
      this.client.token = data['new'];
    });

    this.emitter.on('push:notification', (data: IPushNotificationEvent) => {
      if (data.message.app.asleep || data.message.app.closed) {
        this.insights.track('mobileapp.opened.push');
      }
    });
  }

  /**
   * Fire a callback when core + plugins are ready. This will fire immediately
   * if the components have already become available.
   */
  onReady(callback) {
    // There's a chance this event was already emitted
    if (this.emitter.emitted('device:ready')) {
      callback(this);
    } else {
      this.emitter.on('device:ready', () => {
        callback(this);
      });
    }
  }
}

export let IonicCloud = new Core();
