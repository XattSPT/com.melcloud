'use strict';

const Homey = require('homey');
const http = require('http.min');

const { ManagerNotifications } = require('homey');

class MelCloudDevice extends Homey.Device {

    async onAdded(){
        try{
            console.log("adding new device")
            await this.onInit();    
        } catch (error) {
            throw new Error(err); 
        }
    }

    onInit() {
        const capabilities = this.getCapabilities();
        this.registerCapabilityListener('onoff', this.onCapabilityOnOff.bind(this));
        this.registerCapabilityListener('target_temperature', this.onCapabilitySetTemperature.bind(this));
        this.registerCapabilityListener('forcedhotwater', this.onCapabilityForcedHotWater.bind(this));
        this.registerCapabilityListener('mode_heatpump1', this.onCapabilityMode.bind(this));
        this.getdevicedata(this);

        if (!this.hasCapability('heat_temperature')){
            this.addCapability('heat_temperature')
        }
        if (!this.hasCapability('cool_temperature')){
            this.addCapability('cool_temperature')
        }
        if (!this.hasCapability('meter_heatpumpfrequency')){
            this.addCapability('meter_heatpumpfrequency')
        }
        if (!this.hasCapability('meter_power_consumed_yesterday')) {
            this.addCapability('meter_power_consumed_yesterday')
        }
        if (!this.hasCapability('meter_power_produced_yesterday')) {
            this.addCapability('meter_power_produced_yesterday')
        }
        if (!this.hasCapability('meter_cop_yesterday')) {
            this.addCapability('meter_cop_yesterday')
        }

    }

