const MelCloudDriverMixin = require('../melcloudmixin');

class MelCloudDriverHP extends MelCloudDriverMixin {
  onInit() {
    // Device trigger flowcards
    this.ForcedWaterTrigger = this.homey.flow.getDeviceTriggerCard('Forced_Water_Trigger');
    this.ForcedWaterTrigger.registerRunListener((args) => {
      const forced = args.forced_hot_water_trigger;
      const conditionMet = forced === args.device.getCapabilityValue('forcedhotwater');
      return Promise.resolve(conditionMet);
    });

    this.ModeTrigger = this.homey.flow.getDeviceTriggerCard('Pump1_Thermostat_Trigger');
    this.ModeTrigger.registerRunListener((args) => {
      const conditionMet = args.mode_hpz1_action === args.device.getCapabilityValue('mode_heatpump1');
      return Promise.resolve(conditionMet);
    });

    this.Hot_Water_Trigger = this.homey.flow.getDeviceTriggerCard('Hot_Water_Trigger');
    this.Hot_Water_Trigger.registerRunListener(() => {
      const conditionMet = true;
      return Promise.resolve(conditionMet);
    });

    this.Cold_Water_Trigger = this.homey.flow.getDeviceTriggerCard('Cold_Water_Trigger');
    this.Cold_Water_Trigger.registerRunListener(() => {
      const conditionMet = true;
      return Promise.resolve(conditionMet);
    });

    this.OperationModeTrigger = this.homey.flow.getDeviceTriggerCard('Operation_Mode_Trigger');
    this.OperationModeTrigger.registerRunListener(() => {
      const conditionMet = true;
      return Promise.resolve(conditionMet);
    });

    // Condition flowcards
    this.ForcedHotWaterCondition = this.homey.flow.getConditionCard('Forced_Hot_Water_Condition');
    this.ForcedHotWaterCondition.registerRunListener((args) => {
      const forced = args.forced_hot_water_condition;
      const conditionMet = forced === args.device.getCapabilityValue('forcedhotwater');
      return Promise.resolve(conditionMet);
    });

    this.ModeCondition = this.homey.flow.getConditionCard('Pump1_Thermostat_Condition');
    this.ModeCondition.registerRunListener((args) => {
      const conditionMet = args.mode_hpz1_condition === args.device.getCapabilityValue('mode_heatpump1');
      return Promise.resolve(conditionMet);
    });

    this.Hot_Water_Condition = this.homey.flow.getConditionCard('Hot_Water_Condition');
    this.Hot_Water_Condition.registerRunListener((args) => {
      const conditionMet = args.hot_water_value <= args.device.getCapabilityValue('hot_temperature');
      return Promise.resolve(conditionMet);
    });

    this.Cold_Water_Condition = this.homey.flow.getConditionCard('Cold_Water_Condition');
    this.Cold_Water_Condition.registerRunListener((args) => {
      const conditionMet = args.cold_water_value >= args.device.getCapabilityValue('cold_temperature');
      return Promise.resolve(conditionMet);
    });

    this.OperationModeCondition = this.homey.flow.getConditionCard('Operation_Mode_Condition');
    this.OperationModeCondition.registerRunListener((args) => {
      const settings = args.device.getSettings();
      const conditionMet = args.operation_mode_condition === settings.operationmode;
      return Promise.resolve(conditionMet);
    });

    this.alarm_BoosterHeater1Condition = this.homey.flow.getConditionCard('alarm_BoosterHeater1_Condition');
    this.alarm_BoosterHeater1Condition.registerRunListener((args) => {
      const conditionMet = args.device.getCapabilityValue('alarm_boosterheater1');
      return Promise.resolve(conditionMet);
    });
    this.alarm_BoosterHeater2Condition = this.homey.flow.getConditionCard('alarm_BoosterHeater2_Condition');
    this.alarm_BoosterHeater2Condition.registerRunListener((args) => {
      const conditionMet = args.device.getCapabilityValue('alarm_boosterheater2');
      return Promise.resolve(conditionMet);
    });
    this.alarm_BoosterHeater2PlusCondition = this.homey.flow.getConditionCard('alarm_BoosterHeater2Plus_Condition');
    this.alarm_BoosterHeater2PlusCondition.registerRunListener((args) => {
      const conditionMet = args.device.getCapabilityValue('alarm_boosterheater2plus');
      return Promise.resolve(conditionMet);
    });
    this.alarm_ImmersionHeaterCondition = this.homey.flow.getConditionCard('alarm_ImmersionHeater_Condition');
    this.alarm_ImmersionHeaterCondition.registerRunListener((args) => {
      const conditionMet = args.device.getCapabilityValue('alarm_immersionheater');
      return Promise.resolve(conditionMet);
    });
    this.alarm_DefrostModeCondition = this.homey.flow.getConditionCard('alarm_DefrostMode_Condition');
    this.alarm_DefrostModeCondition.registerRunListener((args) => {
      const conditionMet = args.device.getCapabilityValue('alarm_DefrostMode_Condition');
      return Promise.resolve(conditionMet);
    });

    // Action flowcards
    this.ModeAction = this.homey.flow.getActionCard('Pump1_Thermostat_Action');
    this.ModeAction.registerRunListener((args) => {
      const value = args.mode_hpz1_action;
      args.device.onCapabilityMode(value);
      return Promise.resolve(value);
    });

    this.OperationModeAction = this.homey.flow.getActionCard('Operation_Mode_Action');
    this.OperationModeAction.registerRunListener((args) => {
      const value = args.operation_mode_action;
      args.device.onCapabilityOperationMode(value);
      return Promise.resolve(value);
    });

    this.Heat_Water_Action = this.homey.flow.getActionCard('Heat_Water_Action');
    this.Heat_Water_Action.registerRunListener((args) => {
      const value = args.heat_water_value;
      args.device.setSettings({ heattemperature: value });
      args.device.setCapabilityValue('heat_temperature', value);
      setTimeout(() => args.device.updateCapabilityValues(), 1000);
      return Promise.resolve(value);
    });

    this.Cool_Water_Action = this.homey.flow.getActionCard('Cool_Water_Action');
    this.Cool_Water_Action.registerRunListener((args) => {
      const value = args.cool_water_value;
      args.device.setSettings({ cooltemperature: value });
      args.device.setCapabilityValue('cold_temperature', value);
      setTimeout(() => args.device.updateCapabilityValues(), 1000);
      return Promise.resolve(value);
    });

    this.Water_Tank_Temp_Action = this.homey.flow.getActionCard('Water_Tank_Temp_Action');
    this.Water_Tank_Temp_Action.registerRunListener((args) => {
      const value = args.tank_water_value;
      args.device.setSettings({ tanktemperature: value });
      args.device.setCapabilityValue('watertank_temperature', value);
      setTimeout(() => args.device.updateCapabilityValues(), 1000);
      return Promise.resolve(value);
    });

    this.ForcedHotWaterAction = this.homey.flow.getActionCard('Forced_Hot_Water_Action');
    this.ForcedHotWaterAction.registerRunListener((args) => {
      const value = args.forced_hot_water_action;
      args.device.onCapabilityForcedHotWater(value);
      return Promise.resolve(value);
    });

    this.EcoHotWaterAction = this.homey.flow.getActionCard('Eco_Hot_Water_Action');
    this.EcoHotWaterAction.registerRunListener((args) => {
      const value = args.eco_hot_water_action;
      args.device.onCapabilityEcoHotWater(value);
      return Promise.resolve(value);
    });
  }

  triggerForcedHotWaterChange(device) {
    this.ForcedWaterTrigger.trigger(device);
    return this;
  }

  triggerModeChange(device) {
    this.ModeTrigger.trigger(device);
    return this;
  }

  triggerColdWaterChange(device) {
    this.Cold_Water_Trigger.trigger(device);
    return this;
  }

  triggerHotWaterChange(device) {
    this.Hot_Water_Trigger.trigger(device);
    return this;
  }

  triggerOperationModeChange(device) {
    this.OperationModeTrigger.trigger(device);
    return this;
  }
}

module.exports = MelCloudDriverHP;
