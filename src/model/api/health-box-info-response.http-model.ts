export interface HealthBoxInfoResponse {
  'device_type': string;
  description: string;
  serial: string;
  warranty_number: string;
  'global': Global;
  room: { [id: string]: Room };
  sensor: GlobalSensor[];
}

export interface Global {
  parameter: GlobalParameters;
}

export interface GlobalParameters {
  'device name': UnitValueType;
  'legislation country': UnitValueType;
  warranty: UnitValueType;
}

export interface Room {
  name: string;
  'type': string;
  parameter: DetailedParameter;
  profile_name: 'health' | 'eco' | 'intense';
  actuator: Actuator[];
  sensor: RoomSensor[];
}

export interface Actuator {
  'type': string;
  name: string;
  basic_id: number;
  parameter: Parameter;
}

export interface DetailedParameter {
  nominal: UnitValueType;
  measurement: UnitValueType;
  doors_open: UnitValueType;
  doors_present: UnitValueType;
  icon: UnitValueType;
  measured_power: UnitValueType;
  measured_voltage: UnitValueType;
  offset: UnitValueType;
  subzone: UnitValueType;
  valve: UnitValueType;
  valve_warranty: UnitValueType;
}

export interface Parameter {
  flow_rate: UnitValueType;
}

export type PrimitiveTypes = boolean | number | string;

export interface UnitValueType {
  unit: string;
  value: PrimitiveTypes;
}

export interface CO2Parameter {
  concentration: UnitValueType;
}

export interface TemperatureParameter {
  temperature: UnitValueType;
}

export interface RelativeHumidityParameter {
  humidity: UnitValueType;
}

export interface AirQualityIndexParameter {
  index: UnitValueType;
  main_pollutant: UnitValueType;
}

export type RoomSensorParameters = AirQualityIndexParameter | RelativeHumidityParameter | TemperatureParameter | CO2Parameter;
export type RoomSensorParametersKeys = keyof (AirQualityIndexParameter & RelativeHumidityParameter & TemperatureParameter & CO2Parameter);


export interface Sensor {
  basic_id: number;
  name: string;
  'type': string;
}

export interface RoomSensor extends Sensor {
  'type': 'indoor relative humidity'
    | 'indoor CO2'
    | 'indoor temperature'
    | 'indoor air quality index'
    | 'indoor volatile organic compounds';
  parameter: RoomSensorParameters;
}


export interface GlobalSensor extends Sensor {
  'type': 'global air quality index';
  parameter: AirQualityIndexParameter & { room: UnitValueType };
}
