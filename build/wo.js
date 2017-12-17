

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

refresh1();
}

function printDetails(){
	var doc = new jsPDF();
	var puid = localStorage.getItem("UserID");
	var prate = document.getElementById("ratingspan").innerHTML;
	console.log("Constructing....");
	doc.setFontSize(20);
	doc.text(70,25,"Experience Certificate");
	doc.setFontSize(12);
	doc.text(20,40,"Identification Number: " + puid);
	doc.text(20,50,"Rating : " + prate +" (Out of 5)");
	doc.text(10,60,"WORK ID");
	doc.text(35,60,"WORKER ID");
	doc.text(65,60,"WORK NAME");
	doc.text(105,60,"CUSTOMER ID");
	doc.text(140,60,"RATING");
	doc.text(165,60,"COMMENT");
	
	var oTable = document.getElementById('jobtable1');
	var rowLength = oTable.rows.length;
	var y = 70;
	for (i = 1; i < rowLength; i++){
		var oCells = oTable.rows.item(i).cells;
		var cellData0 = oCells.item(0).innerHTML;
		var cellData1 = oCells.item(1).innerHTML;
		var cellData2 = oCells.item(2).innerHTML;
		var cellData3 = oCells.item(3).innerHTML;
		var cellData4 = oCells.item(4).innerHTML;
		var cellData5 = oCells.item(5).innerHTML;
		
		doc.text(10,y,cellData0);
		doc.text(35,y,cellData1);
		doc.text(65,y,cellData2);
		doc.text(105,y,cellData3);
		doc.text(140,y,cellData4);
		doc.text(165,y,cellData5);
		y=y+10;
	}
	
	console.log("Write");
    doc.save('resume.pdf');
}

 function refresh1(){ 
	var metaset = SkillChain.deployed();
	var userid = parseInt(localStorage.getItem("UserID"));
	var npuserid = localStorage.getItem("UserID");
	var useridlabel = document.getElementById("useridspan");
	console.log(npuserid);
		useridlabel.innerHTML = npuserid;
		var total = 0;
		var count=0;
	for(var i = 1; i < 3; i++) {
		metaset.getRating.call(i, {from: account,gas:400000}).then(function(value) {
			var rwname = web3.toAscii(value[2]);
			var rid="";
			if((rwname.localeCompare(rid)==1))
			{
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
			
			console.log(total);
			total = parseInt(total) + parseInt(value[4]);
			console.log(total);
			var ratinglabel = document.getElementById("ratingspan");
			count++;
			ratinglabel.innerHTML = total / count;
			}
			
	
		}).catch(function(e) {
			console.log(e);
		});
	
	}
 }
 