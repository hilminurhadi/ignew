'use strict'
const Client = require('instagram-private-api').V1;
const chalk = require('chalk');
const delay = require('delay');
const _ = require('lodash');
const inquirer = require('inquirer');
const fs = require('fs');

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
  name:'locationId',
  message:'Insert Location ID:',
  validate: function(value){
    value = value.match(/[0-9]/);
    if (value) return true;
    return 'Delay is number';
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
  message:'Insert Sleep (In Seconds):',
  validate: function(value){
    value = value.match(/[0-9]/);
    if (value) return true;
    return 'Delay is number';
  }
},
{
  type:'input',
  name:'limit',
  message:'Auto Sleep 1 Day if 3x Fail (y/n):',
  validate: function(value){
    if (value == "y"){
      fs.writeFileSync('count.txt', 0);
      return true;
    }else if (value == "n"){
      fs.writeFileSync('count.txt', NaN);
      return true;
    }else{
      return 'Invalid Input';
    }
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

const doAction = async (session, params) => {
  const task = [
  doLike(session, params.id)
  ];
  var [Like] = await Promise.all(task);
  Like = Like ? 1 : 0;

  if (Like == 0){
    fs.readFile('count.txt', (err, data) => {
      if (err) throw err;
        var countl = parseInt(data);
        var _countl = countl+1;
        fs.writeFileSync('count.txt', _countl);
    });
  }

  fs.readFile('count.txt', async function (err, data) {
    if (err) throw err;
    if(data.includes('3')){
      console.log(chalk`{red \n[#][>] LIMIT! Sleep For 24 Hours [<][#]\n}`)
      fs.writeFileSync('count.txt', 0);
      await delay(86400000);
    }
  });

  if(Like == 1){
    Like = chalk`{bold.green Berhasil}`;
  }else{
    Like = chalk`{bold.red Gagal}`;
  }
  return chalk`[Like: ${Like}]`;
}

const doMain = async (account, locationid, sleep, ittyw) => {
  console.log(chalk`\n{green [?] Try to Login ....}`);
  account = await doLogin(account);
  console.log(chalk`{bold.green [✓] Login Success!}`)
  const feed = new Client.Feed.LocationMedia(account.session, locationid);
  console.log(chalk`{green [?] Try Like and Comment All Account In LocationId: ${locationid}\n}`);
  try {
    var cursor;
    var count = 0;
    console.log(chalk`{yellow \n[#][>] START WITH RATIO ${ittyw} TARGET/${sleep} Seconds [<][#]\n}`)
    do {
      if (cursor) feed.setCursor(cursor);
      count++;
      var media = await feed.get();
      media = _.chunk(media, ittyw);
      for (media of media) {
        var timeNow = new Date();
        timeNow = `${timeNow.getHours()}:${timeNow.getMinutes()}:${timeNow.getSeconds()}`
        await Promise.all(media.map(async(media)=>{
          const resultAction = await doAction(account.session, media.params);
          console.log(chalk`[{magenta ${timeNow}}] ${media.id} | {cyanBright @${media.params.account.username}}\n=> ${resultAction}`);
        }))
        console.log(chalk`{yellow \n[#][>] Delay For ${sleep} Seconds [<][#]\n}`)
        await delay(sleep+'000');
      }
      cursor = await feed.getCursor();
    } while(feed.isMoreAvailable());
  } catch(e) {
    console.log(e);
  }
}
console.log(chalk`{bold.cyan
    LL (Like by Location)
    Code by ccocot@bc0de.net
    Recode by koenurf}
      `);
inquirer.prompt(question)
.then(answers => {
  doMain({
    username:answers.username,
    password:answers.password}, answers.locationId, answers.sleep,answers.ittyw,answers.limit);
})
.catch(e => {
  console.log(e);
})
