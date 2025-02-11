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
  elem = document.getElementsByClassName("tasksTotal");
  elem[0].innerHTML = totalTasks;

  elem = document.getElementsByClassName("flag");
  for(let i = 0; i < elem.length; i++)
  {
    totalFlags += getNum(elem[i].value);
  }
  elem = document.getElementsByClassName("flagsTotal");
  elem[0].innerHTML = totalFlags;

  elem = document.getElementsByClassName("border-bottom");
  for(let i = 0; i < elem.length; i++)
  {
    totalUnlocks += getNum(elem[i].value);
  }
  elem = document.getElementsByClassName("unlocksTotal");
  elem[0].innerHTML = totalUnlocks;

  elem = document.getElementsByClassName("results");
  elem[0].innerHTML = totalTasks + totalFlags + totalUnlocks;
}
