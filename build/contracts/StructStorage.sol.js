var Web3 = require("web3");
var SolidityEvent = require("web3/lib/web3/event.js");

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(instance.contract, args);
        });
      };
    },
    synchronizeFunction: function(fn, instance, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var decodeLogs = function(logs) {
            return logs.map(function(log) {
              var logABI = C.events[log.topics[0]];

              if (logABI == null) {
                return null;
              }

              var decoder = new SolidityEvent(null, logABI, instance.address);
              return decoder.decode(log);
            }).filter(function(log) {
              return log != null;
            });
          };

          var callback = function(error, tx) {
            if (error != null) {
              reject(error);
              return;
            }

            var timeout = C.synchronization_timeout || 240000;
            var start = new Date().getTime();

            var make_attempt = function() {
              C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                if (err) return reject(err);

                if (receipt != null) {
                  // If they've opted into next gen, return more information.
                  if (C.next_gen == true) {
                    return accept({
                      tx: tx,
                      receipt: receipt,
                      logs: decodeLogs(receipt.logs)
                    });
                  } else {
                    return accept(tx);
                  }
                }

                if (timeout > 0 && new Date().getTime() - start > timeout) {
                  return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                }

                setTimeout(make_attempt, 1000);
              });
            };

            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  function instantiate(instance, contract) {
    instance.contract = contract;
    var constructor = instance.constructor;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], instance, constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Set the network iniitally to make default data available and re-use code.
    // Then remove the saved network id so the network will be auto-detected on first use.
    fn.setNetwork("default");
    fn.network_id = null;
    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : "default";
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    if (this.currentProvider == null) {
      throw new Error("StructStorage error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("StructStorage error: contract binary not set. Can't deploy new instance.");
    }

    var regex = /__[^_]+_+/g;
    var unlinked_libraries = this.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      throw new Error("StructStorage contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of StructStorage: " + unlinked_libraries);
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = self.web3.eth.contract(self.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(self.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
      // Why, I have no idea...
      var intermediary = function(err, web3_instance) {
        if (err != null) {
          reject(err);
          return;
        }

        if (err == null && web3_instance != null && web3_instance.address != null) {
          accept(new self(web3_instance));
        }
      };

      args.push(tx_params, intermediary);
      contract_class.new.apply(contract_class, args);
    });
  };

  Contract.at = function(address) {
    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to StructStorage.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: StructStorage not deployed or address not set.");
    }

    return this.at(this.address);
  };

  Contract.defaults = function(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    var self = this;
    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      self.class_defaults[key] = value;
    });

    return this.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {
  "default": {
    "abi": [
      {
        "constant": false,
        "inputs": [
          {
            "name": "ll",
            "type": "bytes"
          },
          {
            "name": "g",
            "type": "bytes"
          },
          {
            "name": "p",
            "type": "uint256"
          },
          {
            "name": "tt",
            "type": "bytes32"
          },
          {
            "name": "e",
            "type": "bytes32"
          }
        ],
        "name": "quality",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "fm",
        "outputs": [
          {
            "name": "fid",
            "type": "bytes"
          },
          {
            "name": "fname",
            "type": "bytes32"
          },
          {
            "name": "loc",
            "type": "bytes32"
          },
          {
            "name": "crop",
            "type": "bytes32"
          },
          {
            "name": "contact",
            "type": "uint256"
          },
          {
            "name": "quantity",
            "type": "uint256"
          },
          {
            "name": "exprice",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "j",
            "type": "bytes"
          }
        ],
        "name": "getproduce",
        "outputs": [
          {
            "name": "",
            "type": "bytes"
          },
          {
            "name": "",
            "type": "bytes32"
          },
          {
            "name": "",
            "type": "bytes32"
          },
          {
            "name": "",
            "type": "bytes32"
          },
          {
            "name": "",
            "type": "uint256"
          },
          {
            "name": "",
            "type": "uint256"
          },
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "ur",
            "type": "uint256"
          }
        ],
        "name": "getusertype",
        "outputs": [
          {
            "name": "",
            "type": "bytes32"
          },
          {
            "name": "",
            "type": "bytes32"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "j",
            "type": "uint256"
          }
        ],
        "name": "getfarmernew",
        "outputs": [
          {
            "name": "fid",
            "type": "bytes"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "id",
            "type": "bytes"
          },
          {
            "name": "name",
            "type": "bytes32"
          },
          {
            "name": "loc",
            "type": "bytes32"
          },
          {
            "name": "cr",
            "type": "bytes32"
          },
          {
            "name": "con",
            "type": "uint256"
          },
          {
            "name": "q",
            "type": "uint256"
          },
          {
            "name": "pr",
            "type": "uint256"
          }
        ],
        "name": "produce",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "l",
        "outputs": [
          {
            "name": "lotno",
            "type": "bytes"
          },
          {
            "name": "grade",
            "type": "bytes"
          },
          {
            "name": "mrp",
            "type": "uint256"
          },
          {
            "name": "testdate",
            "type": "bytes32"
          },
          {
            "name": "expdate",
            "type": "bytes32"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "k",
            "type": "bytes"
          }
        ],
        "name": "getquality",
        "outputs": [
          {
            "name": "",
            "type": "bytes"
          },
          {
            "name": "",
            "type": "bytes"
          },
          {
            "name": "",
            "type": "uint256"
          },
          {
            "name": "",
            "type": "bytes32"
          },
          {
            "name": "",
            "type": "bytes32"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "tester",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "s",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "um",
        "outputs": [
          {
            "name": "lwaddress",
            "type": "uint256"
          },
          {
            "name": "fname",
            "type": "bytes32"
          },
          {
            "name": "mname",
            "type": "bytes32"
          },
          {
            "name": "lname",
            "type": "bytes32"
          },
          {
            "name": "password",
            "type": "bytes32"
          },
          {
            "name": "aadharid",
            "type": "uint256"
          },
          {
            "name": "address1",
            "type": "bytes32"
          },
          {
            "name": "contact",
            "type": "uint256"
          },
          {
            "name": "usertype",
            "type": "bytes32"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "t",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "lwaddress",
            "type": "uint256"
          },
          {
            "name": "fname",
            "type": "bytes32"
          },
          {
            "name": "mname",
            "type": "bytes32"
          },
          {
            "name": "lname",
            "type": "bytes32"
          },
          {
            "name": "upassword",
            "type": "bytes32"
          },
          {
            "name": "aadharid",
            "type": "uint256"
          },
          {
            "name": "address1",
            "type": "bytes32"
          },
          {
            "name": "contact",
            "type": "uint256"
          },
          {
            "name": "utype",
            "type": "bytes32"
          }
        ],
        "name": "register",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "receiver",
            "type": "address"
          },
          {
            "name": "amount",
            "type": "uint256"
          },
          {
            "name": "sender",
            "type": "address"
          }
        ],
        "name": "sendCoin",
        "outputs": [
          {
            "name": "sufficient",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "c",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "u",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "addr",
            "type": "address"
          }
        ],
        "name": "getBalance",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "addr",
            "type": "address"
          }
        ],
        "name": "fundaddr",
        "outputs": [],
        "payable": false,
        "type": "function"
      }
    ],
    "unlinked_binary": "0x606060405260006000556001600155600160035534610000575b611dab806100286000396000f300606060405236156100e05763ffffffff60e060020a60003504166304eb580c81146100e557806307467a02146101845780632c6d8fa71461024c57806335ff8ea01461035157806345db3a6a1461037a5780635487e06e1461040a57806354bb13611461047c5780635ef53ded146105a75780638308abd41461070357806386b714e21461072c578063925eaebf1461074b57806392d0d153146107a2578063b70b5615146107c1578063b81e3a50146107ec578063c3da42b814610823578063c6a898c514610842578063f8b2cb4f14610861578063fb5ade311461088c575b610000565b3461000057610182600480803590602001908201803590602001908080601f0160208091040260200160405190810160405280939291908181526020018383808284375050604080516020601f89358b0180359182018390048302840183019094528083529799988101979196509182019450925082915084018382808284375094965050843594602081013594506040013592506108a7915050565b005b3461000057610194600435610d83565b6040805160208101889052908101869052606081018590526080810184905260a0810183905260c0810182905260e0808252885460026101006001831615810260001901909216049183018290528291908201908a9080156102375780601f1061020c57610100808354040283529160200191610237565b820191906000526020600020905b81548152906001019060200180831161021a57829003601f168201915b50509850505050505050505060405180910390f35b346100005761029f600480803590602001908201803590602001908080601f01602080910402602001604051908101604052809392919081815260200183838082843750949650610dce95505050505050565b604080516020808201899052918101879052606081018690526080810185905260a0810184905260c0810183905260e08082528951908201528851909182916101008301918b01908083838215610311575b80518252602083111561031157601f1990920191602091820191016102f1565b505050905090810190601f16801561033d5780820380516001836020036101000a031916815260200191505b509850505050505050505060405180910390f35b346100005761036160043561115d565b6040805192835260208301919091528051918290030190f35b346100005761038a60043561117c565b6040805160208082528351818301528351919283929083019185019080838382156103d0575b8051825260208311156103d057601f1990920191602091820191016103b0565b505050905090810190601f1680156103fc5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b3461000057610182600480803590602001908201803590602001908080601f01602080910402602001604051908101604052809392919081815260200183838082843750949650508435946020810135945060408101359350606081013592506080810135915060a00135611225565b005b346100005761048c60043561167c565b60408051908101849052606081018390526080810182905260a08082528654600261010060018316150260001901909116049082018190528190602082019060c08301908990801561051f5780601f106104f45761010080835404028352916020019161051f565b820191906000526020600020905b81548152906001019060200180831161050257829003601f168201915b50508381038252875460026000196101006001841615020190911604808252602090910190889080156105935780601f1061056857610100808354040283529160200191610593565b820191906000526020600020905b81548152906001019060200180831161057657829003601f168201915b505097505050505050505060405180910390f35b34610000576105fa600480803590602001908201803590602001908080601f016020809104026020016040519081016040528093929190818152602001838380828437509496506116b495505050505050565b60408051908101849052606081018390526080810182905260a08082528651908201528551819060208083019160c08401918a01908083838215610659575b80518252602083111561065957601f199092019160209182019101610639565b505050905090810190601f1680156106855780820380516001836020036101000a031916815260200191505b50838103825287518152875160209182019189019080838382156106c4575b8051825260208311156106c457601f1990920191602091820191016106a4565b505050905090810190601f1680156106f05780820380516001836020036101000a031916815260200191505b5097505050505050505060405180910390f35b3461000057610710611a03565b60408051600160a060020a039092168252519081900360200190f35b3461000057610739611a12565b60408051918252519081900360200190f35b346100005761075b600435611a18565b60408051998a5260208a0198909852888801969096526060880194909452608087019290925260a086015260c085015260e084015261010083015251908190036101200190f35b3461000057610739611a71565b60408051918252519081900360200190f35b346100005761018260043560243560443560643560843560a43560c43560e43561010435611a77565b005b346100005761080f600160a060020a036004358116906024359060443516611cd2565b604080519115158252519081900360200190f35b3461000057610739611d33565b60408051918252519081900360200190f35b3461000057610739611d39565b60408051918252519081900360200190f35b3461000057610739600160a060020a0360043516611d3f565b60408051918252519081900360200190f35b3461000057610182600160a060020a0360043516611d5e565b005b6040805160c081018252600060a08281018281528352835160208181018652838252808501919091528385018390526060808501849052608094850193909352845191820185528982528181018990528185018890529181018690529182018490529151875191928392600c928a92909182918401908083835b602083106109405780518252601f199092019160209182019101610921565b6001836020036101000a03801982511681845116808217855250505050505090500191505090815260200160405180910390206000820151816000019080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f106109c557805160ff19168380011785556109f2565b828001600101855582156109f2579182015b828111156109f25782518255916020019190600101906109d7565b5b50610a139291505b80821115610a0f57600081556001016109fb565b5090565b50506020820151816001019080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f10610a6757805160ff1916838001178555610a94565b82800160010185558215610a94579182015b82811115610a94578251825591602001919060010190610a79565b5b50610ab59291505b80821115610a0f57600081556001016109fb565b5090565b50506040820151600282015560608201516003820155608090910151600490910155600d8054600181018083558281838015829011610bef57600502816005028360005260206000209182019101610bef91905b80821115610a0f57600060008201805460018160011615610100020316600290046000825580601f10610b3c5750610b6e565b601f016020900490600052602060002090810190610b6e91905b80821115610a0f57600081556001016109fb565b5090565b5b5060018201805460018160011615610100020316600290046000825580601f10610b995750610bcb565b601f016020900490600052602060002090810190610bcb91905b80821115610a0f57600081556001016109fb565b5090565b5b5050600060028201819055600382018190556004820155600501610b09565b5090565b5b505050916000526020600020906005020160005b8390919091506000820151816000019080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f10610c5c57805160ff1916838001178555610c89565b82800160010185558215610c89579182015b82811115610c89578251825591602001919060010190610c6e565b5b50610caa9291505b80821115610a0f57600081556001016109fb565b5090565b50506020820151816001019080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f10610cfe57805160ff1916838001178555610d2b565b82800160010185558215610d2b579182015b82811115610d2b578251825591602001919060010190610d10565b5b50610d4c9291505b80821115610a0f57600081556001016109fb565b5090565b505060408201516002820155606082015160038083019190915560809092015160049091015580546001019055505b505050505050565b600b81815481101561000057906000526020600020906007020160005b5060018101546002820154600383015460048401546005850154600686015495965093949293919290919087565b60206040519081016040528060008152506000600060006000600060006009886040518082805190602001908083835b60208310610e1d5780518252601f199092019160209182019101610dfe565b51815160209384036101000a600019018019909216911617905292019485525060405193849003810184208c519094600994508d9350918291908401908083835b60208310610e7d5780518252601f199092019160209182019101610e5e565b51815160209384036101000a60001901801990921691161790529201948552506040519384900381018420600101548d519094600994508e9350918291908401908083835b60208310610ee15780518252601f199092019160209182019101610ec2565b51815160209384036101000a60001901801990921691161790529201948552506040519384900381018420600201548e519094600994508f9350918291908401908083835b60208310610f455780518252601f199092019160209182019101610f26565b6001836020036101000a03801982511681845116808217855250505050505090500191505090815260200160405180910390206003015460098c6040518082805190602001908083835b60208310610fae5780518252601f199092019160209182019101610f8f565b6001836020036101000a03801982511681845116808217855250505050505090500191505090815260200160405180910390206004015460098d6040518082805190602001908083835b602083106110175780518252601f199092019160209182019101610ff8565b6001836020036101000a03801982511681845116808217855250505050505090500191505090815260200160405180910390206005015460098e6040518082805190602001908083835b602083106110805780518252601f199092019160209182019101611061565b518151600019602094850361010090810a82019283169219939093169190911790925294909201968752604080519788900382018820600601548e54601f6002600183161590980290950116959095049283018290048202880182019052818752929594508b935091840190508282801561113c5780601f106111115761010080835404028352916020019161113c565b820191906000526020600020905b81548152906001019060200180831161111f57829003601f168201915b5050505050965096509650965096509650965096505b919395979092949650565b600081815260056020526040902060048101546008909101545b915091565b60408051602080820183526000808352848152600a82528390208054845160026001831615610100026000190190921691909104601f8101849004840282018401909552848152929390918301828280156112185780601f106111ed57610100808354040283529160200191611218565b820191906000526020600020905b8154815290600101906020018083116111fb57829003601f168201915b505050505090505b919050565b6040805161010081018252600060e0828101828152835260208084018390528385018390526060808501849052608080860185905260a080870186905260c0968701869052875194850188528e85528484018e90528488018d90529184018b90528301899052820187905292810185905292518a51919284926009928d92909182918401908083835b602083106112cd5780518252601f1990920191602091820191016112ae565b6001836020036101000a03801982511681845116808217855250505050505090500191505090815260200160405180910390206000820151816000019080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061135257805160ff191683800117855561137f565b8280016001018555821561137f579182015b8281111561137f578251825591602001919060010190611364565b5b506113a09291505b80821115610a0f57600081556001016109fb565b5090565b5050602082015160018083019190915560408301516002830155606083015160038301556080830151600483015560a0830151600583015560c090920151600690910155600b805491820180825590919082818380158290116114b6576007028160070283600052602060002091820191016114b691905b80821115610a0f57600060008201805460018160011615610100020316600290046000825580601f1061144b575061147d565b601f01602090049060005260206000209081019061147d91905b80821115610a0f57600081556001016109fb565b5090565b5b5050600060018201819055600282018190556003820181905560048201819055600582018190556006820155600701611418565b5090565b5b505050916000526020600020906007020160005b8490919091506000820151816000019080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061152357805160ff1916838001178555611550565b82800160010185558215611550579182015b82811115611550578251825591602001919060010190611535565b5b506115719291505b80821115610a0f57600081556001016109fb565b5090565b5050602082810151600183810191909155604080850151600280860191909155606086015160038601556080860151600486015560a0860151600586015560c090950151600690940193909355600080548152600a83529283208e5181548286529484902091975087965091841615610100026000190190931693909304601f90810182900483019392918e019083901061161757805160ff1916838001178555611644565b82800160010185558215611644579182015b82811115611644578251825591602001919060010190611629565b5b506116659291505b80821115610a0f57600081556001016109fb565b5090565b50506000805460010190555b505050505050505050565b600d81815481101561000057906000526020600020906005020160005b50600281015460038201546004830154929350600184019285565b60206040519081016040528060008152506020604051908101604052806000815250600060006000600c866040518082805190602001908083835b6020831061170e5780518252601f1990920191602091820191016116ef565b51815160209384036101000a600019018019909216911617905292019485525060405193849003810184208a519094600c94508b9350918291908401908083835b6020831061176e5780518252601f19909201916020918201910161174f565b6001836020036101000a0380198251168184511680821785525050505050509050019150509081526020016040518091039020600101600c886040518082805190602001908083835b602083106117d65780518252601f1990920191602091820191016117b7565b51815160209384036101000a60001901801990921691161790529201948552506040519384900381018420600201548c519094600c94508d9350918291908401908083835b6020831061183a5780518252601f19909201916020918201910161181b565b51815160209384036101000a60001901801990921691161790529201948552506040519384900381018420600301548d519094600c94508e9350918291908401908083835b6020831061189e5780518252601f19909201916020918201910161187f565b518151600019602094850361010090810a82019283169219939093169190911790925294909201968752604080519788900382018820600401548c54601f60026001831615909802909501169590950492830182900482028801820190528187529295945089935091840190508282801561195a5780601f1061192f5761010080835404028352916020019161195a565b820191906000526020600020905b81548152906001019060200180831161193d57829003601f168201915b5050875460408051602060026001851615610100026000190190941693909304601f8101849004840282018401909252818152959a50899450925084019050828280156119e85780601f106119bd576101008083540402835291602001916119e8565b820191906000526020600020905b8154815290600101906020018083116119cb57829003601f168201915b50505050509350945094509450945094505b91939590929450565b600754600160a060020a031681565b60005481565b600681815481101561000057906000526020600020906009020160005b50805460018201546002830154600384015460048501546005860154600687015460078801546008909801549698509496939592949193909289565b60035481565b6101206040519081016040528060008152602001600060001916815260200160006000191681526020016000600019168152602001600060001916815260200160008152602001600060001916815260200160008152602001600060001916815250610120604051908101604052808b81526020018a600019168152602001896000191681526020018860001916815260200187600019168152602001868152602001856000191681526020018481526020018360001916815250905080600560008c8152602001908152602001600020600082015181600001556020820151816001019060001916905560408201518160020190600019169055606082015181600301906000191690556080820151816004019060001916905560a0820151816005015560c0820151816006019060001916905560e08201518160070155610100820151816008019060001916905590505060068054806001018281815481835581811511611c4b57600902816009028360005260206000209182019101611c4b91905b80821115610a0f576000808255600182018190556002820181905560038201819055600482018190556005820181905560068201819055600782018190556008820155600901611bfc565b5090565b5b505050916000526020600020906009020160005b5082518155602083015160018083019190915560408401516002830155606084015160038301556080840151600483015560a0840151600583015560c0840151600683015560e08401516007830155610100840151600890920191909155805481019055505b50505050505050505050565b600160a060020a03811660009081526004602052604081205483901015611cfb57506000611d2c565b50600160a060020a038082166000908152600460205260408082208054869003905591851681522080548301905560015b9392505050565b60025481565b60015481565b600160a060020a0381166000908152600460205260409020545b919050565b600160a060020a03811660009081526004602052604090206107d090555b505600a165627a7a72305820ccd0b9125e3e6bfac183bbd9d11c6d3eb6fdc6812d32cfcb05cfdf88be97c24f0029",
    "events": {},
    "updated_at": 1513547411553,
    "links": {},
    "address": "0x9f4217c241773546ef593606f4f0beaca782c8a3"
  }
};

  Contract.checkNetwork = function(callback) {
    var self = this;

    if (this.network_id != null) {
      return callback();
    }

    this.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (self.all_networks[network_id] == null) {
        return callback(new Error(self.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      self.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = this.all_networks[network_id] || {};

    this.abi             = this.prototype.abi             = network.abi;
    this.unlinked_binary = this.prototype.unlinked_binary = network.unlinked_binary;
    this.address         = this.prototype.address         = network.address;
    this.updated_at      = this.prototype.updated_at      = network.updated_at;
    this.links           = this.prototype.links           = network.links || {};
    this.events          = this.prototype.events          = network.events || {};

    this.network_id = network_id;
  };

  Contract.networks = function() {
    return Object.keys(this.all_networks);
  };

  Contract.link = function(name, address) {
    if (typeof name == "function") {
      var contract = name;

      if (contract.address == null) {
        throw new Error("Cannot link contract without an address.");
      }

      Contract.link(contract.contract_name, contract.address);

      // Merge events so this contract knows about library's events
      Object.keys(contract.events).forEach(function(topic) {
        Contract.events[topic] = contract.events[topic];
      });

      return;
    }

    if (typeof name == "object") {
      var obj = name;
      Object.keys(obj).forEach(function(name) {
        var a = obj[name];
        Contract.link(name, a);
      });
      return;
    }

    Contract.links[name] = address;
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "StructStorage";
  Contract.generated_with  = Contract.prototype.generated_with  = "3.2.0";

  // Allow people to opt-in to breaking changes now.
  Contract.next_gen = false;

  var properties = {
    binary: function() {
      var binary = Contract.unlinked_binary;

      Object.keys(Contract.links).forEach(function(library_name) {
        var library_address = Contract.links[library_name];
        var regex = new RegExp("__" + library_name + "_*", "g");

        binary = binary.replace(regex, library_address.replace("0x", ""));
      });

      return binary;
    }
  };

  Object.keys(properties).forEach(function(key) {
    var getter = properties[key];

    var definition = {};
    definition.enumerable = true;
    definition.configurable = false;
    definition.get = getter;

    Object.defineProperty(Contract, key, definition);
    Object.defineProperty(Contract.prototype, key, definition);
  });

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.StructStorage = Contract;
  }
})();
