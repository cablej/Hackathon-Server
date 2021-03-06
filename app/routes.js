var Node = require('./models/Node');
var User = require('./models/User');
var CheckIn = require('./models/CheckIn');
var ethereumjs = require('ethereumjs-util');

module.exports = function(app) {

  // server routes ===========================================================
  // handle things like api calls
  // authentication routes


  app.get('/', function(req, res) {
    res.status(200).json({'response': 'See /api/nodes'});
  });

  app.get('/api/nodes', function(req, res) {
    Node.find({}, (err, response) => {
        if (err) {
          console.log(err);
          return res.status(500).send();
        }
        res.status(200).json(response);
      });
  });

  app.get('/api/userAddress', function(req, res) {
    User.findOne({
      publicKey: req.query.address
    }, (err, response) => {
        if (err) {
          console.log(err);
          return res.status(500).send();
        }
        res.status(200).json(response);
      });
  });

  app.post('/api/userAddress', function(req, res) {
    User.create({
      publicKey: req.body.address,
      address: req.body.address
    }, (err, response) => {
        if (err) {
          console.log(err);
          return res.status(500).send();
        }
        res.status(200).json(response);
      });
  });

  app.post('/api/nodes', function(req, res) {
    Node.create({
      name: req.body.name,
      publicKey: req.body.publicKey,
      latitude: req.body.latitude,
      longitude: req.body.longitude
    }, (err, response) => {
        if (err) {
          console.log(err);
          return res.status(500).send();
        }
        res.status(200).json(response);
      });
  });

  app.get('/api/checkins', function(req, res) {
    var query;
    if (req.query.paymentAddress) {
      User.findOne({
        publicKey: req.query.paymentAddress
      }, (err, response) => {
        if (err || !response || !response.address) {
          console.log(err);
          return res.status(500).send();
        }
        let address = response.address;
        console.log(response)
        CheckIn.find({ userAddress: address }, (err, response) => {
            if (err) {
              console.log(err);
              return res.status(500).send();
            }
            res.status(200).json(response);
          });
      });
    } else {
      CheckIn.find({ userAddress: req.query.address }, (err, response) => {
        if (err) {
          console.log(err);
          return res.status(500).send();
        }
        res.status(200).json(response);
      });
    }
  });

  // Confirms if a user was present at a location at a given time
  // userAddress
  // nodeAddress
  // beginTime
  // endTime

  app.get('/api/confirm', function(req, res) {
    User.findOne({
      publicKey: req.query.userAddress
    }, (err, response) => {
      if (err || !response || !response.address) {
        console.log(err);
        return res.status(200).send('false');
      }
      let address = response.address;
      Node.findOne({ publicKey: req.query.nodeAddress }, (err, response) => {
        if (err || !response) {
          console.log(err);
          return res.status(200).send('false');
        }
        let id = response._id;
        console.log(id)
        console.log(address)
        CheckIn.find({
          userAddress: address,
          node: id,
          timestamp: { $gte: req.query.beginTime, $lte: req.query.endTime },
        }, (err, response) => {
          if (err || !response || response.length == 0) {
            console.log(err);
            return res.status(200).send('false');
          }
          res.status(200).send(req.query.userAddress);
        });
      });
    });
  });

  app.post('/api/checkin', function(req, res) {
    // Compute the key used to sign the message
    let signature = req.body.signature;
    let hashedMessage = '0x' + ethereumjs.sha3('\x19Ethereum Signed Message:\n' + signature.message.length + signature.message).toString('hex');
    if (signature.messageHash != hashedMessage) {
      console.log('Error: message does not match hash');
      return res.status(500).send();
    }
    result = ethereumjs.fromRpcSig(signature.signature)
    pub = ethereumjs.ecrecover(ethereumjs.toBuffer(signature.messageHash), result.v, result.r, result.s);
    addrBuf = ethereumjs.pubToAddress(pub);
    address = ethereumjs.toChecksumAddress(ethereumjs.bufferToHex(addrBuf));

    console.log('Passed verification.');
    Node.findOne({ publicKey: address }, (err, response) => {
      if (!response || err) {
        console.log(err);
        return res.status(500).send();
      }
      CheckIn.create({
        userAddress: signature.message.split('|')[0],
        timestamp: signature.message.split('|')[1],
        signature: req.body.signature,
        node: response._id
      }, (err, checkin) => {
        res.status(200).json(checkin);
      });
    });
  });

};