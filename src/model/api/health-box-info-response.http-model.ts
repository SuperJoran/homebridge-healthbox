export interface HealthBoxInfoResponse {
  serial: string;
  'device_type': string;
  description: string;
  room: Room[];
}

export interface Room {
  id: number;
  name: string;
  actuator: Actuator[];
  parameter: DetailedParameter;
}

export interface Actuator {
  'basic id': string;
  'type': string;
  parameter: Parameter;
}

export interface DetailedParameter {
  nominal: UnitValueType;
  measurement: UnitValueType;
}

export interface Parameter {
  'flow_rate': UnitValueType;
}

export interface UnitValueType {
  unit: string;
  value: string;
}