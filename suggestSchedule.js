const fs = require('fs');

function suggestSchedule({devices, rates, maxPower}) {
  if (devices === undefined || devices === null || !Array.isArray(devices) || devices.length < 1){
    throw TypeError('"devices" must be an Array of objects describe device');
  }
  if (devices === undefined || devices === null || !Array.isArray(rates) || rates.length < 1){
    throw TypeError('"rates" must be an Array of objects describe electricity cost at certain period of time');
  }
  if (devices === undefined || devices === null || isNaN(maxPower) || maxPower < 500){
    throw TypeError('"maxPower" must be a positive Number >=500 of W/h we can take while devices working together');
  }
  
  let result = {
        schedule: { },
        consumedEnergy: {
          value: 0,
          devices: {}
        }
      };
  for(let i=0; i<24; i++){result.schedule[i] = [];}
  
  ////// SUB FUNCTIONS /////
  function tableRates(rates) {
    let r = new Array(24);
    rates.forEach((rate)=>{
      for (let i = rate.from; i < ((rate.to<rate.from)?(rate.to+24):(rate.to)); i++){
        r[i%24] = rate.value;
      }
    });
    return r;
  }
  
  function getWorkPeriod(device) {
    if (device.mode === 'night'){ return {from: 21, to: 7}; }
    if (device.mode === 'day'){ return {from: 7, to: 21}; }
    return {from: 0, to: 24};
  }
  
  function getRatesSum(from,duration,rates) {
    let s = 0;
    for (let i=from; i < from + duration; i++){ // cost at first part
      s += rates[i%24];
    }
    return s;
  }
  
  function minCostPeriod(device) {
    const
      period = getWorkPeriod(device),
      hoursInPeriod = (period.to <= period.from)?(period.to + 24 - period.from):(period.to - period.from),
      ratePerHour = tableRates(rates);
    let
      minRateSum = 0,
      sum = 0,
      startHour = period.from;
      
    if (device.duration > hoursInPeriod){ return NaN; }
  
    minRateSum = sum = getRatesSum(period.from, device.duration, ratePerHour); // cost at first part
    
    for (let i=period.from + 1; i < period.from + hoursInPeriod - device.duration; i++){ // shift duration along rates and check the best cost
      sum += ratePerHour[(i+device.duration)%24] - ratePerHour[(i-1)%24];
      if(minRateSum>sum){
        minRateSum = sum;
        startHour = i%24;
      }
    }
    return {from: startHour, to: (startHour+device.duration)%24, rateSum: minRateSum };
  }
  
  //// CORE ////
  devices.forEach( (item) => {
    let workTime = minCostPeriod(item);
    let sum = workTime.rateSum*item.power/1000;
    
    if (result.consumedEnergy.devices[item.id] === undefined){ result.consumedEnergy.devices[item.id] = 0; }
    
    result.consumedEnergy.devices[item.id] += sum;
    result.consumedEnergy.value += sum;
    
  });

  return result;
}

if (module.parent){
  module.exports = suggestSchedule;
}
else { // manual tests
  // suggestSchedule({devices:[], rates:[], maxPower:0});
  // suggestSchedule({devices:[2],rates:[], maxPower:0});
  // suggestSchedule({devices:[2],rates:[2],maxPower:0});
  const data = JSON.parse(fs.readFileSync('./data/input.json').toString()); // path relative to node working directory
  console.dir(suggestSchedule(data));
}