import {CharacteristicValue, PlatformAccessory, Service} from 'homebridge';

import {HealthBoxHomebridgePlatform} from './platform';
import axios from 'axios';
import {HealthBoxInfoResponse} from './model/api/health-box-info-response.http-model';
import {HealthBoxBoostResponse} from './model/api/health-box-boost-response.http-model';


export class HealthBoxFanAccessory {
  private service: Service;

  private state = {
    id: 1,
    config: {
      boostFanSpeed: 200,
      boostDuration: 3600,
      healthBoxIp: 'http://localhost:8080',
    },
  };

  constructor(
    private readonly platform: HealthBoxHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.state.config.boostFanSpeed = accessory.context.config.boostFanSpeed;
    this.state.config.boostDuration = accessory.context.config.boostDuration;
    this.state.config.healthBoxIp = accessory.context.config.healthBoxIp;
    this.state.id = accessory.context.room.id;
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Renson')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.manufacturer.serial);

    this.service = this.accessory.getService(this.platform.Service.Fanv2) || this.accessory.addService(this.platform.Service.Fanv2);

    this.platform.log.debug('Set name ->', accessory.context.room.name);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.room.name);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));
  }

  async setOn(value: CharacteristicValue) {
    this.platform.log.debug(value ? 'Enable boost for id' : 'Disable boost for id', this.state.id);
    const body = {
      'enable': value, 'level': this.state.config.boostFanSpeed, 'timeout': this.state.config.boostDuration,
    };

    await axios.put<HealthBoxBoostResponse>(this.state.config.healthBoxIp + '/v1/api/boost/' + this.state.id, body).then(result => {
      this.platform.log.debug(result.data.enable ? 'Boost enabled for id ' : 'Boost disabled for id ', this.state.id);
    });
  }

  async getOn(): Promise<CharacteristicValue> {
    this.platform.log.debug('Requesting Boost status for id ', this.state.id);
    return axios.get<HealthBoxInfoResponse>(this.state.config.healthBoxIp + '/v1/api/data/current').then(resp => {
      const isPossiblyOn = resp.data.room.filter(room => room.id === this.state.id)
        .pop()!.actuator
        .filter(parameter => parameter.type === 'air valve')
        .map(actuator => actuator.parameter)
        .map(param => parseFloat(param.flow_rate.value) > 50)
        .pop();

      const isOn = isPossiblyOn ?? false;
      this.platform.log.debug(isOn ? 'Boost is currently ON for id ' : 'Boost is currently OFF for id', this.state.id);
      return isOn;
    });
  }
}