    getdevicedata(data, callback){
        try {
        let ContextKey = Homey.ManagerSettings.get('ContextKey')
        let devicee = this.getData() 
        let zone = devicee.zone
        if (zone == null) zone = 1
        console.log("Zone: ", zone)
        let device = this 
        let searchdevice = devicee.id
        let askdevice = {
            uri: "https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/Get?id="+devicee.id+"&buildingID="+devicee.buildingid,
            json: true,
            headers: {'X-MitsContextKey': ContextKey},
        }
        let driver = this.getDriver()
        http.get(askdevice).then(function (result) {
            if (result.response.statusCode !== 200) return (new Error('no_devices'))
            //console.log(result.data)
            if (result.data) {
                let settings = device.getSettings()
                let modeold = settings.operationmode 
                let heattempold = settings.heat_temperature
                let coldtempold = settings.cold_temperature
                let eco = Boolean
                if(result.data.EcoHotWater === true){
                    eco = true
                }else{
                    eco = false
                }
                if (zone == 1){
                    device.setSettings({
                        'heattemperature': result.data.SetHeatFlowTemperatureZone1,
                        'cooltemperature': result.data.SetCoolFlowTemperatureZone1,
                        'tanktemperature': result.data.SetTankWaterTemperature,
                        'ecohotwater': eco, //result.data.EcoHotWater,
                        'operationmode' : String(result.data.OperationMode),
                        'operationmodezone' : String(result.data.OperationModeZone1)
                    })
                    if (result.data.SetTemperatureZone1 < 10){
                        device.setCapabilityValue("target_temperature", 10)  
                    }else if (result.data.SetTemperatureZone1 > 30) {
                        device.setCapabilityValue("target_temperature", 30)
                    } else {
                        device.setCapabilityValue("target_temperature", result.data.SetTemperatureZone1) 
                    }
                    device.setCapabilityValue("mode_heatpump1", String(result.data.OperationModeZone1))
                    device.setCapabilityValue("measure_temperature", result.data.RoomTemperatureZone1)
                    device.setCapabilityValue("heat_temperature", result.data.SetHeatFlowTemperatureZone1)
                    device.setCapabilityValue("cool_temperature", result.data.SetCoolFlowTemperatureZone1)
                    if (heattempold != result.data.SetHeatFlowTemperatureZone1){
                        driver.triggerHotWaterChange (device)    
                    }
                    if (coldtempold != result.data.SetCoolFlowTemperatureZone1){
                        driver.triggerColdWaterChange (device)    
                    }
                }else{
                    device.setSettings({
                        'heattemperature': result.data.SetHeatFlowTemperatureZone2,
                        'cooltemperature': result.data.SetCoolFlowTemperatureZone2,
                        'tanktemperature': result.data.SetTankWaterTemperature,
                        'ecohotwater': eco, //result.data.EcoHotWater,
                        'operationmode' : String(result.data.OperationMode),
                        'operationmodezone' : String(result.data.OperationModeZone2)
                    })
                    if (result.data.SetTemperatureZone2 < 10){
                        device.setCapabilityValue("target_temperature", 10)  
                    }else if (result.data.SetTemperatureZone2 > 30) {
                        device.setCapabilityValue("target_temperature", 30)
                    } else {
                        device.setCapabilityValue("target_temperature", result.data.SetTemperatureZone2) 
                    }
                    device.setCapabilityValue("mode_heatpump1", String(result.data.OperationModeZone2))
                    device.setCapabilityValue("measure_temperature", result.data.RoomTemperatureZone2)
                    device.setCapabilityValue("heat_temperature", result.data.SetHeatFlowTemperatureZone2)
                    device.setCapabilityValue("cool_temperature", result.data.SetCoolFlowTemperatureZone2)
                    if (heattempold != result.data.SetHeatFlowTemperatureZone2){
                        driver.triggerHotWaterChange (device)    
                    }
                    if (coldtempold != result.data.SetCoolFlowTemperatureZone2){
                        driver.triggerColdWaterChange (device)    
                    }
                }


                device.setCapabilityValue("outside_temperature", result.data.OutdoorTemperature)        
                if (device.hasCapability('onoff')==true) {
                    device.setCapabilityValue("onoff", result.data.Power)
                }
                let forcedold = device.getCapabilityValue("forcedhotwater")         
                if (forcedold != result.data.ForcedHotWaterMode){
                    console.log("trigger forced hot water")
                    driver.triggerForcedHotWaterChange (device)    
                }

                if (modeold != result.data.OperationMode){
                    driver.triggerOperationModeChange (device)    
                }
                let toperationmode
                switch (result.data.OperationMode) {
                    default:
                        toperationmode = "Off"
                        break;
                    case 1:
                        toperationmode = "DHW-Heating"
                        break;
                    case 2:
                        toperationmode = "Heating"
                        break;
                    case 3:
                        toperationmode = "Cooling"
                        break;  
                    case 4:
                        toperationmode = "Defrost"
                        break;
                    case 5:
                        toperationmode = "Standby"
                        break;
                    case 6:
                        toperationmode = "Legionella"
                        break;
                }                    
                device.setCapabilityValue("measure_OperationMode", toperationmode)
                device.setCapabilityValue("forcedhotwater", result.data.ForcedHotWaterMode)                
                device.setCapabilityValue("watertank_temperature", result.data.TankWaterTemperature)

              
                console.log("************ UPDATE DEVICE FROM CLOUD - " + devicee.name + "******************")
                console.log("equip: ",devicee.name)
                if (device.hasCapability('onoff')) console.log("onoff: ",device.getCapabilityValue("onoff"))
                console.log("target_temperature: ",device.getCapabilityValue('target_temperature'))
                console.log("measure_temperature: ",device.getCapabilityValue('measure_temperature'))
                console.log("forcedhotwater: ",device.getCapabilityValue('forcedhotwater'))
                console.log("watertank_temperature: ",device.getCapabilityValue('watertank_temperature'))
                console.log("outside_temperature: ",device.getCapabilityValue('outside_temperature'))
                console.log("hot_temperature: ",device.getCapabilityValue('hot_temperature'))
                console.log("cold_temperature: ",device.getCapabilityValue('cold_temperature'))
                console.log("Operation mode Zone: ",device.getCapabilityValue('mode_heatpump1'))
                console.log("Operation Mode: ",device.getCapabilityValue('measure_OperationMode'))
                console.log("EcoHotWater: ", result.data.EcoHotWater)
                return "HOLA"
            }
        })

        let askdevices = {
            uri: "https://app.melcloud.com/Mitsubishi.Wifi.Client/User/ListDevices",
            json: true,
            headers: {
                'X-MitsContextKey': ContextKey,
                'Content-type': 'application/json'
            }
        }

        http.get(askdevices).then(function (result) {
            if (result.response.statusCode !== 200) return (new Error('no_token'))
            if (result.data) {
                    let a;
                    let b;
                    let f;
                    let z;
                    let devices = []
                    let device2 = []
                    for (a = 0; a < result.data.length; a++) {
                        for (b = 0; b < result.data[a].Structure.Devices.length; b++) {
                            device2 = result.data[a].Structure.Devices[b]
                            if(searchdevice == device2.DeviceID){
                                let defrost = Boolean
                                switch (device2.Device.DefrostMode){
                                    case 2:
                                        defrost = true;
                                        break;
                                    default:
                                        defrost = false;
                                        break;
                                }
                                //console.log("1", device2.Device)
                                device.setCapabilityValue("alarm_DefrostMode", defrost)
                                device.setCapabilityValue("alarm_BoosterHeater1", device2.Device.BoosterHeater1Status),
                                device.setCapabilityValue("alarm_BoosterHeater2", device2.Device.BoosterHeater2Status),
                                device.setCapabilityValue("alarm_BoosterHeater2Plus", device2.Device.BoosterHeater2PlusStatus),
                                device.setCapabilityValue("alarm_ImmersionHeater", device2.Device.ImmersionHeaterStatus),
                                device.setCapabilityValue("cold_temperature", device2.Device.ReturnTemperature),
                                device.setCapabilityValue("hot_temperature", device2.Device.FlowTemperature),
                                device.setCapabilityValue("meter_heatpumpfrequency", device2.Device.HeatPumpFrequency)

                            }
                        }
                        for (f = 0; f < result.data[a].Structure.Floors.length; f++) {
                            for (b = 0; b < result.data[a].Structure.Floors[f].Devices.length; b++) {
                                device2 = result.data[a].Structure.Floors[f].Devices[b]
                                if(searchdevice == device2.DeviceID){
                                    let defrost = Boolean

                                    switch (device2.Device.DefrostMode){
                                        case 2:
                                            defrost = true;
                                            break;
                                        default:
                                            defrost = false;
                                            break;
                                    }
                                    //console.log("2", device2.Device)
                                    device.setCapabilityValue("alarm_DefrostMode", defrost)
                                    device.setCapabilityValue("alarm_BoosterHeater1", device2.Device.BoosterHeater1Status),
                                    device.setCapabilityValue("alarm_BoosterHeater2", device2.Device.BoosterHeater2Status),
                                    device.setCapabilityValue("alarm_BoosterHeater2Plus", device2.Device.BoosterHeater2PlusStatus),
                                    device.setCapabilityValue("alarm_ImmersionHeater", device2.Device.ImmersionHeaterStatus),
                                    device.setCapabilityValue("cold_temperature", device2.Device.ReturnTemperature),
                                    device.setCapabilityValue("hot_temperature", device2.Device.FlowTemperature),
                                    device.setCapabilityValue("meter_heatpumpfrequency", device2.Device.HeatPumpFrequency)
                                }
                            }
                            for (f = 0; f < result.data[a].Structure.Floors.length; f++) {
                                for (z = 0; z < result.data[a].Structure.Floors[f].Areas.length; z++) {
                                    for (b = 0; b < result.data[a].Structure.Floors[f].Areas[z].Devices.length; b++) {
                                        device2 = result.data[a].Structure.Floors[f].Areas[z].Devices[b]
                                        if(searchdevice == device2.DeviceID){
                                            let defrost = Boolean
                                            switch (device2.Device.DefrostMode){
                                                case 2:
                                                    defrost = true;
                                                    break;
                                                default:
                                                    defrost = false;
                                                    break;
                                            }
                                            //console.log("3",device2.Device)
                                            device.setCapabilityValue("alarm_DefrostMode", defrost)
                                            device.setCapabilityValue("alarm_BoosterHeater1", device2.Device.BoosterHeater1Status),
                                            device.setCapabilityValue("alarm_BoosterHeater2", device2.Device.BoosterHeater2Status),
                                            device.setCapabilityValue("alarm_BoosterHeater2Plus", device2.Device.BoosterHeater2PlusStatus),
                                            device.setCapabilityValue("alarm_ImmersionHeater", device2.Device.ImmersionHeaterStatus),
                                            device.setCapabilityValue("cold_temperature", device2.Device.ReturnTemperature),
                                            device.setCapabilityValue("hot_temperature", device2.Device.FlowTemperature),
                                            device.setCapabilityValue("meter_heatpumpfrequency", device2.Device.HeatPumpFrequency)
                                        }
                                    }
                                }
                            }
                        }
                        for (z = 0; z < result.data[a].Structure.Areas.length; z++) {
                            for (b = 0; b < result.data[a].Structure.Areas[z].Devices.length; b++) {
                                device2 = result.data[a].Structure.Areas[z].Devices[b]
                                if(searchdevice == device2.DeviceID){
                                    let defrost = Boolean
                                    switch (device2.Device.DefrostMode){
                                        case 2:
                                            defrost = true;
                                            break;
                                        default:
                                            defrost = false;
                                            break;
                                    }
                                    //console.log("4",device2.Device)
                                    device.setCapabilityValue("alarm_DefrostMode", defrost)
                                    device.setCapabilityValue("alarm_BoosterHeater1", device2.Device.BoosterHeater1Status),
                                    device.setCapabilityValue("alarm_BoosterHeater2", device2.Device.BoosterHeater2Status),
                                    device.setCapabilityValue("alarm_BoosterHeater2Plus", device2.Device.BoosterHeater2PlusStatus),
                                    device.setCapabilityValue("alarm_ImmersionHeater", device2.Device.ImmersionHeaterStatus),
                                    device.setCapabilityValue("cold_temperature", device2.Device.ReturnTemperature),
                                    device.setCapabilityValue("hot_temperature", device2.Device.FlowTemperature),
                                    device.setCapabilityValue("meter_heatpumpfrequency", device2.Device.HeatPumpFrequency)
                                }
                            }
                        }
                    }
                return "HOLA"
            }

        })

        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayFormatted = `${yesterday.getFullYear()}-${yesterday.getMonth()+1}-${yesterday.getDate()}T00:00:00`
        let energyreport = {
            uri: "https://app.melcloud.com/Mitsubishi.Wifi.Client/EnergyCost/Report",
            json: true,
            json: {
                DeviceId: devicee.id,
                UseCurrency: false,
                FromDate: yesterdayFormatted,
                ToDate: yesterdayFormatted
            },
            headers: {'X-MitsContextKey': ContextKey},
        }
        http.post(energyreport).then(function (result) {
            if (result.response.statusCode !== 200) return (new Error('no_energy_report'))
            if (result.data) {
                const totalConsumed = result.data.TotalCoolingConsumed + result.data.TotalHeatingConsumed + result.data.TotalHotWaterConsumed
                const totalProduced = result.data.TotalCoolingProduced + result.data.TotalHeatingProduced + result.data.TotalHotWaterProduced
                device.setCapabilityValue("meter_power_consumed_yesterday", totalConsumed)
                device.setCapabilityValue("meter_power_produced_yesterday", totalProduced)
                device.setCapabilityValue("meter_cop_yesterday", result.data.CoP[0])
            }
        })

        this._cancelTimeout = clearTimeout(this._syncTimeout)
        let updateInterval = this.getSettings().interval
        let interval = 1000 * 60 * updateInterval;
        this._syncTimeout = setTimeout(this.getdevicedata.bind(this), (interval));
        console.log("Next update for " + devicee.name + " in ... " + updateInterval + " min - from UPDATE")
    }catch (err) {
        throw new Error(err);
    }
    }

