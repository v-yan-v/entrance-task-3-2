'use strict';

function suggestSchedule({devices, rates, maxPower}) {
  //// VALIDATE INPUT ////
  // let isInputValid = validateInput(devices,rates,maxPower);
  // if (!isInputValid.state){ throw TypeError(isInputValid.msg); }
  
  //// INIT ////
  let
    schedule = { },
    consumedEnergy = {
      value: 0,
      devices: {}
    };
  
  for(let i=0; i<24; i++){schedule[i] = [];} // fill with hours
  
  const ratePerHours = tableRates(rates);
  
  let devicesMap = new Map();
  devices = devices.sort((a, b)=>{ return b.duration - a.duration; });
  devices.forEach((el)=>{
    let tmp = {};
    tmp[el.id] = {};
    for (let key in el){
      if (el.hasOwnProperty(key) && key !== 'id'){
        tmp[el.id][key] = el[key];
      }
    }
    devicesMap.set(el.id, tmp[el.id]);
  });
  
  //// SUB FUNCTIONS ////
  function tableRates(rates) { // parse rates into array - cost for each hour
    let r = new Array(24);
    rates.forEach((rate)=>{
      for (let i = rate.from; i < ((rate.to<rate.from)?(rate.to+24):(rate.to)); i++){
        r[i%24] = rate.value;
      }
    });
    return r;
  }
  
  function getDevicePeriod(mode) {
    if (mode && mode === 'night'){ return {f: 21, t: 7, tH: 7+24-21 }; }
    if (mode && mode === 'day'){ return {f: 7, t: 21, tH: 21-7 }; }
    return {f: 0, t: 0, tH: 24}; // from, to, totalHours
  }
  
  function getRatesSum(startHour, duration, rates) {
    let s = 0;
    for (let i=startHour; i < startHour + duration; i++){ // cost at first part
      s += rates[i%24];
    }
    return s;
  }
  
  function minCostPeriod(from, to, devDur) {
    const
      hoursInPeriod = hoursInRange(from, to);
    let
      minRateSum,
      sum,
      startHour = from;
    
    if (devDur > hoursInPeriod){ return NaN; }
    
    minRateSum = sum = getRatesSum(from, devDur, ratePerHours); // cost at first part
    
    for (let i=from + 1; i < from + hoursInPeriod - devDur; i++){ // shift duration along rates and check the best cost
      sum += ratePerHours[(i+devDur)%24] - ratePerHours[(i-1)%24];
      if(minRateSum>sum){
        minRateSum = sum;
        startHour = i%24;
      }
    }
    return {f: startHour, t: (startHour+devDur)%24, rateSum: minRateSum };
  }
  
  function hoursInRange(f, t) {
    return ((t<=f)?(t+24-f):(t-f));
  }
  
  function powerAtHour(idsList) {
    return idsList.reduce((sum, id) =>{
      return sum + devicesMap.get(id).power;
    }, 0);
  }
  
  
  //// CORE ////
  devicesMap.forEach((iProps, itemId) => {
    let itemPeriod = getDevicePeriod(iProps.mode);
    let
      vacantHours = [],
      tmp = {},
      bestCostTime = {f: NaN, t: NaN, cost: Infinity};
  
    // проверить что на всём допустимом отрезке времени мы можем включать прибор
    for (let i = 0, currPower = 0; i < itemPeriod.tH; i++) { //проходим по каждому часу возможного рабочего времени устройства
      currPower = powerAtHour(schedule[(itemPeriod.f + i) % 24]);
      if (currPower + iProps.power <= maxPower) {
        if ((tmp.f === undefined) && (tmp.t === undefined)) {
          tmp.f = (itemPeriod.f + i) % 24;
        }
      }
      else { // добавляем во временный массив объекты содержащие начальный и конечный час достаточной мощности
        if (tmp.f !== undefined && tmp.t === undefined) {
          tmp.t = (itemPeriod.f + i) % 24;
        }
        vacantHours.push(tmp);
        tmp = {};
      }
    }
    if ((tmp.f !== undefined) && (tmp.t === undefined)) { // если последний час тоже подходит - мы не добавили его в цикле, добавляем в ручную
      tmp.t = (itemPeriod.f + itemPeriod.tH) % 24;
      vacantHours.push(tmp);
    }
    
    // для каждого элемента временного массива
    vacantHours.forEach((timeSpan) => {
      if (iProps.duration <= hoursInRange(timeSpan.f, timeSpan.t)) { //если отрезки времени достаточно длинны для работы устройства
        tmp = minCostPeriod(timeSpan.f, timeSpan.t, iProps.duration);
        if (/*!isNaN(minCost) &&*/ tmp.rateSum < bestCostTime.cost) { // выбираем из них оптимальный по цене кусок
          bestCostTime = tmp;
        }
      }
    });
    
    
    if (!isNaN(bestCostTime.f)) {
      // добавляем в расписание
      for (let i = 0; i < iProps.duration; i++) {
        schedule[(bestCostTime.f + i) % 24].push(itemId);
      }
      
      //  добавляем израсходовано и стоимость
      consumedEnergy.value += iProps.power * bestCostTime.rateSum / 1000;
      if (consumedEnergy.devices[itemId] === undefined) {
        consumedEnergy.devices[itemId] = 0;
      }
      consumedEnergy.devices[itemId] += iProps.power * bestCostTime.rateSum / 1000;
    }
  });
  
  return {schedule, consumedEnergy};
}


if (module.parent){
  module.exports = suggestSchedule;
}
else { // manual tests
  const fs = require('fs');
  
  // suggestSchedule({devices:[], rates:[], maxPower:0});
  // suggestSchedule({devices:[2],rates:[], maxPower:0});
  // suggestSchedule({devices:[2],rates:[2],maxPower:0});
  const data = JSON.parse(fs.readFileSync('./data/input.json').toString()); // path relative to node working directory
  console.dir(suggestSchedule(data));
}