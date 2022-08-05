import {CharacteristicValue, PlatformAccessory, Service} from 'homebridge';

import {HealthBoxHomebridgePlatform} from './platform';
import {HealthBoxApiService} from './health-box-api-service';


export class HealthBoxFanAccessory {
  private service: Service;

  private state = {
    id: 1,
  };

  constructor(
    private readonly platform: HealthBoxHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly healthBoxService: HealthBoxApiService,
  ) {
    this.state.id = accessory.context.room.id;
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Renson')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.manufacturer.serial);

    this.service = this.accessory.getService(this.platform.Service.Fanv2) || this.accessory.addService(this.platform.Service.Fanv2);

    this.platform.log.debug('Set name ->', accessory.context.room.name);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.room.name);

    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setActive.bind(this))
      .onGet(this.getActive.bind(this));
  }

  async setActive(value: CharacteristicValue) {
    const on = value === 1;
    this.platform.log.debug(on ? 'Enable boost for id' : 'Disable boost for id', this.state.id);

    await this.healthBoxService.boost(this.state.id, on).then(result => {
      this.platform.log.debug(result.enable ? 'Boost enabled for id ' : 'Boost disabled for id ', this.state.id);
    });
  }

  async getActive(): Promise<CharacteristicValue> {
    this.platform.log.debug('Requesting Boost status for id ', this.state.id);
    return this.healthBoxService.getRoomActuatorValue(this.state.id).then(value => {
      const isOn = parseFloat(value) > 50;
      this.platform.log.debug(isOn ? 'Boost is currently ON for id ' : 'Boost is currently OFF for id', this.state.id);
      return isOn ? 1 : 0;
    });
  }
}
