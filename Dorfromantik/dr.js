function getNum(str)
{
  let ret = parseInt(str);
  if(isNaN(ret))
  {
    return 0;
  }
  return ret;
}

function updateTotals()
{
  let elem;
  let totalTasks = 0;
  let totalFlags = 0;
  let totalUnlocks = 0;
  
  elem = document.getElementsByClassName("task");
  for(let i = 0; i < elem.length; i++)
  {
    totalTasks += getNum(elem[i].value);
  }
  elem = document.getElementById("taskTotal");
  elem.innerHTML = totalTasks;

  elem = document.getElementsByClassName("flag");
  for(let i = 0; i < elem.length; i++)
  {
    totalFlags += getNum(elem[i].value);
  }
  elem = document.getElementById("flagTotal");
  elem.innerHTML = totalFlags;

  elem = document.getElementsByClassName("unlock");
  for(let i = 0; i < elem.length; i++)
  {
    totalUnlocks += getNum(elem[i].value);
  }
  elem = document.getElementById("unlockTotal");
  elem.innerHTML = totalUnlocks;

  elem = document.getElementById("total");
  elem.innerHTML = totalTasks + totalFlags + totalUnlocks;
}
