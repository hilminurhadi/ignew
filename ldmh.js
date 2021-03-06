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
  name:'text',
  message:'Insert Text Comment (Use [|] if more than 1):',
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

const doLike = async (session, id) => {
  try{
    await Client.Like.create(session, id);
    return true;
  } catch(e) {
    return false;
  }
}

async function doDM(session, users, text){
    try{
await Client.Thread.configureText(session, users, text)
    return true;
} catch(e) {
    return false;
}
}

const doAction = async (session, params, text) => {
  const task = [
  doLike(session, params.id),
  doDM(session, params.account.id, text)
  ];
  var [Like,DM] = await Promise.all(task);
  Like = Like ? chalk`{bold.green SUKSES}` : chalk`{bold.red GAGAL}`;
  DM = DM ? chalk`{bold.green SUKSES}` : chalk`{bold.red GAGAL}`;
  return chalk`[Like: ${Like}] [DM: ${DM} ({cyan ${text}})]`;
}

const doMain = async (account, hastag, sleep, text, ittyw) => {
  console.log(chalk`{yellow \n[?] Try to Login . . .}`)
  account = await doLogin(account);
  console.log(chalk`{bold.green [✓] Login Succsess}\n{yellow [?] Try to Like and DM All Account In Hashtag: #${hastag}}`);
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
          const ranText = text[Math.floor(Math.random() * text.length)];
          const resultAction = await doAction(account.session, media.params, ranText);
          console.log(chalk`[{magenta ${timeNow}}] ${media.id} | {cyanBright @${media.params.account.username}} \n=> ${resultAction}`);
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
  LDMH (Like DM by Hashtag)
  Code by ccocot@bc0de.net
  Recode by koenurf}
      `);
inquirer.prompt(question)
.then(answers => {
  var text = answers.text.split('|');
  doMain({
    username:answers.username, 
    password:answers.password}, answers.hastag, answers.sleep, text,answers.ittyw);
})
.catch(e => {
  console.log(e);
})