    async updateCapabilityValues(capability, value) {
        try {
            let ContextKey = Homey.ManagerSettings.get('ContextKey')
            let devicee = this.getData() 
            let device = this
            let zone = devicee.zone
            console.log("Zone update:", zone)
            console.log("************ SET DEVICE TO CLOUD - " + devicee.name + "******************")
            console.log("equip: ",devicee.name)
            if(this.hasCapability('onoff)')) console.log("onoff: ",this.getCapabilityValue('onoff'))
            console.log("target_temperature: ",this.getCapabilityValue('target_temperature'))
            console.log("forcedhotwater: ",this.getCapabilityValue('forcedhotwater'))
            console.log("watertank_temperature: ",this.getCapabilityValue('watertank_temperature'))
            console.log("mode_heatpump1",  this.getCapabilityValue("mode_heatpump1"))
            let settings = await device.getSettings()
            console.log("OperationMode",  settings.operationmode)
            console.log("EcoHotWater",  settings.ecohotwater)
            let power 
            if (this.hasCapability('onoff')) {
                power = this.getCapabilityValue('onoff')
            } else {
                power = true
            }
            
            let askdevice
            if (zone == "1"){
                askdevice = {
                    uri: "https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/SetAtw",
                    json: true,
                    headers: {
                        'X-MitsContextKey': ContextKey,
                        'Content-Type' : 'application/json; charset=UTF-8'
                    },
                    json:{
                        'DeviceID': devicee.id,
                        'EffectiveFlags' : 281483566710825,
                        'HasPendingCommand' : 'true',
                        'Power': power,
                        'SetTemperatureZone1': this.getCapabilityValue('target_temperature'),
                        'ForcedHotWaterMode': this.getCapabilityValue('forcedhotwater'),
                        'SetHeatFlowTemperatureZone1': settings.heattemperature,
                        'SetCoolFlowTemperatureZone1': settings.cooltemperature,
                        'SetTankWaterTemperature': settings.tanktemperature,
                        'EcoHotWater': settings.ecohotwater,
                        'OperationModeZone1': this.getCapabilityValue('mode_heatpump1'),
                        'OperationMode': settings.operationmode
                    }
                }
            }else{
                askdevice = {
                    uri: "https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/SetAtw",
                    json: true,
                    headers: {
                        'X-MitsContextKey': ContextKey,
                        'Content-Type' : 'application/json; charset=UTF-8'
                    },
                    json:{
                        'DeviceID': devicee.id,
                        'EffectiveFlags' : 281509336515113,
                        'HasPendingCommand' : 'true',
                        'Power': power,
                        'SetTemperatureZone2': this.getCapabilityValue('target_temperature'),
                        'ForcedHotWaterMode': this.getCapabilityValue('forcedhotwater'),
                        'SetHeatFlowTemperatureZone2': settings.heattemperature,
                        'SetCoolFlowTemperatureZone2': settings.cooltemperature,
                        'SetTankWaterTemperature': settings.tanktemperature,
                        'EcoHotWater': settings.ecohotwater,
                        'OperationModeZone2': this.getCapabilityValue('mode_heatpump1'),
                        'OperationMode': settings.operationmode
                    }
                }
                
            }
            //console.log(askdevice)
            let next 
            await http.post(askdevice).then(function (result) {
                if (result.response.statusCode !== 200) return (new Error('no_devices'))
                if (result.data) {
                    next = result.data.NextCommunication
                    return "HOLA"
                }
            })
            this._syncTimeout = setTimeout(this.getdevicedata.bind(this), (1*60*1000));
            console.log("Update in ... 1 min - FROM SET")
        } catch (error){
            throw new Error(err); 
        }
    };

