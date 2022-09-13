'use strict';

const Homey = require('homey');
const http = require('http.min');

const { ManagerNotifications } = require('homey');

class MelCloudDevice extends Homey.Device {

  async onAdded() {
    try {
      console.log('Adding new device');
      await this.onInit();
    } catch (error) {
      throw new Error(error);
    }
  }

  onInit() {
    const capabilities = this.getCapabilities();
    this.registerCapabilityListener('onoff', this.onCapabilityOnOff.bind(this));
    this.registerCapabilityListener('target_temperature', this.onCapabilitySetTemperature.bind(this));
    this.registerCapabilityListener('mode_capability', this.onCapabilitySetMode.bind(this));
    this.registerCapabilityListener('thermostat_mode', this.onCapabilitySetthermostat_mode.bind(this));
    this.registerCapabilityListener('fan_power', this.onCapabilityFanSet.bind(this));
    this.registerCapabilityListener('vertical', this.onCapabilityVerticalSet.bind(this));
    this.registerCapabilityListener('horizontal', this.onCapabilityHorizontalSet.bind(this));
    this.getdevicedata(this);
  }

  async getdevicedata(data, callback) {
    try {
      let ContextKey = Homey.ManagerSettings.get('ContextKey');
      let data = this.getData();
      let driver = this.getDriver();
      let request = {
        uri: 'https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/Get?id=' + data.id + '&buildingID=' + data.buildingid,
        json: true,
        headers: {'X-MitsContextKey': ContextKey}
      };
      let result = await http.get(request).then(function (result) {
        if (result.response.statusCode !== 200) {
          return (new Error('No device'));
        }
        if (result.data) {
          return result;
        }
      });

      if (result.data.SetTemperature < 4) {
        this.setCapabilityValue('target_temperature', 4);
      } else if (result.data.SetTemperature > 35) {
        this.setCapabilityValue('target_temperature', 35);
      } else {
        this.setCapabilityValue('target_temperature', result.data.SetTemperature);
      }
      this.setCapabilityValue('measure_temperature', result.data.RoomTemperature);
      await this.setCapabilityValue('onoff', result.data.Power);
      if (this.getCapabilityValue('thermostat_mode') == null) {
        this.setCapabilityValue('thermostat_mode', 'off');
      }

      let mode = await this.Value2Mode(result.data.OperationMode);
      if (mode !== this.getCapabilityValue('mode_capability')) {
        driver.triggerThermostatModeChange(device);
      }

      await this.setCapabilityValue('mode_capability', mode)
      await this.SetTermostatModeValue(result.data.Power, mode)

      if (result.data.SetFanSpeed !== this.getCapabilityValue('fan_power')) {
        driver.triggerFanSpeedChange(device);
      }
      this.setCapabilityValue('fan_power', result.data.SetFanSpeed);
      let vertical = await this.Value2Vertical(result.data.VaneVertical);
      if (vertical !== this.getCapabilityValue('vertical')) {
        driver.triggerVerticalSwingChange(device);
      }
      this.setCapabilityValue('vertical', vertical);
      let horizontal = await this.Value2Horizontal(result.data.VaneHorizontal);
      if( horizontal !== this.getCapabilityValue('horizontal')) {
        driver.triggerHorizontalSwingChange(device);
      }
      this.setCapabilityValue('horizontal', horizontal);

      this._cancelTimeout = clearTimeout(this._syncTimeout);
      let updateInterval = this.getSettings().interval;
      let interval = 1000 * 60 * updateInterval;
      this._syncTimeout = setTimeout(this.getdevicedata.bind(this), interval);
    } catch (error) {
      throw new Error(error);
    }
  };

