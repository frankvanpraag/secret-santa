const fs = require('fs');
const ejs = require('ejs');
const SendGridAdapter = require('../adapters/send-grid');
const https = require('https')

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

  mixItUp (data) {
    // write buddy name and id to XMD
    let brand = data.brand;
    let api = data.api;
    let key = data.key;
    let survey = data.survey;
    const pool = "POOL_2sNvzmrYrdn9RQ1";
    const mailingList = "CG_eKce12cVmjCadxj";
    const getMailingListContacts = "https://syd1.qualtrics.com/API/v3/directories/" + pool + "/mailinglists/" + mailingList + "/contacts";
    
    // Use Qualtrics API to get all SE members
    const qapireq = {
                      "method": "get",
                      "url": getMailingListContacts,
                      "query": {
                        "pageSize": "100"
                      },
                      "headers": {
                        "X-API-TOKEN": key
                      }
                    };

      const req = https.request(qapireq, res => {
        console.log(`statusCode: ${res.statusCode}`)

        res.on('data', d => {
          process.stdout.write(d)
        })
      })

      req.on('error', error => {
        console.error(error)
      })

      req.end()


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
