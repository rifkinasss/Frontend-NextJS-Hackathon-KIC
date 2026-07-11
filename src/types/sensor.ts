export interface SensorDefinition {
  id: number;
  sensor_code: string;
  sensor_name: string;
  manufacturer?: string;
  description?: string;
  interface_type?: string;
  is_active: boolean;
  created_at: string;
}

export interface DeviceSensorMapping {
  id: number;
  device_id: string;
  sensor_def_id: number;
  gpio_pin?: string;
  i2c_address?: string;
  install_date: string;
  notes?: string;
  sensor_code: string;
  sensor_name: string;
  interface_type?: string;
}