  async updateCapabilityValues(capability, value) {
    try {
      let ContextKey = Homey.ManagerSettings.get('ContextKey');
      let data = this.getData();
      let mode = await this.Mode2Value(this.getCapabilityValue('mode_capability'));
      let vertical = await this.Vertical2Value(this.getCapabilityValue('vertical'));
      let horizontal = await this.Horizontal2Value(this.getCapabilityValue('horizontal'));
      let request = {
        uri: 'https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/SetAta',
        json: true,
        headers: {'X-MitsContextKey': ContextKey},
        json: {
          'DeviceID': data.id,
          'EffectiveFlags' : 0x11F,
          'HasPendingCommand' : 'true',
          'Power': this.getCapabilityValue('onoff'),
          'SetTemperature': this.getCapabilityValue('target_temperature'),
          'OperationMode': mode,
          'SetFanSpeed': this.getCapabilityValue('fan_power'),
          'VaneVertical': vertical,
          'VaneHorizontal': horizontal
        }
      };
      let next;
      await http.post(request).then(function (result) {
        if (result.response.statusCode !== 200) {
          return (new Error('No device'));
        }
        if (result.data) {
          next = result.data.NextCommunication;
          return;
        }
      })
      this._syncTimeout = setTimeout(this.getdevicedata.bind(this), 2 * 60 * 1000);
    } catch (error) {
      throw new Error(error);
    }
  };

  async onCapabilityOnOff(value, opts) {
    try {
      await this.setCapabilityValue('onoff', value);
      if (value == true) {
        await this.SetTermostatModeValue();
      } else {
        this.setCapabilityValue('thermostat_mode', 'off');
      }
      this.updateCapabilityValues();
    } catch (error) {
      throw new Error(error);
    }
  };

  async onCapabilitySetTemperature(value, opts) {
    try{
      await this.setCapabilityValue('target_temperature', value);
      this.updateCapabilityValues();
    } catch (error) {
      throw new Error(error);
    }
  };

  async onCapabilitySetMode(value, opts) {
    try{
      await this.setCapabilityValue('mode_capability', value);
      let onoff = await this.getCapabilityValue('onoff');
      let mode = await this.getCapabilityValue('mode_capability');
      let driver = this.getDriver();
      driver.triggerThermostatModeChange(this);
      await this.SetTermostatModeValue(onoff, mode);
      this.updateCapabilityValues();
    } catch (error) {
      throw new Error(error);
    }
  };

  async onCapabilitySetthermostat_mode(value, opts) {
    try{
      await this.Value2ThermostatMode(value);
      this.updateCapabilityValues();
    } catch (error) {
      throw new Error(error);
    }
  };

  async onCapabilityVerticalSet(value, opts) {
    try{
      await this.setCapabilityValue('vertical', value);
      let driver = this.getDriver();
      driver.triggerVerticalSwingChange(this);
      this.updateCapabilityValues();
    } catch (error) {
      throw new Error(error);
    }
  };

  async onCapabilityHorizontalSet(value, opts) {
    try{
      await this.setCapabilityValue('horizontal', value);
      let driver = this.getDriver();
      driver.triggerHorizontalSwingChange(this);
      this.updateCapabilityValues();
    } catch (error) {
      throw new Error(error);
    }
  };

  async onCapabilityFanSet(value) {
    try{
      await this.setCapabilityValue('fan_power', value);
      let driver = this.getDriver();
      driver.triggerFanSpeedChange(this);
      this.updateCapabilityValues();
    } catch (error) {
      throw new Error(error);
    }
  };

  Mode2Value(value) {
    let mode;
    if (value == 'heat') {
      mode = 1;
    } else if (value == 'cool') {
      mode = 3;;
    } else if (value == 'auto') {
      mode = 8;
    } else if (value == 'off') {
      mode = 0;
    } else if (value == 'fan') {
      mode = 7;
    } else if (value == 'dry') {
      mode = 2;
    }
    return mode;
  }

  Value2Mode(mode) {
    let value;
    if (mode == 0) {
      value = 'off';
    } else if (mode == 1) {
      value = 'heat';
    } else if (mode == 2) {
      value = 'dry';
    } else if (mode == 3) {
      value = 'cool';
    } else if (mode == 7) {
      value = 'fan';
    } else if (mode == 8) {
      value = 'auto';
    }
    return value;
  }

