const fs = require('fs');
const ejs = require('ejs');
const SendGridAdapter = require('../adapters/send-grid');
const pool = "POOL_2sNvzmrYrdn9RQ1";
const mailingList = "CG_8tVp5T22DHGyRtH"; // Yep - the new one
const hostname = "syd1.qualtrics.com"; //Helo
// const xxxhostname = "2aee86ecb4940555cf2afa068d2ba5a8.m.pipedream.net";
const getMailingListContactsQuery = "/API/v3/directories/" + pool + "/mailinglists/" + mailingList + "/contacts";
const getMailingListContactsUrl = "https://" + hostname + getMailingListContactsQuery;
const putContactQuery = "/API/v3/directories/" + pool + "/contacts/";
const putContactUrl = "https://" + hostname + putContactQuery;
const postNewBatchQuery = "/API/v3/directories/" + pool + "/transactionbatches";
const postNewBatchUrl = "https://" + hostname + postNewBatchQuery;
const postBatchesQuery = "/API/v3/directories/" + pool + "/mailinglists/" + mailingList + "/transactioncontacts";
const postBatchesUrl = "https://" + hostname + postBatchesQuery;
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
      // Check if user is fully unsubscribed from entire directory
      let unsubscribed = JSON.parse(body).result.unsubscribed;
      console.log("personAPIrequest unsubscribed: " + unsubscribed);
      // xxx bug: mailingListUnsubscribed and directoryUnsubscribed are not provided by this API call so they are always false/undefined 
      let mailingListUnsubscribed = JSON.parse(body).result.mailingListUnsubscribed;
      console.log("personAPIrequest mailingListUnsubscribed: " + mailingListUnsubscribed);
      let directoryUnsubscribed = JSON.parse(body).result.directoryUnsubscribed;
      console.log("personAPIrequest directoryUnsubscribed: " + directoryUnsubscribed);
      let currentMatch = JSON.parse(body).result.embeddedData["Current match"];
      console.log("personAPIrequest currentMatch: " + currentMatch);
      let firstName = JSON.parse(body).result["firstName"];
      console.log("personAPIrequest firstName: " + firstName);
      let lastName = JSON.parse(body).result["lastName"];
      console.log("personAPIrequest lastName: " + lastName);
      let fullName = firstName + " " + lastName;
      console.log("personAPIrequest fullName: " + fullName);
      // exclude unsubscribed contacts
      // exclude contacts with extrefs that are not email addresses
      // Construct short list of contacts
      var availableThisRound = !unsubscribed && person.extRef.includes('@')
      var contact = 
          { 
            availableThisRound:availableThisRound, 
            contactId:person.contactId, 
            extRef:person.extRef, 
            fullName:fullName,
            firstName:firstName,
            lastName:lastName,
            currentMatch:currentMatch,
            previousMatches:previousMatches, 
            newMatchContactId:null,
            newMatchFirstName:null,
            newMatchLastName:null,
            newMatchFullName:null,
            newMatchExtRef:null 
          };
      console.log("CONTACT ADDED: " + JSON.stringify(contact, undefined, 2));
      contacts.push(contact);
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
    console.log("Start: " + JSON.stringify(options, undefined, 2));
   
    request(options, function (error, response, body) {
      if (error) {
        console.log(error);
        reject();
        throw new Error(error);
      }
      // CHECK ACCOUNT "Expiration Date" FOR USER "buddies@qualtrics.com" ON "qfrankp"
      // CHECK ACCOUNT "Expiration Date" FOR USER "buddies@qualtrics.com" ON "qfrankp"
      // CHECK ACCOUNT "Expiration Date" FOR USER "buddies@qualtrics.com" ON "qfrankp"
      let personList = JSON.parse(body).result.elements;  // ERROR WILL OCCUR IF ACCOUNT HAS EXPIRED
      // CHECK ACCOUNT "Expiration Date" FOR USER "buddies@qualtrics.com" ON "qfrankp"
      // CHECK ACCOUNT "Expiration Date" FOR USER "buddies@qualtrics.com" ON "qfrankp"
      // CHECK ACCOUNT "Expiration Date" FOR USER "buddies@qualtrics.com" ON "qfrankp"
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

  function wait(ms){
     var start = new Date().getTime();
     var end = start;
     while(end < start + ms) {
       end = new Date().getTime();
    }
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

  for (const person of personList) {
    await processPerson(person, key);
  }
  console.log('Done!');
  done = true;
  console.log("CONTACTS FINAL: " + JSON.stringify(contacts, undefined, 2)); // XXX WHY IS THIS PRINTED FRIST (and hence EMPTY)!?
  
  for (const person of shuffle(contacts)) {
    if (person.newMatchContactId || person.matchExtRef || !person.availableThisRound) continue;  // already matched
    console.log("");
    console.log("Checking match for person: " + JSON.stringify(person, undefined, 2));
    for (const match of shuffle(contacts)) {
      // console.log(" person.contactId: "+person.contactId);
      // console.log(" match.contactId: "+match.contactId);
      // console.log(" match.extRef: "+match.extRef);
      // console.log(" person.extRef: "+person.extRef);
      // console.log(" match.newMatchContactId: "+match.newMatchContactId);
      // console.log(" person.newMatchContactId: "+person.newMatchContactId);
      // console.log(" match.previousMatches: "+match.previousMatches);
      // console.log(" person.previousMatches: "+person.previousMatches);
      console.log("  Possible Match: " + JSON.stringify(match.extRef, undefined, 2));
      //console.log("  ---> " + JSON.stringify(match, undefined, 2));
      if (match.availableThisRound    // No match yet     
         ) console.log("  Data check 1: match.availableThisRound == true");
      //if (match.newMatchContactId == null    // No match yet     
      //   ) console.log("  Data check 1: match.newMatchContactId == null");
      if (person.extRef != match.extRef // Not matching themselves
         ) console.log("  Data check 2: person.extRef != match.extRef");
      if (person.currentMatch != match.extRef // Not their current match
         ) console.log("  Data check 2a: person.currentMatch != match.extRef");
      if (person.contactId != match.contactId // Not matching themselves
         ) console.log("  Data check 3: person.contactId != match.contactId");
      if (!person.previousMatches || !person.previousMatches.includes(match.extRef)  // Not matched previously
         ) console.log("  Data check 4: !person.previousMatches || !person.previousMatches.includes(match.extRef)");
      if (!match.previousMatches  || !match.previousMatches.includes(person.extRef)  // Not matched previously
         ) console.log("  Data check 5: !match.previousMatches  || !match.previousMatches.includes(person.extRef");

      if (match.availableThisRound    // This match is not yet matched with someone else
          //&& match.newMatchContactId == null    // No match yet
          && person.extRef != match.extRef // Not matching themselves
          && person.contactId != match.contactId // Not matching themselves
          && person.currentMatch != match.extRef
          && ( !person.previousMatches || !person.previousMatches.includes(match.extRef) ) // Not matched previously
          && ( !match.previousMatches  || !match.previousMatches.includes(person.extRef) ) // Not matched previously
      ) {
        console.log("   ---> Yes, this person is a match!");
        console.log("   ===> Matching "+person.extRef+" with "+match.extRef);
        person.newMatchContactId = match.contactId;
        person.newMatchExtRef = match.extRef;
        person.newMatchFirstName = match.firstName;
        person.newMatchLastName = match.lastName;
        person.newMatchFullName = match.fullName;
        match.newMatchContactId = person.contactId;
        match.newMatchFullName = person.fullName;
        //match.newMatchExtRef = person.extRef;
        // Update previous matches with currentMatch - don't forget to clear currentMatch
        if (person.previousMatches && person.currentMatch)
          person.previousMatches += "," + person.currentMatch; // Save last weeks match
        else
          person.previousMatches = person.currentMatch; // Save last weeks match
        if (match.previousMatches && match.currentMatch)
          match.previousMatches += "," + match.currentMatch + "," + person.extRef;  // Save last weeks match
        else if (match.currentMatch)
          match.previousMatches = match.currentMatch + "," + person.extRef;  // Save last weeks match
        else
          match.previousMatches = person.extRef;  // Save last weeks match
        
        match.availableThisRound = false;  // remove match from future matches
        person.availableThisRound = false; // remove match from future matches
      }
      else {
        console.log("   ---> no match (continue to next match)");
        continue;
      }
      // stop processing other possible matches
      if (person.newMatchContactId) {
        console.log("  BREAK BECAUSE MATCH FOUND: " + JSON.stringify(person.extRef, undefined, 2) + " matched with " + JSON.stringify(match.extRef, undefined, 2));
        console.log("");
        break;
      }
    }
  }
  console.log("MATCHES FINAL: " + JSON.stringify(contacts, undefined, 2)); // HURRAY!
  var m = new Date();
  var dateString =
      m.getUTCFullYear() + "/" +
      ("0" + (m.getUTCMonth()+1)).slice(-2) + "/" +
      ("0" + m.getUTCDate()).slice(-2) + " " +
      ("0" + m.getUTCHours()).slice(-2) + ":" +
      ("0" + m.getUTCMinutes()).slice(-2) + ":" +
      ("0" + m.getUTCSeconds()).slice(-2);

  console.log("Timestamp: ", dateString);

  var lastDebugMessage="";
  
  var batchContacts = [];
  for (const person of contacts) {
    if (person.newMatchExtRef) // This person is arranging a buddy meetup
      lastDebugMessage+="\n"+dateString+": "+person.extRef+" will initiate contact with "+person.newMatchExtRef+" to arrange buddy meetup";
    else if (person.previousMatches && person.newMatchFullName) // This person sits back and waits for a buddy to contact them
      lastDebugMessage+="\n"+dateString+": "+person.extRef+" will wait patiently for "+person.newMatchFullName+" to initiate buddy meetup";
    else
      lastDebugMessage+="\n"+dateString+": "+person.extRef+" does not have a buddy at this point";

    if (person.newMatchExtRef) // This person is arranging a buddy meetup
      batchContacts.push(      
          {
            "firstName": person.firstName,
            "lastName": person.lastName,
            "email": person.extRef,
            "extRef": person.extRef,
             "transactionData": {
               "previousMatches": person.previousMatches?person.previousMatches:"",
               "buddyEmail": person.newMatchExtRef,
               "buddyFullName": person.newMatchFullName,
               "buddyStatus": dateString+": "+person.extRef+" will initiate contact with "+person.newMatchExtRef+" to arrange buddy meetup"
             },
             "embeddedData": { 
                "Buddy status": dateString+": "+person.extRef+" will initiate contact with "+person.newMatchExtRef+" to arrange buddy meetup",
                "Current match": person.newMatchExtRef,
                "Current match first name": person.newMatchFirstName,
                "Current match last name": person.newMatchLastName,
                "Current match full name": person.newMatchFullName,
                "previousMatches": person.previousMatches?person.previousMatches:"" 
             }
          }
        )
      
    else if (person.previousMatches && person.newMatchFullName) // This person sits back and waits for a buddy to contact them
      batchContacts.push(      
          {
            "firstName": person.firstName,
            "lastName": person.lastName,
            "email": person.extRef,
            "extRef": person.extRef,
             "transactionData": {
               "previousMatches": person.previousMatches?person.previousMatches:"",
               "buddyFullName": person.newMatchFullName,
               "buddyStatus": dateString+": "+person.extRef+" will wait patiently for "+person.newMatchFullName+" to initiate buddy meetup"
             },
            "embeddedData": 
              { 
                "Buddy status": dateString+": "+person.extRef+" will wait patiently for "+person.newMatchFullName+" to initiate buddy meetup",
                "Current match": "",
                "Current match first name": "",
                "Current match last name": "",
                "Current match full name": person.newMatchFullName,
                "previousMatches": person.previousMatches?person.previousMatches:"" 
              }
          }
        )
      
    else
      batchContacts.push(      
          {
            "firstName": person.firstName,
            "lastName": person.lastName,
            "email": person.extRef,
            "extRef": person.extRef,
             "transactionData": {
               "previousMatches": person.previousMatches?person.previousMatches:"",
               "buddyFullName": "None",
               "buddyStatus": dateString+": "+person.extRef+" does not have a buddy at this point"
             },
            "embeddedData": 
              { 
                "Buddy status": dateString+": "+person.extRef+" does not have a buddy at this point",
                "Current match": "",
                "Current match first name": "",
                "Current match last name": "",
                "Current match full name": ""
              }
          }
        )
      
  } // end of for loop
  
  console.log("====================== LIFE IS GOOD ======================");
  // PRINT THIS TO THE CONSOLE
  console.log("batchContacts to send to https://syd.qualtrics.com/API/v3/directories/{directoryId}/mailinglists/{mailingListId}/transactioncontacts: ");
  console.log("batchContacts: " + JSON.stringify(batchContacts, undefined, 2));

  var data = "";
  // ToDo: Call API to get batchID
  // ToDo: Call API to get batchID
  // ToDo: Call API to get batchID
  // Push update to XM Directory 
  var bbody = JSON.stringify({ "transactionIds": [ "CTR_00006" ], "creationDate": "2020-12-14T12:12:22Z"});
  var options = {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'accept': '*/*', 'X-API-TOKEN': key},
    body: bbody,
    url: postNewBatchUrl
  };
  console.log("PREPARING NEW BATCH UPDATE: " + JSON.stringify(options, undefined, 2));
  wait(500); // xxx Sometimes we see 404 errors saying the contact does not exists - who knows why?
  request(options, function (error, response, body) {
    if (error) {
      console.log("BATCH INIT ERROR: "+error);
      throw new Error(error);
    }
    if (response) {
      console.log("BATCH INIT RESPONSE: " + JSON.stringify(response, undefined, 2));
    }
    if (body) {
      let result = JSON.parse(body);
      console.log("BATCH INIT BODY from which to get BT_id: " + JSON.stringify(result, undefined, 2));      
      // ToDo: Call API to update all contacts
      // ToDo: Call API to update all contacts
      // ToDo: Call API to update all contacts
      data = {      
        "transactionMeta": {
          "batchId": result.id,
           "fields": [
             "buddyEmail",
             "buddyFullName",
             "buddyStatus"
           ]
        },
        "contacts": [ batchContactsJSON ]
      };
      console.log("xxx now call API to update these contacts: " + JSON.stringify(data, undefined, 2));
      
      if (!JSON.stringify(result, undefined, 2).includes("200 - OK")) // I've seen 404 errors "No contact found" for perfectly valid contactId
      {
          //try one more time
          wait(3000);
//           request(options, function (error, response, body) {
//             if (error) {
//               console.log("WRITE TO XMD ERROR (retry): "+error);
//               throw new Error(error);
//             }
//             if (response) {
//               console.log("WRITE TO XMD RESPONSE (retry): " + JSON.stringify(response, undefined, 2));
//             }
//             if (body) {
//               let result = JSON.parse(body);
//               console.log("WRITE TO XMD BODY (retry): " + JSON.stringify(result, undefined, 2));
//             }
//           });
      }
    }  
  }); // request
  console.log("====================== END OF PROCESSING ======================");
  console.log(lastDebugMessage);
}

async function populateContactsArray(key) {
  try{
    await personListAPIrequest(key);
    console.log("personListAPIrequest Processed")
  }
  catch(error) {
  }
}
