import { createRequire } from "module";
const require = createRequire(import.meta.url);

import fetch from 'node-fetch';
const sdk = require('api')('@front/v1.0.0#189xzg3o3klblhcee4');
const express = require('express')
const app = express()
var bodyParser = require('body-parser');
var useragent = require('express-useragent');
const crypto = require('crypto');

const clickupak = process.env.clickupak;
const clickupwhs = process.env.clickupwhs;
const clickupwhsCommentPost = process.env.clickupwhsCommentPost;
const frontak = process.env.frontak;
const frontwhs = process.env.frontwhs;
const soField = process.env.sofield;
const rsDomain = process.env.rsdomain;

app.use(useragent.express());
app.use(bodyParser.json());    
app.use(bodyParser.urlencoded({ extended: true }));    

async function getTask(taskId, clickupak) {
    const query = new URLSearchParams({
    //   custom_task_ids: 'false',
    //   team_id: '',
      include_subtasks: 'true'
    }).toString();
  
    // const taskId = '860pbda4n';
    const resp = await fetch(
      `https://api.clickup.com/api/v2/task/${taskId}?${query}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: clickupak
        }
      }
    );
  
    const data = await resp.text();
    var task = JSON.parse(data);    
    return task;
  }

  async function getTaskComments(taskId, clickupak) {
    const query = new URLSearchParams({
    //   custom_task_ids: 'true',
    //   team_id: '123',
    //   start: '0',
    //   start_id: 'string'
    }).toString();
      
    const resp = await fetch(
      `https://api.clickup.com/api/v2/task/${taskId}/comment?${query}`,
      {
        method: 'GET',
        headers: {
          Authorization: clickupak
        }
      }
    );
  
    const data = await resp.text();
    const comment = JSON.parse(data);
    console.log("comment:");
    console.dir(comment, { depth: null });

    var comments = comment["comments"];
    let regex = /cnv_[a-zA-Z0-9]+/;
    for(var i=0;i<comments.length;i++){
        var commentText = comments[i]["comment_text"];
        console.log(commentText);
        if( commentText.includes("Front Conversation:") ){
            let result = regex.exec(commentText);
            if(result){
                console.log("Linked Front conversation:",result[0]);
                comment["front_conversation_id"] = result[0]
            }
        }
    }
    return comment;    
  }

async function addTaskAssignee(taskId, userId, clickupak) {
  const query = new URLSearchParams({
    // custom_task_ids: 'true',
    // team_id: '123'
  }).toString();
  
  const resp = await fetch(
    `https://api.clickup.com/api/v2/task/${taskId}?${query}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: clickupak
      },
      body: JSON.stringify({        
        assignees: {add: [userId]},        
      })
    }
  );
  
  const data = await resp.json();
  console.log("addTaskAssignee done:",data);
}

async function removeTaskAssignee(taskId, userId, clickupak) {
  const query = new URLSearchParams({
    // custom_task_ids: 'true',
    // team_id: '123'
  }).toString();
  
  const resp = await fetch(
    `https://api.clickup.com/api/v2/task/${taskId}?${query}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: clickupak
      },
      body: JSON.stringify({        
        assignees: {rem: [userId]},        
      })
    }
  );
  
  const data = await resp.json();
  console.log("addTaskAssignee done:",data);
}

app.all('/', (req, res) => {
    var ip = req.socket.remoteAddress;
    console.log("Just got a request!",ip,"param:",req.params,"body:");
    console.dir(req.body, { depth: null });
    
    res.send('Yo!')
})

