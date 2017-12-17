var accounts;
var account;

function switchToHooked3(_keystore) {

	console.log("switchToHooked3");

	var web3Provider = new HookedWeb3Provider({
	  host: "http://localhost:8545", // check in truffle.js
	  transaction_signer: _keystore
	});

	web3.setProvider(web3Provider);
}

function loginuser(){
	if(document.getElementById("txtid").value=='')
	{
		alert('Please enter your worker / employer id');
		document.getElementById("txtid").focus();
		return false;
	}
	if(document.getElementById("txtpass").value=='')
	{
		alert('Please enter your password');
		document.getElementById("txtpass").focus();
		return false;
    }	
	var metaset 	= SkillChain.deployed();
	var userid 		= document.getElementById("txtid").value;
	var password1 	= document.getElementById("txtpass").value;
    console.log(userid);
	console.log(password1);
   metaset.getusertype.call(parseInt(userid), {from: account}).then(function(value) {
    
    var pass = web3.toAscii(value[0]);
	var str = web3.toAscii(value[1]);
	console.log(pass);
	console.log(str);
	if ((password1.localeCompare(pass)==0)&& str.localeCompare("worker")==0){
	console.log("true");
	localStorage.setItem("UserID", userid);
	window.location.href = "workerhome.html";
	}
	else if ((password1.localeCompare(pass)==0)&& str.localeCompare("employer")==0){
	console.log("true");
	localStorage.setItem("UserID", userid);
	window.location.href = "employerhome.html";
	}
	
	}).catch(function(e) {
    console.log(e);
  });	
}
//Register New Worker
function RegisterWorker() {
	
var skillset = SkillChain.deployed();

var wpassword 	= document.getElementById("wpassword").value;
var fname 		= document.getElementById("wfname").value;
var lname 		= document.getElementById("wlname").value;
var waddress 	= document.getElementById("waddress").value;
var wmnumber 	= parseInt(document.getElementById("wmnumber").value);
var waadhar 	= parseInt(document.getElementById("waadhar").value);
var usertype 	= document.getElementById("loginType").value;
console.log(usertype);
	console.log(wpassword);
	var msgResult;
	console.log("inside function");
	
	var secretSeed = lightwallet.keystore.generateRandomSeed();
	
	lightwallet.keystore.deriveKeyFromPassword(wpassword, function (err, pwDerivedKey) {

		console.log("createWallet");
		
		console.log(secretSeed);
	
		var keystore = new lightwallet.keystore(secretSeed, pwDerivedKey);
		
		keystore.generateNewAddress(pwDerivedKey);
		// generate one new address/private key pairs
		// the corresponding private keys are also encrypted
		var address = keystore.getAddresses()[0];

		var privateKey = keystore.exportPrivateKey(address, pwDerivedKey);
		address1 = address;
		
	skillset.newUser( parseInt(address),wpassword,fname,lname,waddress,wmnumber,waadhar,usertype, {from: account,gas:1500000}).then(function(result) {
    
		console.log("inside register");
		console.log(result);
		
	}).catch(function(e) {
    console.log(e);
    
	});

				
		console.log(address);
		console.log(privateKey);
		
		switchToHooked3(keystore);
		
		var lightwalletaddr = document.getElementById("lightwalletaddr");
		lightwalletaddr.innerHTML = address;
		window.alert("Registration Successfully Completed.");

});
	
 
	 
};

function addJob(){

var metaset = SkillChain.deployed();			   
var txtWorkName = document.getElementById("txtWorkName").value;
var txtWorkLocation = document.getElementById("txtWorkLocation").value;
var txtDuration = parseInt(document.getElementById("txtDuration").value);
var txtTotalWage = document.getElementById("txtTotalWage").value;
var txtPerson = document.getElementById("txtPerson").value;
var txtContactNumber = document.getElementById("txtContactNumber").value;


metaset.newJobpool( txtWorkName,txtWorkLocation,txtDuration,txtTotalWage,txtPerson,txtContactNumber, {from: account,gas:800000}).then(function() {
  console.log("Transaction complete!");
	window.alert("Job added Successfully.");  
  }).catch(function(e) {
    console.log(e);
    setStatus("Error setting value; see log.");
  }); 
};

function refresh(){
	var metaset = SkillChain.deployed();
	metaset.jobPoolCount.call({from: account,gas:400000}).then(function(value) {
    console.log(web3.toAscii(value));
  }).catch(function(e) {
    console.log(e);
    setStatus("Error setting value; see log.");
  });	
	
}

window.onload = function() {
		
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