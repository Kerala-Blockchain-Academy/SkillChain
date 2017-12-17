

var accounts;
var account;
var jworkname;
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
		

}

function refresh(){
 var metaset = SkillChain.deployed();
 var jworkid = document.getElementById("txtWorkID12").value;
 
	for(var i = 1; i < 3; i++) {
		metaset.getapplied.call(i, {from: account,gas:400000}).then(function(value) {
		var rworkid= value[0].valueOf();
		var rworkerid = value[1].valueOf();
		console.log(rworkid);
		console.log(rworkerid);
		if(jworkid.localeCompare(rworkid)==0){console.log("true");
		jworkname = web3.toAscii(value[2]);
		var sel = document.getElementById("test_idmy");
		var opt = document.createElement("option");
		opt.innerHTML = rworkerid;
		opt.value = rworkerid;
		if(value!=null)
		sel.appendChild(opt);
		}
		
		}).catch(function(e) {
			console.log(e);
		});
	}

 }
 
 function ratework(){
		var metaset = SkillChain.deployed();
		var jworkid = document.getElementById("txtWorkID12").value;
		var jworkerid = document.getElementById("test_idmy").value;
		var jempid = localStorage.getItem("UserID");
		var ratesval;
		if(document.getElementById("star1").checked == true)
		{
			ratesval = 1;
		}
		if(document.getElementById("star2").checked == true)
		{
			ratesval = 2;
		}
		if(document.getElementById("star3").checked == true)
		{
			ratesval = 3;
		}
		if(document.getElementById("star4").checked == true)
		{
			ratesval = 4;
		}
		if(document.getElementById("star5").checked == true)
		{
			ratesval = 5;
		}
		var comment = document.getElementById("txtOtherDetails").value;
		metaset.newWorkmenRating( jworkid,jworkerid,jworkname,parseInt(jempid),ratesval,comment, {from: account,gas:800000}).then(function() {
		console.log("Transaction complete!");
	window.alert("Rating Successfully Completed.");		
		}).catch(function(e) {
		console.log(e);
		});	
}