    async onSettings(oldSettingsObj, newSettingsObj, changedKeysArr ){
        try{
            let mode = await this.getCapabilityValue('mode_heatpump1')
            if(mode !== newSettingsObj.operationmodezone) {
                await this.setCapabilityValue('mode_heatpump1', newSettingsObj.operationmodezone)
            }
            await setTimeout(() => this.alwayson(), 1000)
            this._syncTimeout = setTimeout(this.updateCapabilityValues.bind(this), (2000));
        }catch (err) {
            throw new Error(err);   
        }
    }

    async alwayson(){
        try{
            let settings = this.getSettings()
            let device = this
            if (settings.alwayson == true && this.hasCapability('onoff')){
                console.log("remove")
                device.removeCapability('onoff')
            } else if (settings.alwayson == false && this.hasCapability('onoff')==false) {
                console.log("add")
                device.addCapability('onoff')
            }
        }catch (err) {
            throw new Error(err);   
        }
    }



    async onCapabilityOnOff (value, opts){
        try{
            console.log("ON OFF")
            let settings = this.getSettings()
            if (this.hasCapability('onoff')){
                await this.setCapabilityValue('onoff', value)
                console.log("onoff change")
            }
            this.updateCapabilityValues()
        }catch (err) {
            throw new Error(err);
        }
    } 

