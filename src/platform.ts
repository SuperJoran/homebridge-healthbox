import {API, Characteristic, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service} from 'homebridge';

import {PLATFORM_NAME, PLUGIN_NAME} from './settings';
import {HealthBoxFanAccessory} from './HealthBoxFanAccessory';
import axios, {AxiosResponse} from 'axios';
import {HealthBoxInfoResponse} from './model/api/health-box-info-response.http-model';
import {HealthBoxAirQualityAccessory} from './HealthBoxAirQualityAccessory';
import {HealthBoxApiService} from './health-box-api-service';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class HealthBoxHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  private healthBoxService;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.healthBoxService = new HealthBoxApiService(this.config['healthBoxUri'],
      this.config['boostFanSpeed'],
      this.config['boostDuration']);

    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    this.accessories.push(accessory);
  }

  discoverDevices() {

    const healthBoxIp = this.config['healthBoxUri'];
    axios.get<HealthBoxInfoResponse>(healthBoxIp + '/v1/api/data/current').then(resp => {
      this.addVentilationAccessories(resp);
      this.addHealthSensors(resp);
    });
  }

  private addVentilationAccessories(resp: AxiosResponse<HealthBoxInfoResponse>) {
    for (const room of resp.data.room) {

      const uuid = this.api.hap.uuid.generate(resp.data.serial + room.id);

      let existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory && (!existingAccessory.context.version || existingAccessory.context.version < 1)) {
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        existingAccessory = undefined;
      }

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        new HealthBoxFanAccessory(this, existingAccessory, this.healthBoxService);
      } else {
        this.log.info('Adding new accessory:', room.name);

        const accessory = new this.api.platformAccessory(room.name, uuid);

        accessory.context.room = room;
        accessory.context.manufacturer = resp.data;
        accessory.context.version = 1; //Version added so we can introduce breaking changes

        new HealthBoxFanAccessory(this, accessory, this.healthBoxService);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  private addHealthSensors(resp: AxiosResponse<HealthBoxInfoResponse>) {
    this.log.info('Adding health accessory existing accessory');
    const sensors = resp.data.sensor;
    for (const sensor of sensors) {
      const uuid = this.api.hap.uuid.generate(resp.data.serial + sensor['basic id']);

      let existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory && !existingAccessory.context.version) {
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        existingAccessory = undefined;
      }

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        new HealthBoxFanAccessory(this, existingAccessory, this.healthBoxService);
      } else {
        this.log.info('Adding new accessory:', sensor.name);

        const accessory = new this.api.platformAccessory(sensor.name, uuid);

        accessory.context.sensor = sensor;
        accessory.context.manufacturer = resp.data;
        accessory.context.version = 0; //Version added so we can introduce breaking changes
        accessory.context.config = {};
        accessory.context.config.healthBoxIp = this.config['healthBoxUri'];

        new HealthBoxAirQualityAccessory(this, accessory, this.healthBoxService);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}
