import {CharacteristicValue, PlatformAccessory, Service} from 'homebridge';

import {HealthBoxHomebridgePlatform} from './platform';
import {HealthBoxApiService} from './health-box-api-service';


export class HealthBoxAirQualityAccessory {
  private service: Service;

  private state = {
    id: 1,
    config: {
      healthBoxIp: 'http://localhost:8080',
    },
  };

  constructor(
    private readonly platform: HealthBoxHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly healthBoxService: HealthBoxApiService,
  ) {
    this.state.config.healthBoxIp = accessory.context.config.healthBoxIp;
    this.state.id = accessory.context.sensor['basic id'];
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Renson')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.manufacturer.serial);

    this.service = this.accessory.getService(this.platform.Service.AirQualitySensor)
      || this.accessory.addService(this.platform.Service.AirQualitySensor);

    this.platform.log.debug('Set name ', accessory.context.sensor.name);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.sensor.name);

    this.service.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.getOn.bind(this));
  }

  async getOn(): Promise<CharacteristicValue> {
    this.platform.log.debug('Requesting Air quality status for id ', this.state.id);
    return this.healthBoxService.getHealthSensor(this.state.id).then(indexValue => {
      const value = parseFloat(indexValue) / 20;
      let roundedValue = Number(value.toFixed(0));

      if (roundedValue > 5) {
        this.platform.log.debug('Health status exceeded max value! value=', roundedValue);
        roundedValue = 5;
      }

      this.platform.log.debug('Health status is:', roundedValue);
      return roundedValue;
    });
  }
}