    async onCapabilityMode (value, opts){
        try{
            console.log("MODE")
            await this.setCapabilityValue('mode_heatpump1', value)
            let driver = this.getDriver()
            driver.triggerModeChange (this)
            this.updateCapabilityValues()
        }catch (err) {
            throw new Error(err);
        }
    } 
    async onCapabilityOperationMode (value, opts){
        try{
            console.log("OPERATING MODE")
            let settings = this.getSettings()     
            await this.setSettings({
                'operationmode' : String(value)
            })
            this.updateCapabilityValues()
        }catch (err) {
            throw new Error(err);
        }
    } 
    
    async onCapabilityForcedHotWater (value, opts){
        try{
            console.log("FORCED WATER")
            let forced = Boolean
            if (value === true){
                forced = true
            } else if (value == "true"){
                forced = true 
            } else {
                forced = false
            }
            console.log("changed")
            await this.setCapabilityValue('forcedhotwater', forced)
            let driver = this.getDriver()
            driver.triggerForcedHotWaterChange (this)
            this.updateCapabilityValues()
        }catch (err) {
            throw new Error(err);
        }
    } 

    async onCapabilityEcoHotWater (value, opts){
        try{
            console.log("ECO WATER", value)
            let eco = Boolean
            if (value === true){
                eco = true
            } else if (value == "true"){
                eco = true 
            } else {
                eco = false
            }
            console.log("eco:", eco, " value:", value)
            await this.setSettings({
                'ecohotwater' : value  //abans eco
            })
            this.updateCapabilityValues()
        }catch (err) {
            throw new Error(err);
        }
    } 

    async onCapabilitySetTemperature (value, opts){
        try{
            console.log("SET TEMPERATURE")
            await this.setCapabilityValue('target_temperature', value)
            this.updateCapabilityValues()
        }catch (err) {
            throw new Error(err);
        }
    } 

    
}

module.exports = MelCloudDevice;
