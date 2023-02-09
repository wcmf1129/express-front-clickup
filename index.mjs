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
const frontak = process.env.frontak;

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
    console.dir(JSON.parse(data));
    return data;
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
    let regex = /cnv_[a-zA-Z]+[^a-zA-Z]/;
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
    console.log("body:",body);
    const hash = crypto.createHmac('sha256', clickupwhs).update(body);
    const signature = hash.digest('hex');
    console.log("hash:",hash);
    console.log("signature:",signature);

    if(xSignature==signature){
        var taskId = req.body["task_id"];

        var task = await getTask(taskId,clickupak);
        console.log("task:",task);
        console.log("task id:",task["id"]);
        console.log("task assignees:",task["assignees"]);
        console.log("task assignees:",task.assignees);
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
                  console.dir(data,{depth:null});
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
        res.send('authentication succeed')
    }else{
        res.send('Unauthorized request')
    }


    
})

app.listen(process.env.PORT || 3000)