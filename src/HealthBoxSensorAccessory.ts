import {CharacteristicValue, PlatformAccessory, Service} from 'homebridge';

import {HealthBoxHomebridgePlatform} from './platform';
import {HealthBoxApiService} from './health-box-api-service';


export class HealthBoxSensorAccessory {
  private service: Service | undefined;

  public isSupported = false;

  private state = {
    basic_id: 1,
    roomId: 0,
    sensorId: 0,
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
    this.state.basic_id = accessory.context.sensor['basic_id'];
    this.state.roomId = accessory.context.sensor['id'];
    this.state.sensorId = accessory.context.sensor['sensorIndex'];
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Renson')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.manufacturer.serial);


    let sensorService, characteristic, onGet;

    if (accessory.context.sensor.type === 'global air quality index') {
      this.isSupported = true;
      sensorService = this.platform.Service.AirQualitySensor;
      characteristic = this.platform.Characteristic.AirQuality;
      onGet = this.getGlobalAirQuality.bind(this);
    }

    if (accessory.context.sensor.type === 'indoor air quality index') {
      this.isSupported = true;
      sensorService = this.platform.Service.AirQualitySensor;
      characteristic = this.platform.Characteristic.AirQuality;
      onGet = this.getAirQuality.bind(this);
    }

    if (accessory.context.sensor.type === 'indoor CO2') {
      this.isSupported = true;
      sensorService = this.platform.Service.CarbonDioxideSensor;
      characteristic = this.platform.Characteristic.CarbonDioxideLevel;
      onGet = this.getCO2.bind(this);
    }

    if (accessory.context.sensor.type === 'indoor temperature') {
      this.isSupported = true;
      sensorService = this.platform.Service.TemperatureSensor;
      characteristic = this.platform.Characteristic.CurrentTemperature;
      onGet = this.getTemperature.bind(this);
    }

    if (accessory.context.sensor.type === 'indoor relative humidity') {
      this.isSupported = true;
      sensorService = this.platform.Service.HumiditySensor;
      characteristic = this.platform.Characteristic.CurrentRelativeHumidity;
      onGet = this.getHumidity.bind(this);
    }

    if (accessory.context.sensor.type === 'indoor volatile organic compounds') {
      this.isSupported = false;
      // No Homebridge equivalent
    }

    if (this.isSupported) {
      this.service = this.accessory.getService(sensorService) || this.accessory.addService(sensorService);
      this.platform.log.debug('Set name:', accessory.context.sensor.name);
      this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.sensor.name);
      this.service.getCharacteristic(characteristic).onGet(onGet);
    }
  }

  async getCO2(): Promise<CharacteristicValue> {
    this.platform.log.debug('Requesting CO2 for room ', this.state.roomId);
    return this.healthBoxService.getValue(this.state.roomId, this.state.sensorId, 'concentration');
  }

  async getTemperature(): Promise<CharacteristicValue> {
    this.platform.log.debug('Requesting temperature for room ', this.state.roomId);
    return this.healthBoxService.getValue(this.state.roomId, this.state.sensorId, 'temperature');
  }

  async getHumidity(): Promise<CharacteristicValue> {
    this.platform.log.debug('Requesting humidity for room ', this.state.roomId);
    return this.healthBoxService.getValue(this.state.roomId, this.state.sensorId, 'humidity');
  }

  async getGlobalAirQuality(): Promise<CharacteristicValue> {
    this.platform.log.debug('Requesting Air quality status for id ', this.state.basic_id);
    return this.healthBoxService.getGlobalValue(this.state.basic_id, 'index')
      .then(indexValue => this.transformAirQuality(indexValue as number));
  }

  async getAirQuality(): Promise<CharacteristicValue> {
    this.platform.log.debug('Requesting air quality status for room ', this.state.roomId);
    return this.healthBoxService.getValue(this.state.roomId, this.state.sensorId, 'index')
      .then(indexValue => this.transformAirQuality(indexValue as number));
  }

  private transformAirQuality(indexValue: number) {
    const value = indexValue / 20;
    const roundedValue = Number(value.toFixed(0));

    if (roundedValue > 5) {
      this.platform.log.debug('Health status exceeded max value! value =', roundedValue);
      return 5;
    }

    this.platform.log.debug('Health status is:', roundedValue);
    return roundedValue;
  }
}
