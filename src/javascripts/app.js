let account

fetchJSON = async () => {
  try {
    let res = await fetch('/ContractJSON/SkillChain.json')
    let json = res.json()
    return json
  } catch (error) {
    console.log(error)
  }
}

window.onload = async function () {
  let ContractArtifact = await fetchJSON()
  const ABI = ContractArtifact.abi
  const ContractAddress = ContractArtifact.networks['5777'].address
  console.log('ABI is', ABI)
  console.log('Contract Address is', ContractAddress)
  web3 = new Web3('http://127.0.0.1:8545')
  MyContract = new web3.eth.Contract(ABI, ContractAddress)

  let accs = await web3.eth.getAccounts()
  account = accs[0]
}

async function loginuser() {
  if (document.getElementById('txtid').value == '') {
    alert('Please enter your worker / employer id')
    document.getElementById('txtid').focus()
    return false
  }
  if (document.getElementById('txtpass').value == '') {
    alert('Please enter your password')
    document.getElementById('txtpass').focus()
    return false
  }
  var userid = document.getElementById('txtid').value
  var password1 = document.getElementById('txtpass').value
  console.log(userid)
  console.log(password1)
  let value = await MyContract.methods.getusertype(userid).call()
  var pass = value[0]
  var str = value[1]
  console.log(value)
  console.log(str)
  if (password1.localeCompare(pass) == 0 && str.localeCompare('worker') == 0) {
    console.log('true')
    localStorage.setItem('UserID', userid)
    window.location.href = 'workerhome.html'
  } else if (
    password1.localeCompare(pass) == 0 &&
    str.localeCompare('employer') == 0
  ) {
    console.log('true')
    localStorage.setItem('UserID', userid)
    window.location.href = 'employerhome.html'
  }
}
//Register New Worker
async function RegisterWorker() {
  var wpassword = document.getElementById('wpassword').value
  var fname = document.getElementById('wfname').value
  var lname = document.getElementById('wlname').value
  var waddress = document.getElementById('waddress').value
  var wmnumber = parseInt(document.getElementById('wmnumber').value)
  var waadhar = parseInt(document.getElementById('waadhar').value)
  var usertype = document.getElementById('loginType').value
  var userid = Math.floor(Math.random() * 1000)
  console.log(account)
  console.log(userid)
  console.log('inside function')

  let trxReceipt = await MyContract.methods
    .newUser(
      userid,
      wpassword,
      fname,
      lname,
      waddress,
      wmnumber,
      waadhar,
      usertype,
    )
    .send({ from: account, gasLimit: 500000 })
console.log(trxReceipt);
  var lightwalletaddr = document.getElementById('lightwalletaddr')
  lightwalletaddr.innerHTML = userid
  window.alert('Registrated as ' + userid)
}

function addJob() {
  var metaset = SkillChain.at(conaddress)
  var txtWorkName = document.getElementById('txtWorkName').value
  var txtWorkLocation = document.getElementById('txtWorkLocation').value
  var txtDuration = parseInt(document.getElementById('txtDuration').value)
  var txtTotalWage = document.getElementById('txtTotalWage').value
  var txtPerson = document.getElementById('txtPerson').value
  var txtContactNumber = document.getElementById('txtContactNumber').value

  metaset
    .newJobpool(
      txtWorkName,
      txtWorkLocation,
      txtDuration,
      txtTotalWage,
      txtPerson,
      txtContactNumber,
      { from: account, gas: 800000 },
    )
    .then(function () {
      console.log('Transaction complete!')
      window.alert('Job added Successfully.')
    })
    .catch(function (e) {
      console.log(e)
      setStatus('Error setting value; see log.')
    })
}

function refresh() {
  var metaset = SkillChain.at(conaddress)
  metaset.jobPoolCount
    .call({ from: account, gas: 400000 })
    .then(function (value) {
      console.log(web3.toAscii(value))
    })
    .catch(function (e) {
      console.log(e)
      setStatus('Error setting value; see log.')
    })
}
