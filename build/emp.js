

var accounts;
var account;
window.onload = function() {
	var uid = localStorage.getItem("UserID");
	console.log(uid);
	web3.eth.getAccounts(function(err, accs) {
    if (err != null) {
      alert("There was an error fetching your accounts.");
      return;
    }

    if (accs.length == 0) {
      alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
      return;
    }

    accounts = accs;
    account = accounts[0];
	

	
  });
		
refresh();
}

 function refresh(){ 
	var metaset = SkillChain.deployed();
	var userid = parseInt(localStorage.getItem("UserID"));
	var npuserid = localStorage.getItem("UserID");
	var useridlabel = document.getElementById("useridspan");
	console.log(npuserid);
		useridlabel.innerHTML = npuserid;
	for(var i = 1; i < 2; i++) {
		metaset.getRating.call(i, {from: account,gas:400000}).then(function(value) {
			var rid = value[3].valueOf();
			
			//if((userid.localeCompare(rid)==0))
			//{
			var table = document.getElementById("jobtable1");
			var row = table.insertRow(1);
			var cell1 = row.insertCell(0);
			var cell2 = row.insertCell(1);
			var cell3 = row.insertCell(2);
			var cell4 = row.insertCell(3);
			var cell5 = row.insertCell(4);
			var cell6 = row.insertCell(5);
			cell1.innerHTML = value[0].valueOf();
			cell2.innerHTML = value[1].valueOf();
			cell3.innerHTML = web3.toAscii(value[2]);
			cell4.innerHTML = value[3].valueOf();
			cell5.innerHTML = value[4].valueOf();
			cell6.innerHTML = web3.toAscii(value[5]);	
			//}
			
	
		}).catch(function(e) {
			console.log(e);
		});
	}

 }