import {API, Characteristic, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service} from 'homebridge';

import {HEALTH_VERSION, PLATFORM_NAME, PLUGIN_NAME, VENTILATION_VERSION} from './settings';
import {HealthBoxFanAccessory} from './HealthBoxFanAccessory';
import axios, {AxiosResponse} from 'axios';
import {HealthBoxInfoResponse, Sensor} from './model/api/health-box-info-response.http-model';
import {HealthBoxApiService} from './health-box-api-service';
import {HealthBoxSensorAccessory} from './HealthBoxSensorAccessory';

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

  readonly healthBoxService;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.healthBoxService = new HealthBoxApiService(this.config['healthBoxUri'],
      this.config['boostFanSpeed'],
      this.config['boostDuration'],
      this.config['apiKey']);

    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.healthBoxService.activatePrivilegedMode();
      this.healthBoxService.doneValidatingApiKey().then(state => {
        this.log.info('Privileged status:', state);
        this.discoverDevices();
      });
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    this.accessories.push(accessory);
  }

  discoverDevices() {

    const healthBoxIp = this.config['healthBoxUri'];
    axios.get<HealthBoxInfoResponse>(healthBoxIp + '/v2/api/data/current').then(resp => {
      this.addVentilationAccessories(resp);
      this.addHealthSensors(resp);
    });
  }

  private addVentilationAccessories(resp: AxiosResponse<HealthBoxInfoResponse>) {
    for (const [id, room] of Object.entries(resp.data.room)) {
      const uuid = this.api.hap.uuid.generate(resp.data.serial + id);

      let existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory && (!existingAccessory.context.version || existingAccessory.context.version < VENTILATION_VERSION)) {
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        existingAccessory = undefined;
      }

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        new HealthBoxFanAccessory(this, existingAccessory, this.healthBoxService);
      } else {
        this.log.info('Adding new accessory:', room.name);

        const accessory = new this.api.platformAccessory(room.name, uuid);

        accessory.context.room = {...room, id};
        accessory.context.manufacturer = resp.data;
        accessory.context.version = VENTILATION_VERSION; //Version added so we can introduce breaking changes

        new HealthBoxFanAccessory(this, accessory, this.healthBoxService);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  private addHealthSensors(resp: AxiosResponse<HealthBoxInfoResponse>) {
    const rooms = Object.entries(resp.data.room).map(([id, room]) => ({...room, id}));
    let sensors: Sensor[] = resp.data.sensor;

    for (const room of rooms) {
      const s = room.sensor.map((sensor, sensorIndex) => ({...sensor, sensorIndex, id: room.id, name: room.name}));
      sensors = sensors.concat(s);
    }

    for (const sensor of sensors) {
      const uuid = this.api.hap.uuid.generate(resp.data.serial + sensor.basic_id + sensor.type);

      let existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory && (!existingAccessory.context.version || existingAccessory.context.version < HEALTH_VERSION)) {
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        existingAccessory = undefined;
      }

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        new HealthBoxSensorAccessory(this, existingAccessory, this.healthBoxService);
      } else {
        const accessory = new this.api.platformAccessory(sensor.name, uuid);

        accessory.context.sensor = sensor;
        accessory.context.manufacturer = resp.data;
        accessory.context.version = HEALTH_VERSION; //Version added so we can introduce breaking changes
        accessory.context.config = {};
        accessory.context.config.healthBoxIp = this.config['healthBoxUri'];

        if (new HealthBoxSensorAccessory(this, accessory, this.healthBoxService).isSupported) {
          this.log.info('Adding new accessory:', sensor.name);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
      }
    }
  }
}
