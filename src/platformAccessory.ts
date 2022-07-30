import {CharacteristicValue, PlatformAccessory, Service} from 'homebridge';

import {HealthBoxHomebridgePlatform} from './platform';
import axios from 'axios';
import {HealthBoxInfoResponse} from './model/api/health-box-info-response.http-model';
import {HealthBoxBoostResponse} from './model/api/health-box-boost-response.http-model';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class HealthBoxFanAccessory {
  private service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private state = {
    id: 1,
  };

  constructor(
    private readonly platform: HealthBoxHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.state.id = accessory.context.room.id;
    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Renson')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.manufacturer.serial);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Fanv2) || this.accessory.addService(this.platform.Service.Fanv2);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.platform.log.debug('Set name ->', accessory.context.room.name);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.room.name);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below

    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same sub type id.)
     */

    // Example: add two "motion sensor" services to the accessory
    // const motionSensorOneService = this.accessory.getService('Motion Sensor One Name') ||
    //   this.accessory.addService(this.platform.Service.MotionSensor, 'Motion Sensor One Name', 'YourUniqueIdentifier-1');
    //
    // const motionSensorTwoService = this.accessory.getService('Motion Sensor Two Name') ||
    //   this.accessory.addService(this.platform.Service.MotionSensor, 'Motion Sensor Two Name', 'YourUniqueIdentifier-2');

    /**
     * Updating characteristics values asynchronously.
     *
     * Example showing how to update the state of a Characteristic asynchronously instead
     * of using the `on('get')` handlers.
     * Here we change update the motion sensor trigger states on and off every 10 seconds
     * the `updateCharacteristic` method.
     *
     */
    // let motionDetected = false;
    // setInterval(() => {
    //   // EXAMPLE - inverse the trigger
    //   motionDetected = !motionDetected;
    //
    //   // push the new value to HomeKit
    //   motionSensorOneService.updateCharacteristic(this.platform.Characteristic.MotionDetected, motionDetected);
    //   motionSensorTwoService.updateCharacteristic(this.platform.Characteristic.MotionDetected, !motionDetected);
    //
    //   this.platform.log.debug('Triggering motionSensorOneService:', motionDetected);
    //   this.platform.log.debug('Triggering motionSensorTwoService:', !motionDetected);
    // }, 10000);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.platform.log.debug(value ? 'Enable boost for id' : 'Disable boost for id', this.state.id);
    const body = {
      'enable': value, 'level': 200, 'timeout': 3600,
    };

    await axios.put<HealthBoxBoostResponse>('http://192.168.178.26/v1/api/boost/' + this.state.id, body).then(result => {
      this.platform.log.debug(result.data.enable ? 'Boost enabled for id ' : 'Boost disabled for id ', this.state.id);
    });
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getOn(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    this.platform.log.debug('Requesting Boost status for id ', this.state.id);

    return axios.get<HealthBoxInfoResponse>('http://192.168.178.26/v1/api/data/current').then(resp => {
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
