function suggestSchedule({devices, rates, maxPower}) {
  devices.forEach( (item) => {
    console.log(item.name);
  });

  return '-----end suggestSchedule()-----';
}

module.exports = suggestSchedule;