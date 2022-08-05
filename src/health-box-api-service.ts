import axios from 'axios';
import {Sensor} from './model/api/health-box-info-response.http-model';
import {HealthBoxBoostResponse} from './model/api/health-box-boost-response.http-model';


export class HealthBoxApiService {

  constructor(
    private healthBoxUrl: string,
    private boostFanSpeed: number,
    private boostDuration: number,
  ) {
  }

  private readonly GLOBAL_SENSOR_API = '/v2/api/data/current/sensor/';
  private readonly ROOM_API = '/v2/api/data/current/room/';
  private readonly BOOST_API = '/v2/api/boost/';

  public getHealthSensor(id: number): Promise<string> {
    return axios.get<string>(this.healthBoxUrl + this.GLOBAL_SENSOR_API + id + '/parameter/index/value')
      .then(axiosResponse => axiosResponse.data);
  }

  public getRoomActuatorValue(id: number): Promise<string> {
    return axios.get<string>(this.healthBoxUrl + this.ROOM_API + id + '/actuator/0/parameter/flow_rate/value')
      .then(axiosResponse => axiosResponse.data);
  }

  public boost(id: number, on: boolean): Promise<HealthBoxBoostResponse> {
    return axios.put<HealthBoxBoostResponse>(this.healthBoxUrl + this.BOOST_API + id, {
      'enable': on, 'level': this.boostFanSpeed, 'timeout': this.boostDuration,
    }).then(axiosResponse => axiosResponse.data);
  }
}