app.all('/clickup-assign', async (req, res) => {
    var ip = req.socket.remoteAddress;
    console.log("clickup-assign",ip,"param:",req.params,"body:");
    console.log("clickupak.length:", clickupak.length);
    console.dir(req.body, { depth: null });
    var xSignature = req.get('X-Signature');
    console.log("X-Signature:",xSignature);
    var body = JSON.stringify(req.body);    
    const hash = crypto.createHmac('sha256', clickupwhs).update(body);
    const signature = hash.digest('hex');
    console.log("hash:",hash);
    console.log("signature:",signature);

    if(xSignature==signature){
        
        var taskId = req.body["task_id"];
        const task = await getTask(taskId,clickupak);
        console.log("task:",task);        
        console.log("task id:",task["id"]);
        console.log("task assignees:",task["assignees"]);          
        var subtasks = task["subtasks"];
        if(subtasks){
          for(var i=0;i<subtasks.length;i++){
            console.log("subtask",i,subtasks[i]["id"],subtasks[i]["name"]);
            if( subtasks[i]["name"].toUpperCase().includes("COMM REVIEW") || subtasks[i]["name"].toUpperCase().includes("COMMERCIAL REVIEW") || subtasks[i]["name"].toUpperCase().includes("CHECK") ){

            }else{
              var subtaskId = subtasks[i]["id"];
              switch(req.body["history_items"][0]["field"]){
                case "assignee_add":
                  var updatedAssignee = req.body["history_items"][0]["after"];
                  console.log("updatedAssignee:",updatedAssignee);
                  console.log("assignee_add:",subtaskId,updatedAssignee["id"]);
                  await addTaskAssignee(subtaskId, updatedAssignee["id"], clickupak);
                  break;
                case "assignee_rem":
                  var updatedAssignee = req.body["history_items"][0]["before"];
                  console.log("updatedAssignee:",updatedAssignee);
                  console.log("assignee_rem:",subtaskId,updatedAssignee["id"]);
                  await removeTaskAssignee(subtaskId, updatedAssignee["id"], clickupak);
                  break;
                default:

              }            
            }
          }
        }

        var taskAssigneesEmails = []
        if(task["assignees"]){
          if(task["assignees"].length>0){
            taskAssigneesEmails = task["assignees"].map( x => x["email"] );
          }
        }
        console.log("taskAssigneesEmails:", taskAssigneesEmails);

        var clickupComment = await getTaskComments(taskId,clickupak);
        var frontConvId = clickupComment["front_conversation_id"];
        console.log("frontConvId:",frontConvId);
        if(frontConvId){
          await sdk.auth(frontak);

          var teammates;
          await sdk.getTeammates()
            .then( async ({ data }) => {
              console.log("Front teammates:",data["_results"].length);
              teammates = data["_results"];
              await sdk.getConversationById({conversation_id: frontConvId})
                .then( async ({ data }) => {
                  console.log("Front conversation:");
                  // console.dir(data,{depth:null});
                  for(var i=0;i<taskAssigneesEmails.length;i++){
                    var filteredTeammates = teammates.filter(x => x["email"]==taskAssigneesEmails[i]);
                    console.log(i,"matched teammate:",filteredTeammates);
                    if(filteredTeammates.length>0){
                      var teammateId = filteredTeammates[0]["id"];
                      await sdk.patchConversationsConversation_id({assignee_id: teammateId}, {conversation_id: frontConvId})
                        .then(({ data }) => console.log(data))
                        .catch(err => console.error(err));
                    }                
                  }
                  if(taskAssigneesEmails.length==0){
                    console.log("taskAssigneesEmails.length==0");
                    await sdk.patchConversationsConversation_id({assignee_id: null}, {conversation_id: frontConvId})
                        .then(({ data }) => console.log(data))
                        .catch(err => console.error(err));
                  }
                })
                .catch(err => console.error(err));

            })
            .catch(err => console.error(err));              
        }
        res.send('authentication succeed');
    }else{
        res.send('Unauthorized request');
    }
    
})


