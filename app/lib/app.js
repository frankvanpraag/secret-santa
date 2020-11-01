const fs = require('fs');
const ejs = require('ejs');
const SendGridAdapter = require('../adapters/send-grid');
const pool = "POOL_2sNvzmrYrdn9RQ1";
const mailingList = "CG_eKce12cVmjCadxj";
const hostname = "syd1.qualtrics.com";
// const hostname = "2aee86ecb4940555cf2afa068d2ba5a8.m.pipedream.net";
const getMailingListContactsQuery = "/API/v3/directories/" + pool + "/mailinglists/" + mailingList + "/contacts";
const getMailingListContactsUrl = "https://" + hostname + getMailingListContactsQuery;
var request = require('request');
var personList = {},
	totalResults = 0,
	resultsDownloaded = 0;

class App {
  constructor () {
    this.config = require('../config/config');
    this.storageLocation = __dirname + '/../../data/storage.json';
    this.listLocation = __dirname + '/../../data/list.json';
  }

  getConfig () {
    return this.config;
  }

  getStorage () {
    let db = fs.readFileSync(this.storageLocation);
    return JSON.parse(db.toString());
  }

	
  getContacts(brand, key, api, surveyId) {
    // Helper fuctions
    function sleep(milliseconds) { // Yes, terrible
      const date = Date.now();
      let currentDate = null;
      do {
        currentDate = Date.now();
      } while (currentDate - date < milliseconds);
    }
    
    function shuffle(sourceArray) {
      for (var i = 0; i < sourceArray.length - 1; i++) {
          var j = i + Math.floor(Math.random() * (sourceArray.length - i));
          var temp = sourceArray[j];
          sourceArray[j] = sourceArray[i];
          sourceArray[i] = temp;
      }
      return sourceArray;
    }

    // write buddy name and id to XMD
    // Use Qualtrics API to get all SE members (max 200)
    var options = {
      method: 'GET',
      headers: { 'accept': '*/*', 'X-API-TOKEN': key},
      url: getMailingListContactsUrl,
      qs: {pageSize: '200'}
    };

    // Get all contacts in SE buddy list
    request(options, function (error, response, body) {
      if (error) throw new Error(error);
      console.log(body);
      personList = JSON.parse(body).result.elements;
    	totalResults++;
	    resultsDownloaded++;
      //console.log("PERSONLIST: " + JSON.stringify(personList, undefined, 2)); // {"result":{"elements":[{"contactId":"CID_3pIMBkMDJUt5qWp","firstName":"Eeee","lastName":"Egbert","email":"q5@vanpraag.com","phone":null,"extRef":"q5@vanpraag.com","language":null,"unsubscribed":false},{"contactId":"CID_2rypp6zL9UdbiLj","firstName":"Aaaa","lastName":"Aardvaark","email":"q1@vanpraag.com","phone":null,"extRef":"q1@vanpraag.com","language":null,"unsubscribed":false},{"contactId":"CID_aggZq9ziA7j6iiN","firstName":"Bbbb","lastName":"Bullwark","email":"q2@vanpraag.com","phone":null,"extRef":"q2@vanpraag.com","language":null,"unsubscribed":false},{"contactId":"CID_81VryhahElQBxXL","firstName":"Dddd","lastName":"Dopermine","email":"q4@vanpraag.com","phone":null,"extRef":"q4@vanpraag.com","language":null,"unsubscribed":false},{"contactId":"CID_2mWrnio45kZYTTn","firstName":"Cccc","lastName":"Chipotle","email":"q3@vanpraag.com","phone":null,"extRef":"q3@vanpraag.com","language":null,"unsubscribed":false}]
      //console.log("personList: " + JSON.stringify(personList, undefined, 2));
      //console.log("RESULT[1]: " + JSON.stringify(personList[1], undefined, 2));
      console.log("RESULT[1].firstName: " + JSON.stringify(personList[1].firstName, undefined, 2));
    });
    console.log("sleeping for a while...");
    sleep(3000);
    console.log("sleeping done");
    return personList;
  }

