'use strict'
const Client = require('instagram-private-api').V1;
const chalk = require('chalk');
const delay = require('delay');
const _ = require('lodash');
const inquirer = require('inquirer');

const question = [
{
  type:'input',
  name:'username',
  message:'Insert Username:',
  validate: function(value){
    if(!value) return 'Can\'t Empty';
    return true;
  }
},
{
  type:'password',
  name:'password',
  message:'Insert Password:',
  mask:'*',
  validate: function(value){
    if(!value) return 'Can\'t Empty';
    return true;
  }
},
{
  type:'input',
  name:'hastag',
  message:'Insert Hashtag (Without #):',
  validate: function(value){
    if(!value) return 'Can\'t Empty';
    return true;
  }
},
{
    type:'input',
    name:'urlpost',
    message:'Insert Url Post Target :',
    validate: function(value){
      if(!value) return 'Can\'t Empty';
      return true;
    }
  },
{
  type:'input',
  name:'ittyw',
  message:'Input Total of Target You Want (ITTYW):',
  validate: function(value){
    value = value.match(/[0-9]/);
    if (value) return true;
    return 'Use Number Only!';
  }
},
{
  type:'input',
  name:'sleep',
  message:'Insert Sleep (In MiliSeconds):',
  validate: function(value){
    value = value.match(/[0-9]/);
    if (value) return true;
    return 'Delay is number';
  }
}
]

const doLogin = async (params) => {
  const Device = new Client.Device(params.username);
  const Storage = new Client.CookieMemoryStorage();
  const session = new Client.Session(Device, Storage);
  try {
    await Client.Session.create(Device, Storage, params.username, params.password)
    const account = await session.getAccount();
    return Promise.resolve({session,account});
  } catch (err) {
    return Promise.reject(err);
  }
}

const grabFollowers = async (session, id) => {
  const feed = new Client.Feed.AccountFollowers(session, id);
  try{
    feed.map = item => item.params;
    return Promise.resolve(feed.all());
  }catch (e){
    return Promise.reject(err);
  }
}

const doComment = async (session, id, text) => {
  try {
    await Client.Comment.create(session, id, text);
    return true;
  } catch(e){
    return false;
  }
}

const CnM = async function(session, urlpost, text){
    var request = require("request")
    const url = "https://api.instagram.com/oembed/?url="+urlpost
    request({
    url: url,
    json: true
    }, async function (error, response, body) {
    if (!error && response.statusCode === 200) {
        var string = JSON.stringify(body);
        var objectValue = JSON.parse(string);
        var mediaid = objectValue['media_id'];
        const task = [
        doComment(session, mediaid, text)
        ]
        const [Comment] = await Promise.all(task);
        const printComment = Comment ? chalk`{green Comment berhasil}` : chalk`{red Comment gagal}`;
        var timeNow = new Date();
        timeNow = `${timeNow.getHours()}:${timeNow.getMinutes()}:${timeNow.getSeconds()}`
        console.log(chalk`{bold.yellow ${timeNow}} : {bold.green ${printComment} » {bold.cyan ${text}}}`);
    }else{
        console.log(chalk`{cyan {bold.red (FAILED)} URL POST INVALID!}`)
    }
    })
};

const doMain = async (account, hastag, sleep, ittyw) => {
  console.log(chalk`{yellow \n[?] Try to Login . . .}`)
  account = await doLogin(account);
  console.log(chalk`{bold.green [✓] Login Succsess}\n{yellow [?] Try to Mention All Account In Hashtag: #${hastag}}`);
  const feed = new Client.Feed.TaggedMedia(account.session, hastag);
  try {
    var cursor;
    var count = 0;
    console.log(chalk`{yellow \n[#][>] START WITH RATIO ${ittyw} TARGET/${sleep} MiliSeconds [<][#]\n}`)
    do {
      if (cursor) feed.setCursor(cursor);
      count++;  
      var media = await feed.get();
      media = _.chunk(media, ittyw);
      for (media of media) {
        var timeNow = new Date();
        timeNow = `${timeNow.getHours()}:${timeNow.getMinutes()}:${timeNow.getSeconds()}`
        await Promise.all(media.map(async(media)=>{
          const ranText = '@'+media.params.account.username;
          const resultAction = await CnM(account.session, account.urlpost, ranText);
          console.log(chalk`${resultAction}`);
        }))
        console.log(chalk`{yellow \n[#][>] Delay For ${sleep} MiliSeconds [<][#]\n}`)
        await delay(sleep);
      }
      cursor = await feed.getCursor();
      console.log(chalk`[Cursor: {bold.cyan ${cursor ? cursor : 'null'}} | Count: {bold.cyan ${count}} | Total Media: {bold.cyan ${media.length}} | Delay: ${sleep} MiliSeconds ]`);
    } while(feed.isMoreAvailable());
  } catch(e) {
    console.log(e);
  }
}
console.log(chalk`{bold.cyan
    CMUH (Comment Mention to urlPost by Hashtag)
    Code by ccocot@bc0de.net
    Recode by koenurf}
      `);
inquirer.prompt(question)
.then(answers => {
  var text = answers.text.split('|');
  doMain({
    username:answers.username, 
    password:answers.password,
    urlpost:answers.urlpost
}, answers.hastag, answers.sleep, text,answers.ittyw);
})
.catch(e => {
  console.log(e);
})
