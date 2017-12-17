module.exports = {
  build: {
	"index.html": "index.html",
	"workerregister.html":"workerregister.html",
	"workerhome.html":"workerhome.html",
	"employerhome.html":"employerhome.html",
	"addjob.html":"addjob.html",
	"addexperience.html":"addexperience.html",
	"listjob.html":"listjob.html",
	
	
	
    "app.js": [
	  "javascripts/jQuery.js",
	  "javascripts/lightwallet.js",
	  "javascripts/hooked-web3-provider.js",
      "javascripts/app.js"
	  
    ],
	"jobpop.js" : [
	"javascripts/jobpop.js"
	],
	"exp.js" : [
	"javascripts/exp.js"
	],
	"emp.js" : [
	"javascripts/emp.js"
	],
	"wo.js" : [
	"javascripts/wo.js"
	],
    "stylesheets/styles.css": [
      "stylesheets/styles.css"
    ],
    "images/": "images/"
  },
  rpc: {
    host: "localhost",
    port: 8545,
	gas:3000000
  }
};
