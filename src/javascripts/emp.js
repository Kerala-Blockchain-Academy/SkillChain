window.onload = function () {
  var uid = localStorage.getItem('UserID')
  console.log(uid)
  refresh()
}

function refresh() {
  var metaset = SkillChain.at(conaddress)
  var userid = parseInt(localStorage.getItem('UserID'))
  var npuserid = localStorage.getItem('UserID')
  var useridlabel = document.getElementById('useridspan')
  console.log(npuserid)
  useridlabel.innerHTML = npuserid
  for (var i = 1; i < 3; i++) {
    metaset.getRating
      .call(i, { from: account, gas: 400000 })
      .then(function (value) {
        var rid = value[3].valueOf()

        var rwname = web3.toAscii(value[2])
        var rid = ''
        if (rwname.localeCompare(rid) == 1) {
          var table = document.getElementById('jobtable1')
          var row = table.insertRow(1)
          var cell1 = row.insertCell(0)
          var cell2 = row.insertCell(1)
          var cell3 = row.insertCell(2)
          var cell4 = row.insertCell(3)
          var cell5 = row.insertCell(4)
          var cell6 = row.insertCell(5)
          cell1.innerHTML = value[0].valueOf()
          cell2.innerHTML = value[1].valueOf()
          cell3.innerHTML = web3.toAscii(value[2])
          cell4.innerHTML = value[3].valueOf()
          cell5.innerHTML = value[4].valueOf()
          cell6.innerHTML = web3.toAscii(value[5])
        }
      })
      .catch(function (e) {
        console.log(e)
      })
  }
}