function validateFrontSignature(data, signature, apiSecret) {
  var hash = crypto.createHmac('sha1', apiSecret)
                   .update(JSON.stringify(data))
                   .digest('base64');

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

async function setTaskField(taskId, fieldId, fieldValue){
  const query = new URLSearchParams({
    // custom_task_ids: 'true',
    // team_id: '123'
  }).toString();

  // const taskId = '860pwfgfd';
  // const fieldId = 'a5a50dec-2ab2-4210-b03a-bfec443fc1bb';
  const resp = await fetch(
    `https://api.clickup.com/api/v2/task/${taskId}/field/${fieldId}?${query}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: clickupak
      },
      body: JSON.stringify({
        value: fieldValue
      })
    }
  );

  const data = await resp.json();
  console.log(data);
}

app.all('/front-comment', async (req, res) => {
  var ip = req.socket.remoteAddress;
  console.log("Just got a request!",ip,"param:",req.params,"body:");
  console.dir(req.body, { depth: null });
  var xFrontSignature = req.get('X-Front-Signature');
  console.log("X-Front-Signature:",xFrontSignature);
  var bodyString = JSON.stringify(req.body);

  var validation = validateFrontSignature(req.body, xFrontSignature, frontwhs);
  console.log("validation:", validation);
  
  if(validation){
    var frontCommentText = req.body["target"]["data"]["body"];    
    console.log("frontCommentText:", frontCommentText);
    let regex = /\**S\/O Number:\**\s+\d+/;
    console.log("so pattern match:", regex.test(frontCommentText) );    
    if( regex.test(frontCommentText) )
    {
      let result = regex.exec(frontCommentText);
      let orderNumber = "";
      if(result){
        orderNumber = result[0].replace(/\**S\/O Number:\**\s+/, "").trim();
        console.log("orderNumber:", orderNumber);
      }
      
      var links = req.body["conversation"]["links"];
      console.log("links:", links);
      let taskRegex = /\/t\/[a-zA-Z0-9]+/;
      
      for(var i=0;i<links.length;i++){
        let taskResult = taskRegex.exec(links[i]["external_url"]);
        if(taskResult){
          var taskId = taskResult[0].replace("\/t\/", "").trim();
          console.log("taskId:", taskId);
          await setTaskField(taskId, soField, orderNumber);
          var task = await getTask(taskId, clickupak);
          var subtasks = task["subtasks"];
          for(var j=0;j<subtasks.length;j++){
            var subtaskId = subtasks[j]["id"];
            await setTaskField(subtaskId, soField, orderNumber);
          }
        }      
      }
    }

    res.send('authentication succeed');
  }else{
    res.send('Unauthorized request');
  }
  
})

app.all('/clickup-comment-post', async (req, res) => {
  var ip = req.socket.remoteAddress;
    console.log("clickup-comment-post",ip,"param:",req.params,"body:");
    console.log("clickupak.length:", clickupak.length);
    console.dir(req.body, { depth: null });
    var xSignature = req.get('X-Signature');
    console.log("X-Signature:",xSignature);
    var bodyText = JSON.stringify(req.body);    
    const hash = crypto.createHmac('sha256', clickupwhsCommentPost).update(bodyText);
    const signature = hash.digest('hex');
    console.log("hash:",hash);
    console.log("signature:",signature);

    if(xSignature==signature){
      var comments = req.body["history_items"][0]["comment"]["comment"];
      console.log("comments:",comments);
      var frontConv = "";
      for(var i=0;i<comments.length;i++){
        console.log(`comment ${i}: ${comments[i]["text"]}`);
        var match = comments[i]["text"].match( /\/cnv_[a-zA-Z0-9]+/ );
        if (match !== null) {
          frontConv = match[0].substring(1);
          break;
        } 
      }
      console.log(`frontConv: ${frontConv}`);
      if(frontConv!=""){
        await sdk.auth(frontak);
        await sdk.getConversationById({conversation_id: frontConv})
          .then( async ({ data }) => {
            console.dir(data,{depth:null});
            var recipient = data["recipient"];
            var recipientHandle = recipient["handle"];
            console.log(`recipientHandle: ${recipientHandle}`);
            if( recipientHandle.includes(rsDomain) ){

            }else{
              var recipientLink = recipient["_links"]["related"]["contact"];
              var match = recipientLink.match( /\/crd_[a-zA-Z0-9]+/ );
              if( match != null ){
                var contactId = match.substring(1);
                await sdk.getContacts()
                .then( async ({ data }) => {
                    console.log(data);                    
                })
                .catch(err => console.error(err));
              }

            }
          })
          .catch(err => console.error(err));

      }
      res.send('authentication succeed');
    }else{
      res.send('Unauthorized request');
    }  
})

app.listen(process.env.PORT || 3000)