  // ----------------------------------
	
  mixItUpWorkingButCrap (brand, key, api, surveyId) {
    function shuffle(sourceArray) {
      for (var i = 0; i < sourceArray.length - 1; i++) {
          var j = i + Math.floor(Math.random() * (sourceArray.length - i));
          var temp = sourceArray[j];
          sourceArray[j] = sourceArray[i];
          sourceArray[i] = temp;
      }
      return sourceArray;
    }

    // write buddy name and id to XMD
    // Use Qualtrics API to get all SE members (max 200)
    var options = {
      method: 'GET',
      headers: { 'accept': '*/*', 'X-API-TOKEN': key},
      url: getMailingListContactsUrl,
      qs: {pageSize: '200'}
    };

    // Get all contacts in SE buddy list
    request(options, function (error, response, body) {
      if (error) throw new Error(error);
      console.log(body);
      let personList = JSON.parse(body).result.elements;
      //console.log("PERSONLIST: " + JSON.stringify(personList, undefined, 2)); // {"result":{"elements":[{"contactId":"CID_3pIMBkMDJUt5qWp","firstName":"Eeee","lastName":"Egbert","email":"q5@vanpraag.com","phone":null,"extRef":"q5@vanpraag.com","language":null,"unsubscribed":false},{"contactId":"CID_2rypp6zL9UdbiLj","firstName":"Aaaa","lastName":"Aardvaark","email":"q1@vanpraag.com","phone":null,"extRef":"q1@vanpraag.com","language":null,"unsubscribed":false},{"contactId":"CID_aggZq9ziA7j6iiN","firstName":"Bbbb","lastName":"Bullwark","email":"q2@vanpraag.com","phone":null,"extRef":"q2@vanpraag.com","language":null,"unsubscribed":false},{"contactId":"CID_81VryhahElQBxXL","firstName":"Dddd","lastName":"Dopermine","email":"q4@vanpraag.com","phone":null,"extRef":"q4@vanpraag.com","language":null,"unsubscribed":false},{"contactId":"CID_2mWrnio45kZYTTn","firstName":"Cccc","lastName":"Chipotle","email":"q3@vanpraag.com","phone":null,"extRef":"q3@vanpraag.com","language":null,"unsubscribed":false}]
      //console.log("RESULT: " + JSON.stringify(personList, undefined, 2));
      //console.log("RESULT[1]: " + JSON.stringify(personList[1], undefined, 2));
      //console.log("RESULT[1].firstName: " + JSON.stringify(personList[1].firstName, undefined, 2));
      
function resolveAfter2Seconds() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve('resolved');
    }, 2000);
  });
}

async function asyncCall() {
  console.log('calling');
  const result = await resolveAfter2Seconds();
  console.log(result);
  // expected output: "resolved"
}

//asyncCall()
      
      var contacts = [];

