const fs = require('fs');
const ejs = require('ejs');
const SendGridAdapter = require('../adapters/send-grid');
const pool = "POOL_2sNvzmrYrdn9RQ1";
const mailingList = "CG_8tVp5T22DHGyRtH"; // Yep - the new one
const hostname = "syd1.qualtrics.com"; //Helo
// const hostname = "2aee86ecb4940555cf2afa068d2ba5a8.m.pipedream.net";
const getMailingListContactsQuery = "/API/v3/directories/" + pool + "/mailinglists/" + mailingList + "/contacts";
const getMailingListContactsUrl = "https://" + hostname + getMailingListContactsQuery;
var request = require('request');
var contacts = [];
var done = false;
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
  
  
  mixItUp (brand, key, api, surveyId) {
    contacts = [];    // Reset to empty
    populateContactsArray(key);
    //return('{ result : Yep }');
    return(JSON.stringify(contacts));
  }
  
  
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

function personAPIrequest(person, key) {
  return new Promise(function(reject, resolve) {
    var options2 = {
      method: 'GET',
      headers: { 'accept': '*/*', 'X-API-TOKEN': key},
      url: getMailingListContactsUrl+"/"+person.contactId
    };
    request(options2, function (error, response, body) {
      if (error) {
        console.log(error);
        reject();
        throw new Error(error);
      }
      console.log("personAPIrequest: " + body);
      let previousMatches = JSON.parse(body).result.embeddedData.previousMatches;
      console.log("personAPIrequest previousMatches: " + previousMatches);
      let unsubscribed = JSON.parse(body).result.unsubscribed;
      console.log("personAPIrequest unsubscribed: " + unsubscribed);
      let mailingListUnsubscribed = JSON.parse(body).result.mailingListUnsubscribed;
      console.log("personAPIrequest mailingListUnsubscribed: " + mailingListUnsubscribed);
      let directoryUnsubscribed = JSON.parse(body).result.directoryUnsubscribed;
      console.log("personAPIrequest directoryUnsubscribed: " + directoryUnsubscribed);
      // exclude unsubscribed contacts
      // exclude contacts with extrefs that are not email addresses
      // Construct short list of contacts
      if (unsubscribed != 'true' && mailingListUnsubscribed != 'true' && directoryUnsubscribed != 'true' && person.extRef.includes('@') ) {
        var contact = { contactId:person.contactId, extRef:person.extRef, previousMatches:previousMatches };
        //console.log("CONTACT: " + JSON.stringify(contact, undefined, 2));
        contacts.push(contact);
      }
      resolve();
    });
  })
}

function personListAPIrequest(key) {
  return new Promise(function(reject, resolve) {
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
      if (error) {
        console.log(error);
        reject();
        throw new Error(error);
      }
      let personList = JSON.parse(body).result.elements;
      /*console.log("PERSONLIST: " + JSON.stringify(personList, undefined, 2)); // {"result":{"elements":[{"contactId":"CID_3pIMBkMDJUt5qWp","firstName":"Eeee","lastName":"Egbert","email":"q5@vanpraag.com","phone":null,"extRef":"q5@vanpraag.com","language":null,"unsubscribed":false},{"contactId":"CID_2rypp6zL9UdbiLj","firstName":"Aaaa","lastName":"Aardvaark","email":"q1@vanpraag.com","phone":null,"extRef":"q1@vanpraag.com","language":null,"unsubscribed":false},{"contactId":"CID_aggZq9ziA7j6iiN","firstName":"Bbbb","lastName":"Bullwark","email":"q2@vanpraag.com","phone":null,"extRef":"q2@vanpraag.com","language":null,"unsubscribed":false},{"contactId":"CID_81VryhahElQBxXL","firstName":"Dddd","lastName":"Dopermine","email":"q4@vanpraag.com","phone":null,"extRef":"q4@vanpraag.com","language":null,"unsubscribed":false},{"contactId":"CID_2mWrnio45kZYTTn","firstName":"Cccc","lastName":"Chipotle","email":"q3@vanpraag.com","phone":null,"extRef":"q3@vanpraag.com","language":null,"unsubscribed":false}]
      console.log("RESULT: " + JSON.stringify(personList, undefined, 2));
      console.log("RESULT[1]: " + JSON.stringify(personList[1], undefined, 2));
      console.log("RESULT[1].firstName: " + JSON.stringify(personList[1].firstName, undefined, 2));*/
      processPersonList(personList, key);
      resolve();
    });
  })
}

async function processPerson(person, key) {
  try{
    await personAPIrequest(person, key);
    console.log("Processed")
  }
  catch(error) {
  }
}
async function processPersonList(personList, key) {
  function shuffle(sourceArray) {
    for (var i = 0; i < sourceArray.length - 1; i++) {
        var j = i + Math.floor(Math.random() * (sourceArray.length - i));
        var temp = sourceArray[j];
        sourceArray[j] = sourceArray[i];
        sourceArray[i] = temp;
    }
    return sourceArray;
  }

  for (const person of personList) {
    await processPerson(person, key);
  }
  console.log('Done!');
  done = true;
  console.log("CONTACTS FINAL: " + JSON.stringify(contacts, undefined, 2)); // XXX WHY IS THIS PRINTED FRIST (and hence EMPTY)!?
  
  for (const person of shuffle(contacts)) {
    console.log("person: " + JSON.stringify(person, undefined, 2));
    for (const match of shuffle(contacts)) {
      if (match.matchContactId == null    // No match yet
          && person.extRef != match.extRef // Not matching themselves
          && person.contactId != match.contactId // Not matching themselves
          && !person.previousMatches.includes(match.extRef) // Not matched previously
          && !match.previousMatches.includes(person.extRef) // Not matched previously
      ) {
        person.matchContactId = match.contactId;
        person.matchExtRef = match.extRef;
        match.matchContactId = person.contactId;
        match.matchExtRef = person.extRef;
        console.log("  match: " + JSON.stringify(match, undefined, 2));
        // XXXX IMPLEMENT HERE
        // find match that is not self
        //.   AND where potential match does not already have a match
        //.   AND where current contact is not in list of previousMatches
        //.   AND where potential match is not in current contact list of previousMatches
        break;
      }
    }
  }
}

async function populateContactsArray(key) {
  try{
    await personListAPIrequest(key);
    console.log("personListAPIrequest Processed")
  }
  catch(error) {
  }
}