  async SetTermostatModeValue(onoff, mode) {
    try {
      if (onoff == null) {
        onoff = await this.getCapabilityValue('onoff');
      }
      if (mode == null) {
        mode = await this.getCapabilityValue('mode_capability');
      }

      let thermostat_mode
      if (mode == 'cool' && onoff == true) {
        thermostat_mode = 'cool';
        await this.setCapabilityValue('onoff', true);
      } else if (mode == 'cool' && onoff == false) {
        thermostat_mode = 'off';
        await this.setCapabilityValue('onoff', false);
      } else if (mode == 'off') {
        thermostat_mode = 'off'
        await this.setCapabilityValue('onoff', false);
      } else if (mode == 'heat' && onoff == true) {
        thermostat_mode = 'heat';
        await this.setCapabilityValue('onoff', true)
      } else if (mode == 'heat' && onoff == false) {
        thermostat_mode = 'off';
        await this.setCapabilityValue('onoff', false);
      } else{
        if (onoff == true) {
          thermostat_mode = 'auto';
          await this.setCapabilityValue('onoff', true);
        } else {
          thermostat_mode = 'off';
          await this.setCapabilityValue('onoff', false);
        }
      }
      if (mode != 'fan' && mode != 'dry') {
        await this.setCapabilityValue('thermostat_mode', thermostat_mode);
      }
      await this.setCapabilityValue('mode_capability', mode);
      return thermostat_mode;
    } catch (error) {
      throw new Error(error);
    }
  };

  async Value2ThermostatMode(value) {
    try{
      await this.setCapabilityValue('thermostat_mode', value);
      if (value == 'off') {
         await this.setCapabilityValue('onoff', false);
      } else if (value == 'heat') {
         await this.setCapabilityValue('onoff', true);
         await this.setCapabilityValue('mode_capability', 'heat');
      } else if (value == 'cool') {
        await this.setCapabilityValue('onoff', true);
        await this.setCapabilityValue('mode_capability', 'cool');
      } else if (value == 'auto') {
        await this.setCapabilityValue('onoff', true);
        await this.setCapabilityValue('mode_capability', 'auto');
      }
      return;
    }catch (error) {
      throw new Error(error);
    }
  };

  Vertical2Value(value) {
    let vertical;
    if (value == 'auto') {
      vertical = 0;
    } else if (value == 'top') {
      vertical = 1;
    } else if (value == 'middletop') {
      vertical = 2;
    } else if (value == 'middle') {
      vertical = 3;
    } else if (value == 'middlebottom') {
      vertical = 4;
    } else if (value == 'bottom') {
      vertical = 5;
    } else if (value == 'swing') {
      vertical = 7;
    }
    return vertical;
  }

  Value2Vertical(vertical) {
    let value;
    if (vertical == 0){
      value = 'auto';
    } else if (vertical == 1){
      value = 'top';
    } else if (vertical == 2){
      value = 'middletop';
    } else if (vertical == 3){
      value = 'middle';
    } else if (vertical == 4){
      value = 'middlebottom';
    } else if (vertical == 5){
      value = 'bottom';
    } else if (vertical == 7){
      value = 'swing';
    }
    return value;
  }

  Horizontal2Value(value) {
    let horizontal;
    if (value == 'auto') {
      horizontal = 0;
    } else if (value == 'left') {
      horizontal = 1;
    } else if (value == 'middleleft') {
      horizontal = 2;
    } else if (value == 'middle') {
      horizontal = 3;
    } else if (value == 'middleright') {
      horizontal = 4;
    } else if (value == 'right') {
      horizontal = 5;
    } else if (value == 'split') {
      horizontal = 8;
    } else if (value == 'swing') {
      horizontal = 12;
    }
    return horizontal;
  }

  Value2Horizontal(horizontal) {
    let value;
    if (horizontal == 0) {
      value = 'auto';
    } else if (horizontal == 1) {
      value = 'left';
    } else if (horizontal == 2) {
      value = 'middleleft';
    } else if (horizontal == 3) {
      value = 'middle';
    } else if (horizontal == 4) {
      value = 'middleright';
    } else if (horizontal == 5) {
      value = 'right';
    } else if (horizontal == 8) {
      value = 'split';
    } else if (horizontal == 12) {
      value = 'swing';
    }
    return value;
  }

}

module.exports = MelCloudDevice;
