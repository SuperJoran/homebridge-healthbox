import axios from 'axios';
import {HealthBoxBoostResponse} from './model/api/health-box-boost-response.http-model';
import {PrimitiveTypes, RoomSensorParametersKeys} from './model/api/health-box-info-response.http-model';


export class HealthBoxApiService {

  constructor(
    private healthBoxUrl: string,
    private boostFanSpeed: number,
    private boostDuration: number,
    private apiKey: string | null,
  ) {
  }

  private readonly GLOBAL_SENSOR_API = '/v2/api/data/current/sensor/';
  private readonly ROOM_API = '/v2/api/data/current/room/';
  private readonly BOOST_API = '/v2/api/boost/';
  private readonly KEY_API = '/v2/api/api_key';
  private readonly STATUS_API = '/v2/api/api_key/status';

  public getGlobalValue(id: number, parameter: RoomSensorParametersKeys): Promise<PrimitiveTypes> {
    return axios.get<string>(`${this.healthBoxUrl}${this.GLOBAL_SENSOR_API}${id}/parameter/${parameter}/value`)
      .then(axiosResponse => axiosResponse.data);
  }

  public getValue(id: number, index: number, parameter: RoomSensorParametersKeys): Promise<PrimitiveTypes> {
    return axios.get<number>(`${this.healthBoxUrl}${this.ROOM_API}${id}/sensor/${index}/parameter/${parameter}/value`)
      .then(axiosResponse => axiosResponse.data);
  }

  public getRoomActuatorValue(id: number): Promise<string> {
    return axios.get<string>(`${this.healthBoxUrl}${this.ROOM_API}${id}/actuator/0/parameter/flow_rate/value`)
      .then(axiosResponse => axiosResponse.data);
  }

  public boost(id: number, on: boolean): Promise<HealthBoxBoostResponse> {
    return axios.put<HealthBoxBoostResponse>(this.healthBoxUrl + this.BOOST_API + id, {
      'enable': on, 'level': this.boostFanSpeed, 'timeout': this.boostDuration,
    }).then(axiosResponse => axiosResponse.data);
  }

  public activatePrivilegedMode(): void {
    axios.post(this.healthBoxUrl + this.KEY_API, this.apiKey, {headers: {'Content-Type': 'application/json'}}).then().catch();
  }


  // check every 250ms for validating process to complete on device
  public doneValidatingApiKey(): Promise<'valid' | 'empty' | 'validating' | 'invalid'> {
    return new Promise((resolve, reject) => {
      if (!this.apiKey) {
        return resolve('empty');
      }

      const interval = setInterval(() => {
        axios.get(this.healthBoxUrl + this.STATUS_API)
          .then(({data: {state}}) => {
            if (state !== 'validating') {
              clearInterval(interval);
              resolve(state);
            }
          })
          .catch(e => reject(e));
      }, 250);

      // timeout if no response
      setTimeout(() => {
        resolve('invalid');
        clearInterval(interval);
      }, 19_990);
    });
  }
}