Promise.all([      
      personList.forEach((person,index)=>{
        // Retrieve previous matches to avoid
        var options2 = {
          method: 'GET',
          headers: { 'accept': '*/*', 'X-API-TOKEN': key},
          url: getMailingListContactsUrl+"/"+person.contactId
        };
        request(options2, function (error, response, body) {
          if (error) throw new Error(error);
          //console.log(body);
          let previousMatches = JSON.parse(body).result.embeddedData.previousMatches;
          // Construct short list of contacts
          var contact = { contactId:person.contactId, extRef:person.extRef, previousMatches:previousMatches };
return Promise.all(contacts.map(function (contact) {
  return contact.json();
}));
          console.log("CONTACT: " + JSON.stringify(contact, undefined, 2));
     //     contacts.push(contact);
          //console.log("CONTACTS: " + JSON.stringify(contacts, undefined, 2));
          //console.log("---");
          //console.log("Shuffled CONTACTS: " + JSON.stringify(shuffle(contacts), undefined, 2));
          //console.log("---");
        });
      })
]).then(function (data) {
	// Log the data to the console
	// You would do something with both sets of data here
  	console.log("CONTACTS FINAL: " + JSON.stringify(contacts, undefined, 2)); // XXX WHY IS THIS PRINTED FRIST (and hence EMPTY)!?
	console.log(data);
}).catch(function (error) {
	// if there's an error, log it
	console.log(error);
});

      
      
    });
  }

	
	
	
	
  // -----------------------
	
  addSubscriber (data) {
    const storage = this.getStorage();
    storage.subscribers.push(data);

    fs.writeFileSync(this.storageLocation, JSON.stringify(storage));
  }

  haveEmailsAlreadySent () {
    return fs.existsSync(this.listLocation);
  }

  createAndSendEmails () {
    const list = this.assignRecipients();
    const messages = this.composeEmails(list);

    return this.sendEmails(messages);
  }

  resendRecipientList () {
    const list = JSON.parse(fs.readFileSync(this.listLocation).toString());
    const messages = this.composeEmails(list);

    return this.sendEmails(messages);
  }

  assignRecipients () {
    const storage = this.getStorage();
    const subscribers = this.shuffle(storage.subscribers);
    const list = [];

    for (let i = 0; i < subscribers.length; i++) {
      let subscriber = subscribers[i];
      let recipient;

      if (i === subscribers.length - 1) {
        recipient = subscribers[0];
      } else {
        recipient = subscribers[i + 1];
      }

      list.push({
        person: subscriber.email,
        recipient: recipient.email,
        sent: false
      });
    }

    fs.writeFileSync(this.listLocation, JSON.stringify(list));

    return list;
  }

  composeEmails (emailList) {
    const subject = 'Your Secret Santa drawing';
    const messageBody = fs.readFileSync('app/views/email.ejs').toString();
    const subscribers = this.getStorage().subscribers;
    const messages = [];

    for (let i = 0; i < emailList.length; i++) {
      let senderEmail = emailList[i].person;
      let recipientEmail = emailList[i].recipient;
      let sender = this.getItemByEmail(subscribers, senderEmail);
      let recipient = this.getItemByEmail(subscribers, recipientEmail);

      if (recipient) {
        messages.push({
          to: senderEmail,
          subject: subject,
          html: ejs.render(messageBody, {
            name: sender.name,
            recipient: recipient.name,
            colour: recipient.colour,
            animal: recipient.animal,
            idea: recipient.idea,
            deadline: this.config.deadline,
            spendLimit: this.config['spend-limit']
          })
        });
      }
    }

    return messages;
  }

  sendEmails (messages) {
    const emailConfig = this.config['email-server'];
    let adapter;

    if (emailConfig.type === 'sendgrid') {
      adapter = new SendGridAdapter(emailConfig.options, emailConfig['from-address']);
    }

    adapter.send(messages);
  }

  /*
   * Express middleware to check for session
   */
  ensureLoggedIn (req, res, next) {
    if (req.session.user && req.url === '/login') {
      res.redirect('/admin');
    } else if (!req.session.user && req.url !== '/login') {
      req.session.error = 'Access denied!';
      res.status(401);
      res.render('login');
    } else {
      next();
    }
  }

  initSession (req) {
    req.session.user = true;
  }

  getItemByEmail (list, email) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].email === email) {
        return list[i];
      }
    }

    return null;
  }

  /**
   * http://bost.ocks.org/mike/shuffle/
   * @param {Array} array
   * @return {Array}
   */
  shuffle (array) {
    let counter = array.length;
    let temp;
    let index;

    // While there are elements in the array
    while (counter > 0) {
      // Pick a random index
      index = Math.floor(Math.random() * counter);

      // Decrease counter by 1
      counter--;

      // And swap the last element with it
      temp = array[counter];
      array[counter] = array[index];
      array[index] = temp;
    }

    return array;
  }
}

module.exports = new App();
