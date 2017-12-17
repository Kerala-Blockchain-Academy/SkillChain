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

function myFunction() {
  // Declare variables 
  var input, filter, table, tr, td, i;
  input = document.getElementById("myInput");
  filter = input.value.toUpperCase();
  table = document.getElementById("jobtable");
  tr = table.getElementsByTagName("tr");

  // Loop through all table rows, and hide those who don't match the search query
  for (i = 0; i < tr.length; i++) {
    td = tr[i].getElementsByTagName("td")[1];
    if (td) {
      if (td.innerHTML.toUpperCase().indexOf(filter) > -1) {
        tr[i].style.display = "";
      } else {
        tr[i].style.display = "none";
      }
    } 
  }
}

function applyJob(){
		var metaset = SkillChain.deployed();
		var jworkid = document.getElementById("joblistworkid").value;
		var jworkerid = localStorage.getItem("UserID");
		var jworkname;
	
		var oTable = document.getElementById('jobtable');
		var rowLength = oTable.rows.length;
		for (i = 0; i < rowLength; i++){ 
		var oCells = oTable.rows.item(i).cells;
		var cellData = oCells.item(0).innerHTML;
		if(jworkid == cellData)
		{
		   jworkname= oCells.item(1).innerHTML;
		}
    }
		
	console.log(jworkname);
	if(jworkname != "")
	{
		metaset.jobApplied( jworkid,parseInt(jworkerid),jworkname, {from: account,gas:800000}).then(function() {
		console.log("Transaction complete!");    
		}).catch(function(e) {
		console.log(e);
		});
	}
		
		
}
 
 function refresh(){
 var metaset = SkillChain.deployed();
	for(var i = 1; i < 2; i++) {
		metaset.getJobs.call(i, {from: account,gas:400000}).then(function(value) {
			console.log(value[0]);
		
			var table = document.getElementById("jobtable");
			var row = table.insertRow(1);
			var cell1 = row.insertCell(0);
			var cell2 = row.insertCell(1);
			var cell3 = row.insertCell(2);
			var cell4 = row.insertCell(3);
			var cell5 = row.insertCell(4);
			var cell6 = row.insertCell(5);
			var cell7 = row.insertCell(6);
			cell1.innerHTML = value[0].valueOf();
			cell2.innerHTML = web3.toAscii(value[1]);
			cell3.innerHTML = web3.toAscii(value[2]);
			cell4.innerHTML = value[3].valueOf();
			cell5.innerHTML = value[4].valueOf();
			cell6.innerHTML = web3.toAscii(value[5]);
			cell7.innerHTML = value[6].valueOf();	
	
		}).catch(function(e) {
			console.log(e);
		});
	}

 }