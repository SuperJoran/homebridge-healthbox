import {CharacteristicValue, PlatformAccessory, Service} from 'homebridge';

import {HealthBoxHomebridgePlatform} from './platform';
import axios from 'axios';
import {HealthBoxInfoResponse} from './model/api/health-box-info-response.http-model';


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
    return axios.get<HealthBoxInfoResponse>(this.state.config.healthBoxIp + '/v1/api/data/current').then(resp => {
      let value = resp.data.sensor.filter(sensor => sensor['basic id'] === this.state.id)
        .map(sensor => parseFloat(sensor.parameter.index.value))
        .map(num => num / 20)
        .map(num => Number(num.toFixed(0)))
        .pop()!;

      if (value > 5) {
        this.platform.log.debug('Health status exceeded max value! value=', value);
        value = 5;
      }

      this.platform.log.debug('Health status is:', value);
      return value;
    });
  }